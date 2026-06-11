/**
 * Evening Recap Display Logic — Pure Functions
 *
 * Extracted from EveningRecapToast component for testability.
 * These pure functions determine whether the recap should display
 * and compute the message content.
 */

export interface EveningRecapInput {
  /** Current hour (0-23) */
  currentHour: number;
  /** Whether the recap has already been shown for the current date */
  alreadyShownToday: boolean;
  /** Total expense amount for today */
  totalExpenseToday: number;
  /** Number of todos marked done today */
  doneTodoCount: number;
  /** Total number of todos for today */
  totalTodoCount: number;
}

export interface EveningRecapResult {
  /** Whether the toast should be displayed */
  shouldDisplay: boolean;
  /** The formatted message (only meaningful when shouldDisplay is true) */
  message: string;
}

/**
 * Formats a number as Indonesian currency without the "Rp" prefix.
 * Uses periods as thousand separators per Indonesian locale.
 */
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Determines whether the evening recap should display and what message to show.
 *
 * Display conditions (ALL must be true):
 * 1. Time is between 18:00 and 23:59 inclusive
 * 2. User has at least one recorded activity today (expense > 0 OR any todo exists)
 * 3. Recap has not already been shown for the current date
 *
 * Message format: "Hari ini: Rp {total_expense} keluar, {done_count}/{total_count} todo selesai"
 */
export function computeEveningRecap(input: EveningRecapInput): EveningRecapResult {
  const { currentHour, alreadyShownToday, totalExpenseToday, doneTodoCount, totalTodoCount } = input;

  // Condition 1: Time must be between 18:00 and 23:59
  const isEveningTime = currentHour >= 18 && currentHour <= 23;

  // Condition 2: Must have at least one activity today
  const hasActivity = totalExpenseToday > 0 || totalTodoCount > 0;

  // Condition 3: Must not have already been shown
  const notYetShown = !alreadyShownToday;

  const shouldDisplay = isEveningTime && hasActivity && notYetShown;

  // Compute message (always compute for consistency, but only meaningful when displaying)
  const message = `Hari ini: Rp ${formatCurrencyValue(totalExpenseToday)} keluar, ${doneTodoCount}/${totalTodoCount} todo selesai`;

  return { shouldDisplay, message };
}
