'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui';
import {
  Calculator, TrendingUp, Coffee, ShoppingBag, UtensilsCrossed, Car, Bus, Gamepad2,
  Smartphone, Plane, GraduationCap, Shirt, Zap,
} from 'lucide-react';
import { Transaction } from '@/services/duitTrackerService';

interface WhatIfCalculatorProps {
  transactions: Transaction[];
}

// ─── Equivalence items: what your money could buy ───
const EQUIVALENCES = [
  { label: 'Kopi Starbucks', amount: 55000, icon: Coffee },
  { label: 'Makan di resto', amount: 75000, icon: UtensilsCrossed },
  { label: 'Bensin full-tank', amount: 80000, icon: Car },
  { label: 'Streaming 1 bulan', amount: 55000, icon: Gamepad2 },
  { label: 'Baju baru', amount: 200000, icon: Shirt },
  { label: 'Grab/Gojek 5x', amount: 100000, icon: Bus },
  { label: 'Pulsa/Kuota', amount: 50000, icon: Zap },
  { label: 'Jajan online', amount: 150000, icon: ShoppingBag },
];

const SAVINGS_GOALS = [
  { label: 'iPhone 16', amount: 18000000, icon: Smartphone },
  { label: 'Trip Bali', amount: 5000000, icon: Plane },
  { label: 'Kursus Online', amount: 1500000, icon: GraduationCap },
  { label: 'Motor Bekas', amount: 12000000, icon: Car },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  makanan: UtensilsCrossed,
  'jajan/snack': Coffee,
  transportasi: Bus,
  belanja: ShoppingBag,
  hiburan: Gamepad2,
  kopi: Coffee,
};

const fmt = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

interface SpendingInsight {
  category: string;
  total: number;
  count: number;
  avgPerTx: number;
  daily: number;
  weekly: number;
  monthly: number;
}

export function WhatIfCalculator({ transactions }: WhatIfCalculatorProps) {
  const insights = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return null;

    // Determine date range
    const dates = expenses.map(t => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daySpan = Math.max(1, Math.ceil((maxDate - minDate) / 86400000));

    // Group by category
    const catMap = new Map<string, { total: number; count: number }>();
    for (const tx of expenses) {
      const cat = tx.category.toLowerCase();
      const entry = catMap.get(cat) || { total: 0, count: 0 };
      entry.total += tx.amount;
      entry.count += 1;
      catMap.set(cat, entry);
    }

    // Build insights sorted by total desc
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const result: SpendingInsight[] = [];
    for (const [category, { total, count }] of Array.from(catMap.entries())) {
      const daily = total / daySpan;
      result.push({
        category,
        total,
        count,
        avgPerTx: total / count,
        daily,
        weekly: daily * 7,
        monthly: daily * 30,
      });
    }
    result.sort((a, b) => b.total - a.total);

    return {
      categories: result.slice(0, 5), // Top 5 categories
      totalExpense,
      dailyExpense: totalExpense / daySpan,
      weeklyExpense: (totalExpense / daySpan) * 7,
      monthlyExpense: (totalExpense / daySpan) * 30,
      daySpan,
    };
  }, [transactions]);

  if (!insights || insights.categories.length === 0) {
    return (
      <Card style={{ padding: 20, marginBottom: 16, opacity: 0.6, textAlign: 'center' }}>
        <Calculator size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
        <p style={{ fontSize: 13 }}>Belum ada data pengeluaran untuk dianalisis.</p>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Calculator size={18} style={{ color: 'rgb(var(--color-primary))' }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>What If — Insight Pengeluaran</h3>
      </div>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
        Berdasarkan {insights.daySpan} hari data transaksimu
      </p>

      {/* Spending overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          { label: 'Per Hari', value: insights.dailyExpense },
          { label: 'Per Minggu', value: insights.weeklyExpense },
          { label: 'Per Bulan', value: insights.monthlyExpense },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: 'var(--input-bg)' }}>
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'rgb(var(--color-danger))' }}>{fmt(value)}</div>
          </div>
        ))}
      </div>

      {/* Top categories breakdown */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.7 }}>🔥 Top Pengeluaranmu</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.category] || ShoppingBag;
            const pct = Math.round((cat.total / insights.totalExpense) * 100);
            return (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--color-primary), 0.08)' }}>
                  <Icon size={14} style={{ color: 'rgb(var(--color-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{cat.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{fmt(cat.weekly)}/minggu</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'rgb(var(--color-primary))', transition: 'width 0.4s' }} />
                  </div>
                </div>
                <span style={{ fontSize: 10, opacity: 0.5, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* What your spending equals */}
      <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-warning), 0.06), rgba(var(--color-primary), 0.04))', border: '1px solid rgba(var(--color-warning), 0.15)', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>💡 Pengeluaranmu per MINGGU setara:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EQUIVALENCES.map(eq => {
            const count = Math.floor(insights.weeklyExpense / eq.amount);
            if (count < 1) return null;
            const Icon = eq.icon;
            return (
              <div key={eq.label} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Icon size={13} style={{ opacity: 0.6 }} />
                <span><b>{count}x</b> {eq.label}</span>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>

      {/* What your monthly spending equals */}
      <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-danger), 0.06), rgba(var(--color-warning), 0.04))', border: '1px solid rgba(var(--color-danger), 0.12)', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🔥 Pengeluaranmu per BULAN setara:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EQUIVALENCES.map(eq => {
            const count = Math.floor(insights.monthlyExpense / eq.amount);
            if (count < 1) return null;
            const Icon = eq.icon;
            return (
              <div key={eq.label} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Icon size={13} style={{ opacity: 0.6 }} />
                <span><b>{count}x</b> {eq.label}</span>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>

      {/* If you SAVED instead — how fast to goals */}
      <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-success), 0.08), rgba(var(--color-primary), 0.05))', border: '1px solid rgba(var(--color-success), 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <TrendingUp size={14} style={{ color: 'rgb(var(--color-success))' }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Kalau kamu nabung sebesar pengeluaranmu...</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAVINGS_GOALS.map(goal => {
            const months = Math.ceil(goal.amount / insights.monthlyExpense);
            const Icon = goal.icon;
            return (
              <div key={goal.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <Icon size={15} style={{ opacity: 0.6 }} />
                <span style={{ flex: 1 }}>{goal.label} <span style={{ opacity: 0.5 }}>({fmt(goal.amount)})</span></span>
                <span style={{ fontWeight: 800, color: months <= 6 ? 'rgb(var(--color-success))' : months <= 12 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-warning))' }}>
                  {months <= 1 ? '< 1 bulan' : `${months} bulan`}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.5, textAlign: 'center' }}>
          Bayangkan kalau kamu hemat 50% aja — goals tercapai 2x lebih cepat! 🚀
        </div>
      </div>
    </Card>
  );
}
