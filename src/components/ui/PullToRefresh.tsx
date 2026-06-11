'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  /** Callback triggered on pull-to-refresh. Must return a Promise that resolves when refresh is complete. */
  onRefresh: () => Promise<void>;
  /** Minimum pull distance (px) to trigger refresh. Default: 70 */
  pullThreshold?: number;
  /** Cooldown between refreshes (ms). Default: 3000 */
  cooldown?: number;
  /** Maximum pull distance (px). Default: 120 */
  maxPull?: number;
}

/**
 * PullToRefresh — wraps children and adds pull-to-refresh gesture on mobile (<768px).
 * Uses touch events with requestAnimationFrame for smooth 60fps animation.
 * Respects prefers-reduced-motion: skips pull animation and shows static loading state.
 */
export function PullToRefresh({
  children,
  onRefresh,
  pullThreshold = 70,
  cooldown = 3000,
  maxPull = 120,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const currentPull = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const lastRefreshRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isMobileRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Detect mobile viewport and prefers-reduced-motion
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
    };
    checkMobile();

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };

    const handleResize = () => {
      checkMobile();
    };

    mql.addEventListener('change', handleMotionChange);
    window.addEventListener('resize', handleResize);

    return () => {
      mql.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const updatePullDistance = useCallback((distance: number) => {
    currentPull.current = distance;
    // Use rAF to batch DOM updates for smooth 60fps
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setPullDistance(distance);
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobileRef.current || refreshing) return;

    // Only activate when scrolled to top
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing || !isMobileRef.current) return;

    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Dampened pull with diminishing returns for natural feel
      const dampened = Math.min(diff * 0.4, maxPull);
      updatePullDistance(dampened);
    }
  }, [pulling, refreshing, maxPull, updatePullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || refreshing || !isMobileRef.current) return;
    setPulling(false);

    const now = Date.now();
    if (currentPull.current >= pullThreshold && now - lastRefreshRef.current > cooldown) {
      setRefreshing(true);
      lastRefreshRef.current = now;
      // Reset pull distance to show loading indicator
      updatePullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      updatePullDistance(0);
    }
  }, [pulling, refreshing, pullThreshold, cooldown, onRefresh, updatePullDistance]);

  // Calculate visual states
  const progress = Math.min(pullDistance / pullThreshold, 1);
  const isReady = pullDistance >= pullThreshold;
  const showReducedMotion = reducedMotionRef.current;

  // Determine indicator height and transition style
  const indicatorHeight = refreshing ? 44 : pullDistance;
  const indicatorTransition = pulling || showReducedMotion ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="pull-to-refresh-container"
      style={{ position: 'relative', overflowY: 'auto' }}
    >
      {/* Pull indicator area */}
      <div
        className="pull-to-refresh-indicator"
        style={{
          height: indicatorHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: indicatorTransition,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {refreshing ? (
          <div
            className="pull-to-refresh-spinner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Loader2
              size={20}
              className={showReducedMotion ? '' : 'spin'}
              style={{ opacity: 0.6 }}
              aria-hidden="true"
            />
            <span style={{ fontSize: 12, opacity: 0.5 }}>Memperbarui...</span>
          </div>
        ) : isReady ? (
          <span
            style={{
              fontSize: 12,
              opacity: 0.6,
              fontWeight: 500,
              transform: showReducedMotion ? 'none' : 'scale(1.05)',
              transition: showReducedMotion ? 'none' : 'transform 0.15s ease',
            }}
          >
            Lepaskan untuk refresh
          </span>
        ) : pullDistance > 10 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {/* Progress indicator */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              style={{
                opacity: progress * 0.6,
                transform: showReducedMotion ? 'none' : `rotate(${progress * 360}deg)`,
                transition: showReducedMotion ? 'none' : 'transform 0.1s linear',
              }}
              aria-hidden="true"
            >
              <circle
                cx="9"
                cy="9"
                r="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progress * 44} 44`}
                strokeLinecap="round"
                style={{ opacity: 0.4 }}
              />
            </svg>
            <span style={{ fontSize: 12, opacity: 0.3 + progress * 0.3 }}>
              Tarik ke bawah...
            </span>
          </div>
        ) : null}
      </div>

      {/* Wrapped content */}
      <div
        style={{
          transform: showReducedMotion ? 'none' : (pulling && pullDistance > 0 ? `translateY(0)` : undefined),
        }}
      >
        {children}
      </div>
    </div>
  );
}
