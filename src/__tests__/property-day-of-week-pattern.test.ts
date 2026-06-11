/**
 * Property 9: Day-of-Week Pattern Detection
 * Feature: synapse-mega-upgrade
 *
 * Validates: Requirements 8.1, 8.3
 *
 * For any transaction history spanning 4+ weeks, the contextual intelligence detector
 * SHALL identify a day-of-week pattern for a category if and only if the user has 3+
 * transactions on the same day-of-week in the same category within the analysis period.
 * The insight message SHALL contain the correct day name, average amount, and category.
 * At most 3 patterns SHALL be returned.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Transaction } from '@/services/duitTrackerService';
import { detectDayOfWeekPatterns, DayOfWeekPattern } from '@/services/contextualIntelligence';

const INDONESIAN_DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const CATEGORIES = ['Makanan', 'Transport', 'Hiburan', 'Kopi', 'Belanja', 'Tagihan'];

/**
 * Helper: create a Transaction with defaults
 */
function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).substring(2),
    userId: 'user-1',
    amount: 25000,
    type: 'expense',
    category: 'Makanan',
    label: 'Test expense',
    inputMethod: 'manual',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Arbitrary: Generate transactions that form a valid day-of-week pattern.
 * Requirements:
 * - Same dayOfWeek
 * - Same category
 * - 3+ transactions
 * - Span >= 28 days (4+ weeks)
 */
const validPatternArb = fc
  .record({
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    category: fc.constantFrom(...CATEGORIES),
    amount: fc.integer({ min: 1000, max: 500000 }),
    /** Number of occurrences (3 to 8) */
    count: fc.integer({ min: 3, max: 8 }),
    /** Week gaps between occurrences (1-3 weeks apart, ensures span >= 28 days with 3+ items) */
    weekGaps: fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 7, maxLength: 7 }),
  })
  .map(({ dayOfWeek, category, amount, count, weekGaps }) => {
    // Base date: find the first occurrence of `dayOfWeek` starting from 2024-01-07 (a Sunday)
    const baseDate = new Date(2024, 0, 7 + dayOfWeek); // Jan 7 2024 is Sunday (0)
    const transactions: Transaction[] = [];
    let currentDate = new Date(baseDate);

    for (let i = 0; i < count; i++) {
      transactions.push(
        createTransaction({
          category,
          amount,
          date: currentDate.toISOString(),
          createdAt: currentDate.toISOString(),
        }),
      );
      // Move forward by weekGaps[i] weeks to stay on the same dayOfWeek
      const gap = weekGaps[i % weekGaps.length];
      currentDate = new Date(currentDate.getTime() + gap * 7 * 24 * 60 * 60 * 1000);
    }

    // Ensure span >= 28 days by verifying; if count=3 with gap=1 each, span=14 days (not enough)
    // So we force the last transaction to be at least 28 days after the first
    const firstDate = new Date(transactions[0].date).getTime();
    const lastDate = new Date(transactions[transactions.length - 1].date).getTime();
    const spanDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);

    if (spanDays < 28) {
      // Add more weeks to the last transaction to ensure 28+ days span
      const neededMs = (28 - spanDays + 7) * 24 * 60 * 60 * 1000;
      const adjustedDate = new Date(lastDate + neededMs);
      // Ensure adjusted date is still on the correct dayOfWeek
      const adjustedDow = adjustedDate.getDay();
      const shift = ((dayOfWeek - adjustedDow) + 7) % 7;
      adjustedDate.setDate(adjustedDate.getDate() + shift);
      transactions[transactions.length - 1] = createTransaction({
        category,
        amount,
        date: adjustedDate.toISOString(),
        createdAt: adjustedDate.toISOString(),
      });
    }

    return { transactions, dayOfWeek, category, amount, count };
  });

/**
 * Arbitrary: Generate transactions that do NOT form a valid pattern.
 * Either: fewer than 3 on same day+category, OR span < 28 days
 */
const invalidPatternShortSpanArb = fc
  .record({
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    category: fc.constantFrom(...CATEGORIES),
    amount: fc.integer({ min: 1000, max: 500000 }),
    count: fc.integer({ min: 3, max: 5 }),
  })
  .map(({ dayOfWeek, category, amount, count }) => {
    // Place all transactions within 3 weeks (span < 28 days)
    const baseDate = new Date(2024, 0, 7 + dayOfWeek);
    const transactions: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      // Space them 1 week apart, but only use up to 3 weeks (max span = 14 days for 3 items)
      const date = new Date(baseDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      // Cap to ensure span < 28 days
      if (i > 0) {
        const firstTime = baseDate.getTime();
        const thisTime = date.getTime();
        if ((thisTime - firstTime) / (1000 * 60 * 60 * 24) >= 28) break;
      }
      transactions.push(
        createTransaction({
          category,
          amount,
          date: date.toISOString(),
          createdAt: date.toISOString(),
        }),
      );
    }

    return { transactions, dayOfWeek, category };
  });

