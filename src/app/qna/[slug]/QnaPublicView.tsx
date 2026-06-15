'use client';

import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { HtmlRenderer, Button, useToast, useConfirm } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { qnaService } from '@/services/qnaService';
import { ThumbsUp, CheckCircle, MessageSquare, Eye, Clock, ArrowLeft, LogIn, Flag, Loader2, Share2, Hash, HelpCircle, Award } from 'lucide-react';
import { brand } from '@/config/brand';

// Lazy-load Tiptap editor (heavy, no SSR needed)
const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor').then(m => ({ default: m.RichTextEditor })), { ssr: false });

interface Answer {
  id: string;
  userId: string;
  body: string;
  isApprovedByAsker: boolean;
  upvotes: number;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
  hasUpvoted?: boolean;
}

interface Question {
  id: string;
  userId: string;
  title: string;
  body?: string;
  category: string[];
  tags: string[];
  slug: string;
  status: 'open' | 'answered' | 'closed';
  viewCount: number;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
  answers?: Answer[];
}

const QNA_CATEGORIES: Record<string, { emoji: string; label: string; color: string }> = {
  akademik: { emoji: '📚', label: 'Akademik', color: '#3b82f6' },
  pemrograman: { emoji: '💻', label: 'Pemrograman', color: '#10b981' },
  matematika: { emoji: '📐', label: 'Matematika', color: '#f59e0b' },
  sains: { emoji: '🔬', label: 'Sains', color: '#8b5cf6' },
  bahasa: { emoji: '📝', label: 'Bahasa', color: '#ec4899' },
  karir: { emoji: '💼', label: 'Karir', color: '#14b8a6' },
  lainnya: { emoji: '💬', label: 'Lainnya', color: '#6b7280' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  return `${months} bulan lalu`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface RelatedQuestion {
  id: string;
  title: string;
  slug: string;
  category: string[];
  tags: string[];
  viewCount: number;
  createdAt: string;
  _count?: { answers: number };
}

export function QnaPublicView({ question: initialQuestion, relatedQuestions: ssrRelatedQuestions = [] }: { question: Question; relatedQuestions?: RelatedQuestion[] }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const [question, setQuestion] = useState<Question>(initialQuestion);
  const [answerHtml, setAnswerHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [relatedQuestions] = useState<RelatedQuestion[]>(ssrRelatedQuestions);
  // Track which answers the user has upvoted (optimistic state)
  const [upvotedAnswers, setUpvotedAnswers] = useState<Set<string>>(new Set());

  const answers = question.answers || [];
  const approvedAnswer = answers.find(a => a.isApprovedByAsker);
  const otherAnswers = answers.filter(a => !a.isApprovedByAsker).sort((a, b) => {
    // Sort by upvotes descending, then by createdAt ascending
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  const sortedAnswers = approvedAnswer ? [approvedAnswer, ...otherAnswers] : otherAnswers;

  // Get unique contributors
  const contributors = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    answers.forEach(a => {
      const existing = map.get(a.user.id);
      if (existing) existing.count++;
      else map.set(a.user.id, { name: a.user.fullName, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [answers]);

  const refreshQuestion = useCallback(async () => {
    try {
      const updated = await qnaService.getBySlug(question.slug);
      setQuestion(updated);
    } catch {}
  }, [question.slug]);

  // ─── Answer submission ──────────────────────────────────────────
  const handleAnswer = async () => {
    if (!answerHtml.trim() || !user) return;
    // Strip HTML tags to check minimum length
    const plainText = answerHtml.replace(/<[^>]+>/g, '').trim();
    if (plainText.length < 20) {
      showToast('Jawaban minimal 20 karakter.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await qnaService.createAnswer(question.id, answerHtml);
      showToast('Jawaban terkirim! 💬', 'success');
      // XP notification for submitting an answer
      setTimeout(() => showToast('+10 XP untuk jawaban! ⭐', 'success'), 800);
      setAnswerHtml('');
      await refreshQuestion();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ─── Upvote with optimistic UI ──────────────────────────────────
  const handleUpvote = async (answerId: string) => {
    if (!user) { showToast('Login untuk upvote.', 'error'); return; }

    const alreadyUpvoted = upvotedAnswers.has(answerId);

    // Optimistic update
    setQuestion(prev => ({
      ...prev,
      answers: prev.answers?.map(a =>
        a.id === answerId
          ? { ...a, upvotes: a.upvotes + (alreadyUpvoted ? -1 : 1) }
          : a
      ),
    }));

    if (alreadyUpvoted) {
      setUpvotedAnswers(prev => { const next = new Set(prev); next.delete(answerId); return next; });
    } else {
      setUpvotedAnswers(prev => new Set(prev).add(answerId));
    }

    try {
      if (alreadyUpvoted) {
        await qnaService.removeUpvote(answerId);
      } else {
        await qnaService.upvoteAnswer(answerId);
      }
    } catch (e: any) {
      // Revert optimistic update on error
      setQuestion(prev => ({
        ...prev,
        answers: prev.answers?.map(a =>
          a.id === answerId
            ? { ...a, upvotes: a.upvotes + (alreadyUpvoted ? 1 : -1) }
            : a
        ),
      }));
      if (alreadyUpvoted) {
        setUpvotedAnswers(prev => new Set(prev).add(answerId));
      } else {
        setUpvotedAnswers(prev => { const next = new Set(prev); next.delete(answerId); return next; });
      }
      showToast(e.message || 'Gagal memproses upvote.', 'error');
    }
  };

  // ─── Approve answer (question owner only) ──────────────────────
  const handleApprove = async (answerId: string) => {
    try {
      await qnaService.approveAnswer(answerId);
      showToast('Jawaban di-approve! ✅', 'success');
      // XP notification for approving an answer (+30 XP to the answerer)
      setTimeout(() => showToast('+30 XP diberikan ke penjawab! 🎉', 'success'), 800);
      await refreshQuestion();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  // ─── Report answer with confirmation dialog ────────────────────
  const handleReport = async (answerId: string) => {
    if (!user) { showToast('Login untuk melaporkan.', 'error'); return; }

    const confirmed = await confirm({
      title: 'Laporkan Jawaban',
      message: 'Apakah kamu yakin ingin melaporkan jawaban ini? Jawaban yang dilaporkan akan ditinjau oleh moderator.',
      confirmText: 'Ya, Laporkan',
      cancelText: 'Batal',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      await qnaService.reportAnswer(answerId);
      showToast('Laporan dikirim. Terima kasih!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: question.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link disalin!', 'success');
    }
  };

  // ─── Login CTA component for unauthenticated users ─────────────
  const LoginCTA = ({ action }: { action: string }) => (
    <Link href="/auth" style={{ textDecoration: 'none' }}>
      <button style={{
        display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
        color: 'rgb(var(--color-primary))',
        background: 'rgba(var(--color-primary), 0.05)', border: '1px solid rgba(var(--color-primary), 0.15)',
        cursor: 'pointer',
        padding: '6px 12px', borderRadius: 8, fontFamily: 'inherit',
        transition: 'all 0.15s', fontWeight: 600,
      }}>
        <LogIn size={12} /> Masuk untuk {action}
      </button>
    </Link>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(var(--bg-base))' }}>
      {/* Header */}
      <header className="qna-detail-header" style={{
        borderBottom: '1px solid var(--border-default)',
        background: 'rgb(var(--bg-surface))',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}>
        <Link href="/qna" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 'var(--font-lg)', color: 'rgb(var(--color-primary))' }}>{brand.name}</span>
          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Q&A</span>
        </Link>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>👤 {user.fullName}</span>
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <Button size="sm" variant="ghost">Dashboard</Button>
            </Link>
          </div>
        ) : (
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
              color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
              fontSize: 'var(--font-sm)', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <LogIn size={14} /> Masuk / Daftar
            </button>
          </Link>
        )}
      </header>

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 260px', gap: 24, maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }} className="qna-detail-grid">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="qna-detail-sidebar-left" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          {/* Back link */}
          <Link href="/qna" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgb(var(--text-muted))', marginBottom: 20 }}>
            <ArrowLeft size={14} /> Semua Pertanyaan
          </Link>

          {/* Question Info Card */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10 }}>Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ opacity: 0.65 }}>{formatDate(question.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ opacity: 0.65 }}>{question.viewCount} kali dilihat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
                <span style={{ opacity: 0.65 }}>{answers.length} jawaban</span>
              </div>
            </div>
          </div>

          {/* Author Card */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10 }}>Penanya</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.2), rgba(var(--color-primary), 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                {question.user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{question.user.fullName}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--input-bg)', fontSize: 12, fontWeight: 500, width: '100%', textAlign: 'left', transition: 'all 0.2s', color: 'inherit' }}>
              <Share2 size={13} /> Bagikan
            </button>
          </div>
        </aside>

        {/* ── CENTER: Main Content ── */}
        <main style={{ minWidth: 0 }}>
          {/* Question */}
          <article>
            <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>
              {question.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              {/* Status badge */}
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 8, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
                background: question.status === 'answered' ? 'rgba(var(--color-success), 0.1)' : 'rgba(var(--color-warning), 0.1)',
                color: question.status === 'answered' ? 'var(--color-success)' : 'var(--color-warning)',
              }}>
                {question.status === 'answered' ? <><CheckCircle size={11} /> Terjawab</> : <><HelpCircle size={11} /> Menunggu Jawaban</>}
              </span>
              {/* Categories */}
              {question.category?.map(c => {
                const info = QNA_CATEGORIES[c];
                return info ? (
                  <span key={c} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: `${info.color}12`, color: info.color, fontWeight: 600 }}>
                    {info.emoji} {info.label}
                  </span>
                ) : null;
              })}
            </div>

            {/* Tags */}
            {question.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {question.tags.map(tag => (
                  <Link key={tag} href={`/qna?search=${tag}`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: 'rgba(var(--color-primary), 0.05)', color: 'rgb(var(--color-primary))', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <Hash size={10} />{tag}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Body */}
            {question.body && (
              <div style={{ padding: '20px 24px', background: 'rgb(var(--bg-surface))', borderRadius: 16, border: '1px solid var(--border-default)', marginBottom: 32, lineHeight: 1.8, fontSize: 15 }}>
                <HtmlRenderer content={question.body} />
              </div>
            )}
          </article>

          {/* Answers */}
          <section>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--border-default)' }}>
              <MessageSquare size={20} /> {answers.length} Jawaban
            </h2>

            {answers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgb(var(--bg-surface))', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                <HelpCircle size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
                <p style={{ color: 'rgb(var(--text-muted))', marginBottom: 12, fontSize: 15 }}>Belum ada jawaban untuk pertanyaan ini.</p>
                {!user && (
                  <Link href="/auth">
                    <button style={{ padding: '10px 20px', borderRadius: 10, background: 'rgb(var(--color-primary))', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                      Masuk untuk menjawab
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedAnswers.map((answer, idx) => {
                  const isUpvoted = upvotedAnswers.has(answer.id);
                  return (
                    <div
                      key={answer.id}
                      style={{
                        padding: '20px 22px',
                        background: answer.isApprovedByAsker ? 'rgba(var(--color-success) / 0.04)' : 'rgb(var(--bg-surface))',
                        borderRadius: 16,
                        border: answer.isApprovedByAsker ? '2px solid rgba(var(--color-success) / 0.25)' : '1px solid var(--border-default)',
                        animation: `fadeSlideIn 0.3s ease-out ${idx * 0.05}s both`,
                      }}
                    >
                      {answer.isApprovedByAsker && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'rgb(var(--color-success))', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'rgba(var(--color-success), 0.06)', width: 'fit-content' }}>
                          <CheckCircle size={14} /> Jawaban Terbaik
                        </div>
                      )}

                      {/* Author row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: answer.isApprovedByAsker ? 'rgba(var(--color-success), 0.1)' : 'rgba(var(--color-primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: answer.isApprovedByAsker ? 'var(--color-success)' : 'rgb(var(--color-primary))' }}>
                          {answer.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: 13 }}>{answer.user.fullName}</strong>
                          <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>· {timeAgo(answer.createdAt)}</span>
                        </div>
                      </div>

                      <div style={{ lineHeight: 1.8, marginBottom: 14, fontSize: 15 }}>
                        <HtmlRenderer content={answer.body} />
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Upvote button - show login CTA for unauthenticated */}
                          {user && hasFeature('qna_voting') ? (
                            <button
                              onClick={() => handleUpvote(answer.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                                color: isUpvoted ? 'white' : 'rgb(var(--color-primary))',
                                background: isUpvoted ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary), 0.05)',
                                border: isUpvoted ? 'none' : '1px solid rgba(var(--color-primary), 0.15)',
                                cursor: 'pointer',
                                padding: '6px 12px', borderRadius: 8, fontFamily: 'inherit',
                                transition: 'all 0.2s', fontWeight: 600,
                              }}
                              title={isUpvoted ? 'Batalkan upvote' : 'Upvote jawaban ini'}
                            >
                              <ThumbsUp size={13} fill={isUpvoted ? 'white' : 'none'} /> {answer.upvotes}
                            </button>
                          ) : (
                            <LoginCTA action="upvote" />
                          )}

                          {/* Approve button - only for question owner, non-approved answers */}
                          {user && question.userId === user.id && !answer.isApprovedByAsker && (
                            <button
                              onClick={() => handleApprove(answer.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgb(var(--color-success))', background: 'rgba(var(--color-success), 0.06)', border: '1px solid rgba(var(--color-success), 0.15)', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s' }}
                              title="Tandai sebagai jawaban terbaik"
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                          )}
                        </div>

                        {/* Report button - show login CTA for unauthenticated */}
                        {user ? (
                          <button
                            onClick={() => handleReport(answer.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgb(var(--text-muted))', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit', opacity: 0.6, transition: 'all 0.15s' }}
                            title="Laporkan jawaban"
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'rgb(var(--color-error))'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'rgb(var(--text-muted))'; }}
                          >
                            <Flag size={12} /> Laporkan
                          </button>
                        ) : (
                          <Link href="/auth" style={{ textDecoration: 'none' }}>
                            <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Flag size={11} />
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer Form - Tiptap editor for authenticated users, CTA for unauthenticated */}
            {user ? (
              <div style={{ marginTop: 32, padding: '24px', background: 'rgb(var(--bg-surface))', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>✍️ Tulis Jawaban</h3>
                <RichTextEditor
                  content={answerHtml}
                  onChange={setAnswerHtml}
                  placeholder="Tulis jawabanmu di sini... (min. 20 karakter)"
                  minHeight={150}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>
                    {answerHtml.replace(/<[^>]+>/g, '').trim().length < 20 && answerHtml.replace(/<[^>]+>/g, '').trim().length > 0 &&
                      `Minimal 20 karakter (${answerHtml.replace(/<[^>]+>/g, '').trim().length}/20)`
                    }
                  </span>
                  <Button onClick={handleAnswer} disabled={submitting || !answerHtml.replace(/<[^>]+>/g, '').trim()} style={{ borderRadius: 12, padding: '12px 24px' }}>
                    {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : '🚀 Kirim Jawaban'}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', marginTop: 32, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.04) 0%, transparent 100%)', borderRadius: 16, border: '1px solid rgba(var(--color-primary), 0.1)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>Punya jawaban yang lebih baik?</h3>
                <p style={{ fontSize: 14, color: 'rgb(var(--text-muted))', marginBottom: 16 }}>Bergabung dengan komunitas {brand.name} untuk menjawab dan dapatkan reputasi!</p>
                <Link href="/auth">
                  <button style={{
                    padding: '12px 28px', borderRadius: 12,
                    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                    color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700,
                    fontSize: 14, fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}>
                    <LogIn size={16} /> Bergabung Gratis →
                  </button>
                </Link>
              </div>
            )}
          </section>
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="qna-detail-sidebar-right" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          {/* Related Questions */}
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <HelpCircle size={11} /> Pertanyaan Terkait
            </h3>
            {relatedQuestions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {relatedQuestions.slice(0, 5).map(rq => (
                  <Link key={rq.id} href={`/qna/${rq.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '8px 10px', borderRadius: 10, transition: 'background 0.15s', cursor: 'pointer' }} className="hover-lift">
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                        {rq.title}
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 10, opacity: 0.45 }}>
                        <span>{rq._count?.answers ?? 0} jawaban</span>
                        <span>{rq.viewCount} views</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, opacity: 0.35 }}>Tidak ada pertanyaan terkait.</p>
            )}
          </div>

          {/* Tags */}
          {question.tags.length > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Hash size={11} /> Tags
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {question.tags.map(tag => (
                  <Link key={tag} href={`/qna?search=${tag}`} style={{ textDecoration: 'none' }}>
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(var(--color-primary), 0.05)', color: 'rgb(var(--color-primary))', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                      #{tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contributors */}
          {contributors.length > 0 && (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Award size={11} /> Kontributor
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contributors.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg, ${['#6366f1', '#10b981', '#f59e0b', '#ec4899'][i % 4]}30, ${['#6366f1', '#10b981', '#f59e0b', '#ec4899'][i % 4]}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'][i % 4] }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.4 }}>{c.count} jawaban</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA for non-logged-in */}
          {!user && (
            <div style={{ padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.08) 0%, rgba(var(--color-primary), 0.02) 100%)', border: '1px solid rgba(var(--color-primary), 0.1)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Bergabung sekarang!</h3>
              <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12, lineHeight: 1.4 }}>Jawab pertanyaan, bantu sesama, dan dapatkan reputasi.</p>
              <Link href="/auth" style={{ textDecoration: 'none' }}>
                <Button size="sm" style={{ width: '100%', borderRadius: 10, fontSize: 12 }}>
                  <LogIn size={13} /> Masuk / Daftar
                </Button>
              </Link>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-default)', padding: '24px', textAlign: 'center', marginTop: 40 }}>
        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
          © {new Date().getFullYear()} {brand.name} — Platform produktivitas berbasis AI untuk anak muda
        </p>
      </footer>
    </div>
  );
}
