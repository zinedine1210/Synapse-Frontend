'use client';

import React, { useMemo } from 'react';
import { AnimatedNumber } from '@/components/ui';
import { Transaction, Summary } from '@/services/duitTrackerService';
import { TrendingUp, TrendingDown, Wallet, Receipt } from 'lucide-react';

interface FinancialHeroProps {
  summary: Summary;
  transactions: Transaction[];
  month: number;
  year: number;
}

/**
 * FinancialHero — bold financial overview for the month.
 * Shows the balance as a large count-up number, income/expense pills,
 * and a compact daily-expense bar trend derived from existing transactions.
 * Respects prefers-reduced-motion (AnimatedNumber handles count-up; bars
 * have their grow animation disabled via a media query).
 */
export function FinancialHero({ summary, transactions, month, year }: FinancialHeroProps) {
  // Build per-day expense totals for the selected month
  const { bars, maxVal, daysInMonth } = useMemo(() => {
    const dim = new Date(year, month, 0).getDate();
    const totals = new Array(dim).fill(0);
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const d = new Date(tx.date);
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;
      const day = d.getDate();
      if (day >= 1 && day <= dim) totals[day - 1] += tx.amount;
    }
    const max = Math.max(1, ...totals);
    return { bars: totals, maxVal: max, daysInMonth: dim };
  }, [transactions, month, year]);

  const hasTrend = bars.some((b) => b > 0);
  const todayDay = new Date().getDate();
  const isCurrentMonth =
    new Date().getMonth() + 1 === month && new Date().getFullYear() === year;

  const positive = summary.balance >= 0;

  return (
    <div className="duit-hero">
      <div className="duit-hero__top">
        {/* Balance block */}
        <div className="duit-hero__balance">
          <div className="duit-hero__label">
            <Wallet size={14} /> Saldo bulan ini
          </div>
          <AnimatedNumber
            value={summary.balance}
            prefix="Rp "
            countUp
            duration={900}
            className="duit-hero__amount"
            style={{ color: positive ? '#fff' : '#ffd5d5' }}
          />
          <div className="duit-hero__meta">
            <Receipt size={12} />
            <AnimatedNumber value={summary.transactionCount} countUp duration={700} />
            <span>transaksi</span>
          </div>
        </div>

        {/* Income / expense pills */}
        <div className="duit-hero__pills">
          <div className="duit-hero__pill">
            <div className="duit-hero__pill-icon duit-hero__pill-icon--in">
              <TrendingUp size={16} />
            </div>
            <div>
              <div className="duit-hero__pill-label">Pemasukan</div>
              <AnimatedNumber
                value={summary.income}
                prefix="Rp "
                countUp
                duration={800}
                className="duit-hero__pill-value"
              />
            </div>
          </div>
          <div className="duit-hero__pill">
            <div className="duit-hero__pill-icon duit-hero__pill-icon--out">
              <TrendingDown size={16} />
            </div>
            <div>
              <div className="duit-hero__pill-label">Pengeluaran</div>
              <AnimatedNumber
                value={summary.expense}
                prefix="Rp "
                countUp
                duration={800}
                className="duit-hero__pill-value"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mini daily-expense trend */}
      <div className="duit-hero__trend">
        <div className="duit-hero__trend-head">
          <span>Tren pengeluaran harian</span>
          {hasTrend && (
            <span className="duit-hero__trend-max">
              max Rp {maxVal.toLocaleString('id-ID')}
            </span>
          )}
        </div>
        {hasTrend ? (
          <div className="duit-hero__bars" role="img" aria-label="Grafik pengeluaran harian">
            {bars.map((v, i) => {
              const h = Math.max(2, Math.round((v / maxVal) * 100));
              const isToday = isCurrentMonth && i + 1 === todayDay;
              return (
                <div
                  key={i}
                  className={`duit-hero__bar${isToday ? ' duit-hero__bar--today' : ''}`}
                  style={{ height: `${h}%`, animationDelay: `${Math.min(i * 12, 400)}ms` }}
                  title={`Tgl ${i + 1}: Rp ${v.toLocaleString('id-ID')}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="duit-hero__empty">Belum ada pengeluaran bulan ini 🎉</div>
        )}
        <div className="duit-hero__axis">
          <span>1</span>
          <span>{Math.ceil(daysInMonth / 2)}</span>
          <span>{daysInMonth}</span>
        </div>
      </div>

      <style jsx>{`
        .duit-hero {
          border-radius: 22px;
          padding: 22px 24px;
          margin-bottom: 22px;
          color: #fff;
          background: linear-gradient(135deg, rgb(var(--color-primary)) 0%, var(--color-accent-purple, #7c3aed) 100%);
          box-shadow: 0 12px 32px rgba(var(--color-primary), 0.28);
          position: relative;
          overflow: hidden;
        }
        .duit-hero::after {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 240px;
          height: 240px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 70%);
          pointer-events: none;
        }
        .duit-hero__top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .duit-hero__label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.85;
          margin-bottom: 6px;
        }
        :global(.duit-hero__amount) {
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.1;
          display: block;
        }
        .duit-hero__meta {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.8;
          margin-top: 8px;
        }
        .duit-hero__pills {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 200px;
        }
        .duit-hero__pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .duit-hero__pill-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .duit-hero__pill-icon--in {
          background: rgba(16, 185, 129, 0.35);
        }
        .duit-hero__pill-icon--out {
          background: rgba(239, 68, 68, 0.35);
        }
        .duit-hero__pill-label {
          font-size: 11px;
          opacity: 0.85;
          font-weight: 500;
        }
        :global(.duit-hero__pill-value) {
          font-size: 16px;
          font-weight: 700;
        }
        .duit-hero__trend {
          position: relative;
          z-index: 1;
          margin-top: 20px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .duit-hero__trend-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
          margin-bottom: 10px;
        }
        .duit-hero__trend-max {
          opacity: 0.7;
          font-weight: 500;
        }
        .duit-hero__bars {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 56px;
        }
        .duit-hero__bar {
          flex: 1;
          min-width: 2px;
          border-radius: 3px 3px 0 0;
          background: rgba(255, 255, 255, 0.55);
          transform-origin: bottom;
          animation: duitBarGrow 0.5s ease both;
        }
        .duit-hero__bar--today {
          background: var(--color-accent-yellow, #fbbf24);
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
        }
        @keyframes duitBarGrow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        .duit-hero__axis {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          opacity: 0.6;
          margin-top: 6px;
        }
        .duit-hero__empty {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          opacity: 0.8;
        }
        @media (prefers-reduced-motion: reduce) {
          .duit-hero__bar {
            animation: none;
            transform: none;
          }
        }
        @media (max-width: 640px) {
          .duit-hero {
            padding: 18px;
          }
          :global(.duit-hero__amount) {
            font-size: 28px;
          }
          .duit-hero__pills {
            width: 100%;
            flex-direction: row;
          }
          .duit-hero__pill {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
