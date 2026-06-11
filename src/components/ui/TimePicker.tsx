'use client';

import React, { useState, useId, useRef, useEffect, useMemo, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface TimePickerProps extends FormFieldProps {
  /** Current time value in HH:MM format */
  value: string;
  /** Change handler — receives time string in HH:MM format */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minute step interval (default: 5) */
  minuteStep?: number;
  /** Input name attribute */
  name?: string;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * TimePicker — A time input with hour/minute selector dropdown.
 * Wraps FormField for consistent label, error, and hint rendering.
 * Provides smooth focus animation and supports dark/light mode.
 */
export function TimePicker({
  label,
  error,
  hint,
  required,
  disabled,
  className,
  value,
  onChange,
  onBlur,
  placeholder = 'Pilih waktu',
  minuteStep = 5,
  name,
}: TimePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  // Parse current value
  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value) return [-1, -1];
    const [h, m] = value.split(':').map(Number);
    return [h ?? -1, m ?? -1];
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep), [minuteStep]);

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
    setDropUp(spaceBelow < 280);
  }, [isOpen]);

  // Scroll selected items into view on open
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      hourScrollRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center', behavior: 'auto' });
      minuteScrollRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }, 50);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setIsFocused(true);
  }, [disabled]);

  const handleHourSelect = useCallback((h: number) => {
    const m = selectedMinute >= 0 ? selectedMinute : 0;
    onChange(`${pad(h)}:${pad(m)}`);
  }, [selectedMinute, onChange]);

  const handleMinuteSelect = useCallback((m: number) => {
    const h = selectedHour >= 0 ? selectedHour : 0;
    onChange(`${pad(h)}:${pad(m)}`);
  }, [selectedHour, onChange]);

  const handleDone = useCallback(() => {
    setIsOpen(false);
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const inputStyle = getFormInputStyle({
    hasError: !!error,
    isFocused,
    isDisabled: disabled,
  });

  const displayValue = value ? value.slice(0, 5) : '';

  const scrollColumnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  };

  const scrollListStyle: React.CSSProperties = {
    maxHeight: '180px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0.25rem',
    width: '100%',
  };

  const itemBaseStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius-sm, 0.375rem)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 150ms ease',
    color: 'rgb(var(--text-primary))',
    width: '100%',
  };

  const itemSelectedStyle: React.CSSProperties = {
    ...itemBaseStyle,
    background: 'rgba(var(--color-primary) / 1)',
    color: '#fff',
    fontWeight: 600,
  };

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
        {/* Trigger button styled as input */}
        <button
          id={inputId}
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          aria-invalid={!!error}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          style={{
            ...inputStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            textAlign: 'left',
          }}
        >
          <Clock size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ flex: 1, color: displayValue ? 'inherit' : 'rgb(var(--text-muted))' }}>
            {displayValue || placeholder}
          </span>
        </button>

        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value} />}

        {/* Time selector dropdown */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Pilih waktu"
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
              padding: '0.75rem',
              animation: 'fadeSlideIn 0.15s ease',
            }}
          >
            {/* Hour and Minute columns */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Hours */}
              <div style={scrollColumnStyle}>
                <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'rgb(var(--text-muted))', marginBottom: '0.25rem' }}>
                  Jam
                </div>
                <div ref={hourScrollRef} style={scrollListStyle}>
                  {hours.map(h => (
                    <button
                      key={h}
                      type="button"
                      data-selected={h === selectedHour}
                      onClick={() => handleHourSelect(h)}
                      style={h === selectedHour ? itemSelectedStyle : itemBaseStyle}
                    >
                      {pad(h)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '1.25rem', color: 'rgb(var(--text-muted))' }}>
                :
              </div>

              {/* Minutes */}
              <div style={scrollColumnStyle}>
                <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'rgb(var(--text-muted))', marginBottom: '0.25rem' }}>
                  Menit
                </div>
                <div ref={minuteScrollRef} style={scrollListStyle}>
                  {minutes.map(m => (
                    <button
                      key={m}
                      type="button"
                      data-selected={m === selectedMinute}
                      onClick={() => handleMinuteSelect(m)}
                      style={m === selectedMinute ? itemSelectedStyle : itemBaseStyle}
                    >
                      {pad(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Done button */}
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--input-border)', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleDone}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  background: 'rgba(var(--color-primary) / 1)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
