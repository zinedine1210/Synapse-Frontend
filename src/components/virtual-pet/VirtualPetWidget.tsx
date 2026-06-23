'use client';

import React, { useMemo } from 'react';
import { PixelPet, PetMood } from './PixelPet';
import { Heart, Zap, Flame, TrendingUp, TrendingDown } from 'lucide-react';

interface PetStatus {
  /** How many consecutive days the user has logged transactions */
  streakDays: number;
  /** Is the user under budget this month? */
  underBudget: boolean;
  /** Days since last transaction logged */
  daysSinceLastLog: number;
  /** XP level */
  level: number;
  /** Pet name */
  name: string;
}

interface VirtualPetWidgetProps {
  status: PetStatus;
  compact?: boolean;
}

function getMood(status: PetStatus): PetMood {
  const { streakDays, underBudget, daysSinceLastLog } = status;

  if (daysSinceLastLog >= 5) return 'dead';
  if (daysSinceLastLog >= 2) return 'sick';

  // Time-based sleeping (optional — check client time)
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) return 'sleeping';

  if (streakDays >= 7 && underBudget) return 'ecstatic';
  if (streakDays >= 3 || underBudget) return 'happy';
  if (!underBudget && streakDays < 2) return 'sad';

  return 'neutral';
}

function getAccessory(status: PetStatus): 'none' | 'crown' | 'halo' {
  if (status.streakDays >= 30) return 'crown';
  if (status.level >= 10) return 'halo';
  return 'none';
}

function getMoodMessage(mood: PetMood, name: string, status: PetStatus): string {
  switch (mood) {
    case 'ecstatic':
      return `${name} seneng banget! Streak ${status.streakDays} hari + hemat! 🎉`;
    case 'happy':
      return `${name} lagi happy~ Terus catat ya! 😸`;
    case 'neutral':
      return `${name} biasa aja. Yuk lebih rajin catat!`;
    case 'sad':
      return `${name} sedih... kamu lagi boros nih 😿`;
    case 'sick':
      return `${name} sakit! Udah ${status.daysSinceLastLog} hari gak catat! 🤒`;
    case 'dead':
      return `${name} udah tiada... Catat sekarang buat revive! 💀`;
    case 'sleeping':
      return `Sshh... ${name} lagi tidur 💤`;
  }
}

function getHealthPercent(status: PetStatus): number {
  let hp = 100;
  // Lose health for inactivity
  hp -= status.daysSinceLastLog * 20;
  // Lose health for being over budget
  if (!status.underBudget) hp -= 15;
  // Gain health for streak
  hp += Math.min(status.streakDays * 5, 30);
  return Math.max(0, Math.min(100, hp));
}

function getHappinessPercent(status: PetStatus): number {
  let hap = 50;
  if (status.underBudget) hap += 25;
  hap += Math.min(status.streakDays * 5, 25);
  hap -= status.daysSinceLastLog * 15;
  return Math.max(0, Math.min(100, hap));
}

export function VirtualPetWidget({ status, compact = false }: VirtualPetWidgetProps) {
  const mood = useMemo(() => getMood(status), [status]);
  const accessory = useMemo(() => getAccessory(status), [status]);
  const message = getMoodMessage(mood, status.name, status);
  const health = getHealthPercent(status);
  const happiness = getHappinessPercent(status);

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderRadius: 16, background: 'rgb(var(--bg-surface))',
        border: '1px solid var(--border-default)',
      }}>
        <PixelPet mood={mood} size={48} accessory={accessory} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{status.name}</div>
          <div style={{ fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{message}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Flame size={12} style={{ color: 'rgb(var(--color-warning))' }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{status.streakDays}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 20, borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.05), rgba(var(--color-secondary), 0.05))',
      border: '1px solid var(--border-default)',
      textAlign: 'center',
    }}>
      {/* Pet visual */}
      <div style={{ marginBottom: 12 }}>
        <PixelPet mood={mood} size={120} accessory={accessory} />
      </div>

      {/* Name & level */}
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{status.name}</div>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>Level {status.level}</div>

      {/* Message */}
      <p style={{
        fontSize: 13, fontWeight: 500, padding: '8px 16px', borderRadius: 12,
        background: 'rgb(var(--bg-surface))', display: 'inline-block',
        maxWidth: 260, color: 'rgb(var(--text-secondary))',
      }}>
        {message}
      </p>

      {/* Stats bars */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <StatBar icon={<Heart size={14} />} label="Kesehatan" value={health} color="#FF6B6B" />
        <StatBar icon={<Zap size={14} />} label="Kebahagiaan" value={happiness} color="#FBBF24" />
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12, marginTop: 14, justifyContent: 'center' }}>
        <MiniStat icon={<Flame size={13} />} value={`${status.streakDays} hari`} label="Streak" color="rgb(var(--color-warning))" />
        <MiniStat
          icon={status.underBudget ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
          value={status.underBudget ? 'Hemat' : 'Boros'}
          label="Bulan ini"
          color={status.underBudget ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))'}
        />
      </div>
    </div>
  );
}

function StatBar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, maxWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, justifyContent: 'center' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>{label}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'var(--border-default)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 4,
          background: color, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 10, background: 'rgb(var(--bg-surface))' }}>
      <span style={{ color }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{value}</div>
        <div style={{ fontSize: 9, opacity: 0.5 }}>{label}</div>
      </div>
    </div>
  );
}
