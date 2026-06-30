'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Download, Bell, Crown, X, ChevronRight, Sparkles } from 'lucide-react';

interface PostTourPromptProps {
  onDismiss: () => void;
}

interface PromptCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  show: boolean;
  done: boolean;
}

export function PostTourPrompt({ onDismiss }: PostTourPromptProps) {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const promptRef = useRef<any>(null);

  // Capture PWA install prompt
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setPwaInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      promptRef.current = e;
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Check push permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleInstallPWA = useCallback(async () => {
    const prompt = promptRef.current || deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        setPwaInstalled(true);
      }
      setDeferredPrompt(null);
      promptRef.current = null;
    }
  }, [deferredPrompt]);

  const handleEnablePush = useCallback(async () => {
    if (!('Notification' in window)) return;
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushEnabled(true);
      }
    } finally {
      setPushLoading(false);
    }
  }, []);

  const handleBilling = useCallback(() => {
    onDismiss();
    router.push('/billing');
  }, [onDismiss, router]);

  const cards: PromptCard[] = [
    {
      id: 'pwa',
      icon: <Download size={20} />,
      title: 'Install Aplikasi',
      description: 'Pasang Synapse di home screen untuk akses cepat layaknya native app. Bisa offline juga!',
      actionLabel: pwaInstalled ? 'Sudah terpasang ✓' : 'Install Sekarang',
      onAction: handleInstallPWA,
      show: !pwaInstalled && !!deferredPrompt,
      done: pwaInstalled,
    },
    {
      id: 'push',
      icon: <Bell size={20} />,
      title: 'Aktifkan Notifikasi',
      description: 'Dapatkan pengingat tugas, deadline kelas, dan update penting langsung di perangkatmu.',
      actionLabel: pushEnabled ? 'Sudah aktif ✓' : (pushLoading ? 'Meminta izin...' : 'Aktifkan'),
      onAction: handleEnablePush,
      show: !pushEnabled && 'Notification' in (typeof window !== 'undefined' ? window : {}),
      done: pushEnabled,
    },
    {
      id: 'billing',
      icon: <Crown size={20} />,
      title: 'Upgrade ke Pro',
      description: 'Unlock fitur AI penuh, unlimited kelas, Si Bawel roast, dan prediksi ujian. Mulai dari Rp15rb/bulan.',
      actionLabel: 'Lihat Paket',
      onAction: handleBilling,
      show: true,
      done: false,
    },
  ];

  const visibleCards = cards.filter(c => c.show || c.done);

  if (visibleCards.length === 0) {
    onDismiss();
    return null;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease',
      padding: 16,
    }}>
      <div style={{
        background: 'rgb(var(--bg-surface))',
        borderRadius: 20, padding: '24px 20px',
        maxWidth: 420, width: '100%',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        transition: 'transform 0.3s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} style={{ color: 'rgb(var(--color-primary))' }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'rgb(var(--text-primary))' }}>
              Satu Langkah Lagi!
            </h2>
          </div>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 4, lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', marginBottom: 20, lineHeight: 1.5 }}>
          Agar pengalaman menggunakan Synapse lebih maksimal, aktifkan fitur-fitur berikut:
        </p>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {visibleCards.map(card => (
            <div key={card.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              border: '1px solid var(--border-default)',
              background: card.done ? 'rgba(var(--color-success) / 0.05)' : 'rgb(var(--bg-base))',
              opacity: card.done ? 0.7 : 1,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: card.done ? 'rgba(var(--color-success) / 0.12)' : 'rgba(var(--color-primary) / 0.1)',
                color: card.done ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary))',
              }}>
                {card.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: 'rgb(var(--text-primary))' }}>
                  {card.title}
                </h4>
                <p style={{ fontSize: 12, color: 'rgb(var(--text-secondary))', margin: 0, lineHeight: 1.4 }}>
                  {card.description}
                </p>
              </div>
              {!card.done && (
                <Button size="sm" variant={card.id === 'billing' ? 'primary' : 'secondary'} onClick={card.onAction} style={{ flexShrink: 0, fontSize: 12 }}>
                  {card.actionLabel}
                </Button>
              )}
              {card.done && (
                <span style={{ fontSize: 12, color: 'rgb(var(--color-success))', fontWeight: 600, flexShrink: 0 }}>
                  {card.actionLabel}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={onDismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgb(var(--text-muted))', fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Nanti saja <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
