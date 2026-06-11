/**
 * Property 6: Subscription Detection Correctness
 * Property 7: Dismissed Subscription Exclusion
 * Feature: synapse-mega-upgrade
 *
 * Validates: Requirements 5.1, 5.2, 5.4
 *
 * Property 6: For any transaction history, the subscription detector SHALL identify
 * a group of transactions as recurring if and only if: they share the same category,
 * their amounts are within ±10% of each other, they recur with approximately monthly
 * spacing, OR they contain a known service keyword.
 *
 * Property 7: For any dismissed subscription pattern, re-running the subscription
 * detector on the same or extended transaction history SHALL never include that
 * pattern in the results.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { Transaction } from '@/services/duitTrackerService';
import {
  detectRecurringSubscriptions,
  dismissPattern,
  getDismissedPatterns,
} from '@/services/subscriptionDetector';

// Known subscription keywords from the implementation
const SUBSCRIPTION_KEYWORDS = [
  'spotify',
  'netflix',
  'icloud',
  'youtube premium',
  'shopee pay later',
  'kredivo',
  'indosat',
  'telkomsel',
];

// Categories used for generating test transactions
const CATEGORIES = ['tagihan', 'hiburan', 'makanan', 'transportasi', 'belanja'];

/**
 * Helper: create a Transaction with given properties
 */
function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).substring(2),
    userId: 'user-1',
    amount: 50000,
    type: 'expense',
    category: 'tagihan',
    label: 'Generic Expense',
    inputMethod: 'manual',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Arbitrary: generate a date offset by N months from a base date
 */
