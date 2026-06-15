'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import {
  LayoutDashboard, Wallet, CheckSquare, Globe, UtensilsCrossed,
  Receipt, Sparkles, ChevronRight, ChevronLeft, X,
} from 'lucide-react';

interface TutorialOverlayProps {
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    icon: <LayoutDashboard size={32} />,
    title: 'Dashboard',
    emoji: '🏠',
    desc: 'Pusat kendali kuliahmu. Lihat semua kelas, jadwal, dan ringkasan aktivitas AI di satu tempat.',
    tip: 'Upload foto jadwal kuliah untuk otomatis buat semua kelas!',
  },
  {
    icon: <Wallet size={32} />,
    title: 'Duit Tracker',
    emoji: '💰',
    desc: 'Catat pengeluaran harian, atur budget bulanan, dan tanam pohon tabungan virtual.',
    tip: 'Ketik "kopi 25rb" untuk catat pengeluaran instan!',
  },
  {
    icon: <CheckSquare size={32} />,
    title: 'Todo List',
    emoji: '✅',
    desc: 'Kelola tugas dengan drag & drop, kategori, dan kalender. Prioritaskan yang penting.',
    tip: 'Drag & drop kartu untuk ubah urutan prioritas.',
  },
  {
    icon: <Globe size={32} />,
    title: 'Timeline',
    emoji: '🌐',
    desc: 'Forum diskusi ala sosmed. Tanya, jawab, dan bangun reputasi bersama pengguna lain.',
    tip: 'Jawab pertanyaan teman untuk tingkatkan reputasimu!',
  },
  {
    icon: <UtensilsCrossed size={32} />,
    title: 'Makan Apa',
    emoji: '🍔',
    desc: 'Bingung mau makan apa? AI kasih rekomendasi berdasarkan budget dan preferensimu.',
    tip: 'Upload foto menu kantin untuk rekomendasi yang lebih akurat.',
  },
  {
    icon: <Receipt size={32} />,
    title: 'Split Bill',
    emoji: '🧾',
    desc: 'Makan bareng teman? Scan struk dan bagi tagihan otomatis. Adil tanpa ribet.',
    tip: 'Foto struk kasir untuk split bill otomatis!',
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep((p) => p + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((p) => p - 1);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Card
        style={{
          maxWidth: 440,
          width: '90vw',
          padding: '2rem',
          animation: 'fadeIn 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgb(var(--text-muted))',
            padding: 4,
          }}
          aria-label="Tutup tutorial"
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 5, marginBottom: '1.5rem' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= currentStep ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary) / 0.15)',
                transition: 'background 0.3s',
                cursor: 'pointer',
              }}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{step.emoji}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgb(var(--color-primary))', marginBottom: 4 }}>
            {step.icon}
          </div>
          <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 8 }}>
            {step.title}
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            {step.desc}
          </p>

          {/* Tip box */}
          <div
            style={{
              background: 'rgba(var(--color-primary) / 0.06)',
              borderRadius: 'var(--radius-md)',
              padding: '0.7rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', textAlign: 'left' }}>
              {step.tip}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={handlePrev} leftIcon={<ChevronLeft size={16} />}>
                Kembali
              </Button>
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'rgb(var(--text-muted))' }}>
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <Button size="sm" onClick={handleNext} rightIcon={!isLast ? <ChevronRight size={16} /> : undefined}>
            {isLast ? 'Mulai Pakai! 🚀' : 'Lanjut'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
