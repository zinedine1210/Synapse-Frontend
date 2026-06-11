'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RecurrenceSelectorProps {
  value: 'daily' | 'weekly' | 'monthly' | null;
  onChange: (val: 'daily' | 'weekly' | 'monthly' | null) => void;
  disabled?: boolean;
}

const RECURRENCE_OPTIONS = [
  { id: null, label: 'Tidak', emoji: '—' },
  { id: 'daily' as const, label: 'Harian', emoji: '📅' },
  { id: 'weekly' as const, label: 'Mingguan', emoji: '🗓️' },
  { id: 'monthly' as const, label: 'Bulanan', emoji: '📆' },
];

export function RecurrenceSelector({ value, onChange, disabled }: RecurrenceSelectorProps) {
  return (
    <div>
      <label style={{
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: 0.6,
      }}>
        <RefreshCw size={12} /> Berulang
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        {RECURRENCE_OPTIONS.map(opt => (
          <button
            key={opt.id ?? 'none'}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 10,
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: value === opt.id ? 600 : 400,
              background: value === opt.id ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
              color: value === opt.id ? 'rgb(var(--color-primary))' : 'inherit',
              outline: value === opt.id ? '2px solid rgb(var(--color-primary))' : 'none',
              outlineOffset: -1,
              transition: 'all 0.2s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
