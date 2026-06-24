'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { PixelPet, PetMood } from './PixelPet';
import { Heart, Zap, Flame, TrendingUp, TrendingDown, Sparkles, Moon, Star } from 'lucide-react';

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

function getMoodEmoji(mood: PetMood): string {
  switch (mood) {
    case 'ecstatic': return '🎉';
    case 'happy': return '😸';
    case 'neutral': return '😐';
    case 'sad': return '😿';
    case 'sick': return '🤒';
    case 'dead': return '💀';
    case 'sleeping': return '💤';
  }
}

function getMoodMessage(mood: PetMood, name: string, status: PetStatus): string {
  switch (mood) {
    case 'ecstatic':
      return `${name} seneng banget! Streak ${status.streakDays} hari + hemat!`;
    case 'happy':
      return `${name} lagi happy~ Terus catat ya!`;
    case 'neutral':
      return `${name} biasa aja. Yuk lebih rajin catat!`;
    case 'sad':
      return `${name} sedih... kamu lagi boros nih`;
    case 'sick':
      return `${name} sakit! Udah ${status.daysSinceLastLog} hari gak catat!`;
    case 'dead':
      return `${name} udah tiada... Catat sekarang buat revive!`;
    case 'sleeping':
      return `Sshh... ${name} lagi tidur`;
  }
}

function getMoodGradient(mood: PetMood): string {
  switch (mood) {
    case 'ecstatic': return 'linear-gradient(135deg, #FFF9C4 0%, #FFE0B2 50%, #FFCCBC 100%)';
    case 'happy': return 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)';
    case 'neutral': return 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)';
    case 'sad': return 'linear-gradient(135deg, #E1F5FE 0%, #B3E5FC 50%, #81D4FA 100%)';
    case 'sick': return 'linear-gradient(135deg, #FBE9E7 0%, #FFCCBC 50%, #FFAB91 100%)';
    case 'dead': return 'linear-gradient(135deg, #ECEFF1 0%, #CFD8DC 50%, #B0BEC5 100%)';
    case 'sleeping': return 'linear-gradient(135deg, #EDE7F6 0%, #D1C4E9 50%, #B39DDB 100%)';
  }
}

function getHealthPercent(status: PetStatus): number {
  let hp = 100;
  hp -= status.daysSinceLastLog * 20;
  if (!status.underBudget) hp -= 15;
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

function getXpProgress(level: number): number {
  return ((level * 37) % 100);
}

export function VirtualPetWidget({ status, compact = false }: VirtualPetWidgetProps) {
  const mood = useMemo(() => getMood(status), [status]);
  const accessory = useMemo(() => getAccessory(status), [status]);
  const message = getMoodMessage(mood, status.name, status);
  const health = getHealthPercent(status);
  const happiness = getHappinessPercent(status);
  const xpProgress = getXpProgress(status.level);
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (mood === 'ecstatic') {
      const interval = setInterval(() => {
        setSparkle(s => !s);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [mood]);

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderRadius: 'var(--radius-xl)',
        background: getMoodGradient(mood),
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <PixelPet mood={mood} size={52} accessory={accessory} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A2E' }}>{status.name}</div>
          <div style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {getMoodEmoji(mood)} {message}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.7)' }}>
          <Flame size={13} style={{ color: '#F59E0B' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A2E' }}>{status.streakDays}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="virtual-pet-widget" style={{
      position: 'relative',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '1px solid var(--border-default)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: getMoodGradient(mood),
        opacity: 0.6,
        zIndex: 0,
      }} />

      {/* Subtle dot pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '8px 8px',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top section — pet + name + level badge */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '24px 20px 16px',
        }}>
          {/* Level badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(4px)',
            fontSize: 11, fontWeight: 700,
            color: '#6B7280',
            marginBottom: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <Star size={11} style={{ color: '#F59E0B' }} fill="#F59E0B" />
            Level {status.level}
          </div>

          {/* Pet */}
          <div style={{ position: 'relative' }}>
            <PixelPet mood={mood} size={140} accessory={accessory} />
            {sparkle && mood === 'ecstatic' && (
              <Sparkles size={18} style={{
                position: 'absolute', top: 4, right: -4,
                color: '#F59E0B',
                animation: 'pet-sparkle 0.6s ease-out forwards',
              }} />
            )}
          </div>

          {/* Name */}
          <h3 style={{
            fontSize: 20, fontWeight: 900, margin: '8px 0 2px',
            color: '#1A1A2E', letterSpacing: '-0.3px',
          }}>
            {status.name}
          </h3>

          {/* XP bar under name */}
          <div style={{ width: '60%', maxWidth: 160, marginTop: 6 }}>
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${xpProgress}%`, borderRadius: 4,
                background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Message bubble */}
        <div style={{
          margin: '0 16px 16px',
          padding: '10px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(6px)',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <p style={{
            fontSize: 13, fontWeight: 600, margin: 0,
            color: '#374151', lineHeight: 1.4,
          }}>
            {getMoodEmoji(mood)} {message}
          </p>
        </div>

        {/* Stats section */}
        <div style={{
          padding: '0 16px 16px',
          display: 'flex', gap: 8,
        }}>
          <StatBar icon={<Heart size={13} />} label="HP" value={health} color="#EF4444" />
          <StatBar icon={<Zap size={13} />} label="Joy" value={happiness} color="#F59E0B" />
        </div>

        {/* Bottom stats row */}
        <div style={{
          display: 'flex', gap: 0,
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          <BottomStat
            icon={<Flame size={14} />}
            value={`${status.streakDays}`}
            unit="hari"
            label="Streak"
            iconColor="#F59E0B"
            borderRight
          />
          <BottomStat
            icon={status.underBudget ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            value={status.underBudget ? 'Hemat' : 'Boros'}
            label="Bulan ini"
            iconColor={status.underBudget ? '#10B981' : '#EF4444'}
            borderRight
          />
          <BottomStat
            icon={mood === 'sleeping' ? <Moon size={14} /> : <Sparkles size={14} />}
            value={getMoodEmoji(mood)}
            label="Mood"
            iconColor="#8B5CF6"
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes pet-sparkle {
          0% { opacity: 0; transform: scale(0.5) rotate(-20deg); }
          50% { opacity: 1; transform: scale(1.1) rotate(10deg); }
          100% { opacity: 0; transform: scale(0.8) translateY(-10px) rotate(20deg); }
        }
      `}</style>
    </div>
  );
}

function StatBar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color, display: 'flex' }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 4,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 6px ${color}40`,
        }} />
      </div>
    </div>
  );
}

function BottomStat({ icon, value, unit, label, iconColor, borderRight }: {
  icon: React.ReactNode; value: string; unit?: string; label: string; iconColor: string; borderRight?: boolean;
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 8px',
      borderRight: borderRight ? '1px solid rgba(0,0,0,0.06)' : 'none',
      background: 'rgba(255,255,255,0.4)',
    }}>
      <span style={{ color: iconColor, marginBottom: 4, display: 'flex' }}>{icon}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1A1A2E' }}>{value}</span>
        {unit && <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', marginTop: 1 }}>{label}</span>
    </div>
  );
}
