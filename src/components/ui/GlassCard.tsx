'use client';

import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  blur?: number;
  opacity?: number;
}

/**
 * GlassCard — Glass-morphism card variant with backdrop-filter blur.
 * Uses the design system's surface color at reduced opacity with a blur effect.
 */
export function GlassCard({
  children,
  className = '',
  hoverable = false,
  blur = 16,
  opacity = 0.6,
  style,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      style={{
        background: `rgba(var(--bg-surface) / ${opacity})`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: 'var(--transition-smooth)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
