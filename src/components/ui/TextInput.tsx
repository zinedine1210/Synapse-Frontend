'use client';

import React, { useState, useId, useCallback } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface TextInputProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'search';
  maxLength?: number;
  autoFocus?: boolean;
  name?: string;
  leftIcon?: React.ReactNode;
  'aria-describedby'?: string;
}

export function TextInput({
  label, error, hint, required, disabled, className,
  value, onChange, onBlur, placeholder, type = 'text',
  maxLength, autoFocus, name, leftIcon, 'aria-describedby': ariaDescribedBy,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value), [onChange]);
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => { setIsFocused(false); onBlur?.(); }, [onBlur]);

  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required}
      disabled={disabled} className={className} htmlFor={inputId}>
      <div style={{ position: 'relative', width: '100%' }}>
        {leftIcon && (
          <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: isFocused ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', transition: 'color 0.2s', display: 'flex', pointerEvents: 'none' }}>
            {leftIcon}
          </span>
        )}
        <input id={inputId} type={type} name={name} value={value}
          onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur}
          placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus}
          disabled={disabled} required={required} aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          style={{ ...inputStyle, ...(leftIcon ? { paddingLeft: '2.3rem' } : {}) }} />
      </div>
    </FormField>
  );
}
