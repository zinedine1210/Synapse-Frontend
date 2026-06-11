'use client';

import React, { useState, useRef, useCallback, useId } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

type PasswordStrength = 'weak' | 'medium' | 'strong';

interface PasswordInputProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  showStrength?: boolean;
}

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

const strengthConfig: Record<PasswordStrength, { label: string; color: string; pct: number }> = {
  weak: { label: 'Lemah', color: '#ef4444', pct: 33 },
  medium: { label: 'Sedang', color: '#f59e0b', pct: 66 },
  strong: { label: 'Kuat', color: '#22c55e', pct: 100 },
};

export function PasswordInput({ value, onChange, placeholder = '••••••••', required, disabled, label, error, hint, className, style, showStrength = false }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleToggle = useCallback(() => {
    setShow(prev => !prev);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const strength = getPasswordStrength(value);
  const cfg = strengthConfig[strength];
  const inputStyle = getFormInputStyle({ hasError: !!error, isFocused, isDisabled: disabled });

  return (
    <FormField label={label} error={error} hint={hint} required={required} disabled={disabled} className={className} htmlFor={inputId}>
      <div style={{ position: 'relative', width: '100%', ...style }}>
        <input ref={inputRef} id={inputId} type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
          placeholder={placeholder} required={required} disabled={disabled} aria-invalid={!!error}
          style={{ ...inputStyle, paddingRight: '2.75rem' }} />
        <button type="button" onClick={handleToggle} tabIndex={-1}
          aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          style={{
            position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgb(var(--text-muted))', borderRadius: '6px', transition: 'color 0.2s, background 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(var(--color-primary) / 0.06)'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none'; }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--border-default)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${cfg.pct}%`, background: cfg.color, borderRadius: '2px', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
            <Shield size={11} style={{ color: cfg.color }} />
            <span style={{ fontSize: '0.65rem', color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
          </div>
        </div>
      )}
    </FormField>
  );
}
