'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm } from '@/components/ui';
import { todoService, PersonalTodo, TodoStats } from '@/services/todoService';
import { Plus, Trash2, Loader2, CheckSquare, Square, Sparkles, Calendar, AlertTriangle, Clock, Edit2 } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = { high: 'var(--color-error)', medium: 'var(--color-warning)', low: 'var(--color-success)' };
const PRIORITY_LABELS: Record<string, string> = { high: '🔴 Tinggi', medium: '🟡 Sedang', low: '🟢 Rendah' };

function isSameDay(d1: Date, d2: Date) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }
function isWithinDays(date: Date, base: Date, days: number) {
  const diff = (date.getTime() - base.getTime()) / 86400000;
  return diff >= 0 && diff < days;
}

interface TodoGroup { label: string; emoji: string; todos: PersonalTodo[]; color?: string; }

export default function TodosPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' });
  const [aiText, setAiText] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        todoService.getAll(filter ? { status: filter } : undefined),
        todoService.getStats(),
      ]);
      setTodos(list); setStats(s);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group todos by time section
  const groups = useMemo((): TodoGroup[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    const overdue: PersonalTodo[] = [];
    const todayList: PersonalTodo[] = [];
    const tomorrowList: PersonalTodo[] = [];
    const weekList: PersonalTodo[] = [];
    const later: PersonalTodo[] = [];
    const done: PersonalTodo[] = [];
    const noDue: PersonalTodo[] = [];

    for (const t of todos) {
      if (t.status === 'done') { done.push(t); continue; }
      if (!t.dueDate) { noDue.push(t); continue; }
      const due = new Date(t.dueDate);
      if (due < today) { overdue.push(t); }
      else if (isSameDay(due, today)) { todayList.push(t); }
      else if (isSameDay(due, tomorrow)) { tomorrowList.push(t); }
      else if (due < weekEnd) { weekList.push(t); }
      else { later.push(t); }
    }

    const result: TodoGroup[] = [];
    if (overdue.length) result.push({ label: 'TERLAMBAT', emoji: '🚨', todos: overdue, color: 'var(--color-error)' });
    if (todayList.length) result.push({ label: 'HARI INI', emoji: '📌', todos: todayList, color: 'var(--color-warning)' });
    if (tomorrowList.length) result.push({ label: 'BESOK', emoji: '📅', todos: tomorrowList });
    if (weekList.length) result.push({ label: 'MINGGU INI', emoji: '🗓️', todos: weekList });
    if (later.length) result.push({ label: 'NANTI', emoji: '📆', todos: later });
    if (noDue.length) result.push({ label: 'TANPA DEADLINE', emoji: '📝', todos: noDue });
    if (done.length && filter !== 'pending') result.push({ label: 'SELESAI', emoji: '✅', todos: done });
    return result;
  }, [todos, filter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const data = { title: form.title, description: form.description || undefined, dueDate: form.dueDate || undefined, dueTime: form.dueTime || undefined, priority: form.priority as any, category: form.category || undefined };
      if (editingTodo) {
        await todoService.update(editingTodo.id, data);
        showToast('To-do diperbarui!', 'success');
      } else {
        await todoService.create(data);
        showToast('To-do ditambahkan!', 'success');
      }
      setShowAddModal(false); setEditingTodo(null);
      setForm({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' });
      fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (todo: PersonalTodo) => {
    setEditingTodo(todo);
    setForm({
      title: todo.title, description: todo.description || '',
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '',
      dueTime: todo.dueTime || '', priority: todo.priority, category: todo.category || '',
    });
    setShowAddModal(true);
  };

  const handleToggle = async (id: string) => {
    try { await todoService.toggleDone(id); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Hapus to-do ini?' })) return;
    try { await todoService.delete(id); showToast('Dihapus.', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setSubmitting(true);
    try {
      const p = await todoService.parseNaturalInput(aiText);
      setForm({ title: p.title || aiText, description: p.description || '', dueDate: p.dueDate || '', dueTime: p.dueTime || '', priority: p.priority || 'medium', category: p.category || '' });
      setShowAiInput(false); setShowAddModal(true);
      showToast('Input berhasil diparsing!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); setAiText(''); }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>✅ To-Do List</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => setShowAiInput(true)} variant="secondary" size="sm"><Sparkles size={16} /> AI Input</Button>
                  <Button onClick={() => { setEditingTodo(null); setForm({ title: '', description: '', dueDate: '', dueTime: '', priority: 'medium', category: '' }); setShowAddModal(true); }} size="sm"><Plus size={16} /> Tambah</Button>
                </div>
              </div>

              {/* Stats */}
              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  <Card><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.total}</div><div style={{ fontSize: 11, opacity: 0.5 }}>Total</div></div></Card>
                  <Card><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)' }}>{stats.done}</div><div style={{ fontSize: 11, opacity: 0.5 }}>Selesai</div></div></Card>
                  <Card><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-warning)' }}>{stats.pending}</div><div style={{ fontSize: 11, opacity: 0.5 }}>Pending</div></div></Card>
                  <Card><div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-error)' }}>{stats.overdue}</div><div style={{ fontSize: 11, opacity: 0.5 }}>Terlambat</div></div></Card>
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ val: '', label: 'Semua' }, { val: 'pending', label: 'Pending' }, { val: 'done', label: 'Selesai' }].map(f => (
                  <button key={f.val} onClick={() => setFilter(f.val)} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                    background: filter === f.val ? 'var(--color-primary)' : 'var(--bg-secondary)', color: filter === f.val ? '#fff' : 'inherit',
                  }}>{f.label}</button>
                ))}
              </div>

              {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div> : groups.length === 0 ? (
                <Card><div style={{ textAlign: 'center', padding: 24 }}><CheckSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p style={{ opacity: 0.6 }}>Belum ada to-do.</p><p style={{ fontSize: 13, opacity: 0.4 }}>Ketik &quot;kerjakan laporan fisika besok jam 3 sore&quot; di AI Input!</p></div></Card>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {groups.map(group => (
                    <div key={group.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{group.emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: group.color, textTransform: 'uppercase' }}>{group.label}</span>
                        <span style={{ fontSize: 12, opacity: 0.4 }}>({group.todos.length})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.todos.map(todo => {
                          const isOverdue = todo.dueDate && todo.status === 'pending' && new Date(todo.dueDate) < new Date();
                          return (
                            <Card key={todo.id} style={{ opacity: todo.status === 'done' ? 0.6 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button onClick={() => handleToggle(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                                  {todo.status === 'done' ? <CheckSquare size={22} style={{ color: 'var(--color-success)' }} /> : <Square size={22} />}
                                </button>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, textDecoration: todo.status === 'done' ? 'line-through' : 'none' }}>{todo.title}</span>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[todo.priority] || '#999', display: 'inline-block', flexShrink: 0 }} title={PRIORITY_LABELS[todo.priority]} />
                                    {isOverdue && <AlertTriangle size={14} style={{ color: 'var(--color-error)' }} />}
                                    {todo.category && <span style={{ fontSize: 11, opacity: 0.5, background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 8 }}>{todo.category}</span>}
                                  </div>
                                  {todo.dueDate && (
                                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Calendar size={11} />
                                      {new Date(todo.dueDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                      {todo.dueTime && <><Clock size={11} /> {todo.dueTime}</>}
                                    </div>
                                  )}
                                  {todo.description && <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{todo.description}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  <button onClick={() => openEdit(todo)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35 }}><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete(todo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35 }}><Trash2 size={14} /></button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTodo(null); }} title={editingTodo ? 'Edit To-Do' : 'Tambah To-Do'}>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Judul to-do" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                <textarea className="input" placeholder="Deskripsi (opsional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} style={{ flex: 1 }} />
                  <input className="input" type="time" value={form.dueTime} onChange={e => setForm({ ...form, dueTime: e.target.value })} style={{ flex: 1 }} />
                </div>
                <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="high">🔴 Prioritas Tinggi</option>
                  <option value="medium">🟡 Prioritas Sedang</option>
                  <option value="low">🟢 Prioritas Rendah</option>
                </select>
                <input className="input" placeholder="Kategori: kuliah, kerja, pribadi (opsional)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : (editingTodo ? 'Simpan Perubahan' : 'Simpan')}</Button>
              </form>
            </Modal>

            {/* AI Input Modal */}
            <Modal isOpen={showAiInput} onClose={() => setShowAiInput(false)} title="✨ Input via AI">
              <p style={{ marginBottom: 8, fontSize: 14, opacity: 0.7 }}>Ketik tugas dalam bahasa natural:</p>
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, opacity: 0.5 }}>
                <span>• &quot;kerjakan laporan fisika besok jam 3 sore&quot;</span>
                <span>• &quot;beli buku algoritma minggu depan&quot;</span>
                <span>• &quot;presentasi kelompok hari jumat priority tinggi&quot;</span>
                <span>• &quot;telepon mama kapan-kapan&quot;</span>
              </div>
              <textarea className="input" placeholder="Ketik tugas..." value={aiText} onChange={e => setAiText(e.target.value)} rows={3} />
              <div style={{ marginTop: 12 }}><Button onClick={handleAiParse} disabled={submitting || !aiText.trim()}>{submitting ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse</>}</Button></div>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
