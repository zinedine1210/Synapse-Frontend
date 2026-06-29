'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui';
import {
  Calculator, TrendingUp, Coffee, ShoppingBag, UtensilsCrossed, Car, Bus, Gamepad2,
  Smartphone, Plane, GraduationCap, Star, Gift, Target,
} from 'lucide-react';
import { Transaction, WishlistItem } from '@/services/duitTrackerService';

interface WhatIfCalculatorProps {
  transactions: Transaction[];
  wishlist?: WishlistItem[];
}

const FALLBACK_GOALS = [
  { label: 'iPhone 16', amount: 18000000, icon: Smartphone },
  { label: 'Trip Bali', amount: 5000000, icon: Plane },
  { label: 'Kursus Online', amount: 1500000, icon: GraduationCap },
  { label: 'Motor Bekas', amount: 12000000, icon: Car },
];

const PRIORITY_ICONS: Record<string, React.ElementType> = {
  high: Star,
  medium: Target,
  low: Gift,
};

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

export function WhatIfCalculator({ transactions, wishlist = [] }: WhatIfCalculatorProps) {
  const [selectedCatIdx, setSelectedCatIdx] = useState<number | null>(null);

  const insights = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense' && t.category !== 'tagihan');
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
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.7 }}>Top Pengeluaranmu</div>
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

      {/* ─── Wishlist Goals: How long to save ─── */}
      {(() => {
        const pendingWishlist = wishlist.filter(w => !w.isPurchased && w.estimatedPrice > 0);
        const hasWishlist = pendingWishlist.length > 0;
        const goals = hasWishlist
          ? pendingWishlist
              .sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
              })
              .slice(0, 8)
          : null;

        // Selected category for "What if I save from this category"
        const selectedCat = selectedCatIdx !== null ? insights.categories[selectedCatIdx] : null;
        const savingAmount = selectedCat ? selectedCat.daily : insights.dailyExpense;
        const savingLabel = selectedCat ? `hemat dari ${selectedCat.category}` : 'total pengeluaranmu';

        return (
          <>
            {/* Category selector for What-If */}
            <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.06), rgba(var(--color-success), 0.04))', border: '1px solid rgba(var(--color-primary), 0.15)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>What If — Kalau kamu hemat dari:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <button
                  onClick={() => setSelectedCatIdx(null)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: selectedCatIdx === null ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                    background: selectedCatIdx === null ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                    color: selectedCatIdx === null ? 'rgb(var(--color-primary))' : 'inherit',
                  }}
                >
                  Semua ({fmt(Math.round(insights.dailyExpense))}/hari)
                </button>
                {insights.categories.map((cat, idx) => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCatIdx(selectedCatIdx === idx ? null : idx)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                      border: selectedCatIdx === idx ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                      background: selectedCatIdx === idx ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                      color: selectedCatIdx === idx ? 'rgb(var(--color-primary))' : 'inherit',
                    }}
                  >
                    {cat.category} ({fmt(Math.round(cat.daily))}/hari)
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 12, opacity: 0.6, padding: '8px 12px', borderRadius: 8, background: 'var(--input-bg)' }}>
                Kalau kamu {selectedCat ? <span>kurangi pengeluaran <b style={{ textTransform: 'capitalize' }}>{selectedCat.category}</b></span> : 'nabung semua'}, kamu bisa hemat <b style={{ color: 'rgb(var(--color-success))' }}>{fmt(Math.round(savingAmount))}/hari</b> = <b style={{ color: 'rgb(var(--color-success))' }}>{fmt(Math.round(savingAmount * 7))}/minggu</b> = <b style={{ color: 'rgb(var(--color-success))' }}>{fmt(Math.round(savingAmount * 30))}/bulan</b>
              </div>
            </div>

            {/* Wishlist / Savings Goals */}
            <div style={{ borderRadius: 14, padding: 16, background: 'linear-gradient(135deg, rgba(var(--color-success), 0.08), rgba(var(--color-primary), 0.05))', border: '1px solid rgba(var(--color-success), 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <TrendingUp size={14} style={{ color: 'rgb(var(--color-success))' }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {hasWishlist ? 'Kapan wishlist-mu tercapai?' : 'Kalau kamu nabung sebesar pengeluaranmu...'}
                </span>
              </div>
              {hasWishlist && (
                <p style={{ fontSize: 11, opacity: 0.5, margin: '2px 0 12px' }}>
                  Berdasarkan {savingLabel} ({fmt(Math.round(savingAmount))}/hari)
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hasWishlist && goals ? goals.map(item => {
                  const dailySaving = savingAmount;
                  const daysNeeded = Math.ceil(item.estimatedPrice / dailySaving);
                  const weeksNeeded = Math.ceil(daysNeeded / 7);
                  const monthsNeeded = Math.ceil(daysNeeded / 30);
                  const PIcon = PRIORITY_ICONS[item.priority] || Gift;
                  const priorityColor = item.priority === 'high' ? 'rgb(var(--color-danger))' : item.priority === 'medium' ? 'rgb(var(--color-warning))' : 'rgb(var(--color-primary))';

                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                      padding: '10px 12px', borderRadius: 10, background: 'rgba(var(--bg-surface), 0.8)',
                      border: '1px solid var(--border-default)',
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${priorityColor}15`, flexShrink: 0 }}>
                        <PIcon size={13} style={{ color: priorityColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{fmt(item.estimatedPrice)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontWeight: 800, fontSize: 13,
                          color: daysNeeded <= 7 ? 'rgb(var(--color-success))' : daysNeeded <= 30 ? 'rgb(var(--color-primary))' : monthsNeeded <= 3 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-danger))',
                        }}>
                          {daysNeeded <= 7 ? `${daysNeeded} hari` : daysNeeded <= 60 ? `${weeksNeeded} minggu` : `${monthsNeeded} bulan`}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.4 }}>
                          {daysNeeded <= 7 ? 'Dikit lagi!' : daysNeeded <= 30 ? 'Semangat!' : daysNeeded <= 90 ? 'Bisa kok!' : 'Nabung terus!'}
                        </div>
                      </div>
                    </div>
                  );
                }) : FALLBACK_GOALS.map(goal => {
                  const months = Math.ceil(goal.amount / (savingAmount * 30));
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

              {hasWishlist && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--color-success), 0.06)', border: '1px solid rgba(var(--color-success), 0.12)', fontSize: 12, textAlign: 'center' }}>
                  {selectedCat ? (
                    <span>Stop <b style={{ textTransform: 'capitalize' }}>{selectedCat.category}</b> selama <b>{Math.ceil(((goals?.[0]?.estimatedPrice ?? 0) / savingAmount) / 7)} minggu</b> = bisa beli <b>{goals?.[0]?.name}</b>! 🎉</span>
                  ) : (
                    <span>Coba klik kategori di atas untuk lihat &quot;kalau hemat dari kategori X, berapa lama bisa beli wishlist?&quot; 👆</span>
                  )}
                </div>
              )}

              {!hasWishlist && (
                <div style={{ marginTop: 12, fontSize: 11, opacity: 0.5, textAlign: 'center' }}>
                  Tambahkan wishlist di tab 🛒 Wishlist biar insight-nya lebih personal! 🚀
                </div>
              )}
            </div>
          </>
        );
      })()}
    </Card>
  );
}
