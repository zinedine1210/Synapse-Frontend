'use client';

import React from 'react';

interface SiBawelAvatarProps {
  /** Size variant: 'inline' = 32px (transaction comments), 'dashboard' = 48px (proactive bubbles) */
  size?: 'inline' | 'dashboard';
  /** Optional className for extra styling */
  className?: string;
}

/**
 * SiBawelAvatar — Cartoon mascot avatar for Si Bawel financial assistant.
 * Two sizes: 32px inline (transaction comments) and 48px dashboard (proactive bubbles).
 */
export function SiBawelAvatar({ size = 'inline', className }: SiBawelAvatarProps) {
  const px = size === 'dashboard' ? 48 : 32;

  return (
    <div
      className={className}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        boxShadow: size === 'dashboard'
          ? '0 4px 12px rgba(102, 126, 234, 0.25)'
          : '0 2px 6px rgba(102, 126, 234, 0.2)',
      }}
      aria-label="Si Bawel"
      role="img"
    >
      {/* Mascot face using SVG */}
      <svg
        width={px * 0.6}
        height={px * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Face circle */}
        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.95)" />
        {/* Left eye */}
        <circle cx="9" cy="10" r="1.5" fill="#333" />
        {/* Right eye */}
        <circle cx="15" cy="10" r="1.5" fill="#333" />
        {/* Grin mouth */}
        <path
          d="M8 14.5C8 14.5 9.5 17 12 17C14.5 17 16 14.5 16 14.5"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Blush left */}
        <circle cx="7.5" cy="13" r="1.2" fill="rgba(255, 150, 150, 0.4)" />
        {/* Blush right */}
        <circle cx="16.5" cy="13" r="1.2" fill="rgba(255, 150, 150, 0.4)" />
      </svg>
      {/* Speech indicator dot */}
      {size === 'dashboard' && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid var(--card-bg, #fff)',
          }}
        />
      )}
    </div>
  );
}
