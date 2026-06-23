'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button } from '@/components/ui';
import { ChevronRight, Share2, RotateCcw, Sparkles } from 'lucide-react';

// ─── Quiz Data ─────────────────────────────────────────────────────────────────
interface Question {
  text: string;
  options: { label: string; scores: Record<string, number> }[];
}

const QUESTIONS: Question[] = [
  {
    text: 'Gaji/uang jajan baru masuk. Yang pertama kamu lakuin?',
    options: [
      { label: 'Langsung belanja yang udah diincer 🛒', scores: { impulsive: 3, planner: 0, survivor: 0, investor: 0 } },
      { label: 'Sisihkan tabungan dulu, baru santai 💰', scores: { impulsive: 0, planner: 2, survivor: 0, investor: 3 } },
      { label: 'Bayar tagihan & kebutuhan pokok dulu', scores: { impulsive: 0, planner: 3, survivor: 2, investor: 1 } },
      { label: 'Hmm... biarin aja dulu di rekening', scores: { impulsive: 0, planner: 1, survivor: 3, investor: 0 } },
    ],
  },
  {
    text: 'Temen ngajak nongkrong dadakan. Dompet lagi tipis. Kamu?',
    options: [
      { label: 'YOLO! Ikut aja, urusan duit belakangan 🎉', scores: { impulsive: 3, planner: 0, survivor: 0, investor: 0 } },
      { label: 'Ikut tapi set budget max dulu', scores: { impulsive: 0, planner: 3, survivor: 1, investor: 1 } },
      { label: '"Gue pass deh, lagi hemat" 🙏', scores: { impulsive: 0, planner: 1, survivor: 3, investor: 2 } },
      { label: 'Ikut tapi cari tempat yang murce', scores: { impulsive: 1, planner: 2, survivor: 2, investor: 0 } },
    ],
  },
  {
    text: 'Ada flash sale 12.12. Kamu biasanya...',
    options: [
      { label: 'Checkout semua yang di wishlist tanpa mikir 🛍️', scores: { impulsive: 3, planner: 0, survivor: 0, investor: 0 } },
      { label: 'Beli yang emang BUTUH aja, skip yang cuma MAU', scores: { impulsive: 0, planner: 3, survivor: 2, investor: 1 } },
      { label: 'Gak buka marketplace sama sekali (bahaya!) 🚫', scores: { impulsive: 0, planner: 1, survivor: 3, investor: 2 } },
      { label: 'Manfaatin buat beli kebutuhan 3 bulan ke depan sekaligus', scores: { impulsive: 0, planner: 2, survivor: 1, investor: 3 } },
    ],
  },
  {
    text: 'Pas lihat saldo rekening menipis, perasaan kamu...',
    options: [
      { label: '"Yaudah lah, rejeki gak kemana" 😌', scores: { impulsive: 3, planner: 0, survivor: 1, investor: 0 } },
      { label: 'Panik, langsung hitung ulang budget 😰', scores: { impulsive: 0, planner: 3, survivor: 2, investor: 1 } },
      { label: 'Biasa aja, emang selalu tipis 💀', scores: { impulsive: 1, planner: 0, survivor: 3, investor: 0 } },
      { label: 'Cari cara nambah income (side hustle, freelance)', scores: { impulsive: 0, planner: 1, survivor: 1, investor: 3 } },
    ],
  },
  {
    text: 'Kamu dapet uang tak terduga 500rb. Kamu akan...',
    options: [
      { label: 'Treat myself! Udah lama gak self-reward ✨', scores: { impulsive: 3, planner: 1, survivor: 0, investor: 0 } },
      { label: 'Masukin tabungan darurat', scores: { impulsive: 0, planner: 2, survivor: 2, investor: 2 } },
      { label: 'Bayar hutang / tagihan yang nunggak', scores: { impulsive: 0, planner: 1, survivor: 3, investor: 1 } },
      { label: 'Invest atau beli aset (emas, saham, crypto)', scores: { impulsive: 0, planner: 1, survivor: 0, investor: 3 } },
    ],
  },
  {
    text: 'Pendekatan kamu ke catat pengeluaran:',
    options: [
      { label: 'Catat? Haha gak pernah 😂', scores: { impulsive: 3, planner: 0, survivor: 1, investor: 0 } },
      { label: 'Catat tiap transaksi, sampe receh sekalipun', scores: { impulsive: 0, planner: 3, survivor: 1, investor: 2 } },
      { label: 'Kadang catat, kadang lupa', scores: { impulsive: 2, planner: 1, survivor: 2, investor: 0 } },
      { label: 'Gak catat detail tapi selalu tau saldo & budget tersisa', scores: { impulsive: 0, planner: 2, survivor: 1, investor: 3 } },
    ],
  },
  {
    text: 'Relationship kamu sama "nabung":',
    options: [
      { label: 'Nabung itu mitos, yang penting happy 🌈', scores: { impulsive: 3, planner: 0, survivor: 1, investor: 0 } },
      { label: 'Auto-debit ke tabungan tiap bulan, gak kesentuh', scores: { impulsive: 0, planner: 2, survivor: 0, investor: 3 } },
      { label: 'Pengen nabung tapi selalu kepake lagi 😭', scores: { impulsive: 1, planner: 1, survivor: 3, investor: 0 } },
      { label: 'Punya target nabung jelas + timeline', scores: { impulsive: 0, planner: 3, survivor: 0, investor: 2 } },
    ],
  },
];

