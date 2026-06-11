'use client';

import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ComboboxProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  clearable?: boolean;
  filterFn?: (option: ComboboxOption, query: string) => boolean;
}

const defaultFilter = (opt: ComboboxOption, q: string) =>
  opt.label.toLowerCase().includes(q.toLowerCase()) ||
  (opt.description || '').toLowerCase().includes(q.toLowerCase());

export function Combobox({
  label, error, hint, required, disabled, className,
  value, onChange, options, placeholder = 'Pilih...', searchPlaceholder = 'Cari...',
  clearable = false, filterFn = defaultFilter,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const selected = options.find(o => o.value === value);
  const filtered = useMemo(() => search ? options.filter(o => filterFn(o, search)) : options, [options, search, filterFn]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) { setTimeout(() => searchRef.current?.focus(), 50); setHighlightIndex(0); }
  }, [open]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setSearch(''); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filtered[highlightIndex] && !filtered[highlightIndex].disabled) {
        onChange(filtered[highlightIndex].value);
        setOpen(false); setSearch('');
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => Math.max(prev - 1, 0)); }
  }, [highlightIndex, filtered, onChange]);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused: isFocused || open, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
        <button type="button" id={inputId} disabled={disabled}
          onClick={() => { if (!disabled) setOpen(!open); }}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          style={{
            ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
            color: selected ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
          }}>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {selected?.icon}{selected?.label || placeholder}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            {clearable && value && (
              <span onClick={e => { e.stopPropagation(); onChange(''); }} style={{ padding: '0.15rem', borderRadius: '4px', display: 'flex', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}>
                <X size={13} />
              </span>
            )}
            <ChevronDown size={15} style={{ opacity: 0.4, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
          </div>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'rgb(var(--bg-surface))', border: '1.5px solid var(--border-default)',
            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
            animation: 'fadeSlideIn 0.15s ease', overflow: 'hidden',
          }}>
            {/* Search input */}
            <div style={{ padding: '6px 6px 2px', position: 'sticky', top: 0, background: 'rgb(var(--bg-surface))' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} />
                <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setHighlightIndex(0); }}
                  onKeyDown={handleKeyDown} placeholder={searchPlaceholder}
                  style={{ ...getFormInputStyle({ isFocused: true }), paddingLeft: '2rem', fontSize: '0.8rem', padding: '0.45rem 0.6rem 0.45rem 2rem', borderRadius: '7px' }} />
              </div>
            </div>

            {/* Options */}
            <div ref={listRef} role="listbox" style={{ maxHeight: 200, overflowY: 'auto', padding: '4px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Tidak ditemukan</div>
              ) : filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isHighlighted = i === highlightIndex;
                return (
                  <div key={opt.value} role="option" aria-selected={isSelected}
                    onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); setSearch(''); } }}
                    onMouseEnter={() => setHighlightIndex(i)}
                    style={{
                      padding: '0.5rem 0.65rem', borderRadius: '7px', cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem',
                      background: isHighlighted ? 'rgba(var(--color-primary) / 0.06)' : 'transparent',
                      opacity: opt.disabled ? 0.5 : 1, transition: 'background 0.1s',
                    }}>
                    {opt.icon}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</div>
                      {opt.description && <div style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', marginTop: 1 }}>{opt.description}</div>}
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
