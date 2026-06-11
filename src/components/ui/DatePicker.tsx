'use client';

import React, { useState, useId, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface DatePickerProps extends FormFieldProps {
  /** Current date value in YYYY-MM-DD format */
  value: string;
  /** Change handler — receives date string in YYYY-MM-DD format */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date (YYYY-MM-DD) */
  min?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  max?: string;
  /** Input name attribute */
  name?: string;
}

// ─── Helpers ───
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

/**
 * DatePicker — A date input with calendar dropdown styled in Tailwind.
 * Wraps FormField for consistent label, error, and hint rendering.
 * Provides smooth focus animation and supports dark/light mode.
 */
export function DatePicker({
  label,
  error,
  hint,
  required,
  disabled,
  className,
  value,
  onChange,
  onBlur,
  placeholder = 'Pilih tanggal',
  min,
  max,
  name,
}: DatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  // Parse value for calendar navigation
  const parsed = value ? value.split('-').map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed?.[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : new Date().getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

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
    setDropUp(spaceBelow < 340);
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setIsFocused(true);
  }, [disabled]);

  const handleDateSelect = useCallback((dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
    setIsFocused(false);
    onBlur?.();
  }, [onChange, onBlur]);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  // Build calendar grid
  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
    const cells: { day: number; current: boolean; dateStr: string }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true, dateStr: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}` });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }, []);

  const inputStyle = getFormInputStyle({
    hasError: !!error,
    isFocused,
    isDisabled: disabled,
  });

  const displayValue = formatDateDisplay(value);

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
          <Calendar size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ flex: 1, color: displayValue ? 'inherit' : 'rgb(var(--text-muted))' }}>
            {displayValue || placeholder}
          </span>
        </button>

        {/* Hidden input for form submission */}
        {name && <input type="hidden" name={name} value={value} />}

        {/* Calendar dropdown */}
        {isOpen && (
          <div
            role="dialog"
            aria-label="Pilih tanggal"
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
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  color: 'rgb(var(--text-primary))',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)', color: 'rgb(var(--text-primary))' }}>
                {MONTHS_ID[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  color: 'rgb(var(--text-primary))',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Bulan selanjutnya"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.25rem' }}>
              {DAYS_ID.map(d => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    color: 'rgb(var(--text-muted))',
                    padding: '0.25rem 0',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {calendarCells.map((cell, i) => {
                const isSelected = cell.dateStr === value;
                const isToday = cell.dateStr === todayStr;
                const isDisabled = (min && cell.dateStr < min) || (max && cell.dateStr > max);

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(cell.dateStr)}
                    disabled={!!isDisabled}
                    style={{
                      border: 'none',
                      background: isSelected
                        ? 'rgba(var(--color-primary) / 1)'
                        : isToday
                          ? 'rgba(var(--color-primary) / 0.1)'
                          : 'transparent',
                      color: isSelected
                        ? '#fff'
                        : isDisabled
                          ? 'rgb(var(--text-muted))'
                          : !cell.current
                            ? 'rgb(var(--text-muted))'
                            : 'rgb(var(--text-primary))',
                      borderRadius: 'var(--radius-sm, 0.375rem)',
                      padding: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: isSelected || isToday ? 600 : 400,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.4 : !cell.current ? 0.5 : 1,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--input-border)', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDateSelect(todayStr)}
                style={{
                  flex: 1,
                  padding: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  background: 'transparent',
                  color: 'rgb(var(--text-primary))',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = new Date();
                  t.setDate(t.getDate() + 1);
                  handleDateSelect(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
                }}
                style={{
                  flex: 1,
                  padding: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm, 0.375rem)',
                  background: 'transparent',
                  color: 'rgb(var(--text-primary))',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                Besok
              </button>
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