// ─── Personality Types ──────────────────────────────────────────────────────────
interface PersonalityType {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  description: string;
  color: string;
  gradient: string;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}

const TYPES: Record<string, PersonalityType> = {
  impulsive: {
    id: 'impulsive',
    title: 'The Midnight Shopper',
    emoji: '🛒',
    subtitle: 'Spontan, YOLO, anti ribet',
    description: 'Kamu tipe yang percaya hidup cuma sekali. Belanja = healing. Budget? Apa itu? Yang penting happy dulu, urusan duit pikir nanti. 💫',
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    strengths: ['Berani ambil keputusan cepat', 'Gak pelit sama diri sendiri', 'Generous ke temen'],
    weaknesses: ['Sering nyesel setelah checkout', 'Akhir bulan selalu kritis', 'Tabungan? What tabungan?'],
    tips: ['Set "cooling period" 24 jam sebelum beli > 100rb', 'Unfollow akun jualan yang bikin FOMO', 'Pakai Si Bawel level CEREWET 🔥'],
  },
  planner: {
    id: 'planner',
    title: 'The Spreadsheet Lord',
    emoji: '📊',
    subtitle: 'Terencana, detail, anti bocor',
    description: 'Kamu tau persis kemana setiap rupiah pergi. Budget itu sacred. Excel/spreadsheet adalah best friend kamu. Some call it OCD, kamu call it financial literacy 🤓',
    color: '#4ECDC4',
    gradient: 'linear-gradient(135deg, #4ECDC4, #44B4AD)',
    strengths: ['Keuangan terkontrol & predictable', 'Jarang panik akhir bulan', 'Punya tabungan darurat'],
    weaknesses: ['Kadang terlalu kaku & gak enjoy', 'Overthink sebelum beli barang kecil', 'Temen kadang sebel diajak nongkrong'],
    tips: ['Alokasikan "fun budget" tanpa rasa bersalah', 'Sesekali treat yourself tanpa hitung-hitungan', 'Balance is key, you earned it! 🎉'],
  },
  survivor: {
    id: 'survivor',
    title: 'The End-of-Month Warrior',
    emoji: '⚔️',
    subtitle: 'Bertahan hidup level dewa',
    description: 'Kamu expert bertahan dengan saldo minimal. Indomie 3x sehari? Been there. Tapi somehow selalu survive. Skill adaptasi kamu S-tier 💪',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
    strengths: ['Adaptif & resourceful', 'Bisa hidup minimalis kalau perlu', 'Gak gengsi'],
    weaknesses: ['Gak punya buffer kalau ada emergency', 'Sering stress soal uang', 'Stuck di survival mode terus'],
    tips: ['Mulai dari kecil: sisihkan 10rb/hari', 'Cari sumber income tambahan (freelance, part-time)', 'Pakai fitur Saving Tree buat motivasi visual 🌳'],
  },
  investor: {
    id: 'investor',
    title: 'The Future Millionaire',
    emoji: '💎',
    subtitle: 'Visioner, strategic, growth mindset',
    description: 'Kamu mikirin masa depan lebih sering dari masa sekarang. Setiap pengeluaran = investasi atau expense. Compound interest is your love language 📈',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    strengths: ['Punya visi jangka panjang', 'Disiplin dan konsisten', 'Terus belajar financial literacy'],
    weaknesses: ['Kadang lupa enjoy the present', 'Overthink sampe analysis paralysis', 'Bisa terkesan pelit padahal cuma strategic'],
    tips: ['Enjoy the journey, bukan cuma tujuannya', 'Set monthly "no-guilt spending"', 'Share knowledge ke temen-temen yang butuh 🤝'],
  },
};

