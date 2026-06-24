'use client';

import React from 'react';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#3b82f6'];

function stableColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  style?: React.CSSProperties;
}

export function UserAvatar({ name, avatarUrl, size = 28, style }: UserAvatarProps) {
  const color = stableColor(name);
  const fontSize = Math.max(10, Math.round(size * 0.42));

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        ...style,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
