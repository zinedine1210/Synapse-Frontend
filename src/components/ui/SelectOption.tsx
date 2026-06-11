'use client';

import React, { useState, useId, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface SelectOptionItem {
  /** Unique value for this option */
  value: string;
  /** Display label for this option */
  label: string;
  /** Whether this option is disabled */
  disabled?: boolean;
}

export interface SelectOptionProps extends FormFieldProps {
  /** Currently selected value */
  value: string;
  /** Change handler — receives selected value string */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** List of selectable options */
  options: SelectOptionItem[];
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Input name attribute */
  name?: string;
}

/**
 * SelectOption — A styled dropdown select component.
 * Wraps FormField for consistent label, error, and hint rendering.
 * Provides smooth focus animation and supports dark/light mode.
 */
export function SelectOption({
  label,
  error,
  hint,
  required,
  disabled,
  className,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Pilih opsi',
  name,
}: SelectOptionProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Find selected option label
  const selectedLabel = useMemo(() => {
    const found = options.find(opt => opt.value === value);
    return found?.label || '';
  }, [options, value]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onBlur]);

  // Determine drop direction
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < 220);
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const items = listRef.current?.querySelectorAll('[role="option"]');
    items?.[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(prev => !prev);
    setIsFocused(true);
    // Set highlighted index to currently selected value
    const idx = options.findIndex(o => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  }, [disabled, options, value]);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setIsFocused(false);
    onBlur?.();
  }, [onChange, onBlur]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev + 1;
          return next >= options.length ? 0 : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? options.length - 1 : next;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && !options[highlightedIndex]?.disabled) {
          handleSelect(options[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsFocused(false);
        onBlur?.();
        break;
    }
  }, [isOpen, highlightedIndex, options, handleOpen, handleSelect, onBlur]);

  const inputStyle = getFormInputStyle({
    hasError: !!error,
    isFocused,
    isDisabled: disabled,
  });

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      disabled={disabled}
      className={className}
      htmlFor={inputId}
    >
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        {/* Trigger button */}
        <button
          id={inputId}
          type="button"
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          role="combobox"
          aria-invalid={!!error}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${inputId}-listbox`}
          style={{
            ...inputStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ flex: 1, color: selectedLabel ? 'inherit' : 'rgb(var(--text-muted))' }}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={16}
            style={{
              opacity: 0.5,
              flexShrink: 0,
              transition: 'transform 150ms ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value} />}

        {/* Options dropdown */}
        {isOpen && (
          <div
            ref={listRef}
            id={`${inputId}-listbox`}
            role="listbox"
            aria-label={label || 'Pilih opsi'}
            style={{
              position: 'absolute',
              [dropUp ? 'bottom' : 'top']: '100%',
              left: 0,
              right: 0,
              marginTop: dropUp ? undefined : '0.25rem',
              marginBottom: dropUp ? '0.25rem' : undefined,
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--input-border)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              zIndex: 50,
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.25rem',
              animation: 'fadeSlideIn 0.15s ease',
            }}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: 'var(--font-sm, 0.875rem)',
                    borderRadius: 'var(--radius-sm, 0.375rem)',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    background: isSelected
                      ? 'rgba(var(--color-primary) / 0.1)'
                      : isHighlighted
                        ? 'rgba(var(--color-primary) / 0.05)'
                        : 'transparent',
                    color: opt.disabled
                      ? 'rgb(var(--text-muted))'
                      : isSelected
                        ? 'rgba(var(--color-primary) / 1)'
                        : 'rgb(var(--text-primary))',
                    fontWeight: isSelected ? 600 : 400,
                    opacity: opt.disabled ? 0.5 : 1,
                    transition: 'all 150ms ease',
                  }}
                >
                  {opt.label}
                </div>
              );
            })}

            {options.length === 0 && (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)' }}>
                Tidak ada opsi
              </div>
            )}
          </div>
        )}
      </div>
    </FormField>
  );
}
