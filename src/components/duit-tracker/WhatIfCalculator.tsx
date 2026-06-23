'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui';
import { Calculator, TrendingUp, Coffee, ShoppingBag, Sparkles, Plane, Smartphone, Car } from 'lucide-react';

interface WhatIfCalculatorProps {
  /** Average monthly income */
  avgIncome: number;
  /** Average monthly expense */
  avgExpense: number;
  /** Average monthly saving (income - expense) */
  avgSaving: number;
}

const PRESETS = [
  { label: 'Kopi harian', icon: Coffee, amount: 25000, frequency: 'daily' as const },
  { label: 'Jajan online', icon: ShoppingBag, amount: 150000, frequency: 'weekly' as const },
  { label: 'Langganan streaming', icon: Sparkles, amount: 60000, frequency: 'monthly' as const },
  { label: 'Rokok sebungkus', icon: ShoppingBag, amount: 30000, frequency: 'daily' as const },
];

const GOALS = [
  { label: 'iPhone 16', amount: 18000000, icon: Smartphone },
  { label: 'Trip Bali', amount: 5000000, icon: Plane },
  { label: 'Motor Bekas', amount: 12000000, icon: Car },
  { label: 'Laptop Baru', amount: 10000000, icon: Smartphone },
];

const fmt = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

function getMonthlyEquivalent(amount: number, frequency: 'daily' | 'weekly' | 'monthly'): number {
  switch (frequency) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
  }
}

export function WhatIfCalculator({ }: WhatIfCalculatorProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const monthlyAmount = useMemo(() => {
    if (selectedPreset !== null) {
      const p = PRESETS[selectedPreset];
      return getMonthlyEquivalent(p.amount, p.frequency);
    }
    const amt = parseFloat(customAmount) || 0;
    return getMonthlyEquivalent(amt, frequency);
  }, [customAmount, frequency, selectedPreset]);

  const yearlyAmount = monthlyAmount * 12;

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Calculator size={18} style={{ color: 'rgb(var(--color-primary))' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>What If Calculator</h3>
      </div>

      <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
        Kalau kamu STOP pengeluaran ini, dalam setahun kamu bisa punya...
      </p>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {PRESETS.map((p, i) => {
          const Icon = p.icon;
          const active = selectedPreset === i;
          return (
            <button key={i} onClick={() => { setSelectedPreset(active ? null : i); setCustomAmount(''); }} style={{
              padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${active ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
              background: active ? 'rgba(var(--color-primary), 0.08)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? 'rgb(var(--color-primary))' : 'inherit', transition: 'all 0.2s',
            }}>
              <Icon size={13} /> {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, opacity: 0.5 }}>Rp</span>
          <input
            type="number"
            placeholder="Atau masukkan nominal..."
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
            style={{
              width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10,
              border: '1px solid var(--border-default)', background: 'var(--input-bg)',
              color: 'rgb(var(--text-primary))', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['daily', 'weekly', 'monthly'] as const).map(f => (
            <button key={f} onClick={() => { setFrequency(f); setSelectedPreset(null); }} style={{
              padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: frequency === f && selectedPreset === null ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
              color: frequency === f && selectedPreset === null ? '#fff' : 'inherit',
            }}>
              {f === 'daily' ? '/hari' : f === 'weekly' ? '/minggu' : '/bulan'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {monthlyAmount > 0 && (
        <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-success), 0.08), rgba(var(--color-primary), 0.05))', border: '1px solid rgba(var(--color-success), 0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Per Bulan</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--color-success))' }}>{fmt(monthlyAmount)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Per Tahun</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{fmt(yearlyAmount)}</div>
            </div>
          </div>

          {/* Goal comparisons */}
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>Setahun itu setara:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GOALS.map((goal, i) => {
              const months = Math.ceil(goal.amount / monthlyAmount);
              const Icon = goal.icon;
              if (months > 36) return null;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Icon size={14} style={{ opacity: 0.6 }} />
                  <span style={{ flex: 1 }}>{goal.label} ({fmt(goal.amount)})</span>
                  <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{months} bulan</span>
                </div>
              );
            })}
          </div>

          {/* Time Machine projection */}
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <TrendingUp size={14} style={{ color: 'rgb(var(--color-primary))' }} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>⏰ Time Machine</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>6 bulan</span>
                <span style={{ fontWeight: 700 }}>{fmt(monthlyAmount * 6)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>1 tahun</span>
                <span style={{ fontWeight: 700 }}>{fmt(yearlyAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>3 tahun</span>
                <span style={{ fontWeight: 700 }}>{fmt(yearlyAmount * 3)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>5 tahun (+ bunga 5%/th)</span>
                <span style={{ fontWeight: 700, color: 'rgb(var(--color-success))' }}>
                  {fmt(monthlyAmount * 12 * 5 * 1.14)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
