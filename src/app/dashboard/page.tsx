'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useDashboard, useContextualSuggestion } from '@/viewmodels/useDashboard';
import { useDeadlines } from '@/viewmodels/useDeadlines';
import { todoService } from '@/services/todoService';
import { dashboardService, DashboardSummary, TodaysBriefingResponse, ClassComparison, TrendingQuestion, WeeklyChallengeData, AiBriefingResponse } from '@/services/dashboardService';
import { detectDayOfWeekPatterns, DayOfWeekPattern } from '@/services/contextualIntelligence';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { useFeatureAccess } from '@/lib/feature-access';
import { useCache } from '@/lib/cache';
import { useAiJob } from '@/lib/useAiJob';
import { Card, Button, Alert, Modal, useToast, PullToRefresh, AnimatedNumber, TextInput, TextArea, AIPhotoInput } from '@/components/ui';
import { TodaysBriefing, BriefingData } from '@/components/dashboard/TodaysBriefing';
import { AiBriefingCard, AiBriefingSkeleton } from '@/components/dashboard/AiBriefingCard';
import { ContextualBubbles } from '@/components/dashboard/ContextualBubbles';
import { ClassComparisonCard } from '@/components/dashboard/ClassComparisonCard';
import { TrendingQnA } from '@/components/dashboard/TrendingQnA';
import { WeeklyChallengeCard } from '@/components/dashboard/WeeklyChallengeCard';
import { SiBawelAvatar } from '@/components/shared/SiBawelAvatar';
import {
  Plus, BookOpen, Loader2, Check, Sparkles,
  AlertTriangle, Wallet, Target, TreePine,
  CheckSquare, Square, ChevronDown, ChevronUp, Flame, Trophy, ArrowRight,
  Star, Award, MessageCircle, HelpCircle, CalendarDays
} from 'lucide-react';
import { VirtualPetWidget } from '@/components/virtual-pet/VirtualPetWidget';
import { StreakCalendar } from '@/components/gamification/StreakCalendar';

interface ParsedCourse {
  courseName: string;
  day: string;
  time: string;
  room?: string;
  lecturer?: string;
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: `Pagi ${name}! `, emoji: '☀️', sub: 'Gas produktif hari ini! 💪' };
  if (hour >= 11 && hour < 15) return { text: `Sianggg ${name}!`, emoji: '🌤️', sub: 'Jangan skip makan siang ya~' };
  if (hour >= 15 && hour < 18) return { text: `Sore ${name}!`, emoji: '🌅', sub: 'Masih on fire nih 🔥' };
  return { text: `Malam ${name}!`, emoji: '🌙', sub: 'Wrap-up dulu, jangan lembur terus~' };
}

