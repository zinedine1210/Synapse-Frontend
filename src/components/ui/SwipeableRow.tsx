'use client';

import React, { useRef, useState, useCallback } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  rightColor?: string;
  leftColor?: string;
  threshold?: number;
  disabled?: boolean;
}

export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = '✅',
  leftLabel = '🗑️',
  rightColor = 'var(--color-success)',
  leftColor = 'var(--color-error)',
  threshold = 80,
  disabled = false,
}: SwipeableRowProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping || disabled) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    // Limit the swipe distance with dampening
    const dampened = Math.sign(diff) * Math.min(Math.abs(diff), 150);
    setOffset(dampened);
  }, [swiping, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping || disabled) return;
    setSwiping(false);

    if (offset > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    setOffset(0);
  }, [swiping, offset, threshold, onSwipeRight, onSwipeLeft, disabled]);

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      {/* Background actions */}
      {offset !== 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: offset > 0 ? 'flex-start' : 'flex-end',
          padding: '0 20px',
          background: offset > 0 ? rightColor : leftColor,
          color: '#fff', fontWeight: 600, fontSize: 18,
          transition: swiping ? 'none' : 'opacity 0.2s',
        }}>
          {offset > 0 ? rightLabel : leftLabel}
        </div>
      )}
      {/* Foreground content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s ease-out',
          position: 'relative', zIndex: 1,
          background: 'rgb(var(--bg-surface))',
        }}
      >
        {children}
      </div>
    </div>
  );
}
