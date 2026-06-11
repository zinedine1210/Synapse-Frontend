'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  pullThreshold?: number;
  cooldown?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 60,
  cooldown = 3000,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const lastRefreshRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return; // Only pull at the top
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Dampened pull
      setPullDistance(Math.min(diff * 0.4, 100));
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || refreshing) return;
    setPulling(false);

    const now = Date.now();
    if (pullDistance >= pullThreshold && now - lastRefreshRef.current > cooldown) {
      setRefreshing(true);
      lastRefreshRef.current = now;
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pulling, refreshing, pullDistance, pullThreshold, cooldown, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Pull indicator */}
      <div style={{
        height: refreshing ? 40 : pullDistance,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: pulling ? 'none' : 'height 0.2s ease-out',
        overflow: 'hidden',
      }}>
        {refreshing ? (
          <Loader2 className="spin" size={20} style={{ opacity: 0.5 }} />
        ) : pullDistance >= pullThreshold ? (
          <span style={{ fontSize: 12, opacity: 0.5 }}>Lepaskan untuk refresh</span>
        ) : pullDistance > 10 ? (
          <span style={{ fontSize: 12, opacity: 0.3 }}>Tarik ke bawah...</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
