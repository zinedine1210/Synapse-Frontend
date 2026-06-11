'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, useToast } from '@/components/ui';
import { Check, CreditCard, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function BillingPage() {
  const { user, session, refetchProfile } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsLoading(true);
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
          body: JSON.stringify({
            plan: 'PRO',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Gagal membuat invoice.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const snapToken = data.snapToken;

      if (!snapToken) {
        throw new Error('Gagal mendapatkan token pembayaran dari server.');
      }

      // Jalankan Midtrans Snap
      if ((window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async (result: any) => {
            setPaymentSuccess('Pembayaran berhasil! Memverifikasi transaksi...');
            showToast('Pembayaran berhasil! Memverifikasi transaksi...', 'success');
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/payments/verify`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    orderId: result.order_id || data.orderId,
                  }),
                }
              );
              showToast('Akun Anda berhasil ditingkatkan!', 'success');
              await refetchProfile();
            } catch (err) {
              if (process.env.NODE_ENV === 'development') console.error('Gagal verifikasi pembayaran:', err);
              showToast('Gagal memverifikasi status pembayaran secara instan.', 'warning');
            }
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          },
          onPending: (result: any) => {
            showToast('Pembayaran Anda tertunda. Silakan selesaikan pembayaran Anda.', 'warning');
          },
          onError: (result: any) => {
            setPaymentError('Pembayaran gagal. Silakan coba lagi.');
            showToast('Pembayaran gagal. Silakan coba lagi.', 'error');
          },
          onClose: () => {
            console.log('Popup pembayaran ditutup oleh pengguna.');
          },
        });
      } else {
        throw new Error('Midtrans Snap SDK tidak termuat. Silakan muat ulang halaman.');
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memulai pembayaran.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        {/* Load Midtrans Snap Script */}
        <Script
          src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js'}
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />

        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Billing & Upgrade" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600 }}>
                Pilih Paket Belajar Pintar Anda
              </h2>
              <p style={{ color: 'rgb(var(--text-muted))', marginTop: '0.35rem', fontSize: 'var(--font-sm)' }}>
                Tingkatkan batas kuota unggah dan AI untuk performa belajar maksimal.
              </p>
            </div>

            {paymentError && (
              <div style={{ marginBottom: '2rem' }}>
                <Alert type="error" message={paymentError} />
              </div>
            )}

            {paymentSuccess && (
              <div style={{ marginBottom: '2rem' }}>
                <Alert type="success" message={paymentSuccess} />
              </div>
            )}

            {/* Pricing Cards Grid */}
            <div
              className="billing-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '2rem',
                alignItems: 'stretch',
                marginBottom: '3rem',
              }}
            >
              {/* FREE PLAN */}
              <Card
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  position: 'relative',
                  opacity: user?.plan === 'FREE' ? 0.95 : 0.6,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>FREE</h3>
                    {user?.plan === 'FREE' && (
                      <span
                        style={{
                          fontSize: 'var(--font-xs)',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'var(--input-bg)',
                          color: 'rgb(var(--text-secondary))',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        Aktif
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '1rem' }}>
                    <span style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Rp 0</span>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.25rem' }}>/ selamanya</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
                    Coba fitur asisten AI kuliah secara gratis dengan batasan bulanan.
                  </p>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-default)',
                      paddingTop: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {[
                      'Maks. 5 upload file per bulan',
                      'Maks. ukuran file 10 MB',
                      '10 request AI per bulan',
                      'Kuis & Rangkuman Materi',
                    ].map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                        <Check size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                    {user?.plan === 'FREE' ? 'Paket Aktif' : 'Gratis'}
                  </Button>
                </div>
              </Card>

              {/* PRO PLAN */}
              <Card
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(var(--color-primary) / 0.25)',
                  padding: '1.5rem',
                  position: 'relative',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Popular Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                    color: 'rgb(var(--bg-base))',
                    fontSize: 'var(--font-xs)',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <Sparkles size={10} />
                  RECOMMENDED
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      PRO
                      <Zap size={14} style={{ color: 'rgb(var(--color-primary))' }} />
                    </h3>
                    {user?.plan === 'PRO' && (
                      <span
                        style={{
                          fontSize: 'var(--font-xs)',
                          fontWeight: 600,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: 'rgba(var(--color-secondary) / 0.1)',
                          color: 'rgb(var(--color-secondary))',
                          border: '1px solid rgba(var(--color-secondary) / 0.2)',
                        }}
                      >
                        Aktif
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '1rem' }}>
                    <span style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>Rp 49.000</span>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.25rem' }}>/ bulan</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
                    Untuk mahasiswa dengan jadwal padat yang butuh produktivitas tinggi.
                  </p>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-default)',
                      paddingTop: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {[
                      'Maks. 50 upload file per bulan',
                      'Maks. ukuran file 25 MB',
                      '200 request AI per bulan',
                      'Semua fitur Free + Prioritas AI',
                      'Kuis gabungan multi-pertemuan',
                      'Lencana PRO premium',
                    ].map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                        <Check size={14} style={{ color: 'rgb(var(--color-secondary))', flexShrink: 0 }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  {user?.plan === 'PRO' ? (
                    <Button variant="secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                      Paket Aktif
                    </Button>
                  ) : (
                    <Button
                      onClick={handleUpgrade}
                      isLoading={isLoading}
                      leftIcon={<CreditCard size={14} />}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                        color: 'rgb(var(--bg-base))',
                        border: 'none',
                      }}
                    >
                      Upgrade ke PRO
                    </Button>
                  )}
                </div>
              </Card>
            </div>

            {/* Security banner */}
            <Card
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
              }}
            >
              <ShieldCheck size={28} style={{ color: 'rgb(var(--color-secondary))', flexShrink: 0 }} />
              <div>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
                  Transaksi Aman & Terenkripsi
                </h4>
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
