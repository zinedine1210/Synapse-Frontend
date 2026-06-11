'use client';

import React from 'react';
import type { FormFieldProps } from './types';

interface FormFieldWrapperProps extends FormFieldProps {
  /** The form input element to render inside the field */
  children: React.ReactNode;
  /** HTML id to associate label with input via htmlFor */
  htmlFor?: string;
}

/**
 * FormField — Shared wrapper for all form components.
 * Handles label rendering, error messages, hint text, and required indicator.
 * Applies consistent spacing and styling across all form inputs.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  disabled,
  className,
  children,
  htmlFor,
}: FormFieldWrapperProps) {
  return (
    <div
      className={`form-field ${disabled ? 'form-field--disabled' : ''} ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className="form-field__label"
          style={{
            fontSize: 'var(--font-sm)',
            fontWeight: 500,
            color: error ? 'rgb(var(--color-error))' : 'rgb(var(--text-primary))',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'color 0.15s ease',
          }}
        >
          {label}
          {required && (
            <span
              className="form-field__required"
              style={{ color: 'rgb(var(--color-error))', fontWeight: 600 }}
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="form-field__input-wrapper">
        {children}
      </div>

      {error && (
        <p
          className="form-field__error"
          role="alert"
          style={{
            fontSize: 'var(--font-xs)',
            color: 'rgb(var(--color-error))',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            animation: 'fadeSlideIn 0.2s ease',
          }}
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p
          className="form-field__hint"
          style={{
            fontSize: 'var(--font-xs)',
            color: 'rgb(var(--text-muted))',
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * CSS class names and inline style helpers for form input elements.
 * Use these in individual form components (TextInput, NumberInput, etc.)
 * to apply consistent focus transition and error state styling.
 */
export const formInputStyles = {
  /** Base styles for all form inputs */
  base: {
    padding: '0.55rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'rgb(var(--text-primary))',
    fontSize: 'var(--font-base)',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    transition: 'all 150ms ease',
  } as React.CSSProperties,

  /** Focus state — primary color border + glow */
  focus: {
    borderColor: 'rgba(var(--color-primary) / 0.5)',
    boxShadow: '0 0 0 3px rgba(var(--color-primary) / 0.1)',
  } as React.CSSProperties,

  /** Error state — red border */
  error: {
    borderColor: 'rgb(239, 68, 68)',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.08)',
  } as React.CSSProperties,

  /** Disabled state */
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  } as React.CSSProperties,
};

/**
 * Returns computed input styles based on current state.
 * Merges base, error, and disabled styles.
 */
export function getFormInputStyle(options: {
  hasError?: boolean;
  isFocused?: boolean;
  isDisabled?: boolean;
}): React.CSSProperties {
  const { hasError, isFocused, isDisabled } = options;

  return {
    ...formInputStyles.base,
    ...(isFocused && !hasError ? formInputStyles.focus : {}),
    ...(hasError ? formInputStyles.error : {}),
    ...(isDisabled ? formInputStyles.disabled : {}),
  };
}
