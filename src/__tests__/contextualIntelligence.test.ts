import { describe, it, expect } from 'vitest';
import { detectDayOfWeekPatterns, DayOfWeekPattern } from '@/services/contextualIntelligence';
import { Transaction } from '@/services/duitTrackerService';

/**
 * Helper to create a mock transaction
 */
function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'user-1',
    amount: 25000,
    type: 'expense',
    category: 'Makanan',
    label: 'Makan siang',
    inputMethod: 'manual',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to get a date for a specific day of the week, offset by weeks
 * @param dayOfWeek 0=Sunday, 1=Monday, ...
 * @param weeksAgo how many weeks back from "now" (a fixed reference)
 */
function getDateForDay(dayOfWeek: number, weeksAgo: number): string {
  // Start from a known Monday: 2024-01-01 is a Monday
  const baseDate = new Date(2024, 0, 1); // Jan 1 2024 = Monday (day 1)
  // Move to the requested dayOfWeek in the first week
  const diff = dayOfWeek - 1; // Monday is 1, so diff from Monday
  const targetDate = new Date(baseDate);
  targetDate.setDate(baseDate.getDate() + diff - weeksAgo * 7);
  // Actually let's simplify: just pick a consistent reference
  // Use a reference date and find the next occurrence of dayOfWeek, then go back weeksAgo weeks
  const reference = new Date(2024, 5, 30); // June 30, 2024 (Sunday = 0)
  const refDay = reference.getDay();
  const daysUntilTarget = (dayOfWeek - refDay + 7) % 7;
  const firstOccurrence = new Date(reference);
  firstOccurrence.setDate(reference.getDate() + daysUntilTarget);
  // Go back weeksAgo weeks
  firstOccurrence.setDate(firstOccurrence.getDate() - weeksAgo * 7);
  return firstOccurrence.toISOString();
}