/**
 * Arbitrary: Generate transactions with fewer than 3 on the same day+category
 */
const tooFewTransactionsArb = fc
  .record({
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    category: fc.constantFrom(...CATEGORIES),
    amount: fc.integer({ min: 1000, max: 500000 }),
  })
  .map(({ dayOfWeek, category, amount }) => {
    // Only 1 or 2 transactions on same day+category
    const baseDate = new Date(2024, 0, 7 + dayOfWeek);
    const count = Math.random() > 0.5 ? 1 : 2;
    const transactions: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate.getTime() + i * 14 * 24 * 60 * 60 * 1000);
      transactions.push(
        createTransaction({
          category,
          amount,
          date: date.toISOString(),
          createdAt: date.toISOString(),
        }),
      );
    }

    return { transactions, dayOfWeek, category };
  });

/**
 * Arbitrary: Generate multiple valid patterns to test the max-3 cap
 */
const multipleValidPatternsArb = fc
  .record({
    patternCount: fc.integer({ min: 4, max: 6 }),
    baseAmount: fc.integer({ min: 5000, max: 100000 }),
  })
  .map(({ patternCount, baseAmount }) => {
    const transactions: Transaction[] = [];
    const usedCategories: string[] = [];

    for (let p = 0; p < patternCount; p++) {
      const dayOfWeek = p % 7;
      const category = `Category_${p}`;
      usedCategories.push(category);
      const occurrences = 3 + p; // varying occurrences

      const baseDate = new Date(2024, 0, 7 + dayOfWeek);
      for (let i = 0; i < occurrences; i++) {
        const date = new Date(baseDate.getTime() + i * 14 * 24 * 60 * 60 * 1000);
        // Ensure span >= 28 days: with i*14 and occurrences>=3, span = (occurrences-1)*14 >= 28 ✓
        transactions.push(
          createTransaction({
            category,
            amount: baseAmount * (p + 1),
            type: 'expense',
            date: date.toISOString(),
            createdAt: date.toISOString(),
          }),
        );
      }
    }

    return { transactions, patternCount, usedCategories };
  });

