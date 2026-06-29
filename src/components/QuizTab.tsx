'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@/models/Class';
import { Material } from '@/models/File';
import { aiService } from '@/services/aiService';
import { useAiJob } from '@/lib/useAiJob';
import { Card, Button, SelectOption, useToast } from '@/components/ui';
import {
  HelpCircle,
  Sparkles,
  Play,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Users,
  Settings,
} from 'lucide-react';

interface QuizAttemptRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  score: number;
  passed: boolean;
  createdAt: string;
}

interface QuizTabProps {
  sessions: Session[];
  selectedSession: Session | null;
  setSelectedSession: (s: Session) => void;
  quizzes: any[];
  uploadedMaterials: Material[];
  sessionDetailsLoading: boolean;
  refetchSessionDetails: () => void;
  hasQuizFeature: boolean;
}

export function QuizTab({
  sessions,
  selectedSession,
  setSelectedSession,
  quizzes,
  uploadedMaterials,
  sessionDetailsLoading,
  refetchSessionDetails,
  hasQuizFeature,
}: QuizTabProps) {
  const { showToast } = useToast();
  const quizGenJobQT = useAiJob<any>('generate_quiz', {
    onComplete: () => { refetchSessionDetails(); showToast('Kuis AI berhasil dibuat!', 'success'); },
    onError: (err) => showToast(err || 'Gagal menghasilkan kuis.', 'error'),
  });
  const isGeneratingQuiz = quizGenJobQT.isProcessing;
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  // Quiz settings
  const [questionCount, setQuestionCount] = useState('10');
  const [showSettings, setShowSettings] = useState(false);

  // Attempts history
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Shuffle quiz options: returns shuffled options with mapped answer tracking
  const shuffleOptions = (options: string[], answerKey: string): { shuffledOptions: string[]; newAnswerKey: string } => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const parsed = options.map((opt) => ({
      originalLetter: opt.trim().charAt(0),
      text: opt.trim().replace(/^[A-F]\.\s*/, ''),
    }));
    // Fisher-Yates shuffle
    for (let i = parsed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [parsed[i], parsed[j]] = [parsed[j], parsed[i]];
    }
    const shuffledOptions = parsed.map((p, i) => `${letters[i]}. ${p.text}`);
    const correctIdx = parsed.findIndex(p => p.originalLetter === answerKey);
    const newAnswerKey = letters[correctIdx] || answerKey;
    return { shuffledOptions, newAnswerKey };
  };

  // Memoize shuffled quizzes
  const [shuffledQuizzes, setShuffledQuizzes] = useState<{ question: string; options: string[]; answerKey: string; explanation?: string }[]>([]);
  useEffect(() => {
    if (quizzes.length > 0) {
      const shuffled = quizzes.map((q) => {
        const parsed = JSON.parse(q.question);
        const { shuffledOptions, newAnswerKey } = shuffleOptions(parsed.options, parsed.answerKey);
        return { question: parsed.question, options: shuffledOptions, answerKey: newAnswerKey, explanation: parsed.explanation };
      });
      setShuffledQuizzes(shuffled);
    } else {
      setShuffledQuizzes([]);
    }
  }, [quizzes]);

  const fetchAttempts = useCallback(async () => {
    if (!selectedSession) return;
    setLoadingAttempts(true);
    try {
      const data = await aiService.getQuizAttempts(selectedSession.id);
      setAttempts(Array.isArray(data) ? data : []);
    } catch { setAttempts([]); }
    finally { setLoadingAttempts(false); }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession && quizzes.length > 0) fetchAttempts();
  }, [selectedSession, quizzes.length, fetchAttempts]);

  const handleGenerateQuiz = async () => {
    if (!selectedSession) return;
    try { await quizGenJobQT.trigger(() => aiService.generateQuiz([selectedSession.id], parseInt(questionCount) || 10)); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal menghasilkan kuis.', 'error'); }
  };

  const handleSubmitQuiz = async () => {
    if (shuffledQuizzes.length === 0) return;
    let correctCount = 0;
    shuffledQuizzes.forEach((q, idx) => { if (userAnswers[idx] === q.answerKey) correctCount++; });
    const score = Math.round((correctCount / shuffledQuizzes.length) * 100);
    setQuizScore(score);
    setIsSubmittingAttempt(true);
    try {
      await aiService.submitQuizAttempt(quizzes[0].id, score, userAnswers as any);
      setQuizSubmitted(true);
      fetchAttempts();
      showToast('Jawaban kuis berhasil dikirim!', 'success');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal mengirim nilai kuis.', 'error'); }
    finally { setIsSubmittingAttempt(false); }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  if (!hasQuizFeature) {
    return (
      <Card style={{ textAlign: 'center', padding: '2rem' }}>
        <HelpCircle size={28} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3, marginBottom: '0.4rem' }} />
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Fitur kuis tidak tersedia di paket Anda.</p>
      </Card>
    );
  }

  // Session selection step
  if (!selectedSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: '0.25rem' }}>Pilih Pertemuan untuk Kuis</h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '0.5rem' }}>Kuis AI dihasilkan dari rangkuman materi per pertemuan.</p>
        {sessions.map((sess) => (
          <Card key={sess.id} hoverable style={{ padding: '0.6rem 0.85rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => { setSelectedSession(sess); resetQuiz(); }}>
            <div>
              <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 500 }}>{sess.title}</h4>
              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{sess._count?.quizzes || 0} kuis • {sess._count?.materials || 0} berkas</span>
            </div>
            <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
          </Card>
        ))}
      </div>
    );
  }

  if (sessionDetailsLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} /></div>;
  }

  // Attempts history panel
  const attemptsPanel = attempts.length > 0 && (
    <Card style={{ padding: '1rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
      <button onClick={() => setShowHistory(!showHistory)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
          <Trophy size={14} style={{ color: '#fbbf24' }} /> Riwayat & Peringkat
          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 400 }}>({attempts.length})</span>
        </h4>
        <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))', transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {showHistory && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {attempts.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: i === 0 ? 'rgba(var(--color-primary) / 0.04)' : 'transparent', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-muted))', width: '1.5rem' }}>#{i + 1}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                  {a.userName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>{a.userName}</span>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={9} /> {new Date(a.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: a.passed ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>{a.score}</span>
                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 600, background: a.passed ? 'rgba(var(--color-success) / 0.1)' : 'rgba(var(--color-error) / 0.1)', color: a.passed ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}>
                  {a.passed ? 'LULUS' : 'GAGAL'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  // No quizzes yet - generate with settings
  if (quizzes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button onClick={() => { setSelectedSession(null as any); resetQuiz(); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-sm)', fontWeight: 500, fontFamily: 'inherit' }}>← Pilih Pertemuan</button>
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <HelpCircle size={28} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3, marginBottom: '0.5rem' }} />
          <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.25rem' }}>Kuis Belum Dibuat</h4>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>{selectedSession.title}</p>

          {/* Quiz settings */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)', fontFamily: 'inherit' }}>
              <Settings size={12} /> Pengaturan
            </button>
          </div>
          {showSettings && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ maxWidth: 200 }}>
                <SelectOption
                  label="Jumlah Soal"
                  value={questionCount}
                  onChange={setQuestionCount}
                  options={[
                    { value: '5', label: '5 soal' },
                    { value: '10', label: '10 soal' },
                    { value: '15', label: '15 soal' },
                    { value: '20', label: '20 soal' },
                    { value: '25', label: '25 soal' },
                    { value: '30', label: '30 soal' },
                  ]}
                />
              </div>
            </div>
          )}

          <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !uploadedMaterials.some((m) => m.status === 'SUCCESS')} isLoading={isGeneratingQuiz} size="sm" leftIcon={<Sparkles size={13} />}>
            {!uploadedMaterials.some((m) => m.status === 'SUCCESS') ? 'Unggah Materi Dulu' : `Buat ${questionCount} Soal Kuis AI`}
          </Button>
        </Card>
      </div>
    );
  }

  // Quiz intro
  if (!quizStarted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button onClick={() => { setSelectedSession(null as any); resetQuiz(); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-sm)', fontWeight: 500, fontFamily: 'inherit' }}>← Pilih Pertemuan</button>
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <HelpCircle size={28} style={{ color: 'rgb(var(--color-primary))', marginBottom: '0.5rem' }} />
          <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.25rem' }}>Latihan Kuis AI</h4>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>{quizzes.length} soal pilihan ganda • {selectedSession.title}</p>
          {showSettings ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ maxWidth: 200 }}>
                  <SelectOption
                    label="Jumlah Soal"
                    value={questionCount}
                    onChange={setQuestionCount}
                    options={[
                      { value: '5', label: '5 soal' },
                      { value: '10', label: '10 soal' },
                      { value: '15', label: '15 soal' },
                      { value: '20', label: '20 soal' },
                      { value: '25', label: '25 soal' },
                      { value: '30', label: '30 soal' },
                    ]}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <Button size="sm" onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} isLoading={isGeneratingQuiz} leftIcon={<Sparkles size={13} />}>Buat {questionCount} Soal Baru</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>Batal</Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <Button size="sm" onClick={() => setQuizStarted(true)} leftIcon={<Play size={13} />}>Mulai Kuis</Button>
              <Button size="sm" variant="outline" onClick={() => setShowSettings(true)} leftIcon={<Settings size={13} />}>Atur Ulang</Button>
            </div>
          )}
        </Card>
        {attemptsPanel}
      </div>
    );
  }

  // Quiz submitted - results
  if (quizSubmitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
          <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.2rem' }}>Hasil Kuis</h4>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: quizScore >= 70 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))', margin: '0.5rem 0' }}>{quizScore}</div>
          <span style={{ fontSize: 'var(--font-xs)', padding: '0.15rem 0.5rem', borderRadius: '4px', background: quizScore >= 70 ? 'rgba(var(--color-success) / 0.1)' : 'rgba(var(--color-error) / 0.1)', color: quizScore >= 70 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))', fontWeight: 600 }}>
            {quizScore >= 70 ? 'LULUS' : 'BELUM LULUS'}
          </span>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.75rem', marginBottom: '1rem' }}>
            {quizScore >= 70 ? 'Pemahaman materi bagus!' : 'Baca kembali rangkuman dan coba lagi.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={resetQuiz} leftIcon={<RotateCcw size={13} />}>Ulangi</Button>
            <Button variant="outline" size="sm" onClick={() => { resetQuiz(); setShowSettings(true); }} leftIcon={<Settings size={13} />}>Atur Ulang</Button>
          </div>
        </Card>

        {/* Answer review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase' }}>Pembahasan</h4>
          {shuffledQuizzes.map((parsed, idx) => {
            const userAns = userAnswers[idx];
            const isCorrect = userAns === parsed.answerKey;
            return (
              <Card key={idx} style={{ padding: '0.75rem', border: `1px solid ${isCorrect ? 'rgba(var(--color-success) / 0.15)' : 'rgba(var(--color-error) / 0.15)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                  {isCorrect ? <CheckCircle2 size={15} style={{ color: 'rgb(var(--color-success))', flexShrink: 0, marginTop: 2 }} /> : <XCircle size={15} style={{ color: 'rgb(var(--color-error))', flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ flex: 1 }}>
                    <h5 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, lineHeight: 1.4 }}>{idx + 1}. {parsed.question}</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {parsed.options.map((opt: string, oi: number) => {
                        const letter = opt.trim().charAt(0);
                        const isKey = parsed.answerKey === letter;
                        const isUser = userAns === letter;
                        return (
                          <div key={oi} style={{
                            fontSize: 'var(--font-xs)', padding: '0.35rem', borderRadius: '4px',
                            background: isKey ? 'rgba(var(--color-success) / 0.1)' : isUser ? 'rgba(var(--color-error) / 0.1)' : 'var(--input-bg)',
                            color: isKey ? 'rgb(var(--color-success))' : isUser ? 'rgb(var(--color-error))' : 'rgb(var(--text-secondary))',
                            fontWeight: isKey || isUser ? 600 : 400,
                          }}>{opt}</div>
                        );
                      })}
                    </div>
                    {parsed.explanation && <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.5rem', paddingLeft: '0.4rem', borderLeft: '2px solid var(--border-default)' }}>💡 {parsed.explanation}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {attemptsPanel}
      </div>
    );
  }

  // Quiz wizard
  const currentQ = shuffledQuizzes[currentQuestionIdx];
  if (!currentQ) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} /></div>;
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.5rem' }}>
        <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', fontWeight: 500 }}>Soal {currentQuestionIdx + 1}/{shuffledQuizzes.length}</span>
        <span style={{ fontSize: 'var(--font-xs)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(var(--color-primary) / 0.08)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
          {Math.round((currentQuestionIdx / quizzes.length) * 100)}%
        </span>
      </div>
      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, lineHeight: 1.5 }}>{currentQ.question}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {currentQ.options.map((opt: string, idx: number) => {
          const letter = opt.trim().charAt(0);
          const isSelected = userAnswers[currentQuestionIdx] === letter;
          return (
            <button key={idx} onClick={() => setUserAnswers((p) => ({ ...p, [currentQuestionIdx]: letter }))} style={{
              padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 'var(--font-sm)', fontWeight: isSelected ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'var(--transition-fast)',
              background: isSelected ? 'rgba(var(--color-primary) / 0.08)' : 'var(--input-bg)',
              border: isSelected ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
              color: isSelected ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
            }}>{opt}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.75rem' }}>
        <Button variant="ghost" size="sm" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx((p) => p - 1)} leftIcon={<ChevronLeft size={14} />}>Kembali</Button>
        {currentQuestionIdx < shuffledQuizzes.length - 1 ? (
          <Button size="sm" disabled={!userAnswers[currentQuestionIdx]} onClick={() => setCurrentQuestionIdx((p) => p + 1)} rightIcon={<ChevronRight size={14} />}>Lanjut</Button>
        ) : (
          <Button size="sm" disabled={!userAnswers[currentQuestionIdx] || isSubmittingAttempt} isLoading={isSubmittingAttempt} onClick={handleSubmitQuiz} rightIcon={<CheckCircle2 size={14} />}>Kirim</Button>
        )}
      </div>
    </Card>
  );
}