const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const { classes, isLoading, isCreating, createClass } = useDashboard();
  const { deadlines, isLoading: deadlinesLoading } = useDeadlines();
  const { suggestion: contextSuggestion } = useContextualSuggestion();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Cached data — shows stale data instantly on navigation, revalidates in background
  const { data: summary, loading: summaryLoading, revalidate: refetchSummary, mutate: mutateSummary } = useCache<DashboardSummary>('dashboard:summary', () => dashboardService.getSummary());
  const { data: briefing, loading: briefingLoading, revalidate: refetchBriefing } = useCache<TodaysBriefingResponse>('dashboard:briefing', () => dashboardService.getTodaysBriefing());
  const { data: aiBriefingRaw, loading: aiBriefingLoading, revalidate: refetchAiBriefing } = useCache<AiBriefingResponse | { exists: false }>('dashboard:ai-briefing', () => dashboardService.getAiBriefing());
  const aiBriefing = aiBriefingRaw ?? null;
  const [aiBriefingFailed, setAiBriefingFailed] = useState(false);
  const [aiBriefingRefreshing, setAiBriefingRefreshing] = useState(false);

  // AI Job tracking for AI briefing generation
  const aiBriefingJob = useAiJob<AiBriefingResponse>('ai_briefing', {
    onComplete: () => {
      refetchAiBriefing();
      setAiBriefingFailed(false);
      setAiBriefingRefreshing(false);
      showToast('Briefing AI berhasil dibuat! ✨', 'success');
    },
    onError: (err) => {
      setAiBriefingRefreshing(false);
      showToast(err || 'Gagal membuat briefing.', 'error');
    },
  });
  const aiBriefingGenerating = aiBriefingJob.isProcessing || aiBriefingJob.isInitializing;
  const aiBriefingPersisted = aiBriefingJob.result;

  const { data: classComparisonsRaw } = useCache<{ comparisons: ClassComparison[] }>('dashboard:class-comparison', () => dashboardService.getClassComparison());
  const classComparisons = classComparisonsRaw?.comparisons || [];

  const { data: trendingQuestions = [] } = useCache<TrendingQuestion[]>('dashboard:trending-qna', () => dashboardService.getTrendingQna());

  const { data: summaryV2 } = useCache<{ weeklyChallenge: WeeklyChallengeData | null }>('dashboard:summary-v2', () => dashboardService.getSummaryV2());
  const weeklyChallenge = summaryV2?.weeklyChallenge ?? null;

  const [patterns, setPatterns] = useState<DayOfWeekPattern[]>([]);

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
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [createdFromParse, setCreatedFromParse] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Use financial data from summary to build patterns if available
    // In production, this would use the SWR-cached transactions
    // For now, patterns are populated if the contextual intelligence service finds any
    async function loadPatterns() {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch<any>('/duit-tracker/transactions?limit=200');
        const transactions = res?.data || res || [];
        if (Array.isArray(transactions) && transactions.length > 0) {
          const detected = detectDayOfWeekPatterns(transactions);
          setPatterns(detected);
        }
      } catch {
        // Silently fail — patterns are optional enhancement
      }
    }
    loadPatterns();
  }, []);

  const greeting = getGreeting(user?.fullName || 'Sobat');

  const handleRefreshAiBriefing = useCallback(async () => {
    if (aiBriefingGenerating || aiBriefingRefreshing) return;
    setAiBriefingRefreshing(true);
    try {
      await aiBriefingJob.trigger(() => dashboardService.generateAiBriefing());
      refetchAiBriefing();
      setAiBriefingFailed(false);
    } catch (e: any) {
      setAiBriefingRefreshing(false);
      if (!e.message?.includes('sedang memproses')) {
        showToast(e.message || 'Gagal memuat ulang briefing.', 'error');
      }
    }
  }, [showToast, aiBriefingGenerating, aiBriefingRefreshing]);

  const handleGenerateAiBriefing = async () => {
    if (aiBriefingGenerating || aiBriefingRefreshing) return;
    setAiBriefingRefreshing(true);
    try {
      await aiBriefingJob.trigger(() => dashboardService.generateAiBriefing());
      refetchAiBriefing();
      setAiBriefingFailed(false);
    } catch (e: any) {
      setAiBriefingRefreshing(false);
      if (!e.message?.includes('sedang memproses')) {
        showToast(e.message || 'Gagal membuat briefing.', 'error');
      }
    }
  };

  // Build briefing data from API response or fallback to summary data
  const briefingData: BriefingData | null = briefing
    ? briefing
    : summary
    ? {
        schedule: summary.academicSummary?.todaySchedule.map(s => ({
          className: s.className,
          time: s.time,
          room: s.room || undefined,
        })) || [],
        deadlines: summary.deadlines.slice(0, 3).map(d => {
          const dueDate = new Date(d.deadline);
          const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
          return {
            title: d.title,
            className: d.className,
            dueLabel: daysLeft <= 0 ? 'Hari ini' : daysLeft === 1 ? 'Besok' : `${daysLeft} hari lagi`,
          };
        }),
        spendingSummary: summary.financeSummary.expense > 0
          ? { total: summary.financeSummary.expense, topCategory: summary.topBudgetAlert?.category || 'lainnya' }
          : null,
        todos: summary.todoStats,
        contextualTip: contextSuggestion,
      }
    : null;

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newClassName.trim()) { setCreateError('Nama kelas-nya diisi dulu dong!'); return; }
    const res = await createClass(newClassName, newClassDesc);
    if (res.success) { setNewClassName(''); setNewClassDesc(''); setShowCreateModal(false); }
    else { setCreateError(res.error || 'Gagal bikin kelas nih.'); }
  };

  const handleCreateFromParse = async (course: ParsedCourse) => {
    const key = `${course.courseName}-${course.day}`;
    if (createdFromParse[key]) return;
    try {
      const description = `Jadwal: ${course.day}, ${course.time}. Ruang: ${course.room || '-'}. Dosen: ${course.lecturer || '-'}`;
      const res = await createClass(course.courseName, description, { lecturer: course.lecturer, day: course.day, time: course.time, room: course.room });
      if (res.success) { setCreatedFromParse(prev => ({ ...prev, [key]: true })); showToast(`Kelas ${course.courseName} sukses dibikin! 🎉`, 'success'); }
      else { showToast(res.error || 'Gagal nih.', 'error'); }
    } catch { showToast('Ada error nih.', 'error'); }
  };

  const handleQuickTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTodo.trim()) return;
    setAddingTodo(true);
    const tempTitle = quickTodo.trim();
    setQuickTodo('');
    // Optimistic add — create a temporary todo in the summary state immediately
    const tempId = `temp-${Date.now()}`;
    mutateSummary(prev => {
      if (!prev) return prev as unknown as DashboardSummary;
      const tempTodo = { id: tempId, title: tempTitle, status: 'pending' as const, priority: 'medium' as const, dueDate: null, dueTime: null };
      return { ...prev, todosToday: [tempTodo, ...prev.todosToday], todoStats: { ...prev.todoStats, total: prev.todoStats.total + 1 } };
    });
    try {
      const parsed = await todoService.parseNaturalInput(tempTitle);
      const created = await todoService.create({ title: parsed.title || tempTitle, dueDate: parsed.dueDate, dueTime: parsed.dueTime, priority: parsed.priority || 'medium', category: parsed.category });
      showToast('Todo udah masuk! ✅', 'success');
      // Replace temp with real
      mutateSummary(prev => {
        if (!prev) return prev as unknown as DashboardSummary;
        const updated = prev.todosToday.map(t => t.id === tempId ? { ...t, id: created.id, title: created.title } : t);
        return { ...prev, todosToday: updated };
      });
    } catch {
      showToast('Gagal nambahin todo.', 'error');
      // Rollback
      mutateSummary(prev => {
        if (!prev) return prev as unknown as DashboardSummary;
        return { ...prev, todosToday: prev.todosToday.filter(t => t.id !== tempId), todoStats: { ...prev.todoStats, total: Math.max(0, prev.todoStats.total - 1) } };
      });
      setQuickTodo(tempTitle);
    }
    finally { setAddingTodo(false); }
  };

  const handleToggleTodo = async (id: string) => {
    mutateSummary(prev => {
      if (!prev) return prev as unknown as DashboardSummary;
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
            <PullToRefresh onRefresh={async () => {
              await Promise.all([
                refetchSummary(),
                refetchBriefing(),
                refetchAiBriefing(),
              ]);
            }}>
            {/* ═══════ VERTICAL FEED LAYOUT ═══════ */}
            <div className="dashboard-feed" style={{ maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '0 4px', boxSizing: 'border-box' }}>

              {/* ═══════ SECTION 1: GREETING CARD (full-width, prominent) ═══════ */}
              <div className="dashboard-greeting" style={{
                marginBottom: 24,
                padding: '28px 28px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-primary), 0.02) 100%)',
                border: '1px solid rgba(var(--color-primary), 0.1)',
                position: 'relative',
                overflow: 'hidden',
                width: '100%',
              }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, margin: 0 }}>
                    {greeting.emoji} {greeting.text}
                  </h1>
                  <p style={{ fontSize: 14, opacity: 0.7, margin: '6px 0 0' }}>
                    {summary?.aiOneLiner || greeting.sub}
                  </p>
                  {summary?.streakDays != null && summary.streakDays > 0 && (
                    <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(255, 100, 0, 0.1)', fontSize: 13, fontWeight: 600, color: '#ff6400' }}>
                      <span className="streak-fire"><Flame size={14} /></span> {summary.streakDays} hari streak!
                    </div>
                  )}
                </div>
                {/* Decorative gradient orb */}
                <div className="greeting-orb" style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--color-primary), 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              </div>

              {/* ═══════ SECTION 2: TODAY'S BRIEFING (AI-powered) ═══════ */}
              {hasFeature('daily_briefing') && (
                aiBriefingGenerating ? (
                  <div>
                    {aiBriefingPersisted && <AiBriefingCard briefing={aiBriefingPersisted} onRefresh={handleRefreshAiBriefing} isRefreshing={false} />}
                    <AiBriefingSkeleton />
                  </div>
                ) : aiBriefingLoading ? (
                  <AiBriefingSkeleton />
                ) : (aiBriefing && (aiBriefing as any).exists !== false) ? (
                  <AiBriefingCard
                    briefing={aiBriefing as AiBriefingResponse}
                    onRefresh={handleRefreshAiBriefing}
                    isRefreshing={aiBriefingRefreshing}
                  />
                ) : (aiBriefingPersisted) ? (
                  <div>
                    <AiBriefingCard briefing={aiBriefingPersisted} onRefresh={handleRefreshAiBriefing} isRefreshing={aiBriefingRefreshing} />
                    <div className="ai-briefing-cta" style={{
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '20px',
                      marginBottom: '24px',
                      padding: '24px',
                      background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-accent-purple), 0.05) 100%)',
                      border: '1px solid rgba(var(--color-primary), 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '16px'
                    }}>
                      <Button
                        type="button"
                        onClick={handleGenerateAiBriefing}
                        disabled={aiBriefingGenerating || aiBriefingRefreshing}
                        className="flex items-center gap-2 border border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 text-indigo-700 font-medium py-2 px-4 rounded-xl shadow-md hover:shadow-lg active:scale-95"
                      >
                        {(aiBriefingGenerating || aiBriefingRefreshing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                        <span>{(aiBriefingGenerating || aiBriefingRefreshing) ? 'Memproses...' : 'Update Briefing AI 🔄'}</span>
                      </Button>
                    </div>
                  </div>
                ) : (aiBriefing && (aiBriefing as any).exists === false) ? (
                  <div className="ai-briefing-cta" style={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '20px',
                    marginBottom: '24px',
                    padding: '24px',
                    background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-accent-purple), 0.05) 100%)',
                    border: '1px solid rgba(var(--color-primary), 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '16px'
                  }}>
                    <SiBawelAvatar size="dashboard" />
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Mau di-brief Si Bawel? 🗣️</h3>
                      <p style={{ fontSize: '13px', opacity: 0.7, maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
                        Cek jadwal kuliah, tugas deadline, sisa duit, sampe tips belajar — semua dirangkum AI buat lo!
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleGenerateAiBriefing}
                      disabled={aiBriefingGenerating || aiBriefingRefreshing}
                      className="flex items-center gap-2 border border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 text-indigo-700 font-medium py-2 px-4 rounded-xl shadow-md hover:shadow-lg active:scale-95"
                    >
                      {(aiBriefingGenerating || aiBriefingRefreshing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                      <span>{(aiBriefingGenerating || aiBriefingRefreshing) ? 'Memproses...' : 'Gas Briefing AI 🚀'}</span>
                    </Button>
                  </div>
                ) : aiBriefingFailed && briefingData ? (
                  /* Fallback to the rule-based briefing if the AI request failed */
                  <TodaysBriefing data={briefingData} isLoading={briefingLoading && summaryLoading} />
                ) : null
              )}

              {/* ═══════ SECTION 3: SI BAWEL CONTEXTUAL BUBBLES ═══════ */}
              {patterns.length > 0 && hasFeature('si_bawel') && (
                <ContextualBubbles patterns={patterns} />
              )}

              {/* ═══════ SECTION 4: QUICK ACTIONS ═══════ */}
              <div className="dashboard-quick-actions" style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {[
                  { label: 'Scan Struk', icon: '📸', href: '/duit-tracker', feature: 'receipt_scanner' },
                  { label: 'Catat', icon: '💸', href: '/duit-tracker', feature: 'duit_tracker' },
                  { label: 'Todo', icon: '✅', href: '/todos', feature: 'todo_list' },
                  { label: 'Q&A', icon: '❓', href: '/qna', feature: 'qna_public' },
                  { label: 'Kelas', icon: '📚', href: '/classes', feature: 'class' },
                  { label: 'Split Bill', icon: '🧾', href: '/split-bill', feature: 'split_bill' },
                  { label: 'Makan', icon: '🍜', href: '/makan', feature: 'food_recommend' },
                  { label: 'Insight', icon: '💡', href: '/insight', feature: 'ai_insight' },
                ].filter(a => hasFeature(a.feature)).map(action => (
                  <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                    <div className="quick-action-chip" style={{ padding: '10px 18px', borderRadius: 12, background: 'var(--card-bg)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 500 }}>
                      <span style={{ fontSize: 16 }}>{action.icon}</span> {action.label}
                    </div>
                  </Link>
                ))}
              </div>

              {/* ═══════ SECTION 5: KEUANGAN SNAPSHOT ═══════ */}
              {hasFeature('duit_tracker') && (
              <Card style={{ marginBottom: 16 }}>
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
                    <div className="finance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Pemasukan</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success)' }}>
                          <AnimatedNumber value={summary.financeSummary.income} prefix="Rp" countUp duration={800} />
                        </div>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Pengeluaran</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-error)' }}>
                          <AnimatedNumber value={summary.financeSummary.expense} prefix="Rp" countUp duration={800} />
                        </div>
                      </div>
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2 }}>Saldo</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>
                          <AnimatedNumber value={summary.financeSummary.balance} prefix="Rp" countUp duration={800} />
                        </div>
                      </div>
                    </div>

                    {summary.topBudgetAlert && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: summary.topBudgetAlert.percentage > 90 ? 'rgba(var(--color-error), 0.06)' : 'rgba(var(--color-warning), 0.06)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Target size={13} style={{ flexShrink: 0 }} />
                        <span>Budget <strong style={{ textTransform: 'capitalize' }}>{summary.topBudgetAlert.category}</strong>: {summary.topBudgetAlert.percentage}% terpakai</span>
                      </div>
                    )}

                    {summary.trees && summary.trees.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.trees.map((tree, idx) => (
                          <div key={idx} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TreePine size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                            <span style={{ opacity: 0.7, minWidth: 80 }}>{tree.name}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(tree.progress, 100)}%`, background: 'rgb(var(--color-success))', borderRadius: 3, transition: 'width 0.6s ease' }} />
                            </div>
                            <span style={{ fontWeight: 600, opacity: 0.7, minWidth: 35 }}>{tree.progress}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Si Bawel inline bubble */}
                    {summary.bawelBubble && hasFeature('si_bawel') && (
                      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--color-primary), 0.04)', border: '1px solid rgba(var(--color-primary), 0.08)', fontSize: 13, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <SiBawelAvatar size="inline" />
                        <span style={{ fontStyle: 'italic', opacity: 0.85 }}>{summary.bawelBubble}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, opacity: 0.4, fontSize: 13 }}>
                    <Wallet size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                    Mulai catat keuanganmu yuk!
                  </div>
                )}
              </Card>
              )}

              {/* ═══════ SECTION 6: TODO HARI INI ═══════ */}
              {hasFeature('todo_list') && (
              <Card style={{ marginBottom: 16 }}>
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
                    Gak ada todo hari ini 🎉
                  </div>
                )}

                {/* Quick Add Todo — conversational prompt */}
                <form onSubmit={handleQuickTodo} style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <TextInput placeholder='Mau catat apa?' value={quickTodo} onChange={setQuickTodo} />
                  </div>
                  {quickTodo && (
                    <Button size="sm" type="submit" disabled={addingTodo} style={{ padding: '6px 10px' }}>
                      {addingTodo ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
                    </Button>
                  )}
                </form>
              </Card>
              )}

              {/* ═══════ SECTION 7: RINGKASAN AKADEMIK ═══════ */}
              {summary?.academicSummary && hasFeature('class') && (
                <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
                    <BookOpen size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Ringkasan Akademik
                  </h3>
                  <div className="academic-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: summary.academicSummary.todaySchedule.length > 0 ? 16 : 0 }}>
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

              {/* ═══════ SECTION 8: GAMIFIKASI ═══════ */}
              {hasFeature('gamification') && summary?.gamification && (
                <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <Trophy size={16} style={{ color: '#f59e0b' }} /> Level {summary.gamification.level}: {summary.gamification.levelTitle}
                    </h3>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>
                      {summary.gamification.currentXp}{summary.gamification.nextLevelXp ? `/${summary.gamification.nextLevelXp}` : ''} XP
                    </span>
                  </div>
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
                      <span className="streak-fire"><Flame size={14} style={{ color: '#ff6400' }} /></span> {summary.gamification.currentStreak} hari streak
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

              {/* ═══════ SECTION 9: VIRTUAL PET + STREAK CALENDAR ═══════ */}
              {hasFeature('gamification') && summary?.gamification && (
                <>
                  <VirtualPetWidget
                    status={{
                      name: 'Oren',
                      streakDays: summary.gamification.currentStreak || 0,
                      underBudget: true,
                      daysSinceLastLog: 0,
                      level: summary.gamification.level || 1,
                    }}
                    compact={false}
                  />
                  <div style={{ marginTop: 16 }}>
                    <StreakCalendar
                      activityMap={{}}
                      currentStreak={summary.gamification.currentStreak || 0}
                      longestStreak={summary.gamification.longestStreak || 0}
                    />
                  </div>
                </>
              )}

              {/* ═══════ SECTION 10: SOCIAL PROOF — CLASS COMPARISON ═══════ */}
              {hasFeature('dashboard_class_comparison') && <ClassComparisonCard comparisons={classComparisons} />}

              {/* ═══════ SECTION 10: SOCIAL PROOF — TRENDING Q&A ═══════ */}
              {hasFeature('dashboard_trending_qna') && <TrendingQnA questions={trendingQuestions} />}

              {/* ═══════ SECTION 11: SOCIAL PROOF — WEEKLY CHALLENGE ═══════ */}
              {hasFeature('gamification_streak') && weeklyChallenge && <WeeklyChallengeCard challenge={weeklyChallenge} />}

              {/* ═══════ SECTION 12: COLLAPSIBLE DEADLINES ═══════ */}
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

              {/* ═══════ SECTION 10: COLLAPSIBLE KELAS AKTIF ═══════ */}
              <div style={{ marginBottom: 24 }}>
                <button onClick={() => setShowClasses(!showClasses)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-default)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
                    <BookOpen size={16} style={{ color: 'rgb(var(--color-primary))' }} />
                    Kelas Aktif
                    <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 400 }}>({classes.length})</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(var(--color-primary), 0.1)', color: 'rgb(var(--color-primary))', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      + Bikin
                    </div>
                    {showClasses ? <ChevronUp size={16} style={{ opacity: 0.5 }} /> : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                  </div>
                </button>

                <div style={{ overflow: 'hidden', maxHeight: showClasses ? 2000 : 0, transition: 'max-height 0.4s ease-in-out' }}>
                  <div style={{ paddingTop: 12 }}>
                    {/* AI KRS Importer - Revamped */}
                    {hasFeature('schedule_parser') && (
                      <div className="krs-importer-card" style={{
                        padding: '20px',
                        borderRadius: 18,
                        background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.06) 0%, rgba(168, 85, 247, 0.04) 50%, rgba(236, 72, 153, 0.03) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.12)',
                        marginBottom: 16,
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Background decoration */}
                        <div style={{
                          position: 'absolute', top: -20, right: -20, width: 100, height: 100,
                          borderRadius: '50%', background: 'rgba(99, 102, 241, 0.05)',
                          filter: 'blur(20px)', pointerEvents: 'none',
                        }} />
                        <div style={{
                          position: 'absolute', bottom: -15, left: -15, width: 80, height: 80,
                          borderRadius: '50%', background: 'rgba(168, 85, 247, 0.04)',
                          filter: 'blur(16px)', pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.12))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 20,
                            }}>
                              📋
                            </div>
                            <div>
                              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>AI KRS Importer</h4>
                              <p style={{ fontSize: 11.5, opacity: 0.55, margin: '2px 0 0' }}>Foto KRS-mu, auto jadi kelas!</p>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex', gap: 8, flexWrap: 'wrap',
                          }}>
                            <AIPhotoInput
                              mode="schedule"
                              onExtracted={(result) => {
                                setParsedCourses(result);
                              }}
                              label="Upload KRS"
                            />
                          </div>

                          <div style={{
                            marginTop: 12, display: 'flex', gap: 12, fontSize: 10.5, opacity: 0.45,
                          }}>
                            <span>✨ Gemini AI</span>
                            <span>•</span>
                            <span>Foto / Screenshot KRS</span>
                            <span>•</span>
                            <span>Auto-create kelas 🚀</span>
                          </div>
                        </div>
                      </div>
                    )}

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
                        <p style={{ opacity: 0.5, fontSize: 13 }}>Belum ada kelas nih</p>
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
                            </Card>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
            </PullToRefresh>
          </div>
        </div>
      </div>

      {/* Create Class Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Bikin Kelas Baru">
        <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {createError && <Alert type="error" message={createError} />}
          <TextInput label="Nama Kelas" value={newClassName} onChange={setNewClassName} placeholder="Nama mata kuliah" required />
          <TextArea placeholder="Deskripsi (opsional)" value={newClassDesc} onChange={setNewClassDesc} rows={2} />
          <Button type="submit" disabled={isCreating}>{isCreating ? <Loader2 className="spin" size={16} /> : 'Bikin Kelas'}</Button>
        </form>
      </Modal>

      <style jsx>{`
        /* Account for the fixed bottom nav on mobile so content isn't hidden */
        .dashboard-feed {
          padding-bottom: 8px;
        }
        @media (max-width: 767.98px) {
          .dashboard-feed {
            padding-bottom: calc(var(--bottom-nav-height, 60px) + env(safe-area-inset-bottom, 0px) + 24px);
          }
        }
      `}</style>
    </AuthGuard>
  );
}