function dateMonthsAgo(baseDate: Date, monthsAgo: number): Date {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

/**
 * Arbitrary: generate a set of transactions that form a valid recurring subscription
 * (same category, amounts within ±10%, monthly spacing)
 */
const recurringSubscriptionArb = fc
  .record({
    category: fc.constantFrom(...CATEGORIES),
    label: fc.string({ minLength: 3, maxLength: 12, unit: fc.constantFrom(...'abcdef0123456789'.split('')) }),
    baseAmount: fc.integer({ min: 10000, max: 500000 }),
    occurrences: fc.integer({ min: 2, max: 6 }),
    // Variance factor tightly within ±5% of base to guarantee group stays within ±10% of average
    varianceFactors: fc.array(fc.double({ min: 0.96, max: 1.04, noNaN: true }), {
      minLength: 2,
      maxLength: 6,
    }),
    // Day spacing in range 25-35 for monthly
    daySpacings: fc.array(fc.integer({ min: 25, max: 35 }), {
      minLength: 1,
      maxLength: 5,
    }),
  })
  .map(({ category, label, baseAmount, occurrences, varianceFactors, daySpacings }) => {
    const count = Math.min(occurrences, varianceFactors.length, daySpacings.length + 1);
    const baseDate = new Date('2025-06-01');
    const transactions: Transaction[] = [];

    let currentDate = new Date(baseDate);
    for (let i = 0; i < count; i++) {
      const amount = Math.round(baseAmount * varianceFactors[i]);
      transactions.push(
        createTransaction({
          category,
          label: `subscription_${label}`,
          amount,
          date: currentDate.toISOString(),
          createdAt: currentDate.toISOString(),
        })
      );
      if (i < count - 1) {
        currentDate = new Date(
          currentDate.getTime() + daySpacings[i] * 24 * 60 * 60 * 1000
        );
      }
    }
    return { transactions, category, label: `subscription_${label}` };
  });

/**
 * Arbitrary: generate transactions with a known keyword that recur at least twice
 */
const keywordSubscriptionArb = fc
  .record({
    keyword: fc.constantFrom(...SUBSCRIPTION_KEYWORDS),
    category: fc.constantFrom(...CATEGORIES),
    baseAmount: fc.integer({ min: 10000, max: 200000 }),
    occurrences: fc.integer({ min: 2, max: 5 }),
  })
  .map(({ keyword, category, baseAmount, occurrences }) => {
    const baseDate = new Date('2025-06-01');
    const transactions: Transaction[] = [];

    for (let i = 0; i < occurrences; i++) {
      const date = new Date(baseDate.getTime() - i * 30 * 24 * 60 * 60 * 1000);
      transactions.push(
        createTransaction({
          category,
          label: `Pembayaran ${keyword}`,
          amount: baseAmount + Math.round(Math.random() * baseAmount * 0.05),
          date: date.toISOString(),
          createdAt: date.toISOString(),
        })
      );
    }
    return { transactions, category, keyword };
  });

/**
 * Arbitrary: generate a set of non-recurring random transactions
 * (varied categories, varied labels, no pattern)
 */
const nonRecurringTransactionsArb = fc
  .array(
    fc.record({
      category: fc.constantFrom(...CATEGORIES),
      label: fc.string({ minLength: 5, maxLength: 15, unit: fc.constantFrom(...'abcdef0123456789'.split('')) }),
      amount: fc.integer({ min: 5000, max: 1000000 }),
      daysAgo: fc.integer({ min: 0, max: 180 }),
    }),
    { minLength: 0, maxLength: 10 }
  )
  .map((items) => {
    const baseDate = new Date('2025-06-01');
    return items.map((item) =>
      createTransaction({
        category: item.category,
        label: `random_${item.label}`,
        amount: item.amount,
        date: new Date(
          baseDate.getTime() - item.daysAgo * 24 * 60 * 60 * 1000
        ).toISOString(),
        createdAt: new Date(
          baseDate.getTime() - item.daysAgo * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
    );
  });

/**
 * Arbitrary: generate transactions that DON'T qualify as recurring
 * (amounts vary too much, or no monthly spacing, and no keyword)
 */
const nonSubscriptionGroupArb = fc
  .record({
    category: fc.constantFrom(...CATEGORIES),
    label: fc.string({ minLength: 3, maxLength: 10, unit: fc.constantFrom(...'abcdef0123456789'.split('')) }),
    // Amounts that vary more than ±10%
    amounts: fc.array(fc.integer({ min: 10000, max: 500000 }), {
      minLength: 2,
      maxLength: 4,
    }),
  })
  .filter(({ amounts }) => {
    // Ensure amounts DON'T satisfy ±10% tolerance
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avg === 0) return false;
    return amounts.some((a) => Math.abs(a - avg) / avg > 0.1);
  })
  .map(({ category, label, amounts }) => {
    const baseDate = new Date('2025-06-01');
    // Use irregular spacing (not monthly)
    const transactions: Transaction[] = amounts.map((amount, i) =>
      createTransaction({
        category,
        label: `nonrecur_${label}`,
        amount,
        // Random spacing: 1-15 days apart (too close for monthly)
        date: new Date(
          baseDate.getTime() - i * 5 * 24 * 60 * 60 * 1000
        ).toISOString(),
        createdAt: new Date(
          baseDate.getTime() - i * 5 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
    );
    return { transactions, category, label: `nonrecur_${label}` };
  });

// localStorage mock
let localStorageStore: Record<string, string> = {};

describe('Feature: synapse-mega-upgrade, Property 6: Subscription Detection Correctness', () => {
  beforeEach(() => {
    localStorageStore = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageStore[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageStore[key];
        },
        clear: () => {
          localStorageStore = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirements 5.1, 5.2
   *
   * Property 6a: Transactions that share the same category, have amounts within ±10%,
   * and recur with approximately monthly spacing (25-35 day intervals) SHALL be
   * detected as recurring subscriptions.
   */
  it('detects transactions as recurring when they have same category, ±10% amounts, and monthly spacing', () => {
    fc.assert(
      fc.property(recurringSubscriptionArb, ({ transactions, category, label }) => {
        const result = detectRecurringSubscriptions(transactions);

        // The group should be detected as a subscription
        const found = result.items.some(
          (item) => item.category === category && item.label === label
        );
        expect(found).toBe(true);

        // Verify detected item properties
        const item = result.items.find(
          (i) => i.category === category && i.label === label
        );
        if (item) {
          expect(item.occurrences).toBe(transactions.length);
          expect(item.averageAmount).toBeGreaterThan(0);
        }
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 5.2
   *
   * Property 6b: Transactions containing known subscription keywords
   * (spotify, netflix, icloud, youtube premium, shopee pay later, kredivo,
   * indosat, telkomsel) SHALL be detected as recurring even without strict
   * amount/spacing rules.
   */
  it('detects transactions containing subscription keywords as recurring', () => {
    fc.assert(
      fc.property(keywordSubscriptionArb, ({ transactions, keyword }) => {
        const result = detectRecurringSubscriptions(transactions);

        // A keyword-matching group should be found
        const found = result.items.some((item) => item.isKeywordMatch === true);
        expect(found).toBe(true);

        // The label should contain the keyword
        const matchedItem = result.items.find((item) => item.isKeywordMatch);
        if (matchedItem) {
          expect(matchedItem.label.toLowerCase()).toContain(keyword);
        }
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 5.1
   *
   * Property 6c: Transactions that do NOT share the same category, or whose amounts
   * differ by more than ±10%, or that do NOT have monthly spacing, AND do NOT
   * contain a subscription keyword SHALL NOT be identified as recurring.
   */
  it('does NOT detect non-recurring transactions as subscriptions', () => {
    fc.assert(
      fc.property(nonSubscriptionGroupArb, ({ transactions, label }) => {
        const result = detectRecurringSubscriptions(transactions);

        // These transactions should NOT appear in detected subscriptions
        const found = result.items.some((item) => item.label === label);
        expect(found).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 5.1, 5.2
   *
   * Property 6d: The totalMonthly in the result SHALL equal the sum of all
   * detected items' averageAmount, and totalYearly SHALL equal totalMonthly * 12.
   */
  it('totalMonthly equals sum of averageAmounts and totalYearly equals totalMonthly * 12', () => {
    fc.assert(
      fc.property(
        fc.array(recurringSubscriptionArb, { minLength: 1, maxLength: 3 }),
        (subscriptionGroups) => {
          const allTransactions = subscriptionGroups.flatMap((g) => g.transactions);
          const result = detectRecurringSubscriptions(allTransactions);

          const expectedMonthly = result.items.reduce(
            (sum, item) => sum + item.averageAmount,
            0
          );
          expect(result.totalMonthly).toBe(expectedMonthly);
          expect(result.totalYearly).toBe(expectedMonthly * 12);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: synapse-mega-upgrade, Property 7: Dismissed Subscription Exclusion', () => {
  beforeEach(() => {
    localStorageStore = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageStore[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageStore[key];
        },
        clear: () => {
          localStorageStore = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirements 5.4
   *
   * Property 7a: For any dismissed subscription pattern, re-running detectRecurringSubscriptions
   * on the same transaction history SHALL never include that dismissed pattern in the results.
   */
  it('dismissed patterns are excluded from detection results on same history', () => {
    fc.assert(
      fc.property(recurringSubscriptionArb, ({ transactions }) => {
        // First run: detect subscriptions
        const firstResult = detectRecurringSubscriptions(transactions);

        if (firstResult.items.length === 0) return; // nothing to dismiss

        // Dismiss the first detected pattern
        const patternToDismiss = firstResult.items[0].patternKey;
        dismissPattern(patternToDismiss);

        // Re-run detection on the SAME transaction history
        const secondResult = detectRecurringSubscriptions(transactions);

        // The dismissed pattern must NOT appear in results
        const foundDismissed = secondResult.items.some(
          (item) => item.patternKey === patternToDismiss
        );
        expect(foundDismissed).toBe(false);
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 5.4
   *
   * Property 7b: For any dismissed subscription pattern, re-running detectRecurringSubscriptions
   * on EXTENDED transaction history (more transactions added) SHALL still never include
   * that dismissed pattern in the results.
   */
  it('dismissed patterns are excluded even with extended transaction history', () => {
    fc.assert(
      fc.property(
        recurringSubscriptionArb,
        fc.integer({ min: 1, max: 3 }),
        ({ transactions, category, label }, extraCount) => {
          // First run: detect subscriptions
          const firstResult = detectRecurringSubscriptions(transactions);

          if (firstResult.items.length === 0) return;

          // Dismiss the first detected pattern
          const patternToDismiss = firstResult.items[0].patternKey;
          dismissPattern(patternToDismiss);

          // Extend the transaction history with more transactions in same group
          const lastDate = new Date(
            Math.max(...transactions.map((t) => new Date(t.date).getTime()))
          );
          const extendedTransactions = [...transactions];
          for (let i = 0; i < extraCount; i++) {
            const newDate = new Date(
              lastDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000
            );
            extendedTransactions.push(
              createTransaction({
                category,
                label,
                amount: transactions[0].amount,
                date: newDate.toISOString(),
                createdAt: newDate.toISOString(),
              })
            );
          }

          // Re-run detection on extended history
          const secondResult = detectRecurringSubscriptions(extendedTransactions);

          // The dismissed pattern must still NOT appear in results
          const foundDismissed = secondResult.items.some(
            (item) => item.patternKey === patternToDismiss
          );
          expect(foundDismissed).toBe(false);
        }
      ),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 5.4
   *
   * Property 7c: Dismissing one pattern SHALL NOT affect the detection of other
   * valid subscription patterns.
   */
  it('dismissing one pattern does not affect detection of other patterns', () => {
    fc.assert(
      fc.property(
        fc.tuple(recurringSubscriptionArb, keywordSubscriptionArb),
        ([recurringGroup, keywordGroup]) => {
          // Combine both groups of transactions
          const allTransactions = [
            ...recurringGroup.transactions,
            ...keywordGroup.transactions,
          ];

          // First run: detect all
          const firstResult = detectRecurringSubscriptions(allTransactions);

          if (firstResult.items.length < 2) return; // need at least 2 to test

          // Dismiss the first pattern
          const patternToDismiss = firstResult.items[0].patternKey;
          const otherPatterns = firstResult.items
            .slice(1)
            .map((item) => item.patternKey);
          dismissPattern(patternToDismiss);

          // Re-run detection
          const secondResult = detectRecurringSubscriptions(allTransactions);

          // Dismissed pattern must not be present
          expect(
            secondResult.items.some((i) => i.patternKey === patternToDismiss)
          ).toBe(false);

          // Other patterns should still be detected
          for (const otherPattern of otherPatterns) {
            const stillDetected = secondResult.items.some(
              (i) => i.patternKey === otherPattern
            );
            expect(stillDetected).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 5.4
   *
   * Property 7d: Dismissing a keyword-matched subscription SHALL also exclude it
   * from future detection.
   */
  it('dismissed keyword-matched subscriptions are excluded from future detection', () => {
    fc.assert(
      fc.property(keywordSubscriptionArb, ({ transactions }) => {
        // First run: detect keyword subscriptions
        const firstResult = detectRecurringSubscriptions(transactions);

        if (firstResult.items.length === 0) return;

        // Find and dismiss the keyword-matched item
        const keywordItem = firstResult.items.find((i) => i.isKeywordMatch);
        if (!keywordItem) return;

        dismissPattern(keywordItem.patternKey);

        // Re-run detection
        const secondResult = detectRecurringSubscriptions(transactions);

        // Dismissed keyword subscription must not appear
        const foundDismissed = secondResult.items.some(
          (item) => item.patternKey === keywordItem.patternKey
        );
        expect(foundDismissed).toBe(false);
      }),
      { numRuns: 150 }
    );
  });
});
