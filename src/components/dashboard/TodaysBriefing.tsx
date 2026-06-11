'use client';

import React from 'react';
import { Calendar, AlertTriangle, Wallet, CheckSquare, Lightbulb } from 'lucide-react';

export interface BriefingData {
  /** Today's class schedule */
  schedule: { className: string; time: string; room?: string }[];
  /** Deadlines due today or tomorrow */
  deadlines: { title: string; className: string; dueLabel: string }[];
  /** Yesterday's spending summary */
  spendingSummary: { total: number; topCategory: string } | null;
  /** Today's pending todos */
  todos: { total: number; done: number };
  /** Contextual tip (rule-based) */
  contextualTip: string | null;
}

interface TodaysBriefingProps {
  data: BriefingData;
  isLoading?: boolean;
}

const fmt = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

/**
 * TodaysBriefing — Compact, scannable card showing critical daily info.
 * Omits categories with no data. Designed to be absorbed within 5 seconds.
 * Structured as icon-prefixed bullet points.
 */
export function TodaysBriefing({ data, isLoading }: TodaysBriefingProps) {
  if (isLoading) {
    return (
      <div style={{
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--card-bg)',
        border: '1px solid var(--border-default)',
        marginBottom: 20,
      }}>
        <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 6, marginBottom: 14 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="skeleton" style={{ height: 14, borderRadius: 6, width: `${60 + n * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const hasSchedule = data.schedule.length > 0;
  const hasDeadlines = data.deadlines.length > 0;
  const hasSpending = data.spendingSummary !== null;
  const hasTodos = data.todos.total > 0;
  const hasTip = data.contextualTip !== null;

  // Omit section if no data at all
  const hasAnyContent = hasSchedule || hasDeadlines || hasSpending || hasTodos || hasTip;
  if (!hasAnyContent) return null;

  return (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: 14,
        background: 'var(--card-bg)',
        border: '1px solid var(--border-default)',
        marginBottom: 20,
      }}
    >
      <h3 style={{
        fontSize: 14,
        fontWeight: 700,
        margin: '0 0 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        📋 Today&apos;s Briefing
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Schedule */}
        {hasSchedule && (
          <BriefingItem
            icon={<Calendar size={14} />}
            color="rgb(var(--color-primary))"
          >
            <span style={{ fontWeight: 500 }}>Jadwal:</span>{' '}
            {data.schedule.map((s, i) => (
              <span key={i}>
                {s.className} ({s.time}){i < data.schedule.length - 1 ? ', ' : ''}
              </span>
            ))}
          </BriefingItem>
        )}

        {/* Deadlines */}
        {hasDeadlines && (
          <BriefingItem
            icon={<AlertTriangle size={14} />}
            color="var(--color-warning)"
          >
            <span style={{ fontWeight: 500 }}>Deadline:</span>{' '}
            {data.deadlines.map((d, i) => (
              <span key={i}>
                {d.title} — {d.dueLabel}{i < data.deadlines.length - 1 ? ', ' : ''}
              </span>
            ))}
          </BriefingItem>
        )}

        {/* Spending */}
        {hasSpending && data.spendingSummary && (
          <BriefingItem
            icon={<Wallet size={14} />}
            color="var(--color-error)"
          >
            <span style={{ fontWeight: 500 }}>Kemarin:</span>{' '}
            {fmt(data.spendingSummary.total)} keluar, terbanyak di {data.spendingSummary.topCategory}
          </BriefingItem>
        )}

        {/* Todos */}
        {hasTodos && (
          <BriefingItem
            icon={<CheckSquare size={14} />}
            color="var(--color-success)"
          >
            <span style={{ fontWeight: 500 }}>Todo:</span>{' '}
            {data.todos.done}/{data.todos.total} selesai
            {data.todos.done < data.todos.total && (
              <span style={{ opacity: 0.6 }}> — {data.todos.total - data.todos.done} tersisa</span>
            )}
          </BriefingItem>
        )}

        {/* Contextual Tip */}
        {hasTip && (
          <BriefingItem
            icon={<Lightbulb size={14} />}
            color="#f59e0b"
          >
            <span style={{ opacity: 0.8, fontStyle: 'italic' }}>{data.contextualTip}</span>
          </BriefingItem>
        )}
      </div>
    </div>
  );
}

function BriefingItem({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ color, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
