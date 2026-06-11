'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_LABELS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

export interface DatePickerProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
}

function parseYMD(s: string) { const p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function toYMD(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }

export function DatePicker({ label, error, hint, required, disabled, className, value, onChange, placeholder = 'Pilih tanggal', minDate, maxDate }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? parseYMD(value) : new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const today = new Date();
  const selected = value ? parseYMD(value) : null;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isDisabledDate = useCallback((d: Date) => {
    if (minDate && d < parseYMD(minDate)) return true;
    if (maxDate && d > parseYMD(maxDate)) return true;
    return false;
  }, [minDate, maxDate]);

  const handleSelect = (day: number) => {
    const d = new Date(year, month, day);
    if (isDisabledDate(d)) return;
    onChange(toYMD(d));
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const displayValue = selected ? `${selected.getDate()} ${MONTH_NAMES[selected.getMonth()]} ${selected.getFullYear()}` : '';
  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused: isFocused || open, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
        <button type="button" id={inputId} disabled={disabled}
          onClick={() => { if (!disabled) { setOpen(!open); if (!open && value) setViewDate(parseYMD(value)); } }}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          style={{
            ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
            color: displayValue ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
          }}>
          <Calendar size={15} style={{ flexShrink: 0, opacity: 0.45 }} />
          <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 280,
            background: 'rgb(var(--bg-surface))', border: '1.5px solid var(--border-default)',
            borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 50,
            padding: '12px', animation: 'fadeSlideIn 0.15s ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgb(var(--text-secondary))', display: 'flex' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{MONTH_NAMES[month]} {year}</span>
              <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: 'rgb(var(--text-secondary))', display: 'flex' }}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
              {DAY_LABELS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'rgb(var(--text-muted))', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const isToday = isSameDay(date, today);
                const isSelected = selected && isSameDay(date, selected);
                const isDis = isDisabledDate(date);

                return (
                  <button key={day} type="button" onClick={() => handleSelect(day)} disabled={isDis}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '8px', border: 'none',
                      cursor: isDis ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
                      fontWeight: isSelected || isToday ? 700 : 400,
                      background: isSelected ? 'rgb(var(--color-primary))' : isToday ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                      color: isSelected ? '#fff' : isDis ? 'rgb(var(--text-muted))' : isToday ? 'rgb(var(--color-primary))' : 'rgb(var(--text-primary))',
                      opacity: isDis ? 0.35 : 1, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>
              {[
                { label: 'Hari Ini', d: today },
                { label: 'Besok', d: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) },
              ].map(q => (
                <button key={q.label} type="button"
                  onClick={() => { if (!isDisabledDate(q.d)) { onChange(toYMD(q.d)); setViewDate(q.d); setOpen(false); } }}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: '7px', border: 'none',
                    background: 'rgba(var(--color-primary) / 0.06)', color: 'rgb(var(--color-primary))',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.15s',
                  }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
