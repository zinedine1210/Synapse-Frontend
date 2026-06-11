'use client';

import React, { useCallback, useId, useState } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';
import { formatCurrencyInput, parseCurrency } from '@/lib/currency-utils';

interface CurrencyInputProps extends FormFieldProps {
  /** Current formatted value (e.g. "1.500.000") */
  value: string;
  /** Callback with the new formatted value string */
  onChange: (value: string) => void;
  /** Placeholder text (default: "0") */
  placeholder?: string;
  /** Inline styles for the container */
  style?: React.CSSProperties;
}

/**
 * CurrencyInput — Input field with "Rp" prefix and real-time Indonesian
 * thousand separator (dot) formatting. Wraps FormField for consistent
 * label, error, and hint rendering.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  label,
  error,
  hint,
  required,
  disabled,
  className,
  style,
}: CurrencyInputProps) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatCurrencyInput(e.target.value));
    },
    [onChange]
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
      htmlFor={id}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          ...style,
        }}
      >
        {/* Rp prefix */}
        <span
          style={{
            position: 'absolute',
            left: '0.85rem',
            fontSize: 'var(--font-base)',
            fontWeight: 600,
            color: error
              ? 'rgb(239, 68, 68)'
              : isFocused
                ? 'rgba(var(--color-primary) / 0.8)'
                : 'rgb(var(--text-muted))',
            pointerEvents: 'none',
            transition: 'color 150ms ease',
            userSelect: 'none',
          }}
          aria-hidden="true"
        >
          Rp
        </span>

        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            ...inputStyle,
            paddingLeft: '2.5rem', // space for "Rp" prefix
          }}
        />
      </div>
    </FormField>
  );
}

// Re-export parseCurrency from the utility module for backward compatibility
export { parseCurrency } from '@/lib/currency-utils';
