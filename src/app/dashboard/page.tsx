'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useDashboard, useContextualSuggestion } from '@/viewmodels/useDashboard';
import { useDeadlines } from '@/viewmodels/useDeadlines';
import { aiService } from '@/services/aiService';
import { todoService } from '@/services/todoService';
import { dashboardService, DashboardSummary } from '@/services/dashboardService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm } from '@/components/ui';
import {
  Plus, BookOpen, Trash2, Calendar, Upload, Loader2, Check, Sparkles,
  Clock, AlertTriangle, Wallet, TrendingUp, TrendingDown, Target, TreePine,
  CheckSquare, Square, ChevronDown, ChevronUp, Flame, Trophy, ArrowRight,
  Zap, Star, Award, MessageCircle, HelpCircle, CalendarDays
} from 'lucide-react';

interface ParsedCourse {
  courseName: string;
  day: string;
  time: string;
  room?: string;
  lecturer?: string;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: `Selamat pagi, ${name}!`, emoji: '☀️', sub: 'Semangat memulai hari!' };
  if (hour >= 11 && hour < 15) return { text: `Selamat siang, ${name}!`, emoji: '🌤️', sub: 'Jangan lupa istirahat ya' };
  if (hour >= 15 && hour < 18) return { text: `Selamat sore, ${name}!`, emoji: '🌅', sub: 'Masih produktif nih' };
  return { text: `Selamat malam, ${name}!`, emoji: '🌙', sub: 'Waktunya wrap-up' };
}

