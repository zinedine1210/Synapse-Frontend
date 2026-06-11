'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm, DateTimePicker, CategoryPicker } from '@/components/ui';
import { todoService, PersonalTodo, TodoStats } from '@/services/todoService';
import { Plus, Trash2, Loader2, CheckSquare, Square, Sparkles, Calendar, AlertTriangle, Clock, Edit2, Filter, LayoutList, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'study', label: '📚 Study', color: '#6366f1' },
  { id: 'work', label: '💼 Work', color: '#f59e0b' },
  { id: 'personal', label: '🏠 Personal', color: '#10b981' },
  { id: 'finance', label: '💰 Finance', color: '#3b82f6' },
  { id: 'goals', label: '🎯 Goals', color: '#ec4899' },
];

const PRIORITY_COLORS: Record<string, string> = { high: 'var(--color-error)', medium: 'var(--color-warning)', low: 'var(--color-success)' };
const PRIORITY_LABELS: Record<string, string> = { high: '🔴 Tinggi', medium: '🟡 Sedang', low: '🟢 Rendah' };

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.id === cat) || { id: cat, label: cat, color: '#6b7280' };
}

function isSameDay(d1: Date, d2: Date) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }

interface TodoGroup { label: string; emoji: string; todos: PersonalTodo[]; color?: string; }

