'use client';

import React, { useState, useId, useCallback, useRef, useEffect } from 'react';
import { FormField, getFormInputStyle } from './FormField';
import type { FormFieldProps } from './types';

export interface TextAreaProps extends FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  autoResize?: boolean;
  showCount?: boolean;
  resize?: 'none' | 'vertical' | 'both';
  minHeight?: number;
  maxHeight?: number;
  name?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export function TextArea({
  label, error, hint, required, disabled, className,
  value, onChange, onBlur, onKeyDown, placeholder,
  rows = 3, maxLength, autoFocus, autoResize, showCount,
  resize = 'vertical', minHeight, maxHeight, name, inputRef,
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = (inputRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (maxLength) val = val.slice(0, maxLength);
    onChange(val);
  }, [onChange, maxLength]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => { setIsFocused(false); onBlur?.(); }, [onBlur]);

  // Auto-resize
  useEffect(() => {
    if (!autoResize || !ref || !('current' in ref) || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    const computed = Math.max(el.scrollHeight, minHeight || 0);
    el.style.height = `${maxHeight ? Math.min(computed, maxHeight) : computed}px`;
  }, [value, autoResize, minHeight, maxHeight, ref]);

  const baseStyle = getFormInputStyle({ hasError: !!error, isFocused, isDisabled: disabled });

  const textareaStyle: React.CSSProperties = {
    ...baseStyle,
    resize,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    ...(minHeight ? { minHeight } : {}),
    ...(maxHeight && !autoResize ? { maxHeight, overflow: 'auto' } : {}),
  };

  const countHint = showCount && maxLength
    ? `${value.length}/${maxLength}`
    : showCount
      ? `${value.length} karakter`
      : undefined;

  return (
    <FormField label={label} error={error} hint={countHint || hint} required={required}
      disabled={disabled} className={className} htmlFor={inputId}>
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        id={inputId}
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        style={textareaStyle}
      />
    </FormField>
  );
}
