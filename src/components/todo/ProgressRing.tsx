'use client';

import React, { useEffect, useState } from 'react';

interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  size?: number;
  stroke?: number;
  /** Main color of the progress arc (CSS color string) */
  color?: string;
  /** Track (background) color */
  trackColor?: string;
  /** Content rendered in the center of the ring */
  children?: React.ReactNode;
}

/**
 * ProgressRing — animated circular progress indicator (SVG).
 * Used for "today's completion" summary on the To-Do page.
 * Respects prefers-reduced-motion (skips the sweep animation).
 */
export function ProgressRing({
  percent,
  size = 72,
  stroke = 7,
  color = 'rgb(var(--color-primary))',
  trackColor = 'var(--border-default)',
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, isFinite(percent) ? percent : 0));
  const [reduced, setReduced] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Animate the arc from 0 to target on mount / value change
  useEffect(() => {
    if (reduced) { setDisplay(clamped); return; }
    const id = requestAnimationFrame(() => setDisplay(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped, reduced]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (display / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: reduced ? 'none' : 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
