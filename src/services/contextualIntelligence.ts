import { Transaction } from '@/services/duitTrackerService';

/**
 * Contextual Intelligence Service
 *
 * Rule-based day-of-week spending pattern detection. No AI calls needed.
 * Uses cached transaction data from SWR to detect recurring weekly habits.
 *
 * Detection rules:
 * 1. Group expense transactions by (dayOfWeek, category)
 * 2. Group must span 4+ weeks (28+ days between earliest and latest)
 * 3. Group must have 3+ transactions
 * 4. Calculate average amount
 * 5. Return max 3 patterns sorted by occurrence count descending
 *
 * Output format: "Setiap {day_name} kamu biasa habis Rp {avg_amount} untuk {category}"
 */

const INDONESIAN_DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

export interface DayOfWeekPattern {
  /** Day of week (0 = Sunday/Minggu ... 6 = Saturday/Sabtu) */
  dayOfWeek: number;
  /** Indonesian day name */
  dayName: string;
  /** Spending category */
  category: string;
  /** Average amount spent */
  averageAmount: number;
  /** Number of matching transactions */
  occurrences: number;
  /** Formatted insight string */
  insight: string;
}

/**
 * Format an amount using Indonesian locale (e.g., 25.000)
 */
function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString('id-ID');
}

/**
 * Detect day-of-week spending patterns from transaction history.
 *
 * Algorithm:
 * - Filter to expense transactions only
 * - Group by (dayOfWeek, category)
 * - For each group: check span >= 28 days AND count >= 3
 * - Calculate average amount
 * - Sort by occurrences descending, return max 3
 *
 * @param transactions - All user transactions (typically cached via SWR)
 * @returns Array of detected patterns (max 3)
 */
export function detectDayOfWeekPatterns(
  transactions: Transaction[],
): DayOfWeekPattern[] {
  // Only analyze expense transactions
  const expenses = transactions.filter((t) => t.type === 'expense');

  // Group by (dayOfWeek, category)
  const groups: Record<
    string,
    { dayOfWeek: number; category: string; transactions: Transaction[] }
  > = {};

  for (const tx of expenses) {
    const date = new Date(tx.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const key = `${dayOfWeek}::${tx.category}`;

    if (!groups[key]) {
      groups[key] = { dayOfWeek, category: tx.category, transactions: [] };
    }
    groups[key].transactions.push(tx);
  }

  const patterns: DayOfWeekPattern[] = [];

  for (const group of Object.values(groups)) {
    // Need at least 3 transactions
    if (group.transactions.length < 3) continue;

    // Check time span: must cover 4+ weeks (28+ days)
    const dates = group.transactions.map((t) => new Date(t.date).getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);
    const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);

    if (spanDays < 28) continue;

    // Calculate average amount
    const totalAmount = group.transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = totalAmount / group.transactions.length;

    const dayName = INDONESIAN_DAY_NAMES[group.dayOfWeek];
    const insight = `Setiap ${dayName} kamu biasa habis Rp ${formatAmount(averageAmount)} untuk ${group.category}`;

    patterns.push({
      dayOfWeek: group.dayOfWeek,
      dayName,
      category: group.category,
      averageAmount,
      occurrences: group.transactions.length,
      insight,
    });
  }

  // Sort by occurrence count descending
  patterns.sort((a, b) => b.occurrences - a.occurrences);

  // Return max 3 patterns
  return patterns.slice(0, 3);
}
