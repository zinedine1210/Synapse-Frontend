'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { ClassComparison } from '@/services/dashboardService';
import { Users, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface ClassComparisonCardProps {
  comparisons: ClassComparison[];
}

const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/**
 * Social proof card showing anonymous class spending comparison.
 * Only renders if comparisons array is non-empty (backend already filters < 5 members).
 * Requirement 21.1, 21.3
 */
export function ClassComparisonCard({ comparisons }: ClassComparisonCardProps) {
  if (!comparisons || comparisons.length === 0) return null;

  // Show the first comparison (primary class)
  const comparison = comparisons[0];

  const diff = comparison.userSpending - comparison.averageSpending;
  const diffPercent = comparison.averageSpending > 0
    ? Math.round(Math.abs(diff) / comparison.averageSpending * 100)
    : 0;

  const isCheaper = diff < 0;
  const isEqual = Math.abs(diff) < 1000; // negligible difference

  return (
    <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Users size={16} style={{ color: '#8b5cf6' }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
          Perbandingan Kelas
        </h3>
        <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 'auto' }}>
          {comparison.memberCount} anggota
        </span>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
        {isEqual ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Minus size={14} style={{ color: 'var(--color-success)' }} />
            Pengeluaranmu sama dengan rata-rata kelasmu bulan ini.
          </span>
        ) : isCheaper ? (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <TrendingDown size={14} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
            <span>
              Rata-rata temanmu habis <strong>{fmt(comparison.averageSpending)}</strong>/bulan.
              Kamu <strong>{fmt(comparison.userSpending)}</strong> — hemat {diffPercent}%! 🎉
            </span>
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <TrendingUp size={14} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
            <span>
              Rata-rata temanmu habis <strong>{fmt(comparison.averageSpending)}</strong>/bulan.
              Kamu <strong>{fmt(comparison.userSpending)}</strong> — {diffPercent}% lebih tinggi.
            </span>
          </span>
        )}
      </div>

      {/* Visual bar comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.5, width: 50, flexShrink: 0 }}>Kamu</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((comparison.userSpending / Math.max(comparison.averageSpending, comparison.userSpending, 1)) * 100, 100)}%`,
              borderRadius: 3,
              background: isCheaper ? 'var(--color-success)' : 'var(--color-warning)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
            {fmt(comparison.userSpending)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.5, width: 50, flexShrink: 0 }}>Rata²</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((comparison.averageSpending / Math.max(comparison.averageSpending, comparison.userSpending, 1)) * 100, 100)}%`,
              borderRadius: 3,
              background: 'rgba(var(--color-primary), 0.4)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
            {fmt(comparison.averageSpending)}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.4, textAlign: 'center' }}>
        {comparison.className} • Data anonim bulan ini
      </div>
    </Card>
  );
}
