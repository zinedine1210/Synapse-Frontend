'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { Clock, Check } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface TimePickerProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minuteStep?: number;
}

export function TimePicker({ label, error, hint, required, disabled, className, value, onChange, placeholder = 'Pilih waktu', minuteStep = 5 }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const [selHour, selMin] = value ? value.split(':').map(Number) : [-1, -1];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll selected hour/min into view
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (selHour >= 0 && hourRef.current) {
        const el = hourRef.current.querySelector(`[data-hour="${selHour}"]`) as HTMLElement;
        el?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      if (selMin >= 0 && minRef.current) {
        const el = minRef.current.querySelector(`[data-min="${selMin}"]`) as HTMLElement;
        el?.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }, 50);
  }, [open, selHour, selMin]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

  const handleHour = (h: number) => {
    const m = selMin >= 0 ? selMin : 0;
    onChange(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  const handleMin = (m: number) => {
    const h = selHour >= 0 ? selHour : 0;
    onChange(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  const handleDone = () => setOpen(false);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused: isFocused || open, isDisabled: disabled });

  const colBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '6px 8px', borderRadius: '7px', border: 'none',
    cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: active ? 700 : 400,
    background: active ? 'rgb(var(--color-primary))' : 'transparent',
    color: active ? '#fff' : 'rgb(var(--text-primary))',
    transition: 'all 0.15s', textAlign: 'center' as const,
    fontVariantNumeric: 'tabular-nums',
  });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
        <button type="button" id={inputId} disabled={disabled}
          onClick={() => { if (!disabled) setOpen(!open); }}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          style={{
            ...inputStyle, display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
            color: value ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))',
            fontVariantNumeric: 'tabular-nums',
          }}>
          <Clock size={15} style={{ flexShrink: 0, opacity: 0.45 }} />
          <span style={{ flex: 1 }}>{value || placeholder}</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200,
            background: 'rgb(var(--bg-surface))', border: '1.5px solid var(--border-default)',
            borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.14)', zIndex: 50,
            animation: 'fadeSlideIn 0.15s ease', overflow: 'hidden',
          }}>
            {/* Two-column: Hours + Minutes */}
            <div style={{ display: 'flex', height: 200 }}>
              <div ref={hourRef} style={{ flex: 1, overflowY: 'auto', padding: '4px', borderRight: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jam</div>
                {hours.map(h => (
                  <button key={h} type="button" data-hour={h} onClick={() => handleHour(h)} style={colBtnStyle(h === selHour)}>
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div ref={minRef} style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menit</div>
                {minutes.map(m => (
                  <button key={m} type="button" data-min={m} onClick={() => handleMin(m)} style={colBtnStyle(m === selMin)}>
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Done button */}
            <div style={{ borderTop: '1px solid var(--border-default)', padding: '6px' }}>
              <button type="button" onClick={handleDone}
                style={{
                  width: '100%', padding: '7px', borderRadius: '7px', border: 'none',
                  background: 'rgb(var(--color-primary))', color: '#fff',
                  fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                }}>
                <Check size={14} /> Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
