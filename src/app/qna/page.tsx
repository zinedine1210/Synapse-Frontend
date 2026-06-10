'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast } from '@/components/ui';
import { qnaService, QnaQuestion, QnaPaginated, UserReputation } from '@/services/qnaService';
import { Plus, Loader2, MessageSquare, ThumbsUp, CheckCircle, Eye, Search, ChevronLeft } from 'lucide-react';

export default function QnaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState<'list' | 'detail' | 'my'>('list');

  const [data, setData] = useState<QnaPaginated | null>(null);
  const [myQuestions, setMyQuestions] = useState<QnaQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<QnaQuestion | null>(null);
  const [reputation, setReputation] = useState<UserReputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showAskModal, setShowAskModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [askForm, setAskForm] = useState({ title: '', body: '', tags: '' });
  const [answerText, setAnswerText] = useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qnaService.getQuestions({ search: search || undefined, page, limit: 20 });
      setData(res);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

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
        tags: askForm.tags ? askForm.tags.split(',').map(t => t.trim()) : undefined,
      });
      showToast('Pertanyaan berhasil diposting!', 'success');
      setShowAskModal(false);
      setAskForm({ title: '', body: '', tags: '' });
      fetchQuestions();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (slug: string) => {
    setLoading(true);
    try {
      const q = await qnaService.getBySlug(slug);
      setSelectedQuestion(q);
      setView('detail');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async () => {
    if (!answerText.trim() || !selectedQuestion) return;
    setSubmitting(true);
    try {
      await qnaService.createAnswer(selectedQuestion.id, answerText);
      showToast('Jawaban berhasil diposting!', 'success');
      setAnswerText('');
      openDetail(selectedQuestion.slug);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (answerId: string) => {
    try {
      await qnaService.approveAnswer(answerId);
      showToast('Jawaban di-approve!', 'success');
      if (selectedQuestion) openDetail(selectedQuestion.slug);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleUpvote = async (answerId: string) => {
    try {
      await qnaService.upvoteAnswer(answerId);
      showToast('Upvoted!', 'success');
      if (selectedQuestion) openDetail(selectedQuestion.slug);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const loadMyQuestions = async () => {
    setLoading(true);
    try {
      const q = await qnaService.getMyQuestions();
      setMyQuestions(q);
      setView('my');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { open: 'var(--color-primary)', answered: 'var(--color-success)', closed: 'var(--color-error)' };
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: colors[status] || '#999', color: '#fff' }}>{status}</span>;
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content">
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

              {view === 'list' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>❓ Q&A Publik</h1>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={loadMyQuestions} variant="secondary" size="sm">Pertanyaanku</Button>
                      <Button onClick={() => setShowAskModal(true)} size="sm"><Plus size={16} /> Tanya</Button>
                    </div>
                  </div>

                  {/* Reputation */}
                  {reputation && (
                    <Card>
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 14 }}>
                        <span>⭐ Reputasi: <strong>{reputation.score}</strong></span>
                        <span>✅ Jawaban Disetujui: <strong>{reputation.answersApproved}</strong></span>
                        <span>❓ Pertanyaan: <strong>{reputation.questionsAsked}</strong></span>
                      </div>
                    </Card>
                  )}

                  {/* Search */}
                  <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                      <input className="input" placeholder="Cari pertanyaan..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 36 }} />
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div>
                  ) : !data || data.questions.length === 0 ? (
                    <Card><p style={{ textAlign: 'center', opacity: 0.6 }}>Belum ada pertanyaan.</p></Card>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.questions.map(q => (
                          <Card key={q.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(q.slug)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  {statusBadge(q.status)}
                                  <strong>{q.title}</strong>
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.6, display: 'flex', gap: 12 }}>
                                  <span>👤 {q.user.fullName}</span>
                                  <span><MessageSquare size={12} /> {q._count?.answers ?? 0} jawaban</span>
                                  <span><Eye size={12} /> {q.viewCount}</span>
                                  <span>{new Date(q.createdAt).toLocaleDateString('id-ID')}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      {data.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                          <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="secondary" size="sm">Prev</Button>
                          <span style={{ padding: '6px 12px', fontSize: 13 }}>{page} / {data.totalPages}</span>
                          <Button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} variant="secondary" size="sm">Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Detail View */}
              {view === 'detail' && selectedQuestion && (
                <>
                  <button onClick={() => { setView('list'); setSelectedQuestion(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, opacity: 0.7 }}>
                    <ChevronLeft size={16} /> Kembali
                  </button>

                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {statusBadge(selectedQuestion.status)}
                      <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedQuestion.title}</h2>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 12, display: 'flex', gap: 12 }}>
                      <span>👤 {selectedQuestion.user.fullName}</span>
                      <span><Eye size={12} /> {selectedQuestion.viewCount} views</span>
                      <span>{new Date(selectedQuestion.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    {selectedQuestion.body && <div style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedQuestion.body}</div>}
                    {selectedQuestion.tags.length > 0 && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                        {selectedQuestion.tags.map(t => (
                          <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-secondary)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Answers */}
                  <h3 style={{ margin: '20px 0 12px', fontWeight: 600 }}>💬 {selectedQuestion.answers?.length ?? 0} Jawaban</h3>
                  {selectedQuestion.answers?.map(a => (
                    <Card key={a.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => handleUpvote(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ThumbsUp size={18} />
                          </button>
                          <span style={{ fontWeight: 600 }}>{a.upvotes}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{a.body}</div>
                          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>👤 {a.user.fullName}</span>
                            <span>{new Date(a.createdAt).toLocaleDateString('id-ID')}</span>
                            {a.isApprovedByAsker && <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Approved</span>}
                            {selectedQuestion.userId === user?.id && !a.isApprovedByAsker && (
                              <button onClick={() => handleApprove(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 12 }}>
                                ✅ Approve jawaban ini
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Answer Form */}
                  <Card>
                    <h4 style={{ marginBottom: 8, fontWeight: 600 }}>Tulis Jawaban</h4>
                    <textarea className="input" placeholder="Tulis jawabanmu..." value={answerText} onChange={e => setAnswerText(e.target.value)} rows={4} />
                    <div style={{ marginTop: 8 }}>
                      <Button onClick={handleAnswer} disabled={submitting || !answerText.trim()}>
                        {submitting ? <Loader2 className="spin" size={16} /> : 'Kirim Jawaban'}
                      </Button>
                    </div>
                  </Card>
                </>
              )}

              {/* My Questions View */}
              {view === 'my' && (
                <>
                  <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, opacity: 0.7 }}>
                    <ChevronLeft size={16} /> Kembali
                  </button>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Pertanyaanku</h2>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div>
                  ) : myQuestions.length === 0 ? (
                    <Card><p style={{ textAlign: 'center', opacity: 0.6 }}>Kamu belum pernah bertanya.</p></Card>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {myQuestions.map(q => (
                        <Card key={q.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(q.slug)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {statusBadge(q.status)}
                            <strong>{q.title}</strong>
                            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.5 }}>{q._count?.answers ?? 0} jawaban</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Ask Modal */}
            <Modal isOpen={showAskModal} onClose={() => setShowAskModal(false)} title="Ajukan Pertanyaan">
              <form onSubmit={handleAsk} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Judul pertanyaan" value={askForm.title} onChange={e => setAskForm({ ...askForm, title: e.target.value })} required />
                <textarea className="input" placeholder="Deskripsi detail (opsional)" value={askForm.body} onChange={e => setAskForm({ ...askForm, body: e.target.value })} rows={4} />
                <input className="input" placeholder="Tags (pisahkan dengan koma)" value={askForm.tags} onChange={e => setAskForm({ ...askForm, tags: e.target.value })} />
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : 'Post Pertanyaan'}</Button>
              </form>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