describe('Feature: synapse-mega-upgrade, Property 9: Day-of-Week Pattern Detection', () => {
  /**
   * Validates: Requirements 8.1, 8.3
   *
   * Property 9a: For any valid pattern (3+ transactions on same day-of-week,
   * same category, span >= 28 days), the detector SHALL identify it.
   */
  it('detects a day-of-week pattern when 3+ expense transactions exist on the same weekday in the same category spanning 4+ weeks', () => {
    fc.assert(
      fc.property(validPatternArb, ({ transactions, dayOfWeek, category }) => {
        const result = detectDayOfWeekPatterns(transactions);

        // Pattern should be detected
        const found = result.find(
          (p) => p.dayOfWeek === dayOfWeek && p.category === category,
        );
        expect(found).toBeDefined();
        expect(found!.dayName).toBe(INDONESIAN_DAY_NAMES[dayOfWeek]);
        expect(found!.occurrences).toBeGreaterThanOrEqual(3);
      }),
      { numRuns: 150 },
    );
  });

  /**
   * Validates: Requirements 8.1
   *
   * Property 9b: The insight message SHALL contain the correct day name,
   * average amount (formatted in Indonesian locale), and category.
   */
  it('insight message contains correct day name, formatted average amount, and category', () => {
    fc.assert(
      fc.property(validPatternArb, ({ transactions, dayOfWeek, category, amount }) => {
        const result = detectDayOfWeekPatterns(transactions);

        const found = result.find(
          (p) => p.dayOfWeek === dayOfWeek && p.category === category,
        );
        if (!found) return; // skip if not found (covered by 9a)

        const dayName = INDONESIAN_DAY_NAMES[dayOfWeek];

        // Insight must contain the day name
        expect(found.insight).toContain(`Setiap ${dayName}`);
        // Insight must contain the category
        expect(found.insight).toContain(category);
        // Insight must contain "Rp" and the formatted average
        expect(found.insight).toContain('Rp');

        // Verify average amount is correct
        const totalAmount = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const expectedAvg = totalAmount / transactions.filter((t) => t.type === 'expense').length;
        expect(found.averageAmount).toBeCloseTo(expectedAvg, 0);

        // Verify formatted amount appears in insight
        const formattedAvg = Math.round(found.averageAmount).toLocaleString('id-ID');
        expect(found.insight).toContain(formattedAvg);
      }),
      { numRuns: 150 },
    );
  });

  /**
   * Validates: Requirements 8.3
   *
   * Property 9c: At most 3 patterns SHALL be returned regardless of how many
   * valid patterns exist in the transaction data.
   */
  it('returns at most 3 patterns even when more valid patterns exist', () => {
    fc.assert(
      fc.property(multipleValidPatternsArb, ({ transactions, patternCount }) => {
        const result = detectDayOfWeekPatterns(transactions);

        // Must never exceed 3
        expect(result.length).toBeLessThanOrEqual(3);

        // When there are 4+ valid patterns, exactly 3 should be returned
        if (patternCount > 3) {
          expect(result.length).toBe(3);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 8.1
   *
   * Property 9d: The detector SHALL NOT identify a pattern when fewer than 3
   * transactions exist on the same day-of-week in the same category.
   */
  it('does NOT detect a pattern when fewer than 3 transactions exist on the same day+category', () => {
    fc.assert(
      fc.property(tooFewTransactionsArb, ({ transactions, dayOfWeek, category }) => {
        const result = detectDayOfWeekPatterns(transactions);

        // Should NOT find the pattern
        const found = result.find(
          (p) => p.dayOfWeek === dayOfWeek && p.category === category,
        );
        expect(found).toBeUndefined();
      }),
      { numRuns: 150 },
    );
  });

  /**
   * Validates: Requirements 8.1
   *
   * Property 9e: The detector SHALL NOT identify a pattern when the transaction
   * span is less than 28 days (4 weeks), even with 3+ transactions.
   */
  it('does NOT detect a pattern when span is less than 28 days', () => {
    fc.assert(
      fc.property(invalidPatternShortSpanArb, ({ transactions, dayOfWeek, category }) => {
        // Verify our generator produced a span < 28 days
        const dates = transactions.map((t) => new Date(t.date).getTime());
        const span = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
        if (span >= 28) return; // skip if generator accidentally produced valid span

        const result = detectDayOfWeekPatterns(transactions);

        // Should NOT find the pattern
        const found = result.find(
          (p) => p.dayOfWeek === dayOfWeek && p.category === category,
        );
        expect(found).toBeUndefined();
      }),
      { numRuns: 150 },
    );
  });

  /**
   * Validates: Requirements 8.1
   *
   * Property 9f: Income transactions SHALL be excluded from pattern detection.
   * Only expense transactions contribute to day-of-week patterns.
   */
  it('ignores income transactions and only analyzes expenses', () => {
    fc.assert(
      fc.property(
        fc.record({
          dayOfWeek: fc.integer({ min: 0, max: 6 }),
          category: fc.constantFrom(...CATEGORIES),
          amount: fc.integer({ min: 10000, max: 500000 }),
        }),
        ({ dayOfWeek, category, amount }) => {
          // Create 5 income transactions that would form a pattern if they were expenses
          const baseDate = new Date(2024, 0, 7 + dayOfWeek);
          const incomeTransactions: Transaction[] = [];
          for (let i = 0; i < 5; i++) {
            const date = new Date(baseDate.getTime() + i * 14 * 24 * 60 * 60 * 1000);
            incomeTransactions.push(
              createTransaction({
                type: 'income',
                category,
                amount,
                date: date.toISOString(),
                createdAt: date.toISOString(),
              }),
            );
          }

          const result = detectDayOfWeekPatterns(incomeTransactions);
          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 8.3
   *
   * Property 9g: Patterns SHALL be sorted by occurrence count descending.
   * The top 3 returned patterns have the highest occurrence counts.
   */
  it('returns patterns sorted by occurrence count descending', () => {
    fc.assert(
      fc.property(multipleValidPatternsArb, ({ transactions }) => {
        const result = detectDayOfWeekPatterns(transactions);

        // Verify sorted order (descending by occurrences)
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].occurrences).toBeGreaterThanOrEqual(result[i].occurrences);
        }
      }),
      { numRuns: 100 },
    );
  });
});
