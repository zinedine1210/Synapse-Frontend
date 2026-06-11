'use client';

import React, { useState, useId, useCallback, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface NumberInputProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  autoFocus?: boolean;
  showStepper?: boolean;
  allowDecimal?: boolean;
}

export function NumberInput({
  label, error, hint, required, disabled, className,
  value, onChange, onBlur, placeholder, min, max, step = 1, autoFocus,
  showStepper = false, allowDecimal = false,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') { onChange(''); return; }
    const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (pattern.test(raw)) onChange(raw);
  }, [onChange, allowDecimal]);

  const increment = useCallback(() => {
    const cur = parseFloat(value) || 0;
    const next = cur + step;
    if (max !== undefined && next > max) return;
    onChange(String(next));
  }, [value, step, max, onChange]);

  const decrement = useCallback(() => {
    const cur = parseFloat(value) || 0;
    const next = cur - step;
    if (min !== undefined && next < min) return;
    onChange(String(next));
  }, [value, step, min, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); increment(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); decrement(); }
  }, [increment, decrement]);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused, isDisabled: disabled });
  const stepBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: '8px', border: 'none',
    background: 'rgba(var(--color-primary) / 0.06)', color: 'rgb(var(--color-primary))',
    cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0, fontFamily: 'inherit',
  };

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
        {showStepper && (
          <button type="button" onClick={decrement} disabled={disabled || (min !== undefined && (parseFloat(value) || 0) <= min)} style={stepBtnStyle} tabIndex={-1}>
            <Minus size={14} />
          </button>
        )}
        <input ref={inputRef} id={inputId} type="text" inputMode="numeric"
          value={value} onChange={handleChange}
          onFocus={() => setIsFocused(true)} onBlur={() => { setIsFocused(false); onBlur?.(); }}
          onKeyDown={handleKeyDown} placeholder={placeholder} autoFocus={autoFocus}
          disabled={disabled} required={required} aria-invalid={!!error}
          style={{ ...inputStyle, textAlign: showStepper ? 'center' : 'left' }} />
        {showStepper && (
          <button type="button" onClick={increment} disabled={disabled || (max !== undefined && (parseFloat(value) || 0) >= max)} style={stepBtnStyle} tabIndex={-1}>
            <Plus size={14} />
          </button>
        )}
      </div>
    </FormField>
  );
}