// ─── Component ──────────────────────────────────────────────────────────────────
export default function FinancialQuizPage() {
  useAuth();
  const [step, setStep] = useState(0); // 0 = intro, 1-7 = questions, 8 = result
  const [answers, setAnswers] = useState<number[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const result = useMemo(() => {
    if (answers.length < QUESTIONS.length) return null;
    const scores: Record<string, number> = { impulsive: 0, planner: 0, survivor: 0, investor: 0 };
    answers.forEach((ansIdx, qIdx) => {
      const option = QUESTIONS[qIdx].options[ansIdx];
      if (option) {
        Object.entries(option.scores).forEach(([type, score]) => {
          scores[type] += score;
        });
      }
    });
    const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    return { type: TYPES[maxType], scores, maxType };
  }, [answers]);

  const handleAnswer = (optionIdx: number) => {
    setAnswers([...answers, optionIdx]);
    setStep(step + 1);
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `Tipe keuangan gue: ${result.type.emoji} ${result.type.title}\n"${result.type.subtitle}"\n\nCek tipe kamu di Synapse! 💰`;
    if (navigator.share) {
      await navigator.share({ title: 'Financial Personality Quiz', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const progress = step > 0 ? Math.round(((step - 1) / QUESTIONS.length) * 100) : 0;

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 0 calc(var(--bottom-nav-height, 60px) + 16px)' }}>

              {/* ─── INTRO ─── */}
              {step === 0 && (
                <Card style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>💰</div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Tipe Keuangan Kamu Apa?</h1>
                  <p style={{ fontSize: 14, opacity: 0.6, marginBottom: 24, lineHeight: 1.6 }}>
                    7 pertanyaan simpel buat tau personality kamu soal duit.
                    <br />Jawab jujur ya, gak ada yang benar atau salah! 😉
                  </p>
                  <Button onClick={() => setStep(1)} style={{ padding: '14px 32px', fontSize: 16, borderRadius: 14 }}>
                    <Sparkles size={18} /> Mulai Quiz
                  </Button>
                </Card>
              )}

              {/* ─── QUESTIONS ─── */}
              {step >= 1 && step <= QUESTIONS.length && (
                <div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, opacity: 0.5 }}>
                      <span>Pertanyaan {step}/{QUESTIONS.length}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, borderRadius: 3, background: 'rgb(var(--color-primary))', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <Card style={{ padding: 24 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, lineHeight: 1.5 }}>
                      {QUESTIONS[step - 1].text}
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {QUESTIONS[step - 1].options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(i)}
                          style={{
                            padding: '14px 18px', borderRadius: 12, border: '1.5px solid var(--border-default)',
                            background: 'rgb(var(--bg-surface))', cursor: 'pointer', textAlign: 'left',
                            fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'rgb(var(--color-primary))'; (e.target as HTMLElement).style.background = 'rgba(var(--color-primary), 0.04)'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-default)'; (e.target as HTMLElement).style.background = 'rgb(var(--bg-surface))'; }}
                        >
                          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt.label}
                          <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                        </button>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* ─── RESULT ─── */}
              {step > QUESTIONS.length && result && (
                <div style={{ animation: 'fadeSlideIn 0.5s ease-out' }}>
                  {/* Result card */}
                  <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ padding: '32px 24px', textAlign: 'center', background: result.type.gradient, color: '#fff' }}>
                      <div style={{ fontSize: 56, marginBottom: 8 }}>{result.type.emoji}</div>
                      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{result.type.title}</h2>
                      <p style={{ fontSize: 14, opacity: 0.9 }}>{result.type.subtitle}</p>
                    </div>
                    <div style={{ padding: 24 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20, color: 'rgb(var(--text-secondary))' }}>
                        {result.type.description}
                      </p>

                      {/* Score breakdown */}
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Breakdown:</h4>
                        {Object.entries(result.scores).sort((a, b) => b[1] - a[1]).map(([type, score]) => {
                          const t = TYPES[type];
                          const maxScore = QUESTIONS.length * 3;
                          const pct = Math.round((score / maxScore) * 100);
                          return (
                            <div key={type} style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                <span>{t.emoji} {t.title}</span>
                                <span style={{ fontWeight: 600 }}>{pct}%</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: t.color, transition: 'width 0.6s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(var(--color-success), 0.06)', border: '1px solid rgba(var(--color-success), 0.15)' }}>
                          <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-success))', marginBottom: 8 }}>💪 Kelebihan</h5>
                          {result.type.strengths.map((s, i) => (
                            <p key={i} style={{ fontSize: 12, margin: '4px 0', opacity: 0.8 }}>• {s}</p>
                          ))}
                        </div>
                        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(var(--color-error), 0.06)', border: '1px solid rgba(var(--color-error), 0.15)' }}>
                          <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-error))', marginBottom: 8 }}>⚠️ Watch out</h5>
                          {result.type.weaknesses.map((w, i) => (
                            <p key={i} style={{ fontSize: 12, margin: '4px 0', opacity: 0.8 }}>• {w}</p>
                          ))}
                        </div>
                      </div>

                      {/* Tips */}
                      <div style={{ padding: 14, borderRadius: 12, background: 'rgba(var(--color-primary), 0.06)', border: '1px solid rgba(var(--color-primary), 0.15)', marginBottom: 20 }}>
                        <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-primary))', marginBottom: 8 }}>💡 Tips buat kamu</h5>
                        {result.type.tips.map((tip, i) => (
                          <p key={i} style={{ fontSize: 12, margin: '4px 0', opacity: 0.8 }}>• {tip}</p>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Button onClick={shareResult} style={{ flex: 1, justifyContent: 'center' }}>
                          <Share2 size={16} /> Share Hasil
                        </Button>
                        <Button variant="ghost" onClick={reset}>
                          <RotateCcw size={16} /> Ulang
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
