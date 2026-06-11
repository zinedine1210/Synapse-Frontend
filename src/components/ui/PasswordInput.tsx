'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = '••••••••',
  required,
  style,
  className,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback(() => {
    setShow(prev => !prev);
    // Re-focus after toggle
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  return (
    <div className={`password-input-container ${className || ''}`} style={style}>
      <Lock size={14} className="password-input-icon" />
      <input
        ref={inputRef}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="password-input-field"
      />
      <button
        type="button"
        onClick={handleToggle}
        className="password-input-toggle"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}
