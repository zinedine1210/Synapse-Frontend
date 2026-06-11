/**
 * Property 1: Currency Formatting Round-Trip
 * Feature: synapse-ux-revamp
 *
 * Validates: Requirements 1.5
 *
 * For any non-negative integer value, formatting with Indonesian thousand
 * separators (dots) and then parsing back should yield the original numeric value.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency, parseCurrency } from '@/lib/currency-utils';

describe('Feature: synapse-ux-revamp, Property 1: Currency Formatting Round-Trip', () => {
  /**
   * Validates: Requirements 1.5
   *
   * For any non-negative integer, formatting with Indonesian thousand separators
   * and parsing back yields the original value.
   */
  it('formatCurrency → parseCurrency round-trip preserves the original non-negative integer value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (value) => {
          const formatted = formatCurrency(value);
          const parsed = parseCurrency(formatted);
          expect(parsed).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.5
   *
   * The formatted output should only contain digits and dot separators,
   * confirming Indonesian locale convention.
   */
  it('formatCurrency produces a string containing only digits and dot separators', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (value) => {
          const formatted = formatCurrency(value);
          // Should only contain digits and dots
          expect(formatted).toMatch(/^[0-9.]+$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.5
   *
   * Dots are placed correctly as thousand separators — every group of digits
   * between dots (except possibly the leftmost) should be exactly 3 digits.
   */
  it('formatCurrency places dot separators at every 3 digits from the right', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        (value) => {
          const formatted = formatCurrency(value);
          const parts = formatted.split('.');

          // The first group can be 1-3 digits
          expect(parts[0].length).toBeGreaterThanOrEqual(1);
          expect(parts[0].length).toBeLessThanOrEqual(3);

          // All subsequent groups must be exactly 3 digits
          for (let i = 1; i < parts.length; i++) {
            expect(parts[i].length).toBe(3);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
