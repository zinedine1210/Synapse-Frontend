'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, useToast, PullToRefresh, BottomSheet, TagInput, TextInput, SelectOption, UserAvatar } from '@/components/ui';
import { stripMarkdown } from '@/components/ui/MarkdownRenderer';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor').then(m => ({ default: m.RichTextEditor })), { ssr: false });
import { qnaService, QnaQuestion, QnaPaginated, UserReputation, SimilarQuestion, LeaderboardEntry } from '@/services/qnaService';
import { useCache, setCache } from '@/lib/cache';
import { useDebounce } from '@/lib/useDebounce';
import { Plus, Loader2, MessageSquare, CheckCircle, Search, Award, Clock, User as UserIcon, Hash, Eye, HelpCircle, Flame, Sparkles, Zap, Bookmark, ThumbsUp, Trophy } from 'lucide-react';

const QNA_CATEGORIES = [
  { id: 'semua', label: 'Semua', emoji: '🌐', color: '#6366f1' },
  { id: 'akademik', label: 'Akademik', emoji: '📚', color: '#3b82f6' },
  { id: 'pemrograman', label: 'Pemrograman', emoji: '💻', color: '#10b981' },
  { id: 'matematika', label: 'Matematika', emoji: '📐', color: '#f59e0b' },
  { id: 'sains', label: 'Sains', emoji: '🔬', color: '#8b5cf6' },
  { id: 'bahasa', label: 'Bahasa', emoji: '📝', color: '#ec4899' },
  { id: 'karir', label: 'Karir', emoji: '💼', color: '#14b8a6' },
  { id: 'lainnya', label: 'Lainnya', emoji: '💬', color: '#6b7280' },
];

