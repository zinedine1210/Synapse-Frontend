'use client';

import React, { useState, useId, useCallback } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';
import { formatCurrencyInput } from '@/lib/currency-utils';

export { parseCurrency } from '@/lib/currency-utils';

interface CurrencyInputProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  prefix?: string;
  style?: React.CSSProperties;
}

export function CurrencyInput({
  label, error, hint, required, disabled, className,
  value, onChange, onBlur, placeholder = '0', prefix = 'Rp', style,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [display, setDisplay] = useState(() => value ? formatCurrencyInput(value) : '');
  const inputId = useId();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (!raw) { setDisplay(''); onChange(''); return; }
    setDisplay(formatCurrencyInput(raw));
    onChange(raw);
  }, [onChange]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (value) setDisplay(formatCurrencyInput(value));
    onBlur?.();
  }, [value, onBlur]);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div style={{ position: 'relative', width: '100%', ...style }}>
        <span style={{
          position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.8rem', fontWeight: 700, pointerEvents: 'none',
          color: isFocused ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
          transition: 'color 0.2s',
        }}>{prefix}</span>
        <input id={inputId} type="text" inputMode="numeric" value={display}
          onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
          placeholder={placeholder} disabled={disabled} required={required}
          aria-invalid={!!error} style={{ ...inputStyle, paddingLeft: '2.5rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} />
      </div>
    </FormField>
  );
}
