'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
  /** Shape variant for common patterns */
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ width, height = 20, borderRadius = 6, style, className, variant }: SkeletonProps) {
  const resolvedRadius = variant === 'circle' ? '50%' : borderRadius;
  const resolvedWidth = variant === 'circle' ? (height ?? 40) : (width ?? '100%');

  return (
    <div
      className={`skeleton ${className || ''}`}
      style={{
        width: resolvedWidth,
        height,
        borderRadius: resolvedRadius,
        ...style,
      }}
    />
  );
}

/** Generic card skeleton matching the Card component shape */
export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border-default)', background: 'var(--card-bg)', ...style }}>
      <Skeleton height={16} width="60%" style={{ marginBottom: 12 }} />
      <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
      <Skeleton height={12} width="40%" />
    </div>
  );
}

/** List skeleton matching row-based content */
export function SkeletonList({ count = 5, style }: { count?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={28} borderRadius={6} />
      ))}
    </div>
  );
}

/** Text skeleton matching paragraph content */
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

/** Transaction item skeleton — matches the actual transaction row shape */
export function SkeletonTransaction({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 12,
      border: '1px solid var(--border-default)',
      background: 'rgba(var(--bg-surface) / 0.5)',
      ...style,
    }}>
      {/* Category icon */}
      <Skeleton variant="circle" height={40} />
      {/* Text content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={14} width="55%" borderRadius={4} />
        <Skeleton height={11} width="30%" borderRadius={3} />
      </div>
      {/* Amount */}
      <Skeleton height={16} width={80} borderRadius={4} />
    </div>
  );
}

/** Todo item skeleton — matches the actual todo row with checkbox */
export function SkeletonTodo({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 10,
      border: '1px solid var(--border-default)',
      background: 'rgba(var(--bg-surface) / 0.5)',
      ...style,
    }}>
      {/* Checkbox */}
      <Skeleton height={20} width={20} borderRadius={5} />
      {/* Text */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Skeleton height={13} width="65%" borderRadius={4} />
        <Skeleton height={10} width="35%" borderRadius={3} />
      </div>
      {/* Priority/date badge */}
      <Skeleton height={22} width={50} borderRadius={11} />
    </div>
  );
}

/** Q&A question card skeleton */
export function SkeletonQnaCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 14,
      border: '1px solid var(--border-default)',
      background: 'rgba(var(--bg-surface) / 0.5)',
      ...style,
    }}>
      {/* Tags */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <Skeleton height={20} width={60} borderRadius={10} />
        <Skeleton height={20} width={45} borderRadius={10} />
      </div>
      {/* Title */}
      <Skeleton height={16} width="80%" borderRadius={4} style={{ marginBottom: 8 }} />
      {/* Body preview */}
      <Skeleton height={12} width="95%" borderRadius={3} style={{ marginBottom: 5 }} />
      <Skeleton height={12} width="60%" borderRadius={3} style={{ marginBottom: 12 }} />
      {/* Footer: author + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Skeleton variant="circle" height={24} />
        <Skeleton height={11} width={80} borderRadius={3} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <Skeleton height={11} width={30} borderRadius={3} />
          <Skeleton height={11} width={30} borderRadius={3} />
        </div>
      </div>
    </div>
  );
}

/** Dashboard stat card skeleton — matches hero number layout */
export function SkeletonStatCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      border: '1px solid var(--border-default)',
      background: 'rgba(var(--bg-surface) / 0.5)',
      ...style,
    }}>
      {/* Label */}
      <Skeleton height={12} width="40%" borderRadius={3} style={{ marginBottom: 10 }} />
      {/* Hero number */}
      <Skeleton height={28} width="70%" borderRadius={6} style={{ marginBottom: 8 }} />
      {/* Subtitle / trend */}
      <Skeleton height={11} width="55%" borderRadius={3} />
    </div>
  );
}

/** Notification item skeleton */
export function SkeletonNotification({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 10,
      background: 'rgba(var(--bg-surface) / 0.3)',
      ...style,
    }}>
      {/* Icon */}
      <Skeleton variant="circle" height={32} />
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Skeleton height={13} width="75%" borderRadius={4} />
        <Skeleton height={11} width="50%" borderRadius={3} />
        <Skeleton height={10} width="25%" borderRadius={3} />
      </div>
    </div>
  );
}
