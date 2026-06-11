'use client';

import React, { useState, useRef, useCallback, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

type PasswordStrength = 'weak' | 'medium' | 'strong';

interface PasswordInputProps extends FormFieldProps {
  /** Current value of the password field */
  value: string;
  /** Callback fired when the value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Show password strength indicator below the input */
  showStrength?: boolean;
}

/**
 * Evaluates password strength based on length and character variety.
 * - weak: less than 6 characters OR only one character type
 * - medium: 6-7 characters with 2+ character types, OR 8+ with only 1 type
 * - strong: 8+ characters with 3+ character types
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 6) return 'weak';

  let variety = 0;
  if (/[a-z]/.test(password)) variety++;
  if (/[A-Z]/.test(password)) variety++;
  if (/[0-9]/.test(password)) variety++;
  if (/[^a-zA-Z0-9]/.test(password)) variety++;

  if (password.length >= 8 && variety >= 3) return 'strong';
  if (password.length >= 6 && variety >= 2) return 'medium';
  return 'weak';
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  weak: { label: 'Lemah', color: '#ef4444', width: '33%' },
  medium: { label: 'Sedang', color: '#f59e0b', width: '66%' },
  strong: { label: 'Kuat', color: '#22c55e', width: '100%' },
};

export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required,
  disabled,
  label,
  error,
  hint,
  className,
  style,
  showStrength = false,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleToggle = useCallback(() => {
    setShow(prev => !prev);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const strength = getPasswordStrength(value);
  const config = strengthConfig[strength];

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
      <div style={{ position: 'relative', width: '100%', ...style }}>
        <input
          ref={inputRef}
          id={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          style={{
            ...inputStyle,
            paddingRight: '2.75rem',
          }}
        />
        <button
          type="button"
          onClick={handleToggle}
          tabIndex={-1}
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgb(var(--text-muted))',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.15s ease',
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div style={{ marginTop: '0.4rem' }}>
          <div
            style={{
              height: '4px',
              borderRadius: '2px',
              background: 'var(--input-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: config.width,
                background: config.color,
                borderRadius: '2px',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
          <p
            style={{
              fontSize: 'var(--font-xs)',
              color: config.color,
              margin: '0.2rem 0 0',
              fontWeight: 500,
            }}
          >
            {config.label}
          </p>
        </div>
      )}
    </FormField>
  );
}