const MIN_BODY_LEN = 20;

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari`;
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** Plain-text preview from markdown/HTML body for cards. */
function toPreview(text: string): string {
  return stripMarkdown(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}


export default function QnaPage() {
  useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'terbaru' | 'trending' | 'mine' | 'bookmarks'>('terbaru');
  const [selectedCategory, setSelectedCategory] = useState('semua');

  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { data: reputation } = useCache<UserReputation>('qna:reputation', () => qnaService.getReputation());
  const { data: leaderboard } = useCache<LeaderboardEntry[]>('qna:leaderboard', () => qnaService.getWeeklyLeaderboard());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [page, setPage] = useState(1);
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([]);

  // Cache key for the current view — allows instant data on navigation back
  const cacheKey = `qna:questions:${tab}:${selectedCategory}:${debouncedSearch || '_'}`;
  const { data: cachedQuestions } = useCache<{ questions: QnaQuestion[]; totalPages: number; total: number }>(
    cacheKey,
    null, // no auto-fetch — we fetch manually to handle append/pagination
    { revalidateOnMount: false }
  );

  // Hydrate from cache on mount / tab change — show stale data instantly
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (cachedQuestions && questions.length === 0 && loading) {
      setQuestions(cachedQuestions.questions);
      setTotalPages(cachedQuestions.totalPages);
      setTotal(cachedQuestions.total);
      setLoading(false);
      hydratedRef.current = true;
    }
  }, [cachedQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showAskModal, setShowAskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [askForm, setAskForm] = useState({ title: '', body: '', category: '' });
  const [askTags, setAskTags] = useState<string[]>([]);
  const [askBodyError, setAskBodyError] = useState('');
  const debouncedTitle = useDebounce(askForm.title, 500);

  // Duplicate detection — fetch similar questions as user types title
  useEffect(() => {
    if (debouncedTitle.length < 10) { setSimilarQuestions([]); return; }
    qnaService.findSimilarQuestions(debouncedTitle).then(setSimilarQuestions).catch(() => {});
  }, [debouncedTitle]);

  // Pick up ?search= deep-links from detail page tag clicks (e.g. /qna?search=java).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) setSearch(q);
  }, []);

  // Fetch questions for the current tab & page
  const fetchQuestions = useCallback(async (pageNum: number, append: boolean = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      if (tab === 'bookmarks') {
        const bookmarked = await qnaService.getBookmarks();
        const list = Array.isArray(bookmarked) ? bookmarked : [];
        setQuestions(list);
        setTotalPages(1);
        setTotal(list.length);
        setCache(cacheKey, { questions: list, totalPages: 1, total: list.length });
        return;
      }

      if (tab === 'mine') {
        const all = await qnaService.getMyQuestions();
        // Backend returns { data, total, ... } or array — normalize
        const list = Array.isArray(all) ? all : (all as any).data ?? [];
        let filtered = list;
        if (selectedCategory !== 'semua') filtered = filtered.filter((q: any) => q.category?.includes(selectedCategory));
        if (debouncedSearch) {
          const s = debouncedSearch.toLowerCase();
          filtered = filtered.filter((q: any) =>
            q.title.toLowerCase().includes(s) ||
            (q.body || '').toLowerCase().includes(s) ||
            q.tags?.some((t: string) => t.toLowerCase().includes(s))
          );
        }
        setQuestions(filtered);
        setTotalPages(1);
        setTotal(filtered.length);
        setCache(cacheKey, { questions: filtered, totalPages: 1, total: filtered.length });
        return;
      }

      let res: QnaPaginated;
      if (tab === 'trending') {
        res = await qnaService.getTrendingQuestions({ page: pageNum, limit: 15 });
      } else {
        const params: any = { search: debouncedSearch || undefined, page: pageNum, limit: 15 };
        if (selectedCategory !== 'semua') params.category = selectedCategory;
        res = await qnaService.getQuestions(params);
      }

      if (append) {
        setQuestions(prev => {
          const newList = [...prev, ...res.questions];
          setCache(cacheKey, { questions: newList, totalPages: res.totalPages, total: res.total });
          return newList;
        });
      } else {
        setQuestions(res.questions);
        setCache(cacheKey, { questions: res.questions, totalPages: res.totalPages, total: res.total });
      }
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, selectedCategory, tab, showToast, cacheKey]);

  // Reset and fetch when tab, search, or category changes
  useEffect(() => {
    setPage(1);
    fetchQuestions(1, false);
  }, [tab, debouncedSearch, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load more for infinite scroll (paginated tabs only)
  const handleLoadMore = useCallback(() => {
    if (loadingMore || page >= totalPages || tab === 'mine' || tab === 'bookmarks') return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuestions(nextPage, true);
  }, [page, totalPages, loadingMore, fetchQuestions, tab]);

  const hasMore = tab !== 'mine' && tab !== 'bookmarks' && page < totalPages;

  const bodyPlainLen = askForm.body.replace(/<[^>]+>/g, '').trim().length;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askForm.title.trim()) return;

    // Anti-spam: validate body length if body is provided
    if (askForm.body.trim()) {
      const plainText = askForm.body.replace(/<[^>]+>/g, '').trim();
      if (plainText.length < MIN_BODY_LEN) {
        setAskBodyError(`Detail pertanyaan minimal ${MIN_BODY_LEN} karakter`);
        return;
      }
    }
    setAskBodyError('');

    setSubmitting(true);
    try {
      await qnaService.createQuestion({
        title: askForm.title,
        body: askForm.body || undefined,
        tags: askTags.length ? askTags : undefined,
        category: askForm.category ? [askForm.category] : undefined,
      });
      showToast('Pertanyaan udah dipost! 🎉', 'success');
      // XP notification for creating a question
      setTimeout(() => showToast('+5 XP buat pertanyaan baru! ⭐', 'success'), 800);
      setShowAskModal(false);
      setAskForm({ title: '', body: '', category: '' });
      setAskTags([]);
      setTab('terbaru');
      setPage(1);
      fetchQuestions(1, false);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const trendingTags = useMemo(() => {
    if (!questions.length) return [];
    const tagCount: Record<string, number> = {};
    questions.forEach(q => q.tags?.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
  }, [questions]);

  // Stats
  const totalAnswered = questions.filter(q => q.status === 'answered').length;
  const totalQuestions = total;

  const openAsk = () => { setAskBodyError(''); setShowAskModal(true); };

  return (
    <AuthGuard requiredFeature="qna_public">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <PullToRefresh onRefresh={() => { setPage(1); return fetchQuestions(1, false); }}>

            {/* 3-column layout */}
            <div
              className="qna-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '230px 1fr 270px',
                gap: 24,
                maxWidth: 1240,
                margin: '0 auto',
                paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)',
              }}
            >

              {/* ── LEFT SIDEBAR ── */}
              <aside className="qna-sidebar-left" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                {/* Quick Stats */}
                <div style={{ padding: '16px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, transparent 100%)', border: '1px solid rgba(var(--color-primary), 0.1)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{totalQuestions}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>Pertanyaan</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-success)' }}>{totalAnswered}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>Terjawab</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                        <Zap size={14} style={{ color: '#f59e0b' }} fill="#f59e0b" />{reputation?.score ?? 0}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>XP Kamu</div>
                    </div>
                  </div>
                  {reputation && (
                    <>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(var(--color-primary), 0.12)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((reputation.score % 100), 100)}%`, borderRadius: 3, background: 'linear-gradient(90deg, rgb(var(--color-primary)), #f59e0b)', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ fontSize: 9, opacity: 0.4, marginTop: 5, textAlign: 'right' }}>
                        {100 - (reputation.score % 100)} XP ke level berikutnya
                      </div>
                    </>
                  )}
                </div>

                {/* Categories */}
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 8 }}>Kategori</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {QNA_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: selectedCategory === cat.id ? `${cat.color}18` : 'transparent',
                          color: selectedCategory === cat.id ? cat.color : 'inherit',
                          fontWeight: selectedCategory === cat.id ? 700 : 400,
                          fontSize: 13, transition: 'all 0.2s', textAlign: 'left', width: '100%',
                        }}
                      >
                        <span>{cat.emoji}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reputation */}
                {reputation && reputation.score > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10 }}>Reputasimu</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Award size={14} style={{ color: '#f59e0b' }} />
                        </div>
                        <div><strong>{reputation.score}</strong> <span style={{ opacity: 0.4 }}>poin</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={14} style={{ color: '#10b981' }} />
                        </div>
                        <div><strong>{reputation.answersApproved}</strong> <span style={{ opacity: 0.4 }}>approved</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HelpCircle size={14} style={{ color: '#6366f1' }} />
                        </div>
                        <div><strong>{reputation.questionsAsked}</strong> <span style={{ opacity: 0.4 }}>pertanyaan</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </aside>

              {/* ── CENTER: Feed ── */}
              <main style={{ minWidth: 0 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>Ruang Tanya</h1>
                    <p style={{ fontSize: 13, opacity: 0.45, marginTop: 2 }}>Tanya, jawab, bantu sesama — saling carry! 🤝</p>
                  </div>
                  <Button onClick={openAsk} size="sm" style={{ borderRadius: 12, flexShrink: 0 }}><Plus size={14} /> Tanya</Button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <TextInput placeholder="Cari pertanyaan, tag, atau topik..." value={search} onChange={v => { setSearch(v); setPage(1); }} leftIcon={<Search size={16} />} />
                </div>

                {/* Tab Pills */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: 'var(--input-bg)', width: 'fit-content' }}>
                  {[
                    { key: 'terbaru', label: 'Terbaru' },
                    { key: 'trending', label: 'Trending' },
                    { key: 'mine', label: 'Milikku' },
                    { key: 'bookmarks', label: 'Bookmark' },
                  ].map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key as any); setPage(1); }} style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: tab === t.key ? 'var(--card-bg)' : 'transparent',
                      color: tab === t.key ? 'rgb(var(--color-primary))' : 'inherit',
                      boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                    }}>{t.label}</button>
                  ))}
                </div>

                {/* Mobile category filter — visible only on mobile where sidebar is hidden */}
                <div className="qna-mobile-cat-filter" style={{ display: 'none', marginBottom: 14 }}>
                  <SelectOption
                    value={selectedCategory}
                    onChange={v => { setSelectedCategory(v); setPage(1); }}
                    options={QNA_CATEGORIES.map(cat => ({ value: cat.id, label: `${cat.emoji} ${cat.label}` }))}
                  />
                </div>

                {/* Question Feed with Infinite Scroll */}
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 150, borderRadius: 16 }} />)}
                  </div>
                ) : questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 48 }}>
                    <HelpCircle size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                    <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>
                      {tab === 'mine' ? 'Belum ada pertanyaan dari kamu nih' : 'Belum ada pertanyaan, jadi yang pertama! 🚀'}
                    </p>
                    <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>
                      {tab === 'mine' ? 'Ajukan pertanyaan pertamamu dan raih +5 XP!' : 'Jadi yang pertama bertanya!'}
                    </p>
                    <Button onClick={openAsk} size="sm" style={{ marginTop: 16, borderRadius: 10 }}>
                      <Plus size={14} /> Ajukan Pertanyaan
                    </Button>
                  </div>
                ) : (
                  <InfiniteScroll
                    onLoadMore={handleLoadMore}
                    loading={loadingMore}
                    hasMore={hasMore}
                    threshold={200}
                    endMessage={
                      <p style={{ fontSize: 13, opacity: 0.4, textAlign: 'center', padding: '12px 0' }}>
                        Semua pertanyaan sudah ditampilkan ✓
                      </p>
                    }
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {questions.map((q, idx) => {
                        const answerCount = q._count?.answers ?? q.answers?.length ?? 0;
                        const isAnswered = q.status === 'answered';
                        const topAnswer = q.answers?.find(a => a.isApprovedByAsker) || q.answers?.[0];
                        const bodyPreview = q.body ? toPreview(q.body) : '';
                        return (
                          <article
                            key={q.id}
                            onClick={() => router.push(`/qna/${q.slug}`)}
                            className="hover-lift qna-card"
                            style={{
                              position: 'relative',
                              padding: '18px 20px 18px 22px',
                              borderRadius: 16,
                              background: 'var(--card-bg)',
                              border: isAnswered ? '1px solid rgba(var(--color-success), 0.25)' : '1px solid var(--border-default)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              overflow: 'hidden',
                              animation: `fadeSlideIn 0.3s ease-out ${Math.min(idx, 8) * 0.03}s both`,
                            }}
                          >
                            {/* Accent strip for answered questions */}
                            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: isAnswered ? 'var(--color-success)' : 'transparent' }} />

                            <div style={{ display: 'flex', gap: 14 }}>
                              {/* Stat column */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 52, paddingTop: 2 }} className="qna-card-stats">
                                <button
                                  onClick={(e) => { e.stopPropagation(); qnaService.upvoteQuestion(q.id).then(() => { setQuestions(prev => prev.map(p => p.id === q.id ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p)); }).catch(() => {}); }}
                                  style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                  title="Upvote pertanyaan"
                                >
                                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, color: (q.upvotes || 0) > 0 ? 'rgb(var(--color-primary))' : 'inherit', opacity: (q.upvotes || 0) > 0 ? 1 : 0.3 }}>
                                    <ThumbsUp size={14} style={{ marginBottom: 2 }} />
                                    <div>{q.upvotes || 0}</div>
                                  </div>
                                </button>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, color: answerCount > 0 ? 'rgb(var(--color-primary))' : 'inherit', opacity: answerCount > 0 ? 1 : 0.3 }}>
                                    {answerCount}
                                  </div>
                                  <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                                    <MessageSquare size={9} /> jwb
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.45, lineHeight: 1 }}>{q.viewCount}</div>
                                  <div style={{ fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                                    <Eye size={9} /> views
                                  </div>
                                </div>
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Author row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <UserAvatar name={q.user.fullName} avatarUrl={q.user.avatarUrl} size={28} />
                                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.user.fullName}</span>
                                  <span style={{ fontSize: 11, opacity: 0.35, flexShrink: 0 }}>· {timeAgo(q.createdAt)}</span>
                                  {isAnswered && (
                                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(var(--color-success), 0.12)', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto', flexShrink: 0 }}>
                                      <CheckCircle size={10} /> Terjawab
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h3 style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 5, lineHeight: 1.4 }}>{q.title}</h3>

                                {/* Body preview */}
                                {bodyPreview && (
                                  <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {bodyPreview}
                                  </p>
                                )}

                                {/* Top answer preview */}
                                {topAnswer && (
                                  <div style={{
                                    padding: '8px 12px', borderRadius: 10, marginBottom: 10,
                                    background: 'rgba(var(--color-primary), 0.04)', borderLeft: '3px solid rgba(var(--color-primary), 0.4)',
                                    fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                  }}>
                                    <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                                      {topAnswer.isApprovedByAsker ? '✅ Jawaban terbaik: ' : '💡 Jawaban teratas: '}
                                    </span>
                                    <span style={{ opacity: 0.65 }}>{toPreview(topAnswer.body)}</span>
                                  </div>
                                )}

                                {/* Tags + category */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                  {q.category?.map(c => {
                                    const catInfo = QNA_CATEGORIES.find(cat => cat.id === c);
                                    return catInfo ? (
                                      <span key={c} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: `${catInfo.color}18`, color: catInfo.color, fontWeight: 700 }}>
                                        {catInfo.emoji} {catInfo.label}
                                      </span>
                                    ) : null;
                                  })}
                                  {q.tags?.slice(0, 3).map(t => (
                                    <span key={t} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(var(--color-primary), 0.06)', color: 'rgb(var(--color-primary))', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Hash size={9} />{t}</span>
                                  ))}
                                  {q.tags && q.tags.length > 3 && <span style={{ fontSize: 10, opacity: 0.35 }}>+{q.tags.length - 3}</span>}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </InfiniteScroll>
                )}
              </main>

              {/* ── RIGHT SIDEBAR ── */}
              <aside className="qna-sidebar-right" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                {/* Ask CTA */}
                <div style={{
                  padding: '16px 18px', borderRadius: 16, marginBottom: 16,
                  background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.1) 0%, rgba(var(--color-primary), 0.02) 100%)',
                  border: '1px solid rgba(var(--color-primary), 0.12)',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={15} style={{ color: 'rgb(var(--color-primary))' }} /> Punya pertanyaan?</h3>
                  <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, lineHeight: 1.4 }}>Komunitas siap membantu. Ajukan pertanyaan dan dapatkan jawaban berkualitas.</p>
                  <Button onClick={openAsk} size="sm" style={{ width: '100%', borderRadius: 10, fontSize: 12, justifyContent: 'center' }}>
                    <Plus size={13} /> Ajukan Pertanyaan
                  </Button>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                    <Zap size={10} style={{ color: '#f59e0b' }} fill="#f59e0b" /> Dapatkan +5 XP setiap bertanya
                  </div>
                </div>

                {/* Trending Tags */}
                <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={12} /> Trending
                  </h3>
                  {trendingTags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {trendingTags.map(({ tag, count }) => (
                        <button key={tag} onClick={() => { setSearch(tag); setPage(1); }} style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 20,
                          background: 'rgba(var(--color-primary), 0.06)', color: 'rgb(var(--color-primary))', fontWeight: 500,
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, transition: 'all 0.2s',
                        }} className="hover-lift">
                          <Hash size={10} />{tag} <span style={{ opacity: 0.35, fontSize: 10 }}>{count}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, opacity: 0.35 }}>Belum ada tag trending.</p>
                  )}
                </div>

                {/* Weekly Leaderboard */}
                <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Trophy size={12} /> Leaderboard Minggu Ini
                  </h3>
                  {leaderboard && leaderboard.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {leaderboard.map((entry, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, fontSize: 11, fontWeight: 800, color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'inherit', opacity: i >= 3 ? 0.4 : 1 }}>
                            {i + 1}
                          </div>
                          <UserAvatar name={entry.user.fullName} avatarUrl={entry.user.avatarUrl} size={28} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user.fullName}</div>
                            <div style={{ fontSize: 10, opacity: 0.4 }}>{entry.answersCount} jawaban · {entry.approvedCount} approved</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, opacity: 0.35 }}>Belum ada kontributor minggu ini.</p>
                  )}
                </div>
              </aside>

            </div>

            {/* Ask question — BottomSheet (mobile sheet, desktop modal) */}
            <BottomSheet isOpen={showAskModal} onClose={() => setShowAskModal(false)} title="❓ Ajukan Pertanyaan">
              <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* XP reward hint */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Zap size={16} style={{ color: '#f59e0b', flexShrink: 0 }} fill="#f59e0b" />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Posting pertanyaan & dapatkan <span style={{ color: '#f59e0b' }}>+5 XP</span> ✨</span>
                </div>

                {/* Title */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Judul pertanyaan</label>
                  <TextInput
                    placeholder="cth: Gimana cara kerja rekursi di Python?"
                    value={askForm.title}
                    onChange={v => setAskForm({ ...askForm, title: v })}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: 11, opacity: 0.4, marginTop: 5 }}>Tulis spesifik & langsung ke inti — bayangkan kamu lagi nanya ke teman.</p>

                  {/* Duplicate detection */}
                  {similarQuestions.length > 0 && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={11} /> Mungkin sudah pernah ditanyakan:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {similarQuestions.slice(0, 3).map(sq => (
                          <a
                            key={sq.id}
                            href={`/qna/${sq.slug}`}
                            target="_blank"
                            rel="noopener"
                            style={{ fontSize: 12, color: 'rgb(var(--color-primary))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span style={{ opacity: 0.5 }}>→</span> {sq.title}
                            {sq._count?.answers ? <span style={{ fontSize: 10, opacity: 0.5 }}>({sq._count.answers} jawaban)</span> : null}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Detail */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Detail <span style={{ opacity: 0.6, fontWeight: 400 }}>(opsional)</span></label>
                  <RichTextEditor
                    content={askForm.body}
                    onChange={v => {
                      setAskForm({ ...askForm, body: v });
                      if (askBodyError && v.replace(/<[^>]+>/g, '').trim().length >= MIN_BODY_LEN) {
                        setAskBodyError('');
                      }
                    }}
                    placeholder="Jelaskan konteksnya: apa yang sudah kamu coba, error yang muncul, dll..."
                    minHeight={140}
                  />
                  {askBodyError && <p style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{askBodyError}</p>}
                  {/* Character count hint */}
                  {bodyPlainLen > 0 && bodyPlainLen < MIN_BODY_LEN && !askBodyError && (
                    <p style={{ color: 'rgb(var(--text-muted))', fontSize: 11, marginTop: 5 }}>
                      {bodyPlainLen}/{MIN_BODY_LEN} karakter minimum
                    </p>
                  )}
                </div>

                {/* Category chips */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {QNA_CATEGORIES.filter(c => c.id !== 'semua').map(c => {
                      const active = askForm.category === c.id;
                      return (
                        <button key={c.id} type="button" onClick={() => setAskForm({ ...askForm, category: active ? '' : c.id })} style={{
                          padding: '7px 13px', borderRadius: 20, cursor: 'pointer',
                          fontSize: 12.5, fontWeight: active ? 700 : 500,
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: active ? c.color : `${c.color}12`,
                          color: active ? '#fff' : c.color,
                          border: `1px solid ${active ? c.color : 'transparent'}`,
                          transition: 'all 0.2s',
                        }}><span>{c.emoji}</span> {c.label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Tags <span style={{ opacity: 0.6, fontWeight: 400 }}>(opsional)</span></label>
                  <TagInput value={askTags} onChange={setAskTags} placeholder="cth: algoritma, java, database — Enter untuk tambah" maxTags={5} />
                </div>

                <Button type="submit" disabled={submitting || !askForm.title.trim()} style={{ borderRadius: 12, padding: '13px 0', marginTop: 4, justifyContent: 'center', fontSize: 14 }}>
                  {submitting ? <Loader2 className="spin" size={16} style={{ animation: 'spin 1s linear infinite' }} /> : '🚀 Post Pertanyaan'}
                </Button>
              </form>
            </BottomSheet>
            </PullToRefresh>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
