'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({ width, height = 20, borderRadius = 6, style, className }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border-default)', background: 'var(--card-bg)', ...style }}>
      <Skeleton height={16} width="60%" style={{ marginBottom: 12 }} />
      <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
      <Skeleton height={12} width="40%" />
    </div>
  );
}

export function SkeletonList({ count = 5, style }: { count?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={28} borderRadius={6} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, style }: { lines?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
          borderRadius={4}
        />
      ))}
    </div>
  );
}
