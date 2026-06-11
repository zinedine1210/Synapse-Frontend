/**
 * Frontend financial helper functions.
 * Pure utility functions for period comparison calculations.
 */

import { Transaction } from '@/services/duitTrackerService';

export interface PeriodComparisonResult {
  currentTotal: number;
  previousTotal: number;
  difference: number;
  percentageChange: number;
}

/**
 * Calculates the comparison between two time periods.
 * Computes the difference and percentage change from previous period to current.
 */
export function calculatePeriodComparison(
  currentPeriodExpenses: number[],
  previousPeriodExpenses: number[],
): PeriodComparisonResult {
  const currentTotal = currentPeriodExpenses.reduce((sum, amount) => sum + amount, 0);
  const previousTotal = previousPeriodExpenses.reduce((sum, amount) => sum + amount, 0);
  const difference = currentTotal - previousTotal;

  let percentageChange: number;
  if (previousTotal === 0) {
    percentageChange = currentTotal > 0 ? 100 : 0;
  } else {
    percentageChange = (difference / previousTotal) * 100;
  }

  return {
    currentTotal,
    previousTotal,
    difference,
    percentageChange,
  };
}

export type TimeRange = 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get date range for a given time range selection.
 */
export function getDateRange(timeRange: TimeRange, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();

  switch (timeRange) {
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'custom': {
      return {
        start: customStart || new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd || now,
      };
    }
  }
}

/**
 * Get the previous equivalent period for comparison.
 * For "this week" → previous week
 * For "this month" → previous month
 * For "last month" → the month before last
 * For "custom" → same duration before the start date
 */
export function getPreviousPeriod(timeRange: TimeRange, currentRange: DateRange): DateRange {
  switch (timeRange) {
    case 'this_week': {
      const start = new Date(currentRange.start);
      start.setDate(start.getDate() - 7);
      const end = new Date(currentRange.end);
      end.setDate(end.getDate() - 7);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(currentRange.start);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(currentRange.end);
      end.setMonth(end.getMonth() - 1);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(currentRange.start);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(currentRange.start);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'custom': {
      const durationMs = currentRange.end.getTime() - currentRange.start.getTime();
      const end = new Date(currentRange.start.getTime() - 1);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getTime() - durationMs);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
  }
}

/**
 * Filter transactions by date range and return expense amounts.
 */
export function getExpensesInRange(transactions: Transaction[], range: DateRange): number[] {
  return transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const date = new Date(t.date);
      return date >= range.start && date <= range.end;
    })
    .map((t) => t.amount);
}
