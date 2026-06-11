'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Modal, useToast, MarkdownRenderer } from '@/components/ui';
import { qnaService, QnaQuestion, QnaPaginated, QnaAnswer, UserReputation } from '@/services/qnaService';
import {
  Plus, Loader2, MessageSquare, Eye, Search, ThumbsUp, CheckCircle,
  Bold, Italic, Code, List, ListOrdered, Link2, Image as ImageIcon,
  Quote, Heading2, LogIn, Globe, Clock, Award, HelpCircle, Flag,
  ChevronDown, ChevronUp, Send, MoreHorizontal, TrendingUp,
  Users, Star, Zap, Filter, Hash,
} from 'lucide-react';
import { brand } from '@/config/brand';

// ─── Rich Text Editor ────────────────────────────
function RichTextEditor({ value, onChange, placeholder, rows = 6, id }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrapSelection = (before: string, after: string) => {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = el.value.slice(start, end) || 'teks';
    onChange(el.value.slice(0, start) + before + selected + after + el.value.slice(end));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  };
  const insertLine = (prefix: string) => {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart;
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1;
    onChange(el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart));
    setTimeout(() => { el.focus(); el.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length); }, 0);
  };
  const tools = [
    { icon: <Bold size={14} />, t: 'Bold', a: () => wrapSelection('**', '**') },
    { icon: <Italic size={14} />, t: 'Italic', a: () => wrapSelection('*', '*') },
    { icon: <Code size={14} />, t: 'Code', a: () => wrapSelection('`', '`') },
    { icon: <Heading2 size={14} />, t: 'Heading', a: () => insertLine('## ') },
    { icon: <Quote size={14} />, t: 'Quote', a: () => insertLine('> ') },
    { icon: <List size={14} />, t: 'List', a: () => insertLine('- ') },
    { icon: <ListOrdered size={14} />, t: 'Ordered', a: () => insertLine('1. ') },
    { icon: <Link2 size={14} />, t: 'Link', a: () => wrapSelection('[', '](url)') },
  ];
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 8px', borderBottom: '1px solid var(--border-default)', background: 'rgb(var(--bg-elevated))' }}>
        {tools.map((t, i) => (
          <button key={i} type="button" title={t.t} onClick={t.a} className="icon-btn" style={{ padding: '3px 5px' }}>{t.icon}</button>
        ))}
      </div>
      <textarea ref={ref} id={id} className="themed-textarea" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ width: '100%', border: 'none', borderRadius: 0, resize: 'vertical' }} />
      <div style={{ padding: '3px 8px', fontSize: '10px', color: 'rgb(var(--text-muted))', borderTop: '1px solid var(--border-subtle)', background: 'rgb(var(--bg-elevated))' }}>Markdown: **bold** *italic* `code` [link](url)</div>
    </div>
  );
}

