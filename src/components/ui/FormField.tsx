'use client';

import React from 'react';
import type { FormFieldProps } from './types';

interface FormFieldWrapperProps extends FormFieldProps {
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, hint, required, disabled, className, children, htmlFor }: FormFieldWrapperProps) {
  return (
    <div className={`form-field ${disabled ? 'form-field--disabled' : ''} ${className || ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%', opacity: disabled ? 0.55 : 1, transition: 'opacity 0.2s' }}>
      {label && (
        <label htmlFor={htmlFor} style={{
          fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.01em',
          color: error ? 'rgb(var(--color-error))' : 'rgb(var(--text-secondary))',
          display: 'flex', alignItems: 'center', gap: '0.2rem', transition: 'color 0.2s',
        }}>
          {label}
          {required && <span style={{ color: 'rgb(var(--color-error))', fontWeight: 700, fontSize: '0.7rem' }} aria-hidden>*</span>}
        </label>
      )}
      <div className="form-field__input-wrapper">{children}</div>
      {error && (
        <p role="alert" style={{ fontSize: '0.7rem', color: 'rgb(var(--color-error))', margin: 0, fontWeight: 500, animation: 'fadeSlideIn 0.2s ease' }}>
          ⚠ {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', margin: 0, lineHeight: 1.4 }}>{hint}</p>
      )}
    </div>
  );
}

export const formInputStyles = {
  base: {
    padding: '0.6rem 0.8rem',
    borderRadius: '10px',
    background: 'var(--input-bg)',
    border: '1.5px solid var(--border-default)',
    color: 'rgb(var(--text-primary))',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  } as React.CSSProperties,
  focus: {
    borderColor: 'rgb(var(--color-primary))',
    boxShadow: '0 0 0 3px rgba(var(--color-primary) / 0.12)',
    background: 'rgb(var(--bg-surface))',
  } as React.CSSProperties,
  error: {
    borderColor: 'rgb(var(--color-error))',
    boxShadow: '0 0 0 3px rgba(var(--color-error) / 0.08)',
  } as React.CSSProperties,
  disabled: { cursor: 'not-allowed', opacity: 0.5 } as React.CSSProperties,
};

export function getFormInputStyle(opts: { hasError?: boolean; isFocused?: boolean; isDisabled?: boolean }): React.CSSProperties {
  return {
    ...formInputStyles.base,
    ...(opts.isFocused && !opts.hasError ? formInputStyles.focus : {}),
    ...(opts.hasError ? formInputStyles.error : {}),
    ...(opts.isDisabled ? formInputStyles.disabled : {}),
  };
}