const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { classes, isLoading, error, isCreating, createClass, deleteClass } = useDashboard();
  const { deadlines, isLoading: deadlinesLoading } = useDeadlines();
  const { suggestion: contextSuggestion, suggestAction } = useContextualSuggestion();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Collapsible sections
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [showClasses, setShowClasses] = useState(false);

  // Quick todo add
  const [quickTodo, setQuickTodo] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  // Modal create class
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Schedule parser
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [createdFromParse, setCreatedFromParse] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dashboardService.getSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  const greeting = getGreeting(user?.fullName || 'Mahasiswa');

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newClassName.trim()) { setCreateError('Nama kelas wajib diisi.'); return; }
    const res = await createClass(newClassName, newClassDesc);
    if (res.success) { setNewClassName(''); setNewClassDesc(''); setShowCreateModal(false); }
    else { setCreateError(res.error || 'Gagal membuat kelas.'); }
  };

  const handleDeleteClass = async (classId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({ title: 'Konfirmasi', message: 'Hapus kelas ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    await deleteClass(classId);
  };

  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true); setParseError(null); setParsedCourses([]);
    try { const result = await aiService.parseSchedule(file); setParsedCourses(result); }
    catch (err) { setParseError(err instanceof Error ? err.message : 'Gagal mengurai gambar jadwal.'); }
    finally { setIsParsing(false); }
  };

  const handleCreateFromParse = async (course: ParsedCourse) => {
    const key = `${course.courseName}-${course.day}`;
    if (createdFromParse[key]) return;
    try {
      const description = `Jadwal: ${course.day}, ${course.time}. Ruang: ${course.room || '-'}. Dosen: ${course.lecturer || '-'}`;
      const res = await createClass(course.courseName, description, { lecturer: course.lecturer, day: course.day, time: course.time, room: course.room });
      if (res.success) { setCreatedFromParse(prev => ({ ...prev, [key]: true })); showToast(`Kelas ${course.courseName} berhasil dibuat!`, 'success'); }
      else { showToast(res.error || 'Gagal.', 'error'); }
    } catch { showToast('Terjadi kesalahan.', 'error'); }
  };

  const handleQuickTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTodo.trim()) return;
    setAddingTodo(true);
    try {
      const parsed = await todoService.parseNaturalInput(quickTodo);
      await todoService.create({ title: parsed.title || quickTodo, dueDate: parsed.dueDate, dueTime: parsed.dueTime, priority: parsed.priority || 'medium', category: parsed.category });
      showToast('Todo ditambahkan! ✅', 'success');
      setQuickTodo('');
      // Refresh summary
      dashboardService.getSummary().then(setSummary).catch(() => {});
    } catch { showToast('Gagal menambah todo.', 'error'); }
    finally { setAddingTodo(false); }
  };

  const handleToggleTodo = async (id: string) => {
    // Optimistic update
    setSummary(prev => {
      if (!prev) return prev;
      const updatedTodos = prev.todosToday.map(t => t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t);
      const doneCount = updatedTodos.filter(t => t.status === 'done').length;
      return { ...prev, todosToday: updatedTodos, todoStats: { ...prev.todoStats, done: doneCount } };
    });
    try { await todoService.toggleDone(id); }
    catch { showToast('Gagal update.', 'error'); }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Dashboard" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>

              {/* ═══════ GREETING BANNER ═══════ */}
              <div className="dashboard-greeting" style={{ marginBottom: 28, padding: '24px 28px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-primary), 0.02) 100%)', border: '1px solid rgba(var(--color-primary), 0.1)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                    {greeting.emoji} {greeting.text}
                  </h1>
                  <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>
                    {summary?.aiOneLiner || greeting.sub}
                  </p>
                  {summary?.streakDays != null && summary.streakDays > 0 && (
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(255, 100, 0, 0.1)', fontSize: 13, fontWeight: 600, color: '#ff6400' }}>
                      <Flame size={14} /> {summary.streakDays} hari streak!
                    </div>
                  )}
                  {contextSuggestion && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <Zap size={14} style={{ color: 'rgb(var(--color-primary))', opacity: 0.7 }} />
                      <span style={{ opacity: 0.6 }}>{contextSuggestion}</span>
                      {suggestAction && (
                        <Link href={suggestAction.href} style={{ color: 'rgb(var(--color-primary))', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                          {suggestAction.label} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                {/* Decorative gradient orb */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary), 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              </div>

              {/* ═══════ QUICK ACTIONS ═══════ */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {[
                  { label: 'Scan Struk', icon: '📸', href: '/duit-tracker' },
                  { label: 'Catat', icon: '💸', href: '/duit-tracker' },
                  { label: 'Todo', icon: '✅', href: '/todos' },
                  { label: 'Q&A', icon: '❓', href: '/qna' },
                  { label: 'Kelas', icon: '📚', href: '/classes' },
                ].map(action => (
                  <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                    <div className="quick-action-chip" style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 500 }}>
                      <span style={{ fontSize: 16 }}>{action.icon}</span> {action.label}
                    </div>
                  </Link>
                ))}
              </div>

              {/* ═══════ MAIN GRID ═══════ */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>

                {/* KEUANGAN SNAPSHOT */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <Wallet size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Keuangan
                    </h3>
                    <Link href="/duit-tracker" style={{ fontSize: 12, color: 'rgb(var(--color-primary))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                      Detail <ArrowRight size={12} />
                    </Link>
                  </div>

                  {summaryLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '80%' }} />
                      <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '60%' }} />
                      <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '70%' }} />
                    </div>
                  ) : summary?.financeSummary ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <div style={{ padding: '8px 0' }}>
                          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Pemasukan</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success)' }}>{fmt(summary.financeSummary.income)}</div>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Pengeluaran</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-error)' }}>{fmt(summary.financeSummary.expense)}</div>
                        </div>
                        <div style={{ padding: '8px 0' }}>
                          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Saldo</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(summary.financeSummary.balance)}</div>
                        </div>
                      </div>

                      {summary.topBudgetAlert && (
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: summary.topBudgetAlert.percentage > 90 ? 'rgba(var(--color-error), 0.06)' : 'rgba(var(--color-warning), 0.06)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Target size={13} style={{ flexShrink: 0 }} />
                          <span>Budget <strong style={{ textTransform: 'capitalize' }}>{summary.topBudgetAlert.category}</strong>: {summary.topBudgetAlert.percentage}% terpakai</span>
                        </div>
                      )}

                      {summary.trees && summary.trees.length > 0 && (
                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TreePine size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                          <span style={{ opacity: 0.7 }}>{summary.trees[0].name}</span>
                          <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(summary.trees[0].progress, 100)}%`, background: 'var(--color-success)', borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                          <span style={{ fontWeight: 600, opacity: 0.7 }}>{summary.trees[0].progress}%</span>
                        </div>
                      )}

                      {/* Si Bawel Bubble */}
                      {summary.bawelBubble && (
                        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--color-primary), 0.04)', border: '1px solid rgba(var(--color-primary), 0.08)', fontSize: 13, fontStyle: 'italic', lineHeight: 1.5 }}>
                          🗣️ {summary.bawelBubble}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, opacity: 0.4, fontSize: 13 }}>
                      <Wallet size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                      Mulai catat keuanganmu
                    </div>
                  )}
                </Card>

                {/* TODO HARI INI */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <CheckSquare size={16} style={{ color: 'var(--color-success)' }} /> Todo Hari Ini
                      {summary?.todoStats && (
                        <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>({summary.todoStats.done}/{summary.todoStats.total})</span>
                      )}
                    </h3>
                    <Link href="/todos" style={{ fontSize: 12, color: 'rgb(var(--color-primary))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                      Semua <ArrowRight size={12} />
                    </Link>
                  </div>

                  {summaryLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 28, borderRadius: 6 }} />)}
                    </div>
                  ) : summary?.todosToday && summary.todosToday.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                      {summary.todosToday.slice(0, 5).map(todo => (
                        <div key={todo.id} onClick={() => handleToggleTodo(todo.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }} className="todo-hover-row">
                          {todo.status === 'done' ? (
                            <CheckSquare size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                          ) : (
                            <Square size={18} style={{ opacity: 0.35, flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 13, textDecoration: todo.status === 'done' ? 'line-through' : 'none', opacity: todo.status === 'done' ? 0.45 : 1, flex: 1, lineHeight: 1.3 }}>
                            {todo.title}
                          </span>
                          {todo.dueTime && <span style={{ fontSize: 11, opacity: 0.35, fontFamily: 'monospace' }}>{todo.dueTime}</span>}
                          {todo.priority === 'high' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-error)', flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 16, opacity: 0.4, fontSize: 13 }}>
                      Tidak ada todo hari ini 🎉
                    </div>
                  )}

                  {/* Quick Add Todo */}
                  <form onSubmit={handleQuickTodo} style={{ display: 'flex', gap: 6 }}>
                    <input
                      className="input"
                      placeholder='+ "bayar kos besok"'
                      value={quickTodo}
                      onChange={e => setQuickTodo(e.target.value)}
                      style={{ fontSize: 13, flex: 1, padding: '8px 12px' }}
                    />
                    {quickTodo && (
                      <Button size="sm" type="submit" disabled={addingTodo} style={{ padding: '6px 10px' }}>
                        {addingTodo ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
                      </Button>
                    )}
                  </form>
                </Card>
              </div>

              {/* ═══════ RINGKASAN AKADEMIK ═══════ */}
              {summary?.academicSummary && (
                <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
                    <BookOpen size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Ringkasan Akademik
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: summary.academicSummary.todaySchedule.length > 0 ? 16 : 0 }}>
                    {[
                      { label: 'Kelas Aktif', value: summary.academicSummary.activeClasses, icon: <BookOpen size={14} />, color: 'rgb(var(--color-primary))' },
                      { label: 'Tugas Pending', value: summary.academicSummary.pendingTasks, icon: <AlertTriangle size={14} />, color: 'var(--color-warning)' },
                      { label: 'Forum Baru', value: summary.academicSummary.unreadForumMessages, icon: <MessageCircle size={14} />, color: 'var(--color-success)' },
                      { label: 'Q&A Terbuka', value: summary.academicSummary.unansweredQna, icon: <HelpCircle size={14} />, color: '#8b5cf6' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--input-bg)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                          <span style={{ color: item.color }}>{item.icon}</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {summary.academicSummary.todaySchedule.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CalendarDays size={13} /> Jadwal Hari Ini
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {summary.academicSummary.todaySchedule.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--input-bg)' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.className}</span>
                            <span style={{ fontSize: 12, opacity: 0.5, fontFamily: 'monospace' }}>{s.time}</span>
                            <span style={{ fontSize: 11, opacity: 0.4 }}>{s.room}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ═══════ GAMIFIKASI ═══════ */}
              {summary?.gamification && (
                <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <Trophy size={16} style={{ color: '#f59e0b' }} /> Level {summary.gamification.level}: {summary.gamification.levelTitle}
                    </h3>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>
                      {summary.gamification.currentXp}{summary.gamification.nextLevelXp ? `/${summary.gamification.nextLevelXp}` : ''} XP
                    </span>
                  </div>
                  {/* XP Progress Bar */}
                  {summary.gamification.nextLevelXp && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${Math.min((summary.gamification.currentXp / summary.gamification.nextLevelXp) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Flame size={14} style={{ color: '#ff6400' }} /> {summary.gamification.currentStreak} hari streak
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={14} style={{ color: '#8b5cf6' }} /> {summary.gamification.totalAchievements} achievement
                    </span>
                    {summary.gamification.recentAchievement && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)' }}>
                        <Star size={14} /> {summary.gamification.recentAchievement.name}
                      </span>
                    )}
                  </div>
                  {/* Weekly Challenge */}
                  {summary.gamification.weeklyChallenge && (() => {
                    const ch = summary.gamification.weeklyChallenge;
                    const pct = ch.target > 0 ? Math.min(Math.round((ch.current / ch.target) * 100), 100) : 0;
                    return (
                      <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Target size={14} style={{ color: '#f59e0b' }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>Tantangan Minggu Ini</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>&ldquo;{ch.title}&rdquo;</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(var(--color-primary), 0.1)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981', transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: 11, opacity: 0.5 }}>{pct}%</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{fmt(ch.current)} / {fmt(ch.target)}</span>
                          <span>Sisa {ch.daysLeft} hari</span>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              )}

              {/* ═══════ COLLAPSIBLE: DEADLINES ═══════ */}
              {!deadlinesLoading && deadlines && deadlines.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <button onClick={() => setShowDeadlines(!showDeadlines)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                      <Flame size={16} style={{ color: 'var(--color-error)' }} />
                      Deadline Mendekat
                      <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>({deadlines.length})</span>
                    </span>
                    {showDeadlines ? <ChevronUp size={16} style={{ opacity: 0.5 }} /> : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                  </button>
                  <div style={{ overflow: 'hidden', maxHeight: showDeadlines ? 600 : 0, transition: 'max-height 0.3s ease-in-out' }}>
                    <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {deadlines.slice(0, 6).map((d: any) => {
                        const dueDate = new Date(d.deadline);
                        const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                        const urgencyColor = daysLeft <= 1 ? 'var(--color-error)' : daysLeft <= 3 ? 'var(--color-warning)' : 'var(--color-success)';
                        return (
                          <Link key={d.id} href={`/class/${d.classId}`} style={{ textDecoration: 'none' }}>
                            <Card style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.title}</div>
                                  <div style={{ fontSize: 12, opacity: 0.5 }}>{d.class?.name || d.className}</div>
                                </div>
                                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: urgencyColor, color: '#fff', fontWeight: 600 }}>
                                  {daysLeft <= 0 ? 'Hari ini!' : daysLeft === 1 ? 'Besok' : `${daysLeft} hari`}
                                </span>
                              </div>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════ COLLAPSIBLE: KELAS AKTIF ═══════ */}
              <div style={{ marginBottom: 24 }}>
                <button onClick={() => setShowClasses(!showClasses)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                    <BookOpen size={16} style={{ color: 'rgb(var(--color-primary))' }} />
                    Kelas Aktif
                    <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>({classes.length})</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(var(--color-primary), 0.1)', color: 'rgb(var(--color-primary))', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      + Buat
                    </div>
                    {showClasses ? <ChevronUp size={16} style={{ opacity: 0.5 }} /> : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                  </div>
                </button>

                <div style={{ overflow: 'hidden', maxHeight: showClasses ? 2000 : 0, transition: 'max-height 0.4s ease-in-out' }}>
                  <div style={{ paddingTop: 12 }}>
                    {/* Schedule Upload */}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, border: '1px dashed var(--border-default)', marginBottom: 14, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                        <Sparkles size={14} /> Upload foto KRS → AI buatkan kelas
                      </div>
                      {isParsing ? <Loader2 className="spin" size={16} /> : <Upload size={16} style={{ opacity: 0.5 }} />}
                      <input type="file" accept="image/*" onChange={handleScheduleUpload} style={{ display: 'none' }} disabled={isParsing} />
                    </label>

                    {parseError && <Alert type="error" message={parseError} />}

                    {parsedCourses.length > 0 && (
                      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>Hasil Scan:</span>
                        {parsedCourses.map((course, i) => {
                          const key = `${course.courseName}-${course.day}`;
                          return (
                            <Card key={i} style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{course.courseName}</div>
                                  <div style={{ fontSize: 11, opacity: 0.5 }}>{course.day} · {course.time} · {course.room || '-'}</div>
                                </div>
                                <Button size="sm" variant={createdFromParse[key] ? 'ghost' : 'primary'} disabled={createdFromParse[key]} onClick={() => handleCreateFromParse(course)}>
                                  {createdFromParse[key] ? <Check size={14} /> : <Plus size={14} />}
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {isLoading ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                        {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
                      </div>
                    ) : classes.length === 0 ? (
                      <Card style={{ textAlign: 'center', padding: 20 }}>
                        <BookOpen size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                        <p style={{ opacity: 0.5, fontSize: 13 }}>Belum ada kelas</p>
                      </Card>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                        {classes.map(cls => (
                          <Link key={cls.id} href={`/class/${cls.id}`} style={{ textDecoration: 'none' }}>
                            <Card hoverable style={{ height: '100%', padding: '14px 16px', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%', margin: 0 }}>{cls.name}</h4>
                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: cls.memberRole === 'OWNER' ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)', fontWeight: 600 }}>{cls.memberRole}</span>
                              </div>
                              <div style={{ fontSize: 11, opacity: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {cls.lecturer && <span>👨‍🏫 {cls.lecturer}</span>}
                                {cls.day && <span>📅 {cls.day}{cls.time ? `, ${cls.time}` : ''}</span>}
                              </div>
                              {cls.memberRole === 'OWNER' && (
                                <button onClick={(e) => handleDeleteClass(cls.id, e)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.2, padding: 2 }}>
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Kelas Baru">
        <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {createError && <Alert type="error" message={createError} />}
          <input className="input" placeholder="Nama mata kuliah" value={newClassName} onChange={e => setNewClassName(e.target.value)} required />
          <textarea className="input" placeholder="Deskripsi (opsional)" value={newClassDesc} onChange={e => setNewClassDesc(e.target.value)} rows={2} />
          <Button type="submit" disabled={isCreating}>{isCreating ? <Loader2 className="spin" size={16} /> : 'Buat Kelas'}</Button>
        </form>
      </Modal>
    </AuthGuard>
  );
}
