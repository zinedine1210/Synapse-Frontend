'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/feature-access';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast, useConfirm, BottomSheet, PullToRefresh, TextInput, SelectOption, Modal } from '@/components/ui';
import { todoService, PersonalTodo, TodoStats } from '@/services/todoService';
import { useCache, setCache } from '@/lib/cache';
import { Plus, Loader2, CheckSquare, Sparkles, ChevronLeft, ChevronRight, Flame, Search, CheckCheck, Trash2, X, Timer, BookmarkPlus, Bell, BellOff, Grid2X2 } from 'lucide-react';
import { useCelebration } from '@/components/shared/CelebrationOverlay';
import { CustomCategoryCreator, CustomCategory } from '@/components/todo/CustomCategoryCreator';
import { UnifiedTimeline } from '@/components/todo/UnifiedTimeline';
import { ProgressRing } from '@/components/todo/ProgressRing';
import { ViewSegmentedControl, TodoViewMode } from '@/components/todo/ViewSegmentedControl';
import { TodoCard } from '@/components/todo/TodoCard';
import { TodoForm, TodoFormState } from '@/components/todo/TodoForm';
import { DraftSubtask } from '@/components/todo/SubtaskEditor';
import { PomodoroTimer } from '@/components/todo/PomodoroTimer';

// Dynamic import dnd-kit (no SSR)
const DndSortable = dynamic(() => import('@/components/todo/DndSortable').then(mod => ({
  default: ({ items, onReorder, children }: { items: string[]; onReorder: (o: number, n: number) => void; children: React.ReactNode }) => (
    <mod.SortableList items={items} onReorder={onReorder}>{children}</mod.SortableList>
  ),
})), { ssr: false });

const DndSortableItem = dynamic(() => import('@/components/todo/DndSortable').then(mod => ({
  default: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <mod.SortableItem id={id}>{children}</mod.SortableItem>
  ),
})), { ssr: false });

const DEFAULT_CATEGORIES = [
  { id: 'study', label: '📚 Study', emoji: '📚', color: '#6366f1' },
  { id: 'work', label: '💼 Work', emoji: '💼', color: '#f59e0b' },
  { id: 'personal', label: '🏠 Personal', emoji: '🏠', color: '#10b981' },
  { id: 'finance', label: '💰 Finance', emoji: '💰', color: '#3b82f6' },
  { id: 'goals', label: '🎯 Goals', emoji: '🎯', color: '#ec4899' },
];

const PRIORITY_DOT: Record<string, string> = {
  high: 'rgb(var(--color-error))',
  medium: 'rgb(var(--color-warning))',
  low: 'rgb(var(--color-success))',
};

const EMPTY_FORM: TodoFormState = { title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '', recurrence: null, tags: [], reminderAt: '' };

function getCategoryInfo(cat: string, customCats: CustomCategory[]) {
  const found = [...DEFAULT_CATEGORIES, ...customCats].find(c => c.id === cat);
  return found || { id: cat, label: cat, emoji: '📝', color: '#6b7280' };
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Pagi';
  if (h < 15) return 'Siang';
  if (h < 19) return 'Sore';
  return 'Malam';
}

interface TodoGroup { label: string; emoji: string; todos: PersonalTodo[]; color?: string; }

