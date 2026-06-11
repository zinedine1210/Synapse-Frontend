'use client';

import React from 'react';

interface BudgetRingProps {
  /** 0..1 fraction of budget already spent */
  fraction: number;
  /** Diameter in px */
  size?: number;
  /** Big label rendered in the center (e.g. percent remaining) */
  centerTop: string;
  centerBottom?: string;
  danger?: boolean;
}

/**
 * Circular progress ring for the food budget card. Pure SVG so it
 * inherits the global reduced-motion handling via the stroke transition.
 */
export function BudgetRing({ fraction, size = 76, centerTop, centerBottom, danger }: BudgetRingProps) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));
  const dash = circumference * clamped;
  const color = danger ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary))';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(var(--text-muted) / 0.18)"
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
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease' }}
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
          lineHeight: 1.05,
        }}
      >
        <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color }}>{centerTop}</span>
        {centerBottom && (
          <span style={{ fontSize: '9px', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>{centerBottom}</span>
        )}
      </div>
    </div>
  );
}
