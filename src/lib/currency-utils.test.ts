import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, formatCurrencyInput } from './currency-utils';

describe('formatCurrency', () => {
  it('formats zero as "0"', () => {
    expect(formatCurrency(0)).toBe('0');
  });

  it('formats small numbers without separator', () => {
    expect(formatCurrency(999)).toBe('999');
  });

  it('formats thousands with dot separator', () => {
    expect(formatCurrency(1000)).toBe('1.000');
    expect(formatCurrency(1500)).toBe('1.500');
  });

  it('formats millions with correct separators', () => {
    expect(formatCurrency(1500000)).toBe('1.500.000');
    expect(formatCurrency(25000000)).toBe('25.000.000');
  });

  it('formats large numbers correctly', () => {
    expect(formatCurrency(1000000000)).toBe('1.000.000.000');
  });

  it('handles negative numbers by returning "0"', () => {
    expect(formatCurrency(-100)).toBe('0');
  });

  it('handles NaN and Infinity by returning "0"', () => {
    expect(formatCurrency(NaN)).toBe('0');
    expect(formatCurrency(Infinity)).toBe('0');
  });

  it('truncates decimal values to integer', () => {
    expect(formatCurrency(1500.75)).toBe('1.500');
  });
});

describe('parseCurrency', () => {
  it('parses formatted string to number', () => {
    expect(parseCurrency('1.500.000')).toBe(1500000);
  });

  it('parses string without separators', () => {
    expect(parseCurrency('999')).toBe(999);
  });

  it('handles empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });

  it('handles string with Rp prefix', () => {
    expect(parseCurrency('Rp 1.500.000')).toBe(1500000);
  });

  it('handles null/undefined-like values', () => {
    expect(parseCurrency(null as unknown as string)).toBe(0);
    expect(parseCurrency(undefined as unknown as string)).toBe(0);
  });

  it('strips all non-digit characters', () => {
    expect(parseCurrency('abc123def456')).toBe(123456);
  });
});

describe('formatCurrencyInput', () => {
  it('formats raw digits with separators', () => {
    expect(formatCurrencyInput('1500000')).toBe('1.500.000');
  });

  it('strips non-digit characters before formatting', () => {
    // Input "1.500.000" → strips dots → "1500000" → formats → "1.500.000"
    expect(formatCurrencyInput('1.500.000')).toBe('1.500.000');
  });

  it('returns empty string for empty input', () => {
    expect(formatCurrencyInput('')).toBe('');
  });

  it('returns empty string for non-numeric input', () => {
    expect(formatCurrencyInput('abc')).toBe('');
  });

  it('handles partial input while typing', () => {
    expect(formatCurrencyInput('15')).toBe('15');
    expect(formatCurrencyInput('150')).toBe('150');
    expect(formatCurrencyInput('1500')).toBe('1.500');
    expect(formatCurrencyInput('15000')).toBe('15.000');
  });
});