export default function TodosPage() {
  const { user } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { triggerConfetti } = useCelebration();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Cache key changes when filters change
  const todoCacheKey = `todos:list:${statusFilter}:${categoryFilter}`;
  const todoFetcher = useCallback(async () => {
    const params: any = { limit: 200 };
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    const res = await todoService.getAll(params);
    return res.data;
  }, [statusFilter, categoryFilter]);

  const { data: todos = [], loading, revalidate: refetchTodos, mutate: mutateTodos } = useCache<PersonalTodo[]>(todoCacheKey, todoFetcher);
  const { data: stats, revalidate: refetchStats } = useCache<TodoStats>('todos:stats', () => todoService.getStats());

  const fetchData = useCallback(async () => {
    await Promise.all([refetchTodos(), refetchStats()]);
  }, [refetchTodos, refetchStats]);
  const [viewMode, setViewMode] = useState<TodoViewMode>('time');
  const [showSheet, setShowSheet] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<TodoFormState>(EMPTY_FORM);
  const [formSubtasks, setFormSubtasks] = useState<DraftSubtask[]>([]);
  const [quickText, setQuickText] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synapse_custom_todo_categories');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);

  // ─── New features state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pomodoroTodo, setPomodoroTodo] = useState<PersonalTodo | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ todo: PersonalTodo; timeout: ReturnType<typeof setTimeout> } | null>(null);

  // Templates (localStorage)
  const [templates, setTemplates] = useState<{ name: string; form: TodoFormState; subtasks: DraftSubtask[] }[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synapse_todo_templates');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('synapse_todo_templates', JSON.stringify(templates));
  }, [templates]);

  const allCategories = useMemo(() => [...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);

  const categoryOptionsForForm = useMemo(
    () => allCategories.map(c => ({ id: c.id, label: c.label.replace(/^.+?\s/, ''), emoji: c.emoji || c.label.split(' ')[0], color: c.color })),
    [allCategories],
  );

  // Save custom categories to localStorage
  useEffect(() => {
    localStorage.setItem('synapse_custom_todo_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // ─── Today's completion + streak (motivation) ─────────────────────
  const todayProgress = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    let completedToday = 0;
    let remaining = 0;
    for (const t of todos) {
      if (t.status === 'done' && t.completedAt && isSameDay(new Date(t.completedAt), today)) completedToday++;
      if (t.status === 'pending' && t.dueDate && new Date(t.dueDate) < tomorrow) remaining++;
    }
    const total = completedToday + remaining;
    const percent = total > 0 ? Math.round((completedToday / total) * 100) : (completedToday > 0 ? 100 : 0);
    return { completedToday, remaining, total, percent };
  }, [todos]);

  const streak = useMemo(() => {
    const days = new Set<string>();
    for (const t of todos) {
      if (t.status === 'done' && t.completedAt) {
        const d = new Date(t.completedAt);
        days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    }
    let count = 0;
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(cur); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (days.has(key)) count++;
      else if (i === 0) continue; // today may not be done yet; keep streak from yesterday
      else break;
    }
    return count;
  }, [todos]);

  // Celebrate when all of today's tasks are completed (fires once per "completion")
  const celebratedRef = React.useRef(false);
  useEffect(() => {
    if (todayProgress.total > 0 && todayProgress.percent >= 100) {
      if (!celebratedRef.current) {
        celebratedRef.current = true;
        triggerConfetti('streak-milestone');
      }
    } else {
      celebratedRef.current = false;
    }
  }, [todayProgress.percent, todayProgress.total, triggerConfetti]);

  // ─── Search filter ─────────────────────────────────────────────────
  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;
    const q = searchQuery.toLowerCase();
    return todos.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
    );
  }, [todos, searchQuery]);

  // Group by time
  const timeGroups = useMemo((): TodoGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    const overdue: PersonalTodo[] = [], todayList: PersonalTodo[] = [], tomorrowList: PersonalTodo[] = [];
    const weekList: PersonalTodo[] = [], later: PersonalTodo[] = [], done: PersonalTodo[] = [], noDue: PersonalTodo[] = [];

    const sorted = [...filteredTodos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    for (const t of sorted) {
      if (t.status === 'done') { done.push(t); continue; }
      if (!t.dueDate) { noDue.push(t); continue; }
      const due = new Date(t.dueDate);
      if (due < today) overdue.push(t);
      else if (isSameDay(due, today)) todayList.push(t);
      else if (isSameDay(due, tomorrow)) tomorrowList.push(t);
      else if (due < weekEnd) weekList.push(t);
      else later.push(t);
    }

    const result: TodoGroup[] = [];
    if (overdue.length) result.push({ label: 'TERLAMBAT', emoji: '🚨', todos: overdue, color: 'rgb(var(--color-error))' });
    if (todayList.length) result.push({ label: 'HARI INI', emoji: '📌', todos: todayList, color: 'rgb(var(--color-warning))' });
    if (tomorrowList.length) result.push({ label: 'BESOK', emoji: '📅', todos: tomorrowList });
    if (weekList.length) result.push({ label: 'MINGGU INI', emoji: '🗓️', todos: weekList });
    if (later.length) result.push({ label: 'NANTI', emoji: '📆', todos: later });
    if (noDue.length) result.push({ label: 'TANPA DEADLINE', emoji: '📝', todos: noDue });
    if (done.length && statusFilter !== 'pending') result.push({ label: 'SELESAI', emoji: '✅', todos: done });
    return result;
  }, [filteredTodos, statusFilter]);

  // Group by category
  const categoryGroups = useMemo((): TodoGroup[] => {
    const sorted = [...filteredTodos].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const groups: Record<string, PersonalTodo[]> = {};
    for (const t of sorted) {
      const cat = t.category || 'uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return Object.entries(groups).map(([cat, list]) => {
      const info = getCategoryInfo(cat, customCategories);
      return { label: info.label, emoji: '', todos: list, color: info.color };
    });
  }, [filteredTodos, customCategories]);

  // ─── Eisenhower Matrix ──────────────────────────────────────────────
  const eisenhowerQuadrants = useMemo(() => {
    const active = filteredTodos.filter(t => t.status !== 'done');
    const q1: PersonalTodo[] = [], q2: PersonalTodo[] = [], q3: PersonalTodo[] = [], q4: PersonalTodo[] = [];
    const today = new Date();
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 3);
    for (const t of active) {
      const isUrgent = t.dueDate ? new Date(t.dueDate) <= weekEnd : false;
      const isImportant = t.priority === 'high' || t.priority === 'urgent';
      if (isUrgent && isImportant) q1.push(t);
      else if (!isUrgent && isImportant) q2.push(t);
      else if (isUrgent && !isImportant) q3.push(t);
      else q4.push(t);
    }
    return [
      { label: 'Lakukan Segera', emoji: '🔥', todos: q1, color: '#ef4444' },
      { label: 'Jadwalkan', emoji: '📅', todos: q2, color: '#3b82f6' },
      { label: 'Delegasikan', emoji: '🤝', todos: q3, color: '#f59e0b' },
      { label: 'Eliminasi', emoji: '🗑️', todos: q4, color: '#6b7280' },
    ];
  }, [filteredTodos]);

  const groups = viewMode === 'time' ? timeGroups : viewMode === 'category' ? categoryGroups : timeGroups;

  // Calendar data
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todosByDate: Record<string, PersonalTodo[]> = {};
    for (const t of filteredTodos) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!todosByDate[key]) todosByDate[key] = [];
        todosByDate[key].push(t);
      }
    }
    return { year, month, firstDay, daysInMonth, today, todosByDate };
  }, [todos, calendarMonth]);

  // Sortable todo IDs for DnD
  const sortableTodoIds = useMemo(() => {
    return todos.filter(t => t.status !== 'done').sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(t => t.id);
  }, [todos]);

  // ─── Drag and Drop handler ────────────────────────────────────────
  const handleReorder = useCallback(async (oldIndex: number, newIndex: number) => {
    const pendingTodos = todos.filter(t => t.status !== 'done').sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const reordered = [...pendingTodos];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updated = reordered.map((t, i) => ({ ...t, sortOrder: i }));
    mutateTodos(prev => {
      const doneOnes = (prev || []).filter(t => t.status === 'done');
      return [...updated, ...doneOnes];
    });

    try {
      await todoService.reorder(updated.map((t, i) => ({ id: t.id, sortOrder: i })));
    } catch (err: any) {
      showToast('Gagal save urutan', 'error');
      fetchData();
    }
  }, [todos, fetchData]);

  // ─── Reconcile draft subtasks with the API after save ─────────────
  const syncSubtasks = useCallback(async (todoId: string, drafts: DraftSubtask[], original: DraftSubtask[]) => {
    for (const d of drafts) {
      if (!d.id) {
        // Newly added draft → create, then mark done if needed
        try {
          const created = await todoService.createSubtask(todoId, d.title);
          if (d.isDone && created?.id) await todoService.updateSubtask(todoId, created.id, { isDone: true });
        } catch { /* non-blocking */ }
      } else {
        const before = original.find(o => o.id === d.id);
        if (before && before.isDone !== d.isDone) {
          try { await todoService.updateSubtask(todoId, d.id, { isDone: d.isDone }); } catch { /* non-blocking */ }
        }
      }
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const data: any = {
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate || undefined,
        dueTime: form.dueTime || undefined,
        priority: form.priority,
        category: form.category || undefined,
        tags: form.tags.length ? form.tags : undefined,
      };
      const originalSubs: DraftSubtask[] = (editingTodo?.subtasks || []).map(s => ({ id: s.id, title: s.title, isDone: s.isDone }));
      if (editingTodo) {
        await todoService.update(editingTodo.id, data);
        if (form.recurrence !== (editingTodo.recurrence || null)) {
          await todoService.setRecurrence(editingTodo.id, form.recurrence);
        }
        // Reminder
        if (form.reminderAt) {
          await todoService.setReminder(editingTodo.id, new Date(form.reminderAt).toISOString());
        } else {
          await todoService.deleteReminder(editingTodo.id).catch(() => {});
        }
        await syncSubtasks(editingTodo.id, formSubtasks, originalSubs);
        showToast('Task udah di-update! ✏️', 'success');
      } else {
        const created = await todoService.create(data);
        if (form.recurrence && created.id) {
          await todoService.setRecurrence(created.id, form.recurrence);
        }
        if (form.reminderAt && created.id) {
          await todoService.setReminder(created.id, new Date(form.reminderAt).toISOString());
        }
        if (created.id && formSubtasks.length) {
          await syncSubtasks(created.id, formSubtasks, []);
        }
        showToast('Task baru ditambahin! ✅', 'success');
      }
      setShowSheet(false); setEditingTodo(null);
      setForm(EMPTY_FORM); setFormSubtasks([]);
      fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    setQuickAdding(true);
    try {
      const parsed = await todoService.parseNaturalInput(quickText);
      await todoService.create({ title: parsed.title || quickText, dueDate: parsed.dueDate, dueTime: parsed.dueTime, priority: parsed.priority || 'medium', category: parsed.category });
      showToast('Task ditambahin! ✅', 'success');
      setQuickText('');
      fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setQuickAdding(false); }
  };

  const openAdd = (prefill?: Partial<TodoFormState>) => {
    setEditingTodo(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setFormSubtasks([]);
    setShowSheet(true);
  };

  const openEdit = (todo: PersonalTodo) => {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      dueTime: todo.dueTime || '',
      priority: todo.priority,
      category: todo.category || '',
      recurrence: todo.recurrence || null,
      tags: todo.tags || [],
      reminderAt: (todo as any).reminders?.[0]?.remindAt ? new Date((todo as any).reminders[0].remindAt).toISOString().slice(0, 16) : '',
    });
    setFormSubtasks((todo.subtasks || []).map(s => ({ id: s.id, title: s.title, isDone: s.isDone })));
    setShowSheet(true);
  };

  const closeSheet = () => { setShowSheet(false); setEditingTodo(null); setForm(EMPTY_FORM); setFormSubtasks([]); };

  const handleToggle = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    const wasChecking = todo?.status !== 'done';
    mutateTodos(prev => (prev || []).map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' as const : 'done' as const, completedAt: t.status === 'done' ? undefined : new Date().toISOString() } : t));

    if (wasChecking) {
      const el = document.querySelector(`[data-todo-check="${id}"]`);
      if (el) { el.classList.add('todo-check-bounce'); setTimeout(() => el.classList.remove('todo-check-bounce'), 400); }
      const textEl = document.querySelector(`[data-todo-text="${id}"]`);
      if (textEl) { textEl.classList.add('todo-text-strikethrough'); setTimeout(() => { textEl.classList.remove('todo-text-strikethrough'); textEl.classList.add('todo-text-done'); }, 500); }
    }

    try { await todoService.toggleDone(id); }
    catch { fetchData(); }
  };

  const handleDelete = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    // Optimistic remove
    mutateTodos(prev => (prev || []).filter(t => t.id !== id));
    // Undo toast
    const timeout = setTimeout(async () => {
      setPendingDelete(null);
      try { await todoService.delete(id); } catch { fetchData(); }
    }, 5000);
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeout);
      try { await todoService.delete(pendingDelete.todo.id); } catch {}
    }
    setPendingDelete({ todo, timeout });
    showToast('Task dihapus — tap undo untuk batal', 'info');
  };

  const undoDelete = useCallback(() => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeout);
    mutateTodos(prev => [...(prev || []), pendingDelete.todo]);
    setPendingDelete(null);
    showToast('Undo berhasil ✅', 'success');
  }, [pendingDelete, mutateTodos, showToast]);

  // ─── Bulk actions ─────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    const confirmed = await confirm({ title: `Hapus ${selectedIds.size} task?`, message: 'Semua task terpilih akan dihapus.', confirmText: 'Hapus', variant: 'danger' });
    if (!confirmed) return;
    const ids = [...selectedIds];
    mutateTodos(prev => (prev || []).filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set()); setSelectMode(false);
    try { await todoService.bulkDelete(ids); showToast(`${ids.length} task dihapus`, 'success'); } catch { fetchData(); }
  };

  const handleBulkToggle = async (done: boolean) => {
    const ids = [...selectedIds];
    mutateTodos(prev => (prev || []).map(t => selectedIds.has(t.id) ? { ...t, status: done ? 'done' : 'pending' } : t));
    setSelectedIds(new Set()); setSelectMode(false);
    try { await todoService.bulkToggleDone(ids, done); } catch { fetchData(); }
  };

  // ─── Template handlers ───────────────────────────────────────────
  const saveAsTemplate = (name: string, form: TodoFormState, subtasks: DraftSubtask[]) => {
    setTemplates(prev => [...prev, { name, form, subtasks }]);
    showToast('Template disimpan 📝', 'success');
  };

  const loadTemplate = (idx: number) => {
    const tpl = templates[idx];
    if (!tpl) return;
    setForm(tpl.form);
    setFormSubtasks(tpl.subtasks);
    setShowTemplateModal(false);
    setShowSheet(true);
  };

  const deleteTemplate = (idx: number) => {
    setTemplates(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Subtask handlers (inline card expansion) ─────────────────────
  const handleAddSubtask = async (todoId: string, title: string) => {
    const newSub = await todoService.createSubtask(todoId, title);
    mutateTodos(prev => (prev || []).map(t => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: [...(t.subtasks || []), newSub] };
    }));
  };

  const handleToggleSubtask = async (todoId: string, subId: string, isDone: boolean) => {
    mutateTodos(prev => (prev || []).map(t => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: (t.subtasks || []).map(s => s.id === subId ? { ...s, isDone } : s) };
    }));
    try { await todoService.updateSubtask(todoId, subId, { isDone }); }
    catch { fetchData(); }
  };

  const handleDeleteSubtask = async (todoId: string, subId: string) => {
    mutateTodos(prev => (prev || []).map(t => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subId) };
    }));
    try { await todoService.deleteSubtask(todoId, subId); }
    catch { fetchData(); }
  };

  const handleCreateCategory = (cat: CustomCategory) => {
    setCustomCategories(prev => [...prev, cat]);
    setShowCategoryCreator(false);
    showToast(`Kategori "${cat.label}" udah dibuat! 🎉`, 'success');
  };

  // ─── Render a single todo (with DnD wrapper) ──────────────────────
  const renderTodoItem = (todo: PersonalTodo) => {
    const catInfo = getCategoryInfo(todo.category || '', customCategories);
    return (
      <TodoCard
        key={todo.id}
        todo={todo}
        catInfo={catInfo}
        isExpanded={expandedTodoId === todo.id}
        onToggleExpand={() => setExpandedTodoId(expandedTodoId === todo.id ? null : todo.id)}
        onToggle={() => handleToggle(todo.id)}
        onEdit={() => openEdit(todo)}
        onDelete={() => handleDelete(todo.id)}
        onFocus={() => setPomodoroTodo(todo)}
        selectMode={selectMode}
        isSelected={selectedIds.has(todo.id)}
        onSelect={() => toggleSelect(todo.id)}
        onAddSubtask={(title) => handleAddSubtask(todo.id, title)}
        onToggleSubtask={(subId, isDone) => handleToggleSubtask(todo.id, subId, isDone)}
        onDeleteSubtask={(subId) => handleDeleteSubtask(todo.id, subId)}
      />
    );
  };

  const motivational = todayProgress.percent >= 100 && todayProgress.total > 0
    ? 'Mantap semua kelar! GG banget! 🎉'
    : todayProgress.remaining > 0
      ? `${todayProgress.remaining} task lagi, dikit lagii gas!`
      : 'Masih kosong nih, isi dong! ✨';

  return (
    <AuthGuard requiredFeature="todo_list">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <PullToRefresh onRefresh={fetchData}>
              <div className="feature-container" style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>

                {/* ─── Header card ─── */}
                <Card
                  style={{
                    padding: 18,
                    marginBottom: 16,
                    background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.12), rgba(var(--color-secondary), 0.08))',
                    border: '1px solid rgba(var(--color-primary), 0.18)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    <ProgressRing percent={todayProgress.percent} size={78} stroke={8} color="rgb(var(--color-primary))">
                      <span style={{ fontSize: 20, fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{todayProgress.percent}%</span>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.55, marginTop: 2 }}>HARI INI</span>
                    </ProgressRing>

                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgb(var(--text-muted))', margin: 0 }}>
                        {greeting()}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
                      </p>
                      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '2px 0 6px', letterSpacing: -0.4 }}>Todo Kamu</h1>
                      <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', margin: 0 }}>{motivational}</p>
                      {streak > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '4px 10px', borderRadius: 999, background: 'rgba(var(--color-warning), 0.15)', color: 'rgb(var(--color-warning))', fontSize: 12, fontWeight: 700 }}>
                          <Flame size={13} className="streak-fire" /> {streak} hari beruntun
                        </span>
                      )}
                    </div>

                    {stats && (
                      <div className="todo-header-stats" style={{ display: 'flex', gap: 8 }}>
                        {[
                          { val: stats.pending, label: 'Aktif', color: 'rgb(var(--color-warning))' },
                          { val: stats.done, label: 'Selesai', color: 'rgb(var(--color-success))' },
                          { val: stats.overdue, label: 'Telat', color: 'rgb(var(--color-error))' },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: 'center', minWidth: 54, padding: '8px 10px', borderRadius: 12, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 10, opacity: 0.55, fontWeight: 600 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* ─── Quick add bar ─── */}
                <form onSubmit={handleQuickAdd} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <TextInput
                        placeholder='Ketik cepat: "kerjakan PR fisika besok jam 3 sore"'
                        value={quickText}
                        onChange={v => setQuickText(v)}
                        leftIcon={<Sparkles size={16} />}
                      />
                    </div>
                    {quickText ? (
                      <Button type="submit" disabled={quickAdding} style={{ borderRadius: 14, paddingLeft: 18, paddingRight: 18 }}>
                        {quickAdding ? <Loader2 className="spin" size={16} /> : <Plus size={18} />}
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" onClick={() => openAdd()} style={{ borderRadius: 14, paddingLeft: 16, paddingRight: 16 }}>
                        <Plus size={18} /> Detail
                      </Button>
                    )}
                  </div>
                  <p style={{ fontSize: 11, opacity: 0.45, marginTop: 6, paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={11} /> AI otomatis mengenali deadline, prioritas &amp; kategori
                  </p>
                </form>

                {/* ─── View switcher ─── */}
                <div style={{ marginBottom: 14 }}>
                  <ViewSegmentedControl
                    value={viewMode}
                    onChange={setViewMode}
                    allowedModes={[
                      'time' as TodoViewMode,
                      ...(hasFeature('todo_categories') ? ['category' as TodoViewMode] : []),
                      'eisenhower' as TodoViewMode,
                      ...(hasFeature('todo_calendar') ? ['calendar' as TodoViewMode] : []),
                      ...(hasFeature('todo_timeline') ? ['timeline' as TodoViewMode] : []),
                    ]}
                  />
                </div>

                {/* ─── Search bar ─── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <TextInput
                      placeholder="Cari task..."
                      value={searchQuery}
                      onChange={setSearchQuery}
                      leftIcon={<Search size={15} />}
                    />
                  </div>
                  <button
                    onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                    style={{
                      padding: '8px 14px', borderRadius: 12, border: '1px solid var(--border-default)',
                      background: selectMode ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                      color: selectMode ? '#fff' : 'rgb(var(--text-secondary))',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <CheckCheck size={14} /> {selectMode ? 'Batal' : 'Pilih'}
                  </button>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    title="Template"
                    style={{
                      padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border-default)',
                      background: 'var(--input-bg)', color: 'rgb(var(--text-secondary))',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <BookmarkPlus size={14} />
                  </button>
                </div>

                {/* ─── Select mode toolbar ─── */}
                {selectMode && selectedIds.size > 0 && (
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 14px', marginBottom: 14,
                    borderRadius: 14, background: 'rgba(var(--color-primary), 0.08)',
                    border: '1px solid rgba(var(--color-primary), 0.2)', alignItems: 'center', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'rgb(var(--color-primary))', marginRight: 'auto' }}>
                      {selectedIds.size} dipilih
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(true)} style={{ fontSize: 12 }}>✅ Selesai</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleBulkToggle(false)} style={{ fontSize: 12 }}>↩️ Aktifkan</Button>
                    <Button size="sm" variant="danger" onClick={handleBulkDelete} style={{ fontSize: 12 }}><Trash2 size={13} /> Hapus</Button>
                  </div>
                )}

                {/* ─── Undo delete toast ─── */}
                {pendingDelete && (
                  <div style={{
                    position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 9990,
                    background: 'rgb(var(--bg-elevated))', border: '1px solid rgba(var(--color-primary), 0.3)',
                    borderRadius: 16, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)', animation: 'fadeSlideIn 0.2s',
                  }}>
                    <span style={{ fontSize: 13, color: 'rgb(var(--text-primary))' }}>"{pendingDelete.todo.title}" dihapus</span>
                    <Button size="sm" onClick={undoDelete}>Undo</Button>
                  </div>
                )}

                {/* ─── Filters (hidden for timeline) ─── */}
                {viewMode !== 'timeline' && viewMode !== 'calendar' && (
                  <div style={{ marginBottom: 16 }}>
                    {/* Status pills */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {[{ val: '', label: 'Semua' }, { val: 'pending', label: 'Aktif' }, { val: 'done', label: 'Selesai' }].map(f => (
                        <button key={f.val} onClick={() => setStatusFilter(f.val)} style={{
                          padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                          background: statusFilter === f.val ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                          color: statusFilter === f.val ? 'rgb(var(--bg-base))' : 'rgb(var(--text-secondary))', transition: 'all 0.2s',
                        }}>{f.label}</button>
                      ))}
                    </div>

                    {/* Category — dropdown on mobile, chips on desktop */}
                    <div className="todo-cat-desktop" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                      <button onClick={() => setCategoryFilter('')} style={chipStyle(categoryFilter === '')}>
                        🌐 Semua <span style={{ opacity: 0.5, marginLeft: 4 }}>{todos.length}</span>
                      </button>
                      {allCategories.map(cat => {
                        const count = todos.filter(t => t.category === cat.id).length;
                        const active = categoryFilter === cat.id;
                        return (
                          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)} style={chipStyle(active, cat.color)}>
                            {cat.label} <span style={{ opacity: 0.5, marginLeft: 4 }}>{count}</span>
                          </button>
                        );
                      })}
                      <button onClick={() => setShowCategoryCreator(true)} style={{ ...chipStyle(false), whiteSpace: 'nowrap', opacity: 0.65 }}>
                        <Plus size={12} /> Kategori
                      </button>
                    </div>
                    <div className="todo-cat-mobile" style={{ display: 'none', gap: 6, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <SelectOption
                          value={categoryFilter}
                          onChange={v => setCategoryFilter(v)}
                          options={[
                            { value: '', label: `🌐 Semua (${todos.length})` },
                            ...allCategories.map(cat => {
                              const count = todos.filter(t => t.category === cat.id).length;
                              return { value: cat.id, label: `${cat.emoji} ${cat.label.replace(cat.emoji + ' ', '')} (${count})` };
                            }),
                          ]}
                        />
                      </div>
                      <button onClick={() => setShowCategoryCreator(true)} style={{ ...chipStyle(false), whiteSpace: 'nowrap', opacity: 0.65, flexShrink: 0 }}>
                        <Plus size={12} /> Kategori
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom Category Creator */}
                {showCategoryCreator && (
                  <div style={{ marginBottom: 16 }}>
                    <CustomCategoryCreator onCreated={handleCreateCategory} onCancel={() => setShowCategoryCreator(false)} />
                  </div>
                )}

                {/* ─── Content ─── */}
                {viewMode === 'timeline' ? (
                  <UnifiedTimeline />
                ) : viewMode === 'calendar' ? (
                  <CalendarView
                    calendarData={calendarData}
                    calendarMonth={calendarMonth}
                    setCalendarMonth={setCalendarMonth}
                    customCategories={customCategories}
                    onDayClick={(dateKey) => openAdd({ dueDate: dateKey })}
                    onTodoClick={openEdit}
                  />
                ) : viewMode === ('eisenhower' as TodoViewMode) ? (
                  /* ─── Eisenhower Matrix ─── */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {eisenhowerQuadrants.map((q, i) => (
                      <Card key={i} style={{ padding: 14, borderLeft: `3px solid ${q.color}`, minHeight: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <span>{q.emoji}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: q.color, letterSpacing: 0.5 }}>{q.label}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>{q.todos.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {q.todos.length === 0 ? (
                            <p style={{ fontSize: 12, opacity: 0.35, textAlign: 'center', paddingTop: 12 }}>Kosong</p>
                          ) : q.todos.map(todo => (
                            <TodoCard
                              key={todo.id}
                              todo={todo}
                              catInfo={getCategoryInfo(todo.category || 'uncategorized', customCategories)}
                              isExpanded={expandedTodoId === todo.id}
                              onToggle={() => handleToggle(todo.id)}
                              onEdit={() => openEdit(todo)}
                              onDelete={() => handleDelete(todo.id)}
                              onFocus={() => setPomodoroTodo(todo)}
                              selectMode={selectMode}
                              isSelected={selectedIds.has(todo.id)}
                              onSelect={() => toggleSelect(todo.id)}
                              onExpandToggle={() => setExpandedTodoId(expandedTodoId === todo.id ? null : todo.id)}
                              onAddSubtask={(title) => handleAddSubtask(todo.id, title)}
                              onToggleSubtask={(subId, done) => handleToggleSubtask(todo.id, subId, done)}
                              onDeleteSubtask={(subId) => handleDeleteSubtask(todo.id, subId)}
                            />
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 64, borderRadius: 14 }} />)}
                  </div>
                ) : groups.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: 40 }}>
                    <CheckSquare size={44} style={{ opacity: 0.18, marginBottom: 14 }} />
                    <p style={{ opacity: 0.7, fontSize: 15, marginBottom: 4, fontWeight: 600 }}>Kosong nih tasknya</p>
                    <p style={{ opacity: 0.45, fontSize: 13, marginBottom: 16 }}>Ketik di kolom cepat di atas atau bikin task baru yuk!</p>
                    <Button onClick={() => openAdd()} style={{ margin: '0 auto' }}><Plus size={16} /> Gas Bikin!</Button>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                    {groups.map(group => (
                      <div key={group.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          {group.emoji && <span style={{ fontSize: 14 }}>{group.emoji}</span>}
                          {group.color && viewMode === 'category' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: group.color }} />}
                          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, color: group.color, textTransform: 'uppercase' }}>{group.label}</span>
                          <span style={{ fontSize: 11, opacity: 0.35 }}>({group.todos.length})</span>
                        </div>
                        <DndSortable
                          items={group.todos.map(t => t.id)}
                          onReorder={(oldIdx, newIdx) => {
                            const globalOldIdx = sortableTodoIds.indexOf(group.todos[oldIdx]?.id);
                            const globalNewIdx = sortableTodoIds.indexOf(group.todos[newIdx]?.id);
                            if (globalOldIdx !== -1 && globalNewIdx !== -1) {
                              handleReorder(globalOldIdx, globalNewIdx);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {group.todos.map(todo => (
                              <DndSortableItem key={todo.id} id={todo.id}>
                                {renderTodoItem(todo)}
                              </DndSortableItem>
                            ))}
                          </div>
                        </DndSortable>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PullToRefresh>

            {/* ─── Add / Edit sheet (BottomSheet on mobile, modal on desktop) ─── */}
            <BottomSheet isOpen={showSheet} onClose={closeSheet} title={editingTodo ? '✏️ Edit Task' : '✅ Tambah Task'}>
              <TodoForm
                form={form}
                setForm={setForm}
                subtasks={formSubtasks}
                setSubtasks={setFormSubtasks}
                categories={categoryOptionsForForm}
                submitting={submitting}
                editing={!!editingTodo}
                onSubmit={handleAdd}
                onSaveTemplate={saveAsTemplate}
              />
            </BottomSheet>

            {/* ─── Templates modal ─── */}
            {showTemplateModal && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              }} onClick={() => setShowTemplateModal(false)}>
                <Card style={{ maxWidth: 420, width: '100%', padding: 24, maxHeight: '70vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📝 Template Todo</h3>
                    <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={18} /></button>
                  </div>
                  {templates.length === 0 ? (
                    <p style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', padding: 20 }}>
                      Belum ada template. Buat task lalu save sebagai template dari form.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {templates.map((tpl, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                          borderRadius: 12, border: '1px solid var(--border-default)', cursor: 'pointer',
                        }} onClick={() => loadTemplate(i)}>
                          <BookmarkPlus size={14} style={{ opacity: 0.5 }} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{tpl.name}</span>
                          <span style={{ fontSize: 11, opacity: 0.4 }}>{tpl.subtasks.length} subtask</span>
                          <button onClick={e => { e.stopPropagation(); deleteTemplate(i); }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4,
                          }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ─── Pomodoro Timer ─── */}
            {pomodoroTodo && (
              <PomodoroTimer
                todoTitle={pomodoroTodo.title}
                onComplete={() => { handleToggle(pomodoroTodo.id); setPomodoroTodo(null); }}
                onClose={() => setPomodoroTodo(null)}
              />
            )}

          </div>
        </div>
      </div>

      <style jsx>{`
        .todo-cat-scroll::-webkit-scrollbar { height: 0; }
        .todo-cat-scroll { scrollbar-width: none; }
      `}</style>
    </AuthGuard>
  );
}

// ─── Category chip style helper ─────────────────────────────────────
function chipStyle(active: boolean, color?: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
    padding: '7px 13px', borderRadius: 999, border: '1px solid transparent', cursor: 'pointer',
    fontSize: 12.5, fontWeight: active ? 700 : 500,
    background: active ? (color ? `${color}1f` : 'rgba(var(--color-primary), 0.12)') : 'var(--input-bg)',
    color: active ? (color || 'rgb(var(--color-primary))') : 'rgb(var(--text-secondary))',
    borderColor: active && color ? `${color}55` : 'transparent',
    transition: 'all 0.2s',
  };
}

// ─── Calendar view (extracted for clarity) ──────────────────────────
interface CalendarViewProps {
  calendarData: {
    year: number; month: number; firstDay: number; daysInMonth: number; today: Date;
    todosByDate: Record<string, PersonalTodo[]>;
  };
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  customCategories: CustomCategory[];
  onDayClick: (dateKey: string) => void;
  onTodoClick: (todo: PersonalTodo) => void;
}

function CalendarView({ calendarData, calendarMonth, setCalendarMonth, customCategories, onDayClick, onTodoClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const selectedTodos = selectedDate ? (calendarData.todosByDate[selectedDate] || []) : [];

  return (
    <div className="todo-calendar">
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
        <button onClick={() => setCalendarMonth(new Date(calendarData.year, calendarData.month - 1, 1))} style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
            {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <button onClick={() => setCalendarMonth(new Date(calendarData.year, calendarData.month + 1, 1))} style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day names header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 8 }}>
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgb(var(--text-muted))', padding: '8px 0', letterSpacing: 0.3 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: calendarData.firstDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: 12 }} />
        ))}
        {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTodos = calendarData.todosByDate[dateKey] || [];
          const isToday = isSameDay(calendarData.today, new Date(calendarData.year, calendarData.month, day));
          const isSelected = selectedDate === dateKey;
          const hasPending = dayTodos.some(t => t.status === 'pending');
          const hasOverdue = dayTodos.some(t => t.status === 'pending' && new Date(t.dueDate!) < calendarData.today);
          const allDone = dayTodos.length > 0 && dayTodos.every(t => t.status === 'done');

          return (
            <div
              key={day}
              onClick={() => {
                setSelectedDate(isSelected ? null : dateKey);
                if (!dayTodos.length && !isSelected) onDayClick(dateKey);
              }}
              style={{
                aspectRatio: '1',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                background: isSelected
                  ? 'rgb(var(--color-primary))'
                  : isToday
                    ? 'rgba(var(--color-primary), 0.08)'
                    : 'transparent',
                border: isToday && !isSelected ? '2px solid rgb(var(--color-primary))' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: isToday || isSelected ? 800 : 500,
                color: isSelected
                  ? '#fff'
                  : isToday
                    ? 'rgb(var(--color-primary))'
                    : 'inherit',
              }}>
                {day}
              </span>

              {/* Dot indicators */}
              {dayTodos.length > 0 && (
                <div style={{ display: 'flex', gap: 3, marginTop: 4, position: 'absolute', bottom: 6 }}>
                  {dayTodos.length <= 3 ? (
                    dayTodos.map((t, idx) => (
                      <span key={idx} style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: isSelected
                          ? 'rgba(255,255,255,0.8)'
                          : t.status === 'done'
                            ? 'rgb(var(--color-success))'
                            : hasOverdue && t.status === 'pending' && new Date(t.dueDate!) < calendarData.today
                              ? 'rgb(var(--color-error))'
                              : 'rgb(var(--color-primary))',
                      }} />
                    ))
                  ) : (
                    <>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : allDone ? 'rgb(var(--color-success))' : hasOverdue ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary))' }} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: isSelected ? 'rgba(255,255,255,0.9)' : 'rgb(var(--text-muted))', lineHeight: 1 }}>+{dayTodos.length}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected date detail panel */}
      {selectedDate && (
        <div style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 16,
          background: 'rgb(var(--bg-surface))',
          border: '1px solid var(--border-default)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h4>
            <button
              onClick={() => onDayClick(selectedDate)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                background: 'rgba(var(--color-primary), 0.1)',
                color: 'rgb(var(--color-primary))',
              }}
            >
              + Tambah
            </button>
          </div>

          {selectedTodos.length === 0 ? (
            <p style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', padding: '12px 0', margin: 0 }}>Tidak ada task di tanggal ini</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedTodos.map(todo => {
                const ci = getCategoryInfo(todo.category || '', customCategories);
                return (
                  <div
                    key={todo.id}
                    onClick={() => onTodoClick(todo)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                      background: todo.status === 'done' ? 'rgba(var(--color-success), 0.04)' : 'var(--input-bg)',
                      border: `1px solid ${todo.status === 'done' ? 'rgba(var(--color-success), 0.2)' : 'var(--border-default)'}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Priority dot */}
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: PRIORITY_DOT[todo.priority] || '#999',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        textDecoration: todo.status === 'done' ? 'line-through' : 'none',
                        opacity: todo.status === 'done' ? 0.5 : 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {todo.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {todo.category && (
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${ci.color}15`, color: ci.color, fontWeight: 500 }}>
                            {ci.emoji} {ci.label.replace(/^.+?\s/, '')}
                          </span>
                        )}
                        {todo.dueTime && (
                          <span style={{ fontSize: 10, opacity: 0.5 }}>🕐 {todo.dueTime}</span>
                        )}
                        {todo.recurrence && (
                          <span style={{ fontSize: 10, opacity: 0.5 }}>🔄 {todo.recurrence === 'daily' ? 'Harian' : todo.recurrence === 'weekly' ? 'Mingguan' : 'Bulanan'}</span>
                        )}
                      </div>
                    </div>

                    {/* Status indicator */}
                    <span style={{ fontSize: 16 }}>{todo.status === 'done' ? '✅' : '⬜'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
