'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface QuickInputBarProps {
  /** Called when user submits text (press Enter or click send) */
  onSubmit: (text: string) => void;
  /** Called on every keystroke (debounced externally or by ParsePreview) */
  onInputChange?: (text: string) => void;
  /** Whether a submission is in progress */
  submitting?: boolean;
  /** External controlled value */
  value?: string;
  /** External onChange */
  onChange?: (value: string) => void;
}

/**
 * QuickInputBar — Sticky top bar for natural language transaction input.
 * Remains visible during scroll with placeholder "Ketik: kopi 25k..."
 * Sends input to `/duit-tracker/parse` API for live preview.
 */
export function QuickInputBar({
  onSubmit,
  onInputChange,
  submitting = false,
  value,
  onChange,
}: QuickInputBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const text = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (onChange) {
      onChange(val);
    } else {
      setInternalValue(val);
    }
    onInputChange?.(val);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || submitting) return;
    onSubmit(text.trim());
    if (!onChange) setInternalValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="quick-input-bar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        padding: '12px 0',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(var(--bg-main), 0.85)',
        borderBottom: '1px solid var(--border-default)',
        marginBottom: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'var(--input-bg)',
          border: '1px solid var(--border-default)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <Sparkles size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ketik: kopi 25k..."
          disabled={submitting}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 14,
            fontWeight: 500,
            color: 'inherit',
            fontFamily: 'inherit',
          }}
          aria-label="Input transaksi cepat"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          style={{
            background: text.trim()
              ? 'rgb(var(--color-primary))'
              : 'var(--border-default)',
            border: 'none',
            borderRadius: 10,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s',
            flexShrink: 0,
            color: text.trim() ? '#fff' : 'inherit',
            opacity: text.trim() ? 1 : 0.4,
          }}
          aria-label="Kirim transaksi"
        >
          {submitting ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </form>
    </div>
  );
}
