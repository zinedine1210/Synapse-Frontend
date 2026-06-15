'use client';

import React from 'react';
import { Flame, Trophy } from 'lucide-react';
import { gamificationService, GamificationProfile } from '@/services/gamificationService';
import { useCache } from '@/lib/cache';

interface XpBarProps {
  collapsed?: boolean;
}

export function XpBar({ collapsed = false }: XpBarProps) {
  // Use in-memory cache to persist user gamification details across page navigations.
  // We only fetch in the background if the cache is older than the deduping interval,
  // providing a seamless and highly responsive navigation experience.
  const { data: profile } = useCache<GamificationProfile>(
    'gamification:profile',
    () => gamificationService.getProfile(),
    {
      dedupingInterval: 60000, // dedupe fetches within 1 minute
    }
  );

  if (!profile) return null;

  if (collapsed) {
    return (
      <div
        style={{
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {profile.currentStreak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-warning))' }}>
            <Flame size={14} />
            <span style={{ fontWeight: 600 }}>{profile.currentStreak}</span>
          </div>
        )}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `conic-gradient(rgb(var(--color-primary)) ${profile.xpProgress * 3.6}deg, rgba(var(--color-primary) / 0.15) 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-xs)',
            fontWeight: 700,
            color: 'rgb(var(--color-primary))',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: 'rgb(var(--bg-surface))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile.level}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Level + Streak row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Trophy size={14} style={{ color: 'rgb(var(--color-primary))' }} />
          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>
            Lv.{profile.level} {profile.levelName}
          </span>
        </div>
        {profile.currentStreak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-warning))' }}>
            <Flame size={12} />
            <span style={{ fontWeight: 600 }}>{profile.currentStreak}</span>
          </div>
        )}
      </div>

      {/* XP Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
            {profile.totalXp} XP
          </span>
          {profile.nextLevelXp && (
            <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
              {profile.nextLevelXp} XP
            </span>
          )}
        </div>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: 'rgba(var(--color-primary) / 0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(profile.xpProgress, 100)}%`,
              height: '100%',
              borderRadius: 2,
              background: 'rgb(var(--color-primary))',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
