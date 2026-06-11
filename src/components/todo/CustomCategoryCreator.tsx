'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TextInput } from '@/components/ui';

export interface CustomCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

interface CustomCategoryCreatorProps {
  onCreated: (category: CustomCategory) => void;
  onCancel: () => void;
}

const COLOR_OPTIONS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899',
  '#8b5cf6', '#f97316', '#14b8a6', '#ef4444', '#06b6d4',
];

const EMOJI_OPTIONS = [
  '📚', '💼', '🏠', '💰', '🎯', '🎮', '🏋️', '🍳',
  '✈️', '🎨', '💡', '🔧', '🎵', '📱', '🌿', '⚡',
];

export function CustomCategoryCreator({ onCreated, onCancel }: CustomCategoryCreatorProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    onCreated({ id, label: `${emoji} ${name}`, emoji, color });
  };

  return (
    <form onSubmit={handleSubmit} style={{
      padding: 14,
      borderRadius: 12,
      background: 'var(--card-bg)',
      border: '1px solid var(--border-default)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>✨ Kategori Baru</span>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
          <X size={16} />
        </button>
      </div>

      {/* Name input */}
      <div style={{ marginBottom: 12 }}>
        <TextInput label="Nama" placeholder="Nama kategori..." value={name} onChange={setName} autoFocus />
      </div>

      {/* Emoji picker */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, marginBottom: 6, display: 'block' }}>Emoji</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: emoji === e ? 'rgba(var(--color-primary), 0.15)' : 'var(--input-bg)',
                outline: emoji === e ? '2px solid rgb(var(--color-primary))' : 'none',
                outlineOffset: -1,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.5, marginBottom: 6, display: 'block' }}>Warna</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: c,
                outline: color === c ? '3px solid rgb(var(--color-primary))' : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Preview & Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: 8,
          background: `${color}20`,
          color,
          fontSize: 12,
          fontWeight: 500,
        }}>
          {emoji} {name || 'Preview'}
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            background: 'rgb(var(--color-primary))',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            opacity: name.trim() ? 1 : 0.5,
          }}
        >
          <Plus size={12} /> Buat
        </button>
      </div>
    </form>
  );
}
