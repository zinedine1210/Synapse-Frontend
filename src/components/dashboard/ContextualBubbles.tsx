'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { SiBawelAvatar } from '@/components/shared/SiBawelAvatar';
import { DayOfWeekPattern } from '@/services/contextualIntelligence';

interface ContextualBubblesProps {
  /** Detected patterns from contextual intelligence (max 3) */
  patterns: DayOfWeekPattern[];
}

/**
 * ContextualBubbles — Si Bawel proactive insight bubbles on the Dashboard.
 * Displays max 3 pattern bubbles, each individually dismissible.
 * Uses localStorage to remember dismissed patterns for the current session/day.
 */
export function ContextualBubbles({ patterns }: ContextualBubblesProps) {
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `bawel_dismissed_${today}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        setDismissedKeys(new Set(arr));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Staggered appear animation
  useEffect(() => {
    const visiblePatterns = patterns.filter(p => !dismissedKeys.has(getPatternKey(p)));
    visiblePatterns.forEach((p, i) => {
      setTimeout(() => {
        setVisibleKeys(prev => {
          const next = new Set(Array.from(prev));
          next.add(getPatternKey(p));
          return next;
        });
      }, 300 + i * 200);
    });
  }, [patterns, dismissedKeys]);

  const getPatternKey = useCallback((p: DayOfWeekPattern) => {
    return `${p.dayOfWeek}::${p.category}`;
  }, []);

  const handleDismiss = useCallback((pattern: DayOfWeekPattern) => {
    const key = getPatternKey(pattern);
    // Animate out first
    setVisibleKeys(prev => {
      const next = new Set(Array.from(prev));
      next.delete(key);
      return next;
    });

    // Then remove after animation
    setTimeout(() => {
      setDismissedKeys(prev => {
        const next = new Set(Array.from(prev));
        next.add(key);
        // Persist to localStorage
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `bawel_dismissed_${today}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }, 300);
  }, [getPatternKey]);

  const activeBubbles = patterns
    .filter(p => !dismissedKeys.has(getPatternKey(p)))
    .slice(0, 3);

  if (activeBubbles.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 20,
      }}
    >
      {activeBubbles.map((pattern) => {
        const key = getPatternKey(pattern);
        const isVisible = visibleKeys.has(key);

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 16,
              background: 'rgba(var(--color-primary), 0.04)',
              border: '1px solid rgba(var(--color-primary), 0.08)',
              transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
              opacity: isVisible ? 1 : 0,
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <SiBawelAvatar size="dashboard" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, marginBottom: 4 }}>
                Si Bawel
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>
                {pattern.insight}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(pattern)}
              aria-label="Tutup"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                opacity: 0.4,
                flexShrink: 0,
                borderRadius: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
