'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, useToast } from '@/components/ui';
import { Check, CreditCard, ShieldCheck, Zap, Crown, Clock, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface PlanData {
  id: string;
  name: string;
  description?: string;
  maxUploadPerMonth: number;
  maxFileSizeMb: number;
  aiRequestLimit: number;
  aiBriefingLimit: number;
  aiWeeklyRoastLimit: number;
  aiFoodLimit: number;
  aiDigitalizationLimit: number;
  aiInsightLimit: number;
  aiExamPredictionLimit: number;
  aiQuizGenLimit: number;
  aiReceiptScanLimit: number;
  aiSkripsweetLimit: number;
  aiTodoParseLimit: number;
  features: string[];
  price: number;
  durationDays: number;
}

interface PaymentHistory {
  id: string;
  orderId: string;
  plan: string;
  grossAmount: number;
  transactionStatus: string;
  snapToken: string | null;
  createdAt: string;
}

// Maps feature IDs to user-friendly labels
const FEATURE_LABELS: Record<string, string> = {
  class: 'Kelas & Pertemuan',
  forum: 'Forum & Diskusi',
  quiz: 'Kuis AI',
  task: 'Tugas Kelas',
  task_ai_solver: 'AI Solver Tugas',
  task_image_ocr: 'Foto Soal (OCR)',
  exam_prediction: 'Prediksi Ujian AI',
  exam_kisi_kisi: 'Upload Kisi-Kisi AI',
  ai_digitalization: 'AI Digitalisasi Materi',
  schedule_parser: 'AI Schedule Parser',
  pdf_export: 'Smart B5 Printer',
  ai_insight: 'AI Insight Mingguan',
  daily_briefing: 'Briefing Harian AI',
  duit_tracker: 'Duit Tracker',
  duit_tracker_bills: 'Tagihan Rutin',
  duit_tracker_debts: 'Pencatatan Hutang',
  duit_tracker_wishlist: 'Wishlist',
  duit_tracker_challenges: 'Budget Challenge',
  si_bawel: 'Si Bawel (AI Keuangan)',
  split_bill: 'Split Bill',
  receipt_scanner: 'Scan Struk',
  food_recommend: 'Makan Apa (AI Food)',
  todo_list: 'To-Do List',
  todo_calendar: 'Kalender Todo',
  todo_timeline: 'Timeline Todo',
  todo_recurring: 'Tugas Berulang',
  qna_public: 'Q&A Publik',
  qna_ai_answer: 'Jawaban AI Q&A',
  skripsweet: 'Skripsweet (Asisten Skripsi)',
  gamification: 'Gamifikasi & XP',
  gamification_leaderboard: 'Leaderboard',
  notification: 'Notifikasi',
  command_palette: 'Command Palette',
  virtual_pet: 'Virtual Pet',
  profile_card: 'Digital Identity Card',
  quiz_keuangan: 'Quiz Kepribadian Keuangan',
  kolektif: 'Kas Kelas (Kolektif)',
  canvas: 'Canvas Editor',
};

function buildFeatureList(plan: PlanData): string[] {
  const lines: string[] = [];
  lines.push(`${plan.maxUploadPerMonth} upload / bulan`);
  lines.push(`Maks file ${plan.maxFileSizeMb} MB`);
  lines.push(`${plan.aiRequestLimit} request AI / bulan`);
  if (plan.aiBriefingLimit > 0) lines.push(`${plan.aiBriefingLimit} briefing AI / hari`);
  if (plan.aiFoodLimit > 0) lines.push(`${plan.aiFoodLimit} food AI / hari`);
  if (plan.aiDigitalizationLimit > 0) lines.push(`${plan.aiDigitalizationLimit} digitalisasi AI / hari`);
  if (plan.aiQuizGenLimit > 0) lines.push(`${plan.aiQuizGenLimit} generate kuis / hari`);
  if (plan.aiReceiptScanLimit > 0) lines.push(`${plan.aiReceiptScanLimit} scan struk / hari`);
  if (plan.aiSkripsweetLimit > 0) lines.push(`${plan.aiSkripsweetLimit} skripsweet AI / hari`);

  // Add key features (pick most important ones for display)
  const importantFeatures = [
    'class', 'forum', 'quiz', 'task', 'task_ai_solver', 'exam_prediction',
    'ai_digitalization', 'daily_briefing', 'ai_insight',
    'duit_tracker', 'si_bawel', 'split_bill', 'receipt_scanner', 'food_recommend',
    'todo_list', 'todo_calendar', 'todo_recurring',
    'qna_public', 'qna_ai_answer', 'skripsweet',
    'gamification', 'gamification_leaderboard', 'virtual_pet',
    'profile_card', 'quiz_keuangan', 'command_palette',
  ];

  const activeFeatures = importantFeatures.filter(f => plan.features.includes(f));
  activeFeatures.forEach(f => {
    if (FEATURE_LABELS[f]) lines.push(FEATURE_LABELS[f]);
  });

  return lines;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
}

function formatDuration(days: number): string {
  if (days === 0) return 'selamanya';
  if (days >= 365) return `${Math.floor(days / 365)} tahun`;
  if (days >= 30) return `${Math.floor(days / 30)} bulan`;
  return `${days} hari`;
}

export default function BillingPage() {
  const { user, session, refetchProfile } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [resumingId, setResumingId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PlanData[]>('/payments/plans')
      .then(data => setPlans(data))
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
    // Fetch payment history
    apiFetch<PaymentHistory[]>('/payments/history')
      .then(data => setPayments(data))
      .catch(() => setPayments([]));
  }, []);

  const handleUpgrade = async (planName: string) => {
    if (planName === 'FREE') return;
    setIsLoading(planName);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/payments/create-snap-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ plan: planName }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Gagal membuat invoice.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const snapToken = data.snapToken;

      if (!snapToken) throw new Error('Gagal mendapatkan token pembayaran dari server.');

      if ((window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            setPaymentSuccess('Pembayaran berhasil! Memverifikasi...');
            showToast('Pembayaran berhasil!', 'success');
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/payments/verify`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ orderId: result.order_id || data.orderId }),
                }
              );
              showToast('Akun berhasil ditingkatkan!', 'success');
              await refetchProfile();
              apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
            } catch {
              showToast('Gagal memverifikasi status pembayaran.', 'warning');
            }
            setTimeout(() => window.location.reload(), 2000);
          },
          onPending: () => {
            showToast('Pembayaran tertunda. Cek riwayat untuk melanjutkan.', 'warning');
            apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
          },
          onError: () => { setPaymentError('Pembayaran gagal. Silakan coba lagi.'); showToast('Pembayaran gagal.', 'error'); },
          onClose: () => {
            // User closed popup — refresh history so pending payment shows up
            apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
          },
        });
      } else {
        throw new Error('Midtrans Snap SDK tidak termuat. Muat ulang halaman.');
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memulai pembayaran.');
    } finally {
      setIsLoading(null);
    }
  };

  const currentPlanName = user?.pricingPlan?.name || user?.plan || 'FREE';
  const hasPendingPayment = payments.some(p => p.transactionStatus === 'pending');

  const handleResume = async (orderId: string) => {
    setResumingId(orderId);
    setPaymentError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/payments/resume`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Gagal melanjutkan pembayaran.' }));
        throw new Error(errorData.message || 'Gagal melanjutkan pembayaran.');
      }

      const data = await response.json();
      if (!(window as any).snap) throw new Error('Midtrans Snap SDK tidak termuat. Muat ulang halaman.');

      (window as any).snap.pay(data.snapToken, {
        onSuccess: async (result: any) => {
          setPaymentSuccess('Pembayaran berhasil! Memverifikasi...');
          showToast('Pembayaran berhasil!', 'success');
          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/payments/verify`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ orderId: result.order_id || data.orderId }),
              }
            );
            showToast('Akun berhasil ditingkatkan!', 'success');
            await refetchProfile();
            apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
          } catch {
            showToast('Gagal memverifikasi.', 'warning');
          }
          setTimeout(() => window.location.reload(), 2000);
        },
        onPending: () => {
          showToast('Pembayaran tertunda. Cek riwayat untuk melanjutkan.', 'warning');
          apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
        },
        onError: () => { setPaymentError('Pembayaran gagal.'); showToast('Pembayaran gagal.', 'error'); },
        onClose: () => {
          apiFetch<PaymentHistory[]>('/payments/history').then(setPayments).catch(() => {});
        },
      });
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      showToast(err instanceof Error ? err.message : 'Gagal melanjutkan pembayaran.', 'error');
    } finally {
      setResumingId(null);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Script
          src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js'}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />

        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Billing & Upgrade" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Pilih Paket yang Tepat</h2>
              <p style={{ color: 'rgb(var(--text-muted))', marginTop: '0.35rem', fontSize: 'var(--font-sm)' }}>
                Tingkatkan kuota AI, upload, dan akses fitur premium.
              </p>
            </div>

            {/* Current plan info with expiry */}
            {currentPlanName !== 'FREE' && (user as any)?.planExpiresAt && (
              <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(var(--color-primary) / 0.05)', border: '1px solid rgba(var(--color-primary) / 0.15)' }}>
                <Crown size={20} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                    Paket {currentPlanName} aktif
                  </span>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: 8 }}>
                    Berlaku hingga {new Date((user as any).planExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </Card>
            )}

            {/* Data retention warning — shown when plan expired but data still retained */}
            {currentPlanName === 'FREE' && (user as any)?.dataRetentionDeadline && (
              <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: '#ef4444' }}>
                    Data premium kamu akan dihapus!
                  </span>
                  <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                    Langganan telah berakhir. Data fitur premium (briefing AI, food history, receipt scan, dll) masih tersimpan hingga{' '}
                    <strong>{new Date((user as any).dataRetentionDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                    {' '}Upgrade kembali sebelum tanggal tersebut agar data tidak hilang.
                  </span>
                </div>
              </Card>
            )}

            {paymentError && <div style={{ marginBottom: '1.5rem' }}><Alert type="error" message={paymentError} /></div>}
            {paymentSuccess && <div style={{ marginBottom: '1.5rem' }}><Alert type="success" message={paymentSuccess} /></div>}

            {/* Plans Grid */}
            {loadingPlans ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {[1, 2].map(n => <div key={n} className="skeleton" style={{ height: 400, borderRadius: 12 }} />)}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'stretch', marginBottom: '2rem' }}>
                {plans.map((plan, idx) => {
                  const isActive = currentPlanName === plan.name;
                  const isFree = plan.price === 0;
                  const isHighlighted = !isFree && idx > 0; // Highlight paid plans
                  const features = buildFeatureList(plan);

                  return (
                    <Card
                      key={plan.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '1.5rem',
                        position: 'relative',
                        border: isHighlighted ? '1px solid rgba(var(--color-primary) / 0.25)' : undefined,
                        boxShadow: isHighlighted ? 'var(--shadow-lg)' : undefined,
                        opacity: isActive ? 1 : isFree && currentPlanName !== 'FREE' ? 0.65 : 1,
                      }}
                    >
                      {/* Recommended badge for first paid plan */}
                      {isHighlighted && idx === 1 && (
                        <div style={{
                          position: 'absolute', top: -10, right: 20,
                          background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                          color: 'rgb(var(--bg-base))', fontSize: 'var(--font-xs)', fontWeight: 700,
                          padding: '0.2rem 0.6rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Crown size={10} /> RECOMMENDED
                        </div>
                      )}

                      <div>
                        {/* Plan name + active badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {plan.name}
                            {!isFree && <Zap size={14} style={{ color: 'rgb(var(--color-primary))' }} />}
                          </h3>
                          {isActive && (
                            <span style={{
                              fontSize: 'var(--font-xs)', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4,
                              background: isHighlighted ? 'rgba(var(--color-secondary) / 0.1)' : 'var(--input-bg)',
                              color: isHighlighted ? 'rgb(var(--color-secondary))' : 'rgb(var(--text-secondary))',
                              border: `1px solid ${isHighlighted ? 'rgba(var(--color-secondary) / 0.2)' : 'var(--border-default)'}`,
                            }}>
                              Aktif
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{formatPrice(plan.price)}</span>
                          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: 4 }}>
                            / {formatDuration(plan.durationDays)}
                          </span>
                        </div>

                        {/* Description */}
                        {plan.description && (
                          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
                            {plan.description}
                          </p>
                        )}

                        {/* Features */}
                        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {features.map((feat, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                              <Check size={14} style={{ color: isHighlighted ? 'rgb(var(--color-secondary))' : 'rgb(var(--color-primary))', flexShrink: 0 }} />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ marginTop: '1.5rem' }}>
                        {isActive ? (
                          <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                            Paket Aktif
                          </Button>
                        ) : isFree ? (
                          <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                            Gratis
                          </Button>
                        ) : plan.price < (plans.find(p => p.name === currentPlanName)?.price || 0) ? (
                          <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }}>
                            Paket lebih rendah
                          </Button>
                        ) : hasPendingPayment ? (
                          <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.7 }}>
                            Ada pembayaran tertunda ↓
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpgrade(plan.name)}
                            isLoading={isLoading === plan.name}
                            leftIcon={<CreditCard size={14} />}
                            style={{
                              width: '100%', justifyContent: 'center',
                              background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                              color: 'rgb(var(--bg-base))', border: 'none',
                            }}
                          >
                            Upgrade ke {plan.name}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} /> Riwayat Pembayaran
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {payments.map(payment => {
                    const isPending = payment.transactionStatus === 'pending';
                    const isSettlement = payment.transactionStatus === 'settlement';
                    const isExpired = payment.transactionStatus === 'expire';
                    const isCancelled = payment.transactionStatus === 'cancel';

                    const statusConfig = isSettlement
                      ? { label: 'Berhasil', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={14} /> }
                      : isPending
                      ? { label: 'Menunggu', color: '#eab308', bg: 'rgba(234,179,8,0.1)', icon: <AlertCircle size={14} /> }
                      : isExpired
                      ? { label: 'Kadaluarsa', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <XCircle size={14} /> }
                      : isCancelled
                      ? { label: 'Dibatalkan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <XCircle size={14} /> }
                      : { label: payment.transactionStatus, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <AlertCircle size={14} /> };

                    return (
                      <div
                        key={payment.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.75rem 1rem', borderRadius: 8,
                          border: '1px solid var(--border-default)', background: 'var(--input-bg)',
                          flexWrap: 'wrap', gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                            {payment.plan} — {formatPrice(payment.grossAmount)}
                          </span>
                          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                            {new Date(payment.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 'var(--font-xs)', fontWeight: 600,
                            padding: '0.2rem 0.5rem', borderRadius: 4,
                            background: statusConfig.bg, color: statusConfig.color,
                          }}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                          {isPending && payment.snapToken && (
                            <Button
                              size="sm"
                              onClick={() => handleResume(payment.orderId)}
                              isLoading={resumingId === payment.orderId}
                              leftIcon={<RefreshCw size={12} />}
                              style={{
                                fontSize: 'var(--font-xs)',
                                background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                                color: 'rgb(var(--bg-base))', border: 'none',
                              }}
                            >
                              Lanjutkan
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Security banner */}
            <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
              <ShieldCheck size={28} style={{ color: 'rgb(var(--color-secondary))', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Transaksi Aman & Terenkripsi</h4>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.1rem' }}>
                  Pembayaran melalui Midtrans. Mendukung QRIS, Virtual Account, dan e-Wallet.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
