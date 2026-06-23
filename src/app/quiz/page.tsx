'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { classService } from '@/services/classService';
import { aiService } from '@/services/aiService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, useToast, SelectOption } from '@/components/ui';
import { useCache } from '@/lib/cache';
import { useAiJob } from '@/lib/useAiJob';
import {
  GraduationCap,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  description?: string;
}

interface SessionItem {
  id: string;
  title: string;
  sequence: number;
  _count?: { materials: number; quizzes: number };
}

export default function QuizPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data states — classes cached via useCache
  const { data: classes = [], loading: loadingClasses } = useCache<ClassItem[]>('classes:list', () => classService.getMyClasses());
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Loading & error states
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Job tracking for quiz generation
  const quizGenJob = useAiJob<any>('generate_quiz', {
    onComplete: (res) => {
      if (res?.quizzes?.length > 0) {
        setQuizQuizzes(res.quizzes);
        setQuizIds(res.quizIds || []);
        setQuizStarted(true);
        setCurrentIdx(0);
        setUserAnswers({});
        setQuizSubmitted(false);
        showToast('Kuis AI sukses dibuat! 🎯', 'success');
      } else {
        setError(res?.message || 'Gagal bikin kuis nih.');
        showToast(res?.message || 'Gagal bikin kuis nih.', 'error');
      }
    },
    onError: (err) => { setError(err || 'Ada error pas bikin kuis.'); showToast(err || 'Ada error pas bikin kuis.', 'error'); },
  });
  const isGenerating = quizGenJob.isProcessing;

  // Quiz execution states
  const [quizQuizzes, setQuizQuizzes] = useState<any[]>([]);
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // { idx: letter }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select first class when loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Load sessions when class changes
  useEffect(() => {
    if (!selectedClassId) return;

    async function loadSessions() {
      try {
        setLoadingSessions(true);
        setSessions([]);
        setSelectedSessionIds([]);
        const list = await classService.getClassSessions(selectedClassId);
        setSessions((list as any) || []);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Gagal memuat sesi kelas:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, [selectedClassId]);

  const handleToggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleGenerateQuiz = async () => {
    if (selectedSessionIds.length === 0) {
      showToast('Pilih minimal 1 sesi pertemuan dulu dong!', 'warning');
      return;
    }

    setError(null);
    setQuizQuizzes([]);
    setQuizIds([]);

    try {
      await quizGenJob.trigger(() => aiService.generateQuiz(selectedSessionIds, questionCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ada error pas bikin kuis.');
      showToast(err instanceof Error ? err.message : 'Ada error pas bikin kuis.', 'error');
    }
  };

  const handleSubmitQuiz = async () => {
    if (quizQuizzes.length === 0) return;

    let correct = 0;
    quizQuizzes.forEach((q, idx) => {
      if (userAnswers[idx] === q.answerKey) {
        correct++;
      }
    });

    const score = Math.round((correct / quizQuizzes.length) * 100);
    setQuizScore(score);
    setIsSubmitting(true);

    try {
      // Submit attempt for the first quiz ID
      if (quizIds.length > 0) {
        await aiService.submitQuizAttempt(quizIds[0], score, userAnswers as any);
      }
      setQuizSubmitted(true);
      showToast('Jawaban kuis sukses dikirim! 🚀', 'success');
    } catch (err) {
      showToast('Gagal nyimpen hasil kuis.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetQuiz = () => {
    setQuizStarted(false);
    setQuizSubmitted(false);
    setQuizQuizzes([]);
    setQuizIds([]);
    setCurrentIdx(0);
    setUserAnswers({});
  };

  // If user does not have 'quiz' feature, show Paywall
  if (user && user.pricingPlan && !user.pricingPlan.features.includes('quiz')) {
    return (
      <AuthGuard>
        <div className="app-shell">
          <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

          <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Appbar title="Kuis AI Custom" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - var(--appbar-height))',
                padding: '2rem',
              }}
            >
              <Card
                style={{
                  maxWidth: '520px',
                  width: '100%',
                  textAlign: 'center',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(0, 212, 255, 0.1)',
                  padding: '3rem 2rem',
                }}
              >
                <ShieldAlert size={60} style={{ color: 'rgb(0, 212, 255)', margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                  Fitur Kuis AI Custom Premium
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(160, 160, 200, 0.8)', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Dapatkan kemampuan untuk menggabungkan beberapa sesi kuliah sekaligus (Flexible Quiz Predictor) untuk mensimulasikan kuis kisi-kisi UTS/UAS secara instan. Fitur ini eksklusif untuk pengguna **PRO**.
                </p>
                <Link href="/billing" style={{ textDecoration: 'none' }}>
                  <Button style={{ width: '100%', justifyContent: 'center' }} rightIcon={<ArrowRight size={16} />}>
                    Upgrade ke PRO Hanya Rp 49.000
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredFeature="quiz">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Kuis AI Custom" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {/* Title */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap style={{ color: 'rgb(0, 212, 255)' }} />
                Flexible Quiz Predictor (PRO)
              </h2>
              <p style={{ color: 'rgba(160, 160, 200, 0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Pilih kelas dan kustomisasi sesi pertemuan mana saja yang ingin diujikan oleh AI untuk kisi-kisi ujian.
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: '1.5rem' }}>
                <Alert type="error" message={error} />
              </div>
            )}

            {loadingClasses ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'rgb(0, 212, 255)' }} />
              </div>
            ) : classes.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                <BookOpen size={48} style={{ color: 'rgba(160, 160, 200, 0.2)', marginBottom: '1rem' }} />
                <p style={{ color: 'rgba(160, 160, 200, 0.8)', marginBottom: '1.5rem' }}>
                  Anda belum memiliki kelas. Bikin kelas dulu yuk di dashboard.
                </p>
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <Button>Balik ke Dashboard</Button>
                </Link>
              </Card>
            ) : !quizStarted ? (
              // Quiz Builder Form
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Select Class */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <SelectOption label="Pilih Kelas Kuliah" value={selectedClassId} onChange={v => setSelectedClassId(v)} options={classes.map((cls) => ({ value: cls.id, label: cls.name }))} />
                    </div>

                    {/* Question Count */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <SelectOption label="Jumlah Soal" value={String(questionCount)} onChange={v => setQuestionCount(Number(v))} options={[5, 10, 15, 20].map((n) => ({ value: String(n), label: `${n} Soal Pilihan Ganda` }))} />
                    </div>

                    {/* Sessions Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240, 240, 255, 0.8)' }}>
                        Pilih Pertemuan Kuliah (Bisa Multi-Sesi)
                      </label>

                      {loadingSessions ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                          <Loader2 className="animate-spin" size={20} style={{ color: 'rgb(0, 212, 255)' }} />
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '0.75rem',
                            maxHeight: '280px',
                            overflowY: 'auto',
                            padding: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '8px',
                          }}
                        >
                          {sessions.map((sess) => {
                            const isChecked = selectedSessionIds.includes(sess.id);
                            return (
                              <label
                                key={sess.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.625rem 0.875rem',
                                  borderRadius: '8px',
                                  background: isChecked ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                                  border: isChecked ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                  color: isChecked ? 'white' : 'rgba(160, 160, 200, 0.8)',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  userSelect: 'none',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSession(sess.id)}
                                  style={{ accentColor: 'rgb(0, 212, 255)', cursor: 'pointer' }}
                                />
                                <span>{sess.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <Button
                        onClick={handleGenerateQuiz}
                        disabled={isGenerating || selectedSessionIds.length === 0}
                        isLoading={isGenerating}
                        leftIcon={<Sparkles size={16} />}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        Buat Kuis Prediksi AI
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : quizSubmitted ? (
              // Quiz Results View
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card style={{ textAlign: 'center', padding: '2.5rem 1.5rem', border: '1px solid rgba(255, 255, 255, 0.06)', background: 'rgba(15, 25, 52, 0.4)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>
                    Hasil Evaluasi Kuis Custom
                  </h4>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: quizScore >= 70 ? 'rgb(0, 245, 160)' : 'rgb(248, 113, 113)', margin: '0.5rem 0' }}>
                    {quizScore}
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: 999, background: quizScore >= 70 ? 'rgba(0, 245, 160, 0.15)' : 'rgba(248, 113, 113, 0.15)', color: quizScore >= 70 ? 'rgb(0, 245, 160)' : 'rgb(248, 113, 113)', fontWeight: 700 }}>
                    {quizScore >= 70 ? 'LULUS EVALUASI' : 'BELUM LULUS'}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(160, 160, 200, 0.7)', marginTop: '1rem', marginBottom: '1.5rem' }}>
                    {quizScore >= 70
                      ? 'Gokil! Jawaban prediksi lo mantap banget.'
                      : 'Cek materi yang salah di bawah dan coba lagi kuis prediksinya ya.'}
                  </p>
                  <Button variant="secondary" onClick={handleResetQuiz} leftIcon={<RotateCcw size={16} />}>
                    Bikin Kuis Baru
                  </Button>
                </Card>

                {/* Question Review */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
                    Bahas Kuis:
                  </h4>
                  {quizQuizzes.map((q, idx) => {
                    const userAnswer = userAnswers[idx];
                    const isCorrect = userAnswer === q.answerKey;

                    return (
                      <Card
                        key={idx}
                        style={{
                          border: `1px solid ${isCorrect ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)'}`,
                          background: isCorrect ? 'rgba(52, 211, 153, 0.02)' : 'rgba(248, 113, 113, 0.02)',
                          padding: '1.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          {isCorrect ? (
                            <CheckCircle2 size={18} style={{ color: 'rgb(52, 211, 153)', flexShrink: 0, marginTop: 2 }} />
                          ) : (
                            <XCircle size={18} style={{ color: 'rgb(248, 113, 113)', flexShrink: 0, marginTop: 2 }} />
                          )}
                          <div>
                            <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', lineHeight: 1.4 }}>
                              {idx + 1}. {q.question}
                            </h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
                              {q.options?.map((opt: string, oIdx: number) => {
                                const letter = opt.trim().charAt(0);
                                const isUserSelected = userAnswer === letter;
                                const isCorrectKey = q.answerKey === letter;

                                return (
                                  <div
                                    key={oIdx}
                                    style={{
                                      fontSize: '0.8rem',
                                      padding: '0.5rem',
                                      borderRadius: '6px',
                                      background: isCorrectKey
                                        ? 'rgba(52, 211, 153, 0.15)'
                                        : isUserSelected
                                        ? 'rgba(248, 113, 113, 0.15)'
                                        : 'rgba(255,255,255,0.02)',
                                      border: '1px solid rgba(255,255,255,0.04)',
                                      color: isCorrectKey
                                        ? 'rgb(52, 211, 153)'
                                        : isUserSelected
                                        ? 'rgb(248, 113, 113)'
                                        : 'rgba(160,160,200,0.8)',
                                      fontWeight: isCorrectKey || isUserSelected ? 600 : 400,
                                    }}
                                  >
                                    {opt}
                                  </div>
                                );
                              })}
                            </div>
                            {q.explanation && (
                              <p style={{ fontSize: '0.8rem', color: 'rgba(160, 160, 200, 0.7)', marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                                💡 <b>Bahas Detail:</b> {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Quiz Wizard Mode
              (() => {
                const q = quizQuizzes[currentIdx];
                return (
                  <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(160, 160, 200, 0.8)', fontWeight: 600 }}>
                        Pertanyaan {currentIdx + 1} dari {quizQuizzes.length}
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(0, 212, 255, 0.1)', color: 'rgb(0, 212, 255)', fontWeight: 600 }}>
                        {Math.round((currentIdx / quizQuizzes.length) * 100)}% Selesai
                      </span>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', lineHeight: 1.5 }}>
                        {q.question}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {q.options?.map((opt: string, oIdx: number) => {
                        const letter = opt.trim().charAt(0);
                        const isSelected = userAnswers[currentIdx] === letter;

                        return (
                          <button
                            key={oIdx}
                            onClick={() => {
                              setUserAnswers((prev) => ({ ...prev, [currentIdx]: letter }));
                            }}
                            style={{
                              padding: '0.875rem 1.25rem',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                              border: isSelected ? '1px solid rgb(0, 212, 255)' : '1px solid rgba(255,255,255,0.06)',
                              color: isSelected ? 'rgb(0, 212, 255)' : 'rgba(240, 240, 255, 0.9)',
                              textAlign: 'left',
                              fontSize: '0.9rem',
                              fontWeight: isSelected ? 600 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                      <Button
                        variant="ghost"
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx((p) => p - 1)}
                        leftIcon={<ChevronLeft size={16} />}
                      >
                        Balik
                      </Button>

                      {currentIdx < quizQuizzes.length - 1 ? (
                        <Button
                          disabled={!userAnswers[currentIdx]}
                          onClick={() => setCurrentIdx((p) => p + 1)}
                          rightIcon={<ChevronRight size={16} />}
                        >
                          Lanjut
                        </Button>
                      ) : (
                        <Button
                          disabled={!userAnswers[currentIdx] || isSubmitting}
                          isLoading={isSubmitting}
                          onClick={handleSubmitQuiz}
                          rightIcon={<CheckCircle2 size={16} />}
                        >
                          Kirim Jawaban 🚀
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