// ─── Time ago ────────────────────────────────────
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}h`;
  return `${Math.floor(days / 30)}bln`;
}

// ─── Avatar ──────────────────────────────────────
function Avatar({ name, size = 36, url }: { name: string; size?: number; url?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  const colors = ['99,102,241', '236,72,153', '34,197,94', '245,158,11', '139,92,246', '6,182,212'];
  const ci = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `rgba(${colors[ci]} / 0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: `rgb(${colors[ci]})`, flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Post Card ───────────────────────────────────
function PostCard({ q, user, onOpen, onVote }: {
  q: QnaQuestion; user: any; onOpen: () => void; onVote?: () => void;
}) {
  const answerCount = q._count?.answers ?? q.answers?.length ?? 0;
  const hasApproved = q.status === 'answered';
  return (
    <article className="timeline-post" onClick={onOpen}>
      <div className="post-header">
        <Avatar name={q.user.fullName} size={40} url={q.user.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="post-author">{q.user.fullName}</span>
            <span className="post-time">{timeAgo(q.createdAt)}</span>
          </div>
          {q.tags && q.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              {q.tags.slice(0, 3).map(t => <span key={t} className="tag-chip" style={{ fontSize: '10px', padding: '1px 6px' }}><Hash size={9} /> {t}</span>)}
            </div>
          )}
        </div>
        {hasApproved && <span className="solved-badge"><CheckCircle size={12} /> Terjawab</span>}
      </div>
      <h3 className="post-title">{q.title}</h3>
      {q.body && (
        <div className="post-body-preview">
          {q.body.replace(/[#*`>\[\]!]/g, '').slice(0, 200)}
          {q.body.length > 200 && '...'}
        </div>
      )}
      <div className="post-footer">
        <span className="post-stat"><ThumbsUp size={14} /> {q.viewCount}</span>
        <span className="post-stat"><MessageSquare size={14} /> {answerCount} jawaban</span>
        <span className="post-stat"><Eye size={14} /> {q.viewCount}</span>
      </div>
    </article>
  );
}

// ─── Main Page ───────────────────────────────────
export default function TimelinePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data
  const [data, setData] = useState<QnaPaginated | null>(null);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  // Detail
  const [selectedQuestion, setSelectedQuestion] = useState<QnaQuestion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Ask modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [askForm, setAskForm] = useState({ title: '', body: '', tags: '' });

  // Search debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 500);
  }, []);

  useEffect(() => { return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }; }, []);

  // Fetch
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      setData(await qnaService.getQuestions({
        search: debouncedSearch || undefined,
        page, limit: 15,
        status: statusFilter || undefined,
      }));
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);
  useEffect(() => { if (user) qnaService.getReputation().then(setReputation).catch(() => {}); }, [user]);

  // Open detail
  const openDetail = async (slug: string) => {
    setDetailLoading(true);
    try {
      const q = await qnaService.getBySlug(slug);
      setSelectedQuestion(q);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setDetailLoading(false); }
  };

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion) return;
    setSubmittingAnswer(true);
    try {
      await qnaService.createAnswer(selectedQuestion.id, answerText);
      showToast('Jawaban diposting!', 'success');
      setAnswerText('');
      // Refresh detail
      const q = await qnaService.getBySlug(selectedQuestion.slug);
      setSelectedQuestion(q);
      fetchQuestions();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmittingAnswer(false); }
  };

  // Upvote
  const handleUpvote = async (answerId: string) => {
    try {
      await qnaService.upvoteAnswer(answerId);
      if (selectedQuestion) {
        const q = await qnaService.getBySlug(selectedQuestion.slug);
        setSelectedQuestion(q);
      }
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  // Approve
  const handleApprove = async (answerId: string) => {
    try {
      await qnaService.approveAnswer(answerId);
      showToast('Jawaban disetujui! ✅', 'success');
      if (selectedQuestion) {
        const q = await qnaService.getBySlug(selectedQuestion.slug);
        setSelectedQuestion(q);
        fetchQuestions();
      }
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  // Ask question
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askForm.title.trim()) return;
    setSubmitting(true);
    try {
      await qnaService.createQuestion({ title: askForm.title, body: askForm.body || undefined, tags: askForm.tags ? askForm.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined });
      showToast('Pertanyaan diposting! 🎉', 'success');
      setShowAskModal(false); setAskForm({ title: '', body: '', tags: '' });
      fetchQuestions();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // Report
  const handleReport = async (answerId: string) => {
    try { await qnaService.reportAnswer(answerId); showToast('Dilaporkan.', 'success'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  // ─── Trending tags (from loaded data) ──────────
  const trendingTags = (() => {
    if (!data) return [];
    const tagMap: Record<string, number> = {};
    data.questions.forEach(q => q.tags?.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    return Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  // ─── Left Sidebar (Logged-in user info) ────────
  const leftSidebar = (
    <aside className="timeline-sidebar timeline-sidebar-left">
      {user && reputation && (
        <div className="sidebar-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar name={user.fullName || user.email} size={44} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)' }}>{user.fullName || 'User'}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)', color: 'rgb(var(--color-warning))' }}>{reputation.score}</div>
              <div style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>Reputasi</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)', color: 'rgb(var(--color-success))' }}>{reputation.answersApproved}</div>
              <div style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>Approved</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 'var(--font-lg)' }}>{reputation.questionsAsked}</div>
              <div style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>Ditanya</div>
            </div>
          </div>
        </div>
      )}
      <div className="sidebar-card">
        <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Filter size={14} /> Filter</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[{ v: '', l: '🌐 Semua' }, { v: 'open', l: '🟢 Belum Terjawab' }, { v: 'answered', l: '✅ Terjawab' }].map(f => (
            <button key={f.v} onClick={() => { setStatusFilter(f.v); setPage(1); }} className={`todo-cat-item ${statusFilter === f.v ? 'active' : ''}`}>
              <span className="cat-name">{f.l}</span>
            </button>
          ))}
        </div>
      </div>
      {!user && (
        <div className="sidebar-card" style={{ textAlign: 'center' }}>
          <Globe size={24} style={{ color: 'rgb(var(--color-primary))', marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--font-sm)', marginBottom: 12 }}>Bergabung untuk bertanya & menjawab</p>
          <Link href="/auth"><Button size="sm" style={{ width: '100%' }}><LogIn size={14} /> Masuk</Button></Link>
        </div>
      )}
    </aside>
  );

  // ─── Right Sidebar (Trending) ──────────────────
  const rightSidebar = (
    <aside className="timeline-sidebar timeline-sidebar-right">
      {trendingTags.length > 0 && (
        <div className="sidebar-card">
          <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Trending Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {trendingTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => { setTagFilter(tagFilter === tag ? '' : tag); handleSearchChange(tagFilter === tag ? '' : tag); }}
                className="tag-chip"
                style={{
                  cursor: 'pointer',
                  background: tagFilter === tag ? 'rgba(var(--color-primary) / 0.12)' : undefined,
                  borderColor: tagFilter === tag ? 'rgb(var(--color-primary))' : undefined,
                  fontWeight: tagFilter === tag ? 600 : 400,
                  fontSize: '11px',
                }}
              >
                <Hash size={10} /> {tag} <span style={{ opacity: 0.5 }}>({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sidebar-card">
        <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} /> Tips</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))' }}>
          <p>💡 Jawaban yang disetujui pemilik pertanyaan memberi +5 reputasi</p>
          <p>📝 Gunakan Markdown untuk format jawaban yang lebih jelas</p>
          <p>🏷️ Tambahkan tag agar pertanyaanmu mudah ditemukan</p>
        </div>
      </div>
      {data && (
        <div className="sidebar-card">
          <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Statistik</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Pertanyaan</span><strong>{data.total}</strong></div>
          </div>
        </div>
      )}
    </aside>
  );

  // ─── Main Feed ─────────────────────────────────
  const feedContent = (
    <div className="timeline-feed">
      {/* Compose box */}
      {user && (
        <div className="compose-box" onClick={() => setShowAskModal(true)}>
          <Avatar name={user.fullName || user.email} size={36} />
          <div className="compose-placeholder">Apa yang ingin kamu tanyakan?</div>
          <Button size="sm"><Plus size={14} /> Tanya</Button>
        </div>
      )}

      {/* Search */}
      <div className="timeline-search">
        <Search size={16} className="search-icon" />
        <input placeholder="Cari pertanyaan, topik, atau tag..." value={search} onChange={e => handleSearchChange(e.target.value)} />
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} /></div>
      ) : !data || data.questions.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">🌐</span><h3>Belum ada postingan</h3><p>Jadilah yang pertama memulai diskusi!</p></div>
      ) : (
        <>
          {data.questions.map(q => (
            <PostCard key={q.id} q={q} user={user} onOpen={() => openDetail(q.slug)} />
          ))}
          {data.totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 16 }}>
              <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="ghost" size="sm">← Prev</Button>
              <span className="page-info">{page} / {data.totalPages}</span>
              <Button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} variant="ghost" size="sm">Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ─── Detail Modal ──────────────────────────────
  const detailModal = (
    <Modal isOpen={!!selectedQuestion} onClose={() => { setSelectedQuestion(null); setAnswerText(''); setShowPreview(false); }} title="" size="lg">
      {detailLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} /></div>
      ) : selectedQuestion && (
        <div className="detail-view">
          {/* Question */}
          <div className="detail-question">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar name={selectedQuestion.user.fullName} size={40} url={selectedQuestion.user.avatarUrl} />
              <div style={{ flex: 1 }}>
                <span className="post-author">{selectedQuestion.user.fullName}</span>
                <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', display: 'flex', gap: 10, marginTop: 2 }}>
                  <span><Clock size={11} /> {timeAgo(selectedQuestion.createdAt)}</span>
                  <span><Eye size={11} /> {selectedQuestion.viewCount} views</span>
                </div>
              </div>
              {selectedQuestion.status === 'answered' && <span className="solved-badge"><CheckCircle size={12} /> Terjawab</span>}
            </div>
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, marginBottom: 12 }}>{selectedQuestion.title}</h2>
            {selectedQuestion.body && (
              <div className="post-body-full"><MarkdownRenderer content={selectedQuestion.body} /></div>
            )}
            {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {selectedQuestion.tags.map(t => <span key={t} className="tag-chip"><Hash size={10} /> {t}</span>)}
              </div>
            )}
            {/* Share link */}
            <div style={{ marginTop: 12, fontSize: 'var(--font-xs)' }}>
              <Link href={`/qna/${selectedQuestion.slug}`} target="_blank" style={{ color: 'rgb(var(--color-primary))', textDecoration: 'none' }}>
                🔗 Link publik
              </Link>
            </div>
          </div>

          {/* Answers */}
          <div className="detail-answers">
            <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={16} /> {selectedQuestion.answers?.length || 0} Jawaban
            </h3>
            {(!selectedQuestion.answers || selectedQuestion.answers.length === 0) ? (
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', padding: 20, textAlign: 'center' }}>Belum ada jawaban. Jadilah yang pertama!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...(selectedQuestion.answers || [])]
                  .sort((a, b) => {
                    if (a.isApprovedByAsker && !b.isApprovedByAsker) return -1;
                    if (!a.isApprovedByAsker && b.isApprovedByAsker) return 1;
                    return b.upvotes - a.upvotes;
                  })
                  .map(ans => (
                    <div key={ans.id} className={`answer-card ${ans.isApprovedByAsker ? 'approved' : ''}`}>
                      {ans.isApprovedByAsker && (
                        <div className="approved-label"><CheckCircle size={13} /> Jawaban Terbaik</div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div className="vote-column">
                          <button onClick={() => handleUpvote(ans.id)} className="vote-btn"><ThumbsUp size={16} /></button>
                          <span className="vote-count">{ans.upvotes}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Avatar name={ans.user.fullName} size={28} url={ans.user.avatarUrl} />
                            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{ans.user.fullName}</span>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{timeAgo(ans.createdAt)}</span>
                          </div>
                          <div className="post-body-full"><MarkdownRenderer content={ans.body} /></div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            {user && selectedQuestion.userId === user.id && !ans.isApprovedByAsker && (
                              <button onClick={() => handleApprove(ans.id)} className="action-link green"><CheckCircle size={13} /> Setujui</button>
                            )}
                            {user && ans.userId !== user.id && (
                              <button onClick={() => handleReport(ans.id)} className="action-link"><Flag size={13} /> Laporkan</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Write answer */}
          {user ? (
            <div className="write-answer">
              <h4 style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Send size={14} /> Tulis Jawaban</h4>
              <div style={{ marginBottom: 8 }}>
                <div className="tab-bar" style={{ marginBottom: 8 }}>
                  <button className={`tab-pill ${!showPreview ? 'active' : ''}`} onClick={() => setShowPreview(false)}>Tulis</button>
                  <button className={`tab-pill ${showPreview ? 'active' : ''}`} onClick={() => setShowPreview(true)}>Preview</button>
                </div>
                {showPreview ? (
                  <div style={{ padding: 16, minHeight: 120, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'rgb(var(--bg-base))' }}>
                    {answerText ? <MarkdownRenderer content={answerText} /> : <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)' }}>Belum ada konten...</p>}
                  </div>
                ) : (
                  <RichTextEditor value={answerText} onChange={setAnswerText} placeholder="Tulis jawabanmu... (mendukung Markdown)" rows={5} />
                )}
              </div>
              <Button onClick={handleSubmitAnswer} disabled={submittingAnswer || !answerText.trim()} style={{ width: '100%' }}>
                {submittingAnswer ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={14} /> Kirim Jawaban</>}
              </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, background: 'rgb(var(--bg-base))', borderRadius: 'var(--radius-md)' }}>
              <p style={{ marginBottom: 10, fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Login untuk menjawab pertanyaan</p>
              <Link href="/auth"><Button size="sm"><LogIn size={14} /> Masuk</Button></Link>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

  // ─── Ask Modal ─────────────────────────────────
  const askModal = (
    <Modal isOpen={showAskModal} onClose={() => setShowAskModal(false)} title="✍️ Buat Postingan" size="lg">
      <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input className="themed-input" placeholder="Judul pertanyaan" value={askForm.title} onChange={e => setAskForm({ ...askForm, title: e.target.value })} required style={{ width: '100%' }} />
        <RichTextEditor value={askForm.body} onChange={v => setAskForm({ ...askForm, body: v })} placeholder="Jelaskan pertanyaanmu secara detail... (Markdown)" rows={8} />
        <input className="themed-input" placeholder="Tags (pisahkan dengan koma): javascript, react, nextjs" value={askForm.tags} onChange={e => setAskForm({ ...askForm, tags: e.target.value })} style={{ width: '100%' }} />
        <Button type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Post Pertanyaan'}
        </Button>
      </form>
    </Modal>
  );

  // ─── Render ────────────────────────────────────
  const mainLayout = (
    <div className="timeline-layout">
      {leftSidebar}
      {feedContent}
      {rightSidebar}
    </div>
  );

  if (user) {
    return (
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            {mainLayout}
          </div>
        </div>
        {detailModal}
        {askModal}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(var(--bg-base))' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgb(var(--bg-base))', borderBottom: '1px solid var(--border-default)', backdropFilter: 'blur(12px)' }}>
        <Link href="/qna" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={24} style={{ color: 'rgb(var(--color-primary))' }} />
          <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
            {brand.name} <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>Timeline</span>
          </span>
        </Link>
        <Link href="/auth"><Button size="sm"><LogIn size={14} /> Masuk / Daftar</Button></Link>
      </header>
      <main style={{ padding: '24px 20px' }}>
        {mainLayout}
      </main>
      <footer style={{ textAlign: 'center', padding: '24px 20px', borderTop: '1px solid var(--border-default)', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)' }}>
        <p>{brand.name} &mdash; Platform pembelajaran kolaboratif</p>
      </footer>
      {detailModal}
      {askModal}
    </div>
  );
}
