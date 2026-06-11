import { Transaction } from '@/services/duitTrackerService';

/**
 * Subscription Detection Service — "Bocor Halus"
 *
 * Rule-based detection of recurring transactions. No AI calls needed.
 * Uses cached transaction data from SWR.
 *
 * Detection rules:
 * 1. Same category
 * 2. Amount within ±10% of the group average
 * 3. Monthly spacing (25-35 day intervals between occurrences)
 * 4. OR contains a known subscription keyword
 */

// Known subscription service keywords
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

const DISMISSED_STORAGE_KEY = 'synapse_dismissed_subscriptions';

export interface DetectedSubscription {
  /** Unique pattern key for dismiss tracking (e.g., "tagihan_spotify_49000") */
  patternKey: string;
  /** Display label */
  label: string;
  /** Category of the transactions */
  category: string;
  /** Average monthly amount */
  averageAmount: number;
  /** Number of matching occurrences */
  occurrences: number;
  /** Whether it was detected via keyword */
  isKeywordMatch: boolean;
  /** Most recent transaction date */
  lastDate: string;
}

export interface SubscriptionSummary {
  /** Total estimated monthly cost */
  totalMonthly: number;
  /** Total estimated yearly cost */
  totalYearly: number;
  /** Individual detected subscriptions */
  items: DetectedSubscription[];
}

/**
 * Check if a transaction label matches any subscription keywords
 */
function matchesKeyword(label: string): boolean {
  const lower = label.toLowerCase();
  return SUBSCRIPTION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check if a set of amounts are within ±10% of each other
 */
function amountsWithinTolerance(amounts: number[]): boolean {
  if (amounts.length < 2) return false;
  const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  if (avg === 0) return false;
  return amounts.every((a) => Math.abs(a - avg) / avg <= 0.1);
}

/**
 * Check if dates have approximately monthly spacing (25-35 day intervals)
 */
function hasMonthlySpacing(dates: Date[]): boolean {
  if (dates.length < 2) return false;

  // Sort dates ascending
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

  let validIntervals = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays =
      (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays >= 25 && diffDays <= 35) {
      validIntervals++;
    }
  }

  // At least one valid monthly interval
  return validIntervals >= 1;
}

/**
 * Generate a unique pattern key for a subscription group
 */
function generatePatternKey(category: string, label: string, avgAmount: number): string {
  const normalizedLabel = label.toLowerCase().trim().replace(/\s+/g, '_');
  return `${category}_${normalizedLabel}_${Math.round(avgAmount)}`;
}

/**
 * Get dismissed subscription patterns from localStorage
 */
export function getDismissedPatterns(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a pattern to the dismissed list in localStorage
 */
export function dismissPattern(pattern: string): void {
  if (typeof window === 'undefined') return;
  const current = getDismissedPatterns();
  if (!current.includes(pattern)) {
    current.push(pattern);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(current));
  }
}

/**
 * Check if user has enough transaction history for subscription detection.
 * Requires >= 10 transactions AND >= 2 months of history.
 */
export function hasEnoughHistory(transactions: Transaction[]): boolean {
  if (transactions.length < 10) return false;

  if (transactions.length === 0) return false;

  const dates = transactions.map((t) => new Date(t.date));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));

  const diffMs = latest.getTime() - earliest.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // At least ~60 days (2 months) of history
  return diffDays >= 55;
}

/**
 * Detect recurring subscription-like transactions from a list of transactions.
 *
 * Detection logic:
 * - Group expense transactions by (category + normalized label)
 * - For each group, check if:
 *   a) They share the same category AND amounts are within ±10% AND monthly spacing, OR
 *   b) The label contains a known subscription keyword AND recurs at least twice
 *
 * @param transactions - All user transactions (typically cached via SWR)
 * @returns SubscriptionSummary with detected items (excluding dismissed ones)
 */
export function detectRecurringSubscriptions(
  transactions: Transaction[],
): SubscriptionSummary {
  const dismissed = getDismissedPatterns();

  // Only look at expense transactions
  const expenses = transactions.filter((t) => t.type === 'expense');

  // Group by category + normalized label
  const groups: Record<
    string,
    { transactions: Transaction[]; category: string; label: string }
  > = {};

  for (const tx of expenses) {
    const key = `${tx.category}::${tx.label.toLowerCase().trim()}`;
    if (!groups[key]) {
      groups[key] = { transactions: [], category: tx.category, label: tx.label };
    }
    groups[key].transactions.push(tx);
  }

  const detectedItems: DetectedSubscription[] = [];

  for (const group of Object.values(groups)) {
    // Need at least 2 occurrences
    if (group.transactions.length < 2) continue;

    const amounts = group.transactions.map((t) => t.amount);
    const dates = group.transactions.map((t) => new Date(t.date));
    const isKeyword = matchesKeyword(group.label);

    // Check detection rules:
    // Rule: same category (implicit from grouping) AND
    //   (amount ±10% AND monthly spacing) OR keyword match
    const amountOk = amountsWithinTolerance(amounts);
    const spacingOk = hasMonthlySpacing(dates);

    const isSubscription = (amountOk && spacingOk) || isKeyword;

    if (!isSubscription) continue;

    const avgAmount =
      amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const patternKey = generatePatternKey(
      group.category,
      group.label,
      avgAmount,
    );

    // Skip dismissed patterns
    if (dismissed.includes(patternKey)) continue;

    // Find most recent date
    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());

    detectedItems.push({
      patternKey,
      label: group.label,
      category: group.category,
      averageAmount: Math.round(avgAmount),
      occurrences: group.transactions.length,
      isKeywordMatch: isKeyword,
      lastDate: sortedDates[0].toISOString(),
    });
  }

  // Sort by average amount descending
  detectedItems.sort((a, b) => b.averageAmount - a.averageAmount);

  const totalMonthly = detectedItems.reduce((s, d) => s + d.averageAmount, 0);

  return {
    totalMonthly,
    totalYearly: totalMonthly * 12,
    items: detectedItems,
  };
}
