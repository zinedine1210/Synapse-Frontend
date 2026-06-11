'use client';

import React from 'react';

type GradientPreset = 'primary' | 'coral' | 'purple' | 'yellow' | 'custom';

interface GradientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  /** Preset gradient or 'custom' to use customGradient prop */
  variant?: GradientPreset;
  /** Custom CSS gradient value (used when variant='custom') */
  customGradient?: string;
  /** Gradient direction in degrees. Default: 135 */
  angle?: number;
}

const GRADIENT_MAP: Record<Exclude<GradientPreset, 'custom'>, string> = {
  primary: 'rgb(var(--color-primary)), rgb(var(--color-secondary))',
  coral: 'rgb(var(--color-accent-coral)), rgb(var(--color-accent-purple))',
  purple: 'rgb(var(--color-accent-purple)), rgb(var(--color-primary))',
  yellow: 'rgb(var(--color-accent-yellow)), rgb(var(--color-accent-coral))',
};

/**
 * GradientCard — Card with a gradient background.
 * Supports preset gradients (primary, coral, purple, yellow) or custom gradients.
 */
export function GradientCard({
  children,
  className = '',
  hoverable = false,
  variant = 'primary',
  customGradient,
  angle = 135,
  style,
  ...props
}: GradientCardProps) {
  const gradient =
    variant === 'custom' && customGradient
      ? customGradient
      : `linear-gradient(${angle}deg, ${GRADIENT_MAP[variant === 'custom' ? 'primary' : variant]})`;

  return (
    <div
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      style={{
        background: gradient,
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        color: 'white',
        transition: 'var(--transition-smooth)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
