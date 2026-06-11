/**
 * Currency formatting utilities for Indonesian Rupiah (IDR).
 * Uses dot (titik) as thousand separator per Indonesian locale convention.
 */

/**
 * Formats a numeric value with Indonesian thousand separators (dots).
 * Example: 1500000 → "1.500.000"
 *
 * @param value - Non-negative number to format
 * @returns Formatted string with dots as thousand separators
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }

  // Use integer part only (floor to handle any floating point)
  const intValue = Math.floor(value);

  if (intValue === 0) return '0';

  const str = intValue.toString();
  let result = '';
  let count = 0;

  // Build from right to left, inserting dots every 3 digits
  for (let i = str.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      result = '.' + result;
    }
    result = str[i] + result;
    count++;
  }

  return result;
}

/**
 * Parses a formatted currency string back to its numeric value.
 * Strips all non-digit characters (dots, spaces, "Rp" prefix, etc.)
 * Example: "1.500.000" → 1500000
 *
 * @param formatted - Formatted currency string
 * @returns The numeric value
 */
export function parseCurrency(formatted: string): number {
  if (!formatted || typeof formatted !== 'string') {
    return 0;
  }

  // Remove all non-digit characters
  const clean = formatted.replace(/\D/g, '');

  if (!clean) return 0;

  return parseInt(clean, 10);
}

/**
 * Formats a raw input string for display in real-time as the user types.
 * Strips non-digit characters, then applies thousand separator formatting.
 * Used internally by CurrencyInput for live formatting.
 *
 * @param raw - Raw input string (may contain dots, letters, etc.)
 * @returns Formatted string with thousand separators, or empty string if no digits
 */
export function formatCurrencyInput(raw: string): string {
  const clean = raw.replace(/\D/g, '');
  if (!clean) return '';

  const numericValue = parseInt(clean, 10);
  return formatCurrency(numericValue);
}