describe('contextualIntelligence', () => {
  describe('detectDayOfWeekPatterns', () => {
    it('returns empty array when no transactions', () => {
      const result = detectDayOfWeekPatterns([]);
      expect(result).toEqual([]);
    });

    it('returns empty array when only income transactions', () => {
      const transactions = Array.from({ length: 5 }, (_, i) =>
        createTransaction({
          type: 'income',
          date: getDateForDay(1, i), // Every Monday
        }),
      );
      const result = detectDayOfWeekPatterns(transactions);
      expect(result).toEqual([]);
    });

    it('returns empty when fewer than 3 transactions on same day+category', () => {
      const transactions = [
        createTransaction({ date: getDateForDay(2, 0), category: 'Makanan' }),
        createTransaction({ date: getDateForDay(2, 5), category: 'Makanan' }),
      ];
      const result = detectDayOfWeekPatterns(transactions);
      expect(result).toEqual([]);
    });

    it('returns empty when span is less than 28 days', () => {
      // 3 transactions on the same weekday but within 3 weeks (< 28 days span)
      const transactions = [
        createTransaction({ date: getDateForDay(3, 0), category: 'Transport' }),
        createTransaction({ date: getDateForDay(3, 1), category: 'Transport' }),
        createTransaction({ date: getDateForDay(3, 2), category: 'Transport' }),
      ];
      // span = 14 days (2 weeks between first and last) < 28
      const result = detectDayOfWeekPatterns(transactions);
      expect(result).toEqual([]);
    });

    it('detects a pattern when 3+ transactions on same weekday over 4+ weeks', () => {
      // 5 transactions on Wednesday over 8 weeks
      const transactions = [
        createTransaction({ date: getDateForDay(3, 0), category: 'Makanan', amount: 20000 }),
        createTransaction({ date: getDateForDay(3, 2), category: 'Makanan', amount: 25000 }),
        createTransaction({ date: getDateForDay(3, 4), category: 'Makanan', amount: 30000 }),
        createTransaction({ date: getDateForDay(3, 6), category: 'Makanan', amount: 25000 }),
        createTransaction({ date: getDateForDay(3, 8), category: 'Makanan', amount: 20000 }),
      ];

      const result = detectDayOfWeekPatterns(transactions);
      expect(result.length).toBe(1);
      expect(result[0].dayOfWeek).toBe(3);
      expect(result[0].dayName).toBe('Rabu');
      expect(result[0].category).toBe('Makanan');
      expect(result[0].occurrences).toBe(5);
      expect(result[0].averageAmount).toBe(24000);
      expect(result[0].insight).toContain('Setiap Rabu');
      expect(result[0].insight).toContain('Makanan');
    });

    it('formats insight string correctly with Indonesian locale', () => {
      const transactions = [
        createTransaction({ date: getDateForDay(1, 0), category: 'Transport', amount: 50000 }),
        createTransaction({ date: getDateForDay(1, 2), category: 'Transport', amount: 50000 }),
        createTransaction({ date: getDateForDay(1, 4), category: 'Transport', amount: 50000 }),
        createTransaction({ date: getDateForDay(1, 6), category: 'Transport', amount: 50000 }),
      ];

      const result = detectDayOfWeekPatterns(transactions);
      expect(result.length).toBe(1);
      expect(result[0].insight).toBe(
        'Setiap Senin kamu biasa habis Rp 50.000 untuk Transport',
      );
    });

    it('returns max 3 patterns even if more are detected', () => {
      const days = [0, 1, 2, 3, 4]; // Sun, Mon, Tue, Wed, Thu
      const categories = ['Makanan', 'Transport', 'Hiburan', 'Belanja', 'Kopi'];

      const transactions: Transaction[] = [];
      for (let i = 0; i < 5; i++) {
        for (let w = 0; w < 6; w++) {
          transactions.push(
            createTransaction({
              date: getDateForDay(days[i], w * 2), // Every other week to ensure 28+ day span
              category: categories[i],
              amount: 10000 * (i + 1),
            }),
          );
        }
      }

      const result = detectDayOfWeekPatterns(transactions);
      expect(result.length).toBe(3);
    });

    it('sorts patterns by occurrence count descending', () => {
      const transactions: Transaction[] = [
        // 3 on Tuesday (Selasa) for Kopi
        ...Array.from({ length: 3 }, (_, i) =>
          createTransaction({ date: getDateForDay(2, i * 2), category: 'Kopi', amount: 15000 }),
        ),
        // 5 on Friday (Jumat) for Makanan
        ...Array.from({ length: 5 }, (_, i) =>
          createTransaction({ date: getDateForDay(5, i * 2), category: 'Makanan', amount: 30000 }),
        ),
        // 4 on Monday (Senin) for Transport
        ...Array.from({ length: 4 }, (_, i) =>
          createTransaction({ date: getDateForDay(1, i * 2), category: 'Transport', amount: 20000 }),
        ),
      ];

      const result = detectDayOfWeekPatterns(transactions);
      expect(result.length).toBe(3);
      expect(result[0].occurrences).toBe(5); // Jumat Makanan
      expect(result[1].occurrences).toBe(4); // Senin Transport
      expect(result[2].occurrences).toBe(3); // Selasa Kopi
    });

    it('separates patterns by category even on same day', () => {
      const transactions: Transaction[] = [
        // 4 on Monday for Makanan
        ...Array.from({ length: 4 }, (_, i) =>
          createTransaction({ date: getDateForDay(1, i * 2), category: 'Makanan', amount: 20000 }),
        ),
        // 4 on Monday for Kopi
        ...Array.from({ length: 4 }, (_, i) =>
          createTransaction({ date: getDateForDay(1, i * 2), category: 'Kopi', amount: 15000 }),
        ),
      ];

      const result = detectDayOfWeekPatterns(transactions);
      expect(result.length).toBe(2);
      const categories = result.map((p) => p.category).sort();
      expect(categories).toEqual(['Kopi', 'Makanan']);
    });

    it('ignores income transactions in pattern detection', () => {
      const transactions: Transaction[] = [
        // Income on Mondays - should be ignored
        ...Array.from({ length: 5 }, (_, i) =>
          createTransaction({ date: getDateForDay(1, i * 2), type: 'income', category: 'Gaji', amount: 500000 }),
        ),
        // Only 2 expenses on Monday - below threshold
        createTransaction({ date: getDateForDay(1, 0), category: 'Makanan', amount: 20000 }),
        createTransaction({ date: getDateForDay(1, 6), category: 'Makanan', amount: 20000 }),
      ];

      const result = detectDayOfWeekPatterns(transactions);
      expect(result).toEqual([]);
    });
  });
});
