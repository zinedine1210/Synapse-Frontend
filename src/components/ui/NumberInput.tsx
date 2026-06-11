'use client';

import React, { useState, useId, useCallback } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface NumberInputProps extends FormFieldProps {
  /** Current numeric value (empty string when cleared) */
  value: string;
  /** Change handler — receives validated numeric string */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Input placeholder */
  placeholder?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment (for arrow key adjustments) */
  step?: number;
  /** Allow decimal numbers — defaults to false (integers only) */
  allowDecimal?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Input name attribute */
  name?: string;
  /** Aria-describedby for accessibility */
  'aria-describedby'?: string;
}

/**
 * NumberInput — A numeric-only input component wrapping FormField.
 * Validates input to allow only digits (and optionally decimals).
 * Provides smooth focus border/shadow animation via transition-all duration-150.
 * Supports dark/light mode and responsive rendering from 320px to 1920px.
 */
export function NumberInput({
  label,
  error,
  hint,
  required,
  disabled,
  className,
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  step = 1,
  allowDecimal = false,
  autoFocus,
  name,
  'aria-describedby': ariaDescribedBy,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Allow empty string (clearing the field)
      if (raw === '') {
        onChange('');
        return;
      }

      // Validate numeric-only input
      const pattern = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
      if (!pattern.test(raw)) {
        return; // Reject non-numeric characters
      }

      // Enforce min/max if provided and value is a valid number
      const numericValue = parseFloat(raw);
      if (!isNaN(numericValue)) {
        if (min !== undefined && numericValue < min) return;
        if (max !== undefined && numericValue > max) return;
      }

      onChange(raw);
    },
    [onChange, allowDecimal, min, max]
  );

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow arrow up/down to increment/decrement
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const current = parseFloat(value) || 0;
        const delta = e.key === 'ArrowUp' ? step : -step;
        const next = current + delta;

        if (min !== undefined && next < min) return;
        if (max !== undefined && next > max) return;

        onChange(allowDecimal ? next.toString() : Math.round(next).toString());
      }
    },
    [value, onChange, step, min, max, allowDecimal]
  );

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
      <input
        id={inputId}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={ariaDescribedBy}
        style={inputStyle}
      />
    </FormField>
  );
}
