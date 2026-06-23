'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { WeeklyChallengeData } from '@/services/dashboardService';
import { Target, Zap, Clock } from 'lucide-react';

interface WeeklyChallengeCardProps {
  challenge: WeeklyChallengeData;
}

/**
 * Weekly challenge card showing title, progress bar, days remaining, and XP reward.
 * Hidden when no active challenge (parent conditionally renders).
 * Requirements 21.5, 21.6
 */
export function WeeklyChallengeCard({ challenge }: WeeklyChallengeCardProps) {
  if (!challenge) return null;

  const progressPercent = challenge.targetValue > 0
    ? Math.min(Math.round((challenge.current / challenge.targetValue) * 100), 100)
    : 0;

  const isCompleted = challenge.completed || progressPercent >= 100;

  return (
    <Card style={{
      marginBottom: 16,
      padding: '18px 22px',
      border: isCompleted ? '1px solid var(--color-success)' : undefined,
      background: isCompleted ? 'rgba(16, 185, 129, 0.03)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Target size={16} style={{ color: isCompleted ? 'var(--color-success)' : '#f59e0b' }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
          Tantangan Minggu Ini
        </h3>
        {isCompleted && (
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'var(--color-success)',
            color: '#fff',
            fontWeight: 600,
            marginLeft: 'auto',
          }}>
            Selesai! 🎉
          </span>
        )}
      </div>

      {/* Challenge title */}
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>
        &ldquo;{challenge.title}&rdquo;
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Progress: {challenge.current} / {challenge.targetValue}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>
            {progressPercent}%
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            borderRadius: 4,
            background: isCompleted
              ? 'var(--color-success)'
              : progressPercent > 70
                ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                : 'linear-gradient(90deg, rgb(var(--color-primary)), #8b5cf6)',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Meta: days remaining + XP reward */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.6 }}>
          <Clock size={12} />
          {challenge.daysLeft > 0 ? `Sisa ${challenge.daysLeft} hari` : 'Hari terakhir!'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f59e0b', fontWeight: 600 }}>
          <Zap size={12} />
          +{challenge.rewardXp} XP
        </span>
      </div>

      {/* Description if available */}
      {challenge.description && (
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.5, fontStyle: 'italic', lineHeight: 1.4 }}>
          {challenge.description}
        </div>
      )}
    </Card>
  );
}
