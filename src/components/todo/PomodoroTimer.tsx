'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, Coffee } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProgressRing } from './ProgressRing';

interface PomodoroTimerProps {
  todoTitle: string;
  onComplete: () => void;
  onClose: () => void;
}

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

export function PomodoroTimer({ todoTitle, onComplete, onClose }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === 'work' ? WORK_MINUTES * 60 : BREAK_MINUTES * 60;
  const percent = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        if (phase === 'work') {
          setSessions(s => s + 1);
          setPhase('break');
          return BREAK_MINUTES * 60;
        } else {
          setPhase('work');
          return WORK_MINUTES * 60;
        }
      }
      return prev - 1;
    });
  }, [phase]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const reset = () => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(WORK_MINUTES * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isWork = phase === 'work';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isWork ? 'rgba(0,0,0,0.92)' : 'rgba(0,40,20,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: 24, transition: 'background 0.5s',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20, background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 8,
      }}>
        <X size={24} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isWork ? null : <Coffee size={18} style={{ color: '#4ade80' }} />}
        <span style={{
          fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
          color: isWork ? 'rgb(var(--color-primary))' : '#4ade80',
        }}>
          {isWork ? '🔥 Fokus' : '☕ Istirahat'}
        </span>
      </div>

      <ProgressRing percent={percent} size={220} stroke={10} color={isWork ? 'rgb(var(--color-primary))' : '#4ade80'}>
        <span style={{ fontSize: 48, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
      </ProgressRing>

      <p style={{
        fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
        maxWidth: 300, textAlign: 'center', lineHeight: 1.4,
      }}>
        {todoTitle}
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Button variant="ghost" onClick={reset} style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
          <RotateCcw size={16} />
        </Button>
        <Button
          onClick={() => setRunning(!running)}
          style={{
            paddingLeft: 32, paddingRight: 32, fontSize: 16,
            background: isWork ? 'rgb(var(--color-primary))' : '#4ade80',
            color: isWork ? '#fff' : '#000',
          }}
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? ' Pause' : ' Mulai'}
        </Button>
        {sessions > 0 && (
          <Button variant="ghost" onClick={onComplete} style={{ color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
            ✅ Selesai
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgb(var(--color-primary))' }} />
        ))}
        {sessions === 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Belum ada sesi</span>}
      </div>
    </div>
  );
}