export default function TodosPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'time' | 'category' | 'calendar'>('time');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' });
  const [quickText, setQuickText] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const [list, s] = await Promise.all([todoService.getAll(params), todoService.getStats()]);
      setTodos(list); setStats(s);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by time
  const timeGroups = useMemo((): TodoGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    const overdue: PersonalTodo[] = [], todayList: PersonalTodo[] = [], tomorrowList: PersonalTodo[] = [];
    const weekList: PersonalTodo[] = [], later: PersonalTodo[] = [], done: PersonalTodo[] = [], noDue: PersonalTodo[] = [];

    for (const t of todos) {
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
    if (overdue.length) result.push({ label: 'TERLAMBAT', emoji: '🚨', todos: overdue, color: 'var(--color-error)' });
    if (todayList.length) result.push({ label: 'HARI INI', emoji: '📌', todos: todayList, color: 'var(--color-warning)' });
    if (tomorrowList.length) result.push({ label: 'BESOK', emoji: '📅', todos: tomorrowList });
    if (weekList.length) result.push({ label: 'MINGGU INI', emoji: '🗓️', todos: weekList });
    if (later.length) result.push({ label: 'NANTI', emoji: '📆', todos: later });
    if (noDue.length) result.push({ label: 'TANPA DEADLINE', emoji: '📝', todos: noDue });
    if (done.length && statusFilter !== 'pending') result.push({ label: 'SELESAI', emoji: '✅', todos: done });
    return result;
  }, [todos, statusFilter]);

  // Group by category
  const categoryGroups = useMemo((): TodoGroup[] => {
    const groups: Record<string, PersonalTodo[]> = {};
    for (const t of todos) {
      const cat = t.category || 'uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return Object.entries(groups).map(([cat, list]) => {
      const info = getCategoryInfo(cat);
      return { label: info.label, emoji: '', todos: list, color: info.color };
    });
  }, [todos]);

  const groups = viewMode === 'time' ? timeGroups : categoryGroups;

  // Calendar data
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Map todos by date key "YYYY-MM-DD"
    const todosByDate: Record<string, PersonalTodo[]> = {};
    for (const t of todos) {
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const data = { title: form.title, description: form.description || undefined, dueDate: form.dueDate || undefined, dueTime: form.dueTime || undefined, priority: form.priority as any, category: form.category || undefined };
      if (editingTodo) { await todoService.update(editingTodo.id, data); showToast('Todo diperbarui!', 'success'); }
      else { await todoService.create(data); showToast('Todo ditambahkan!', 'success'); }
      setShowAddModal(false); setEditingTodo(null);
      setForm({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' });
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
      showToast('Todo ditambahkan! ✅', 'success');
      setQuickText('');
      fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setQuickAdding(false); }
  };

  const openEdit = (todo: PersonalTodo) => {
    setEditingTodo(todo);
    setForm({ title: todo.title, description: todo.description || '', dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '', dueTime: todo.dueTime || '', priority: todo.priority, category: todo.category || '' });
    setShowAddModal(true);
  };

  const handleToggle = async (id: string) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' as const : 'done' as const } : t));
    try { await todoService.toggleDone(id); }
    catch { fetchData(); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Hapus to-do ini?' })) return;
    try { await todoService.delete(id); showToast('Dihapus.', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>

            {/* Header (full width) */}
            <div style={{ maxWidth: 1100, margin: '0 auto', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>✅ To-Do List</h1>
                <Button onClick={() => { setEditingTodo(null); setForm({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' }); setShowAddModal(true); }} size="sm"><Plus size={16} /> Tambah</Button>
              </div>

              {/* Quick Add */}
              <form onSubmit={handleQuickAdd}>
                <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Sparkles size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                    <input
                      className="input"
                      placeholder='Ketik: "kerjakan PR fisika besok jam 3 sore"'
                      value={quickText}
                      onChange={e => setQuickText(e.target.value)}
                      style={{ paddingLeft: 34, fontSize: 14, borderRadius: 12, padding: '12px 14px 12px 34px' }}
                    />
                  </div>
                  {quickText && (
                    <Button type="submit" disabled={quickAdding} style={{ borderRadius: 12 }}>
                      {quickAdding ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
                    </Button>
                  )}
                </div>
                <p style={{ fontSize: 11, opacity: 0.4, marginTop: 6, paddingLeft: 4 }}>AI otomatis parsing deadline, prioritas & kategori</p>
              </form>
            </div>

            {/* 2-column layout: sidebar + main */}
            <div className="todo-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, maxWidth: 1100, margin: '0 auto' }}>

              {/* ── LEFT SIDEBAR: Categories + Stats ── */}
              <aside className="todo-sidebar" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                {/* Stats summary */}
                {stats && (
                  <Card style={{ padding: 14, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { val: stats.total, label: 'Total', color: 'inherit' },
                        { val: stats.done, label: 'Selesai', color: 'var(--color-success)' },
                        { val: stats.pending, label: 'Pending', color: 'var(--color-warning)' },
                        { val: stats.overdue, label: 'Terlambat', color: 'var(--color-error)' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '6px 0' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: 10, opacity: 0.5 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Category navigation */}
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.5, marginBottom: 8 }}>Kategori</h3>
                  <div className="todo-sidebar-categories" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={() => setCategoryFilter('')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: categoryFilter === '' ? 'rgba(var(--color-primary), 0.1)' : 'transparent',
                        color: categoryFilter === '' ? 'rgb(var(--color-primary))' : 'inherit',
                        fontWeight: categoryFilter === '' ? 600 : 400, fontSize: 13, textAlign: 'left', width: '100%', transition: 'all 0.2s',
                      }}
                    >
                      <span>🌐 Semua</span>
                      <span style={{ fontSize: 11, opacity: 0.4 }}>{todos.length}</span>
                    </button>
                    {CATEGORIES.map(cat => {
                      const count = todos.filter(t => t.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryFilter(cat.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: categoryFilter === cat.id ? `${cat.color}15` : 'transparent',
                            color: categoryFilter === cat.id ? cat.color : 'inherit',
                            fontWeight: categoryFilter === cat.id ? 600 : 400, fontSize: 13, textAlign: 'left', width: '100%', transition: 'all 0.2s',
                          }}
                        >
                          <span>{cat.label}</span>
                          <span style={{ fontSize: 11, opacity: 0.4 }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* View mode */}
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.5, marginBottom: 8 }}>Tampilan</h3>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => setViewMode('time')} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: viewMode === 'time' ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)', color: viewMode === 'time' ? 'rgb(var(--color-primary))' : 'inherit', transition: 'all 0.2s' }}>
                      <Clock size={13} /> Waktu
                    </button>
                    <button onClick={() => setViewMode('category')} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: viewMode === 'category' ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)', color: viewMode === 'category' ? 'rgb(var(--color-primary))' : 'inherit', transition: 'all 0.2s' }}>
                      <LayoutList size={13} /> Kategori
                    </button>
                    <button onClick={() => setViewMode('calendar')} style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: viewMode === 'calendar' ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)', color: viewMode === 'calendar' ? 'rgb(var(--color-primary))' : 'inherit', transition: 'all 0.2s' }}>
                      <CalendarDays size={13} /> Kalender
                    </button>
                  </div>
                </div>
              </aside>

              {/* ── MAIN: Todo List ── */}
              <main style={{ minWidth: 0 }}>
                {/* Status filter pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {[{ val: '', label: 'Semua' }, { val: 'pending', label: 'Aktif' }, { val: 'done', label: 'Selesai' }].map(f => (
                    <button key={f.val} onClick={() => setStatusFilter(f.val)} style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      background: statusFilter === f.val ? 'rgb(var(--color-primary))' : 'var(--input-bg)', color: statusFilter === f.val ? '#fff' : 'inherit', transition: 'all 0.2s',
                    }}>{f.label}</button>
                  ))}
                </div>

                {/* Calendar View */}
                {viewMode === 'calendar' ? (
                  <div>
                    {/* Calendar header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <button onClick={() => setCalendarMonth(new Date(calendarData.year, calendarData.month - 1, 1))} style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={16} />
                      </button>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                        {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button onClick={() => setCalendarMonth(new Date(calendarData.year, calendarData.month + 1, 1))} style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgb(var(--text-muted))', padding: '6px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {/* Empty cells before first day */}
                      {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} style={{ minHeight: 90, borderRadius: 10, background: 'transparent' }} />
                      ))}

                      {/* Day cells */}
                      {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayTodos = calendarData.todosByDate[dateKey] || [];
                        const isToday = isSameDay(calendarData.today, new Date(calendarData.year, calendarData.month, day));
                        const hasOverdue = dayTodos.some(t => t.status === 'pending' && new Date(t.dueDate!) < calendarData.today);

                        return (
                          <div
                            key={day}
                            onClick={() => {
                              setEditingTodo(null);
                              setForm({ title: '', description: '', dueDate: dateKey, dueTime: '', priority: 'medium', category: '' });
                              setShowAddModal(true);
                            }}
                            style={{
                              minHeight: 90, borderRadius: 10, padding: '6px 8px', cursor: 'pointer',
                              background: isToday ? 'rgba(var(--color-primary), 0.06)' : 'var(--card-bg)',
                              border: isToday ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                              transition: 'all 0.15s', overflow: 'hidden',
                              display: 'flex', flexDirection: 'column',
                            }}
                          >
                            {/* Day number */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{
                                fontSize: 12, fontWeight: isToday ? 800 : 600,
                                color: isToday ? 'rgb(var(--color-primary))' : hasOverdue ? 'rgb(var(--color-error))' : 'inherit',
                                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                background: isToday ? 'rgba(var(--color-primary), 0.12)' : 'transparent',
                              }}>
                                {day}
                              </span>
                              {dayTodos.length > 0 && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgb(var(--text-muted))' }}>{dayTodos.length}</span>
                              )}
                            </div>

                            {/* Todo items */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                              {dayTodos.slice(0, 3).map(todo => {
                                const catInfo = getCategoryInfo(todo.category || '');
                                return (
                                  <div
                                    key={todo.id}
                                    onClick={(e) => { e.stopPropagation(); openEdit(todo); }}
                                    style={{
                                      fontSize: 10, lineHeight: '14px', padding: '2px 5px', borderRadius: 4,
                                      background: todo.status === 'done' ? 'rgba(var(--color-success), 0.1)' : `${catInfo.color}15`,
                                      color: todo.status === 'done' ? 'rgb(var(--color-success))' : catInfo.color,
                                      fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      textDecoration: todo.status === 'done' ? 'line-through' : 'none',
                                      opacity: todo.status === 'done' ? 0.6 : 1,
                                      display: 'flex', alignItems: 'center', gap: 3,
                                    }}
                                  >
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLORS[todo.priority] || '#999', flexShrink: 0 }} />
                                    {todo.title}
                                  </div>
                                );
                              })}
                              {dayTodos.length > 3 && (
                                <span style={{ fontSize: 9, color: 'rgb(var(--text-muted))', fontWeight: 600, paddingLeft: 4 }}>
                                  +{dayTodos.length - 3} lagi
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                /* List View */
                loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
                  </div>
                ) : groups.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: 32 }}>
                    <CheckSquare size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 4 }}>Belum ada to-do.</p>
                    <p style={{ opacity: 0.4, fontSize: 13 }}>Ketik di atas untuk mulai!</p>
                  </Card>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {groups.map(group => (
                    <div key={group.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {group.emoji && <span style={{ fontSize: 14 }}>{group.emoji}</span>}
                        {group.color && viewMode === 'category' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: group.color }} />}
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: group.color, textTransform: 'uppercase' }}>{group.label}</span>
                        <span style={{ fontSize: 11, opacity: 0.35 }}>({group.todos.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.todos.map(todo => {
                          const catInfo = getCategoryInfo(todo.category || '');
                          const isOverdue = todo.dueDate && todo.status === 'pending' && new Date(todo.dueDate) < new Date();
                          return (
                            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--border-default)', opacity: todo.status === 'done' ? 0.55 : 1, transition: 'all 0.2s' }}>
                              <button onClick={() => handleToggle(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}>
                                {todo.status === 'done' ? <CheckSquare size={20} style={{ color: 'var(--color-success)' }} /> : <Square size={20} style={{ opacity: 0.4 }} />}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 500, fontSize: 14, textDecoration: todo.status === 'done' ? 'line-through' : 'none' }}>{todo.title}</span>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[todo.priority] || '#999', flexShrink: 0 }} />
                                  {isOverdue && <AlertTriangle size={13} style={{ color: 'var(--color-error)' }} />}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                  {todo.category && (
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${catInfo.color}15`, color: catInfo.color, fontWeight: 500 }}>{catInfo.label}</span>
                                  )}
                                  {todo.dueDate && (
                                    <span style={{ fontSize: 11, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                                      <Calendar size={10} />
                                      {new Date(todo.dueDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                      {todo.dueTime && <> · {todo.dueTime}</>}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button onClick={() => openEdit(todo)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}><Trash2 size={14} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
              )}
              </main>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTodo(null); }} title={editingTodo ? '✏️ Edit To-Do' : '✅ Tambah To-Do'}>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Judul</label>
                  <input className="input" placeholder="Apa yang perlu dikerjakan?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={{ fontSize: 15, padding: '12px 14px', borderRadius: 10 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Catatan (opsional)</label>
                  <textarea className="input" placeholder="Detail tambahan..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ borderRadius: 10, padding: '10px 14px', resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Tanggal</label>
                    <DateTimePicker mode="date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} placeholder="Pilih tanggal" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Waktu</label>
                    <DateTimePicker mode="time" value={form.dueTime} onChange={v => setForm({ ...form, dueTime: v })} placeholder="Pilih waktu" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Prioritas</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([{ id: 'high', label: 'Tinggi', emoji: '🔴' }, { id: 'medium', label: 'Sedang', emoji: '🟡' }, { id: 'low', label: 'Rendah', emoji: '🟢' }]).map(p => (
                      <button key={p.id} type="button" onClick={() => setForm({ ...form, priority: p.id })} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: form.priority === p.id ? 600 : 400,
                        background: form.priority === p.id ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                        color: form.priority === p.id ? 'rgb(var(--color-primary))' : 'inherit',
                        outline: form.priority === p.id ? '2px solid rgb(var(--color-primary))' : 'none',
                        outlineOffset: -1, transition: 'all 0.2s',
                      }}>{p.emoji} {p.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <CategoryPicker
                    options={[{ id: '', label: 'Tanpa Kategori', emoji: '📝' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label.replace(/^.+\s/, ''), emoji: c.label.split(' ')[0], color: c.color }))]}
                    value={form.category}
                    onChange={v => setForm({ ...form, category: v })}
                  />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : (editingTodo ? '💾 Simpan Perubahan' : '✅ Tambah Todo')}
                </Button>
              </form>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
