'use client';

import React, { useState, useId, useCallback } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface TextInputProps extends FormFieldProps {
  /** Current input value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Input placeholder */
  placeholder?: string;
  /** Input type — defaults to "text" */
  type?: 'text' | 'email' | 'url' | 'tel' | 'search';
  /** Maximum character length */
  maxLength?: number;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Input name attribute */
  name?: string;
  /** Aria-describedby for accessibility */
  'aria-describedby'?: string;
}

/**
 * TextInput — A text input component wrapping FormField.
 * Provides smooth focus border/shadow animation via transition-all duration-150.
 * Supports dark/light mode and responsive rendering from 320px to 1920px.
 */
export function TextInput({
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
  type = 'text',
  maxLength,
  autoFocus,
  name,
  'aria-describedby': ariaDescribedBy,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

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
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={maxLength}
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
