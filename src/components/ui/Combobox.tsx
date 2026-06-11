'use client';

import React, { useState, useId, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface ComboboxOption {
  /** Unique value for this option */
  value: string;
  /** Display label for this option */
  label: string;
  /** Whether this option is disabled */
  disabled?: boolean;
}

export interface ComboboxProps extends FormFieldProps {
  /** Currently selected value */
  value: string;
  /** Change handler — receives selected value string */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** List of selectable options */
  options: ComboboxOption[];
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Whether the selected value can be cleared */
  clearable?: boolean;
  /** Custom filter function; defaults to case-insensitive label match */
  filterFn?: (option: ComboboxOption, query: string) => boolean;
  /** Text to show when no options match the query */
  emptyText?: string;
  /** Input name attribute */
  name?: string;
}

function defaultFilter(option: ComboboxOption, query: string): boolean {
  return option.label.toLowerCase().includes(query.toLowerCase());
}

/**
 * Combobox — A searchable autocomplete select component.
 * Wraps FormField for consistent label, error, and hint rendering.
 * Provides smooth focus animation and supports dark/light mode.
 */
export function Combobox({
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
  placeholder = 'Cari atau pilih...',
  clearable = true,
  filterFn = defaultFilter,
  emptyText = 'Tidak ada hasil',
  name,
}: ComboboxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  // Filtered options based on query
  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter(opt => filterFn(opt, query));
  }, [options, query, filterFn]);

  // Find selected option label
  const selectedLabel = useMemo(() => {
    const found = options.find(opt => opt.value === value);
    return found?.label || '';
  }, [options, value]);

  // Reset highlight when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setQuery('');
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
    setDropUp(spaceBelow < 240);
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const items = listRef.current?.querySelectorAll('[role="option"]');
    items?.[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, highlightedIndex]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setIsFocused(true);
    setQuery('');
    // Focus the input after opening
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [disabled]);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setIsFocused(false);
    setQuery('');
    onBlur?.();
  }, [onChange, onBlur]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  }, [isOpen]);

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
          return next >= filteredOptions.length ? 0 : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length && !filteredOptions[highlightedIndex]?.disabled) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsFocused(false);
        setQuery('');
        onBlur?.();
        break;
    }
  }, [isOpen, highlightedIndex, filteredOptions, handleOpen, handleSelect, onBlur]);

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
          onKeyDown={!isOpen ? handleKeyDown : undefined}
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
          <Search size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
          <span style={{ flex: 1, color: selectedLabel ? 'inherit' : 'rgb(var(--text-muted))' }}>
            {selectedLabel || placeholder}
          </span>
          {clearable && value && !disabled && (
            <span
              onClick={handleClear}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: 0.5 }}
              aria-label="Hapus pilihan"
            >
              <X size={14} />
            </span>
          )}
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

        {/* Dropdown with search */}
        {isOpen && (
          <div
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
              padding: '0.5rem',
              animation: 'fadeSlideIn 0.15s ease',
            }}
          >
            {/* Search input */}
            <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: 0.4,
                  pointerEvents: 'none',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ketik untuk mencari..."
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem 0.45rem 2rem',
                  fontSize: 'var(--font-sm, 0.875rem)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  background: 'var(--input-bg, transparent)',
                  color: 'rgb(var(--text-primary))',
                  outline: 'none',
                  transition: 'all 150ms ease',
                }}
              />
            </div>

            {/* Options list */}
            <div
              ref={listRef}
              id={`${inputId}-listbox`}
              role="listbox"
              aria-label={label || 'Pilih opsi'}
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '0.25rem 0',
              }}
            >
              {filteredOptions.map((opt, idx) => {
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
                      padding: '0.45rem 0.6rem',
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

              {filteredOptions.length === 0 && (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)' }}>
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
