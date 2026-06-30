'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface SelectOptionItem {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectOptionProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOptionItem[];
  placeholder?: string;
}

export function SelectOption({ label, error, hint, required, disabled, className, value, onChange, options, placeholder = 'Pilih...' }: SelectOptionProps) {
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (highlightIndex >= 0 && !options[highlightIndex]?.disabled) {
        onChange(options[highlightIndex].value);
        setOpen(false);
      }
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => Math.min(prev + 1, options.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => Math.max(prev - 1, 0)); }
  }, [open, highlightIndex, options, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused: isFocused || open, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
        <button type="button" id={inputId} role="combobox" aria-expanded={open} aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => { if (!disabled) setOpen(!open); }}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            ...inputStyle,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
            color: selected ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
            height: 'auto', minHeight: 0,
          }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1.4 }}>
            {selected?.icon}{selected?.label || placeholder}
          </span>
          <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.4, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>

        {open && (
          <div ref={listRef} role="listbox"
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: 'rgb(var(--bg-surface))', border: '1.5px solid var(--border-default)',
              borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
              maxHeight: 220, overflowY: 'auto', padding: '4px',
            }}>
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHighlighted = i === highlightIndex;
              return (
                <div key={opt.value} role="option" aria-selected={isSelected}
                  onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                  onMouseEnter={() => setHighlightIndex(i)}
                  style={{
                    padding: '0.5rem 0.65rem', borderRadius: '7px', cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
                    background: isSelected ? 'rgba(var(--color-primary) / 0.08)' : isHighlighted ? 'rgba(var(--color-primary) / 0.04)' : 'transparent',
                    color: opt.disabled ? 'rgb(var(--text-muted))' : isSelected ? 'rgb(var(--color-primary))' : 'rgb(var(--text-primary))',
                    fontWeight: isSelected ? 600 : 400, opacity: opt.disabled ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}>
                  {opt.icon}
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {isSelected && <Check size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FormField>
  );
}
