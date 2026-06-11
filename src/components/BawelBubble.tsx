'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface BawelBubbleProps {
  message: string | null;
  level?: 'info' | 'warning' | 'danger' | 'praise';
  linkHref?: string;
  linkLabel?: string;
}

export function BawelBubble({ message, level = 'info', linkHref, linkLabel }: BawelBubbleProps) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message && !dismissed) {
      // Animate in after a short delay
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [message, dismissed]);

  if (!message || dismissed) return null;

  const bgColors: Record<string, string> = {
    info: 'rgba(var(--color-primary), 0.06)',
    warning: 'rgba(245, 158, 11, 0.08)',
    danger: 'rgba(239, 68, 68, 0.08)',
    praise: 'rgba(16, 185, 129, 0.08)',
  };

  const borderColors: Record<string, string> = {
    info: 'rgba(var(--color-primary), 0.12)',
    warning: 'rgba(245, 158, 11, 0.15)',
    danger: 'rgba(239, 68, 68, 0.15)',
    praise: 'rgba(16, 185, 129, 0.15)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        right: 24,
        zIndex: 999,
        maxWidth: 340,
        padding: '14px 18px',
        borderRadius: 16,
        background: bgColors[level],
        border: `1px solid ${borderColors[level]}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>🗣️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, marginBottom: 4 }}>Si Bawel</div>
          <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>{message}</p>
          {linkHref && (
            <Link href={linkHref} style={{ fontSize: 12, color: 'rgb(var(--color-primary))', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              {linkLabel || 'Lihat'} <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <button
          onClick={() => { setVisible(false); setTimeout(() => setDismissed(true), 300); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
