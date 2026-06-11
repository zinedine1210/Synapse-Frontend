'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  locale?: string;
  style?: React.CSSProperties;
  className?: string;
  /** When true, always animates from 0 to target value on mount (count-up effect) */
  countUp?: boolean;
}

/**
 * AnimatedNumber — animates between number values with an ease-out cubic easing.
 * Supports count-up from 0 via the `countUp` prop.
 * Respects prefers-reduced-motion: shows final value immediately when enabled.
 */
export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 600,
  decimals = 0,
  locale = 'id-ID',
  style,
  className,
  countUp = false,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(countUp ? 0 : value);
  const prevRef = useRef(countUp ? 0 : value);
  const frameRef = useRef<number>(0);
  const mountedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;

    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // If reduced motion is preferred, show final value immediately
    if (reducedMotionRef.current) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const start = mountedRef.current ? prevRef.current : (countUp ? 0 : value);
    const diff = value - start;

    if (diff === 0) {
      mountedRef.current = true;
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;

      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
        prevRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    mountedRef.current = true;

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration, countUp]);

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
