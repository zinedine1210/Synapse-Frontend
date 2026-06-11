'use client';

import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ value, onChange, placeholder = 'Tambah tag...', maxTags = 10 }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px',
      border: '1px solid var(--border-default)', borderRadius: 10,
      background: 'var(--input-bg)', minHeight: 40, alignItems: 'center',
      transition: 'border-color 0.2s',
    }}>
      {value.map(tag => (
        <span key={tag} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500,
          background: 'rgba(var(--color-primary), 0.08)', color: 'rgb(var(--color-primary))',
        }}>
          #{tag}
          <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: 0.6 }}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{
          flex: 1, minWidth: 80, border: 'none', background: 'transparent',
          outline: 'none', fontSize: 13, color: 'inherit', padding: '2px 4px',
        }}
      />
    </div>
  );
}
