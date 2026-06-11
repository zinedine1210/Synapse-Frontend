'use client';

import React, { useCallback } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

function formatCurrency(raw: string): string {
  const clean = raw.replace(/\D/g, '');
  if (!clean) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(clean));
}

export function parseCurrency(formatted: string): number {
  return parseFloat(formatted.replace(/\D/g, '')) || 0;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  required,
  style,
  className,
}: CurrencyInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatCurrency(e.target.value));
  }, [onChange]);

  return (
    <div className={`currency-input-container ${className || ''}`} style={style}>
      <span className="currency-input-prefix">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="currency-input-field"
      />
    </div>
  );
}
