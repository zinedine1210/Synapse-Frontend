'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Modal, useToast } from '@/components/ui';
import { qnaService, QnaQuestion, QnaPaginated, UserReputation } from '@/services/qnaService';
import { Plus, Loader2, MessageSquare, ThumbsUp, CheckCircle, Search, Award, TrendingUp, Clock, User as UserIcon, Hash, Eye, HelpCircle, Flame, Star, Share2 } from 'lucide-react';

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

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari`;
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function QnaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'terbaru' | 'trending' | 'mine'>('terbaru');
  const [selectedCategory, setSelectedCategory] = useState('semua');

  const [data, setData] = useState<QnaPaginated | null>(null);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showAskModal, setShowAskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [askForm, setAskForm] = useState({ title: '', body: '', tags: '', category: '' });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { search: search || undefined, page, limit: 15 };
      if (selectedCategory !== 'semua') params.category = selectedCategory;
      const res = await qnaService.getQuestions(params);
      setData(res);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [search, page, selectedCategory]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);
  useEffect(() => { qnaService.getReputation().then(setReputation).catch(() => {}); }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askForm.title.trim()) return;
    setSubmitting(true);
    try {
      await qnaService.createQuestion({
        title: askForm.title,
        body: askForm.body || undefined,
        tags: askForm.tags ? askForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        category: askForm.category ? [askForm.category] : undefined,
      });
      showToast('Pertanyaan berhasil diposting! 🎉', 'success');
      setShowAskModal(false); setAskForm({ title: '', body: '', tags: '', category: '' });
      fetchQuestions();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const trendingTags = useMemo(() => {
    if (!data?.questions) return [];
    const tagCount: Record<string, number> = {};
    data.questions.forEach(q => q.tags?.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
  }, [data]);

  const topContributors = useMemo(() => {
    if (!data?.questions) return [];
    const contribs: Record<string, { name: string; count: number }> = {};
    data.questions.forEach(q => {
      q.answers?.forEach(a => {
        if (!contribs[a.user.id]) contribs[a.user.id] = { name: a.user.fullName, count: 0 };
        contribs[a.user.id].count += 1;
      });
    });
    return Object.values(contribs).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [data]);

  // Stats
  const totalAnswered = data?.questions.filter(q => q.status === 'answered').length ?? 0;
  const totalQuestions = data?.total ?? 0;

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>

            {/* 3-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: 24, maxWidth: 1200, margin: '0 auto' }} className="qna-grid">

              {/* ── LEFT SIDEBAR ── */}
              <aside className="qna-sidebar-left" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                {/* Quick Stats */}
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.06) 0%, transparent 100%)', border: '1px solid rgba(var(--color-primary), 0.08)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{totalQuestions}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>Pertanyaan</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)' }}>{totalAnswered}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>Terjawab</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{reputation?.score ?? 0}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>XP Kamu</div>
                    </div>
                  </div>
                  {reputation && (
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(var(--color-primary), 0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((reputation.score % 100), 100)}%`, borderRadius: 2, background: 'rgb(var(--color-primary))', transition: 'width 0.5s' }} />
                    </div>
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
                          background: selectedCategory === cat.id ? `${cat.color}15` : 'transparent',
                          color: selectedCategory === cat.id ? cat.color : 'inherit',
                          fontWeight: selectedCategory === cat.id ? 600 : 400,
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
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10 }}>Reputasimu</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Award size={14} style={{ color: '#f59e0b' }} />
                        </div>
                        <div><strong>{reputation.score}</strong> <span style={{ opacity: 0.4 }}>poin</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={14} style={{ color: '#10b981' }} />
                        </div>
                        <div><strong>{reputation.answersApproved}</strong> <span style={{ opacity: 0.4 }}>approved</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>❓ Q&A</h1>
                    <p style={{ fontSize: 13, opacity: 0.45, marginTop: 2 }}>Tanya, jawab, bantu sesama mahasiswa</p>
                  </div>
                  <Button onClick={() => setShowAskModal(true)} size="sm" style={{ borderRadius: 10 }}><Plus size={14} /> Tanya</Button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                  <input className="input" placeholder="Cari pertanyaan, tag, atau topik..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 38, borderRadius: 12, padding: '12px 14px 12px 38px', fontSize: 14 }} />
                </div>

                {/* Tab Pills */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: 'var(--input-bg)', width: 'fit-content' }}>
                  {[
                    { key: 'terbaru', label: 'Terbaru', icon: <Clock size={13} /> },
                    { key: 'trending', label: 'Trending', icon: <Flame size={13} /> },
                    { key: 'mine', label: 'Milikku', icon: <UserIcon size={13} /> },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                      padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: tab === t.key ? 'var(--card-bg)' : 'transparent',
                      color: tab === t.key ? 'rgb(var(--color-primary))' : 'inherit',
                      boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s',
                    }}>{t.icon} {t.label}</button>
                  ))}
                </div>

                {/* Question Feed */}
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
                  </div>
                ) : !data || data.questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 48 }}>
                    <HelpCircle size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                    <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada pertanyaan</p>
                    <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Jadi yang pertama bertanya!</p>
                    <Button onClick={() => setShowAskModal(true)} size="sm" style={{ marginTop: 16, borderRadius: 10 }}>
                      <Plus size={14} /> Ajukan Pertanyaan
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.questions.map((q, idx) => (
                      <div key={q.id} onClick={() => router.push(`/qna/${q.slug}`)} style={{
                        padding: '18px 20px', borderRadius: 16, background: 'var(--card-bg)',
                        border: q.status === 'answered' ? '1px solid rgba(var(--color-success), 0.15)' : '1px solid var(--border-default)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        animation: `fadeSlideIn 0.3s ease-out ${idx * 0.03}s both`,
                      }} className="hover-lift">
                        <div style={{ display: 'flex', gap: 14 }}>
                          {/* Vote/Answer count column */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 48, paddingTop: 2 }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: (q._count?.answers ?? q.answers?.length ?? 0) > 0 ? 'rgb(var(--color-primary))' : 'inherit', opacity: (q._count?.answers ?? 0) > 0 ? 1 : 0.3 }}>
                                {q._count?.answers ?? q.answers?.length ?? 0}
                              </div>
                              <div style={{ fontSize: 9, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>jawaban</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.4 }}>{q.viewCount}</div>
                              <div style={{ fontSize: 9, opacity: 0.3, textTransform: 'uppercase', letterSpacing: 0.3 }}>views</div>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Author row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.2), rgba(var(--color-primary), 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                                {q.user.fullName.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{q.user.fullName}</span>
                              <span style={{ fontSize: 11, opacity: 0.35 }}>· {timeAgo(q.createdAt)}</span>
                              {q.status === 'answered' && (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(var(--color-success), 0.1)', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
                                  <CheckCircle size={10} /> Terjawab
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 5, lineHeight: 1.4 }}>{q.title}</h3>

                            {/* Body preview */}
                            {q.body && (
                              <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {q.body}
                              </p>
                            )}

                            {/* Top answer preview */}
                            {q.answers && q.answers.length > 0 && (
                              <div style={{
                                padding: '8px 12px', borderRadius: 10, marginBottom: 8,
                                background: 'rgba(var(--color-primary), 0.03)', border: '1px solid rgba(var(--color-primary), 0.06)',
                                fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}>
                                <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                                  {(q.answers.find(a => a.isApprovedByAsker)) ? '✅ Best: ' : '💡 Top: '}
                                </span>
                                <span style={{ opacity: 0.65 }}>{(q.answers.find(a => a.isApprovedByAsker) || q.answers[0])?.body}</span>
                              </div>
                            )}

                            {/* Tags + category */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {q.category?.length > 0 && q.category.map(c => {
                                const catInfo = QNA_CATEGORIES.find(cat => cat.id === c);
                                return catInfo ? (
                                  <span key={c} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${catInfo.color}12`, color: catInfo.color, fontWeight: 600 }}>
                                    {catInfo.emoji} {catInfo.label}
                                  </span>
                                ) : null;
                              })}
                              {q.tags.slice(0, 3).map(t => (
                                <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(var(--color-primary), 0.05)', color: 'rgb(var(--color-primary))', fontWeight: 500 }}>#{t}</span>
                              ))}
                              {q.tags.length > 3 && <span style={{ fontSize: 10, opacity: 0.35 }}>+{q.tags.length - 3}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {data.totalPages > page && (
                      <Button onClick={() => setPage(p => p + 1)} variant="secondary" style={{ margin: '12px auto', display: 'block', borderRadius: 10 }}>Muat lebih banyak</Button>
                    )}
                  </div>
                )}
              </main>

              {/* ── RIGHT SIDEBAR ── */}
              <aside className="qna-sidebar-right" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                {/* Ask CTA */}
                <div style={{
                  padding: '16px 18px', borderRadius: 14, marginBottom: 16,
                  background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-primary), 0.02) 100%)',
                  border: '1px solid rgba(var(--color-primary), 0.1)',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Punya pertanyaan?</h3>
                  <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, lineHeight: 1.4 }}>Komunitas siap membantu. Ajukan pertanyaan dan dapatkan jawaban berkualitas.</p>
                  <Button onClick={() => setShowAskModal(true)} size="sm" style={{ width: '100%', borderRadius: 10, fontSize: 12 }}>
                    <Plus size={13} /> Ajukan Pertanyaan
                  </Button>
                </div>

                {/* Trending Tags */}
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flame size={12} /> Trending
                  </h3>
                  {trendingTags.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {trendingTags.map(({ tag, count }) => (
                        <button key={tag} onClick={() => { setSearch(tag); setPage(1); }} style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 8,
                          background: 'rgba(var(--color-primary), 0.05)', color: 'rgb(var(--color-primary))', fontWeight: 500,
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

                {/* Top Contributors */}
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={12} /> Top Kontributor
                  </h3>
                  {topContributors.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {topContributors.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 12, fontSize: 11, fontWeight: 800, color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'inherit', opacity: i >= 3 ? 0.4 : 1 }}>
                            {i + 1}
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5]}30, ${['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5]}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5] }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                            <div style={{ fontSize: 10, opacity: 0.4 }}>{c.count} jawaban</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, opacity: 0.35 }}>Belum ada kontributor.</p>
                  )}
                </div>
              </aside>

            </div>

            {/* Ask Modal — improved */}
            <Modal isOpen={showAskModal} onClose={() => setShowAskModal(false)} title="❓ Ajukan Pertanyaan">
              <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Judul pertanyaan</label>
                  <input className="input" placeholder="Apa yang ingin kamu tanyakan?" value={askForm.title} onChange={e => setAskForm({ ...askForm, title: e.target.value })} required style={{ fontSize: 15, padding: '12px 14px', borderRadius: 10, fontWeight: 500 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Detail (opsional)</label>
                  <textarea className="input" placeholder="Semakin jelas, semakin mudah dijawab..." value={askForm.body} onChange={e => setAskForm({ ...askForm, body: e.target.value })} rows={4} style={{ borderRadius: 10, padding: '12px 14px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {QNA_CATEGORIES.filter(c => c.id !== 'semua').map(c => (
                      <button key={c.id} type="button" onClick={() => setAskForm({ ...askForm, category: askForm.category === c.id ? '' : c.id })} style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: askForm.category === c.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: askForm.category === c.id ? `${c.color}15` : 'var(--input-bg)',
                        color: askForm.category === c.id ? c.color : 'inherit',
                        outline: askForm.category === c.id ? `2px solid ${c.color}` : 'none',
                        outlineOffset: -1, transition: 'all 0.2s',
                      }}><span>{c.emoji}</span> {c.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Tags</label>
                  <input className="input" placeholder="algoritma, java, database (pisah koma)" value={askForm.tags} onChange={e => setAskForm({ ...askForm, tags: e.target.value })} style={{ fontSize: 13, borderRadius: 10, padding: '10px 14px' }} />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : '🚀 Post Pertanyaan'}
                </Button>
              </form>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

