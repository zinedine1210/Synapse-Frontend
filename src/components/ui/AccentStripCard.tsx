'use client';

import React from 'react';

type AccentColor = 'primary' | 'secondary' | 'coral' | 'purple' | 'yellow' | 'success' | 'warning' | 'error';
type StripPosition = 'left' | 'top';

interface AccentStripCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  /** Color of the accent strip */
  accent?: AccentColor;
  /** Custom CSS color value (overrides accent prop) */
  customColor?: string;
  /** Position of the accent strip */
  position?: StripPosition;
  /** Width/height of the strip in pixels. Default: 4 */
  stripSize?: number;
}

const COLOR_MAP: Record<AccentColor, string> = {
  primary: 'rgb(var(--color-primary))',
  secondary: 'rgb(var(--color-secondary))',
  coral: 'rgb(var(--color-accent-coral))',
  purple: 'rgb(var(--color-accent-purple))',
  yellow: 'rgb(var(--color-accent-yellow))',
  success: 'rgb(var(--color-success))',
  warning: 'rgb(var(--color-warning))',
  error: 'rgb(var(--color-error))',
};

/**
 * AccentStripCard — Card with a colored border strip on the left or top edge.
 * Useful for categorized content, status indicators, and visual grouping.
 */
export function AccentStripCard({
  children,
  className = '',
  hoverable = false,
  accent = 'primary',
  customColor,
  position = 'left',
  stripSize = 4,
  style,
  ...props
}: AccentStripCardProps) {
  const color = customColor || COLOR_MAP[accent];

  const stripStyle: React.CSSProperties =
    position === 'left'
      ? { borderLeft: `${stripSize}px solid ${color}` }
      : { borderTop: `${stripSize}px solid ${color}` };

  return (
    <div
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: 'var(--transition-smooth)',
        ...stripStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
