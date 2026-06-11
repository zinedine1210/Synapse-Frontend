/**
 * Property 8: Evening Recap Display Rules
 * Feature: synapse-mega-upgrade, Property 8: Evening Recap Display Rules
 *
 * Validates: Requirements 7.1, 7.2, 7.5
 *
 * For any local time and user activity data, the evening recap toast SHALL display
 * if and only if: the time is between 18:00 and 23:59 inclusive, the user has at
 * least one recorded activity today, and the recap has not already been shown for
 * the current date. The content SHALL always match the format
 * "Hari ini: Rp {total_expense} keluar, {done_count}/{total_count} todo selesai".
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeEveningRecap,
  formatCurrencyValue,
  EveningRecapInput,
} from '@/services/eveningRecapLogic';

// --- Arbitraries ---

/** Generate a valid hour (0-23) */
const arbHour = fc.integer({ min: 0, max: 23 });

/** Generate an evening hour (18-23) */
const arbEveningHour = fc.integer({ min: 18, max: 23 });

/** Generate a non-evening hour (0-17) */
const arbNonEveningHour = fc.integer({ min: 0, max: 17 });

/** Generate an expense amount (0 to large) */
const arbExpenseAmount = fc.integer({ min: 0, max: 100_000_000 });

/** Generate a positive expense amount (at least 1) */
const arbPositiveExpense = fc.integer({ min: 1, max: 100_000_000 });

/** Generate todo counts where totalTodoCount >= doneTodoCount */
const arbTodoCounts = fc
  .integer({ min: 0, max: 100 })
  .chain((total) =>
    fc.integer({ min: 0, max: total }).map((done) => ({ totalTodoCount: total, doneTodoCount: done }))
  );

/** Generate todo counts with at least one todo */
const arbNonEmptyTodoCounts = fc
  .integer({ min: 1, max: 100 })
  .chain((total) =>
    fc.integer({ min: 0, max: total }).map((done) => ({ totalTodoCount: total, doneTodoCount: done }))
  );

/** Generate a full EveningRecapInput */
const arbEveningRecapInput: fc.Arbitrary<EveningRecapInput> = fc.record({
  currentHour: arbHour,
  alreadyShownToday: fc.boolean(),
  totalExpenseToday: arbExpenseAmount,
  doneTodoCount: fc.integer({ min: 0, max: 100 }),
  totalTodoCount: fc.integer({ min: 0, max: 100 }),
}).filter((input) => input.doneTodoCount <= input.totalTodoCount);

// --- Tests ---

describe('Feature: synapse-mega-upgrade, Property 8: Evening Recap Display Rules', () => {
  describe('Display condition: shouldDisplay is true if and only if all three conditions hold', () => {
    it('displays when time is 18-23, has activity, and not already shown', () => {
      fc.assert(
        fc.property(
          arbEveningHour,
          arbPositiveExpense,
          arbTodoCounts,
          (hour, expense, todos) => {
            const result = computeEveningRecap({
              currentHour: hour,
              alreadyShownToday: false,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(result.shouldDisplay).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('displays when time is 18-23, has todos (even zero expense), and not already shown', () => {
      fc.assert(
        fc.property(
          arbEveningHour,
          arbNonEmptyTodoCounts,
          (hour, todos) => {
            const result = computeEveningRecap({
              currentHour: hour,
              alreadyShownToday: false,
              totalExpenseToday: 0,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(result.shouldDisplay).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('does NOT display when time is outside 18-23 (Req 7.1)', () => {
      fc.assert(
        fc.property(
          arbNonEveningHour,
          arbPositiveExpense,
          arbTodoCounts,
          fc.boolean(),
          (hour, expense, todos, alreadyShown) => {
            const result = computeEveningRecap({
              currentHour: hour,
              alreadyShownToday: alreadyShown,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(result.shouldDisplay).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('does NOT display when already shown today (Req 7.3 — once per day)', () => {
      fc.assert(
        fc.property(
          arbEveningHour,
          arbPositiveExpense,
          arbTodoCounts,
          (hour, expense, todos) => {
            const result = computeEveningRecap({
              currentHour: hour,
              alreadyShownToday: true,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(result.shouldDisplay).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('does NOT display when no activity today (Req 7.5)', () => {
      fc.assert(
        fc.property(
          arbEveningHour,
          fc.boolean(),
          (hour, alreadyShown) => {
            const result = computeEveningRecap({
              currentHour: hour,
              alreadyShownToday: alreadyShown,
              totalExpenseToday: 0,
              doneTodoCount: 0,
              totalTodoCount: 0,
            });
            expect(result.shouldDisplay).toBe(false);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('shouldDisplay is exactly the conjunction of all three conditions (biconditional)', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);

          const isEvening = input.currentHour >= 18 && input.currentHour <= 23;
          const hasActivity = input.totalExpenseToday > 0 || input.totalTodoCount > 0;
          const notShown = !input.alreadyShownToday;

          const expectedShouldDisplay = isEvening && hasActivity && notShown;
          expect(result.shouldDisplay).toBe(expectedShouldDisplay);
        }),
        { numRuns: 500 }
      );
    });
  });

  describe('Message format: always matches "Hari ini: Rp {total_expense} keluar, {done_count}/{total_count} todo selesai" (Req 7.2)', () => {
    it('message matches the exact format for any valid input', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);

          const expectedMessage = `Hari ini: Rp ${formatCurrencyValue(input.totalExpenseToday)} keluar, ${input.doneTodoCount}/${input.totalTodoCount} todo selesai`;
          expect(result.message).toBe(expectedMessage);
        }),
        { numRuns: 500 }
      );
    });

    it('message starts with "Hari ini: Rp " prefix', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);
          expect(result.message.startsWith('Hari ini: Rp ')).toBe(true);
        }),
        { numRuns: 200 }
      );
    });

    it('message contains " keluar, " separator', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);
          expect(result.message).toContain(' keluar, ');
        }),
        { numRuns: 200 }
      );
    });

    it('message ends with " todo selesai" suffix', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);
          expect(result.message.endsWith(' todo selesai')).toBe(true);
        }),
        { numRuns: 200 }
      );
    });

    it('message contains correct done/total count in format "{done}/{total}"', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);
          const countPattern = `${input.doneTodoCount}/${input.totalTodoCount} todo selesai`;
          expect(result.message).toContain(countPattern);
        }),
        { numRuns: 200 }
      );
    });

    it('expense in message matches formatCurrencyValue output', () => {
      fc.assert(
        fc.property(arbEveningRecapInput, (input) => {
          const result = computeEveningRecap(input);
          const formattedExpense = formatCurrencyValue(input.totalExpenseToday);
          expect(result.message).toContain(`Rp ${formattedExpense} keluar`);
        }),
        { numRuns: 200 }
      );
    });
  });

  describe('Boundary conditions', () => {
    it('hour 18 is the first valid evening hour', () => {
      fc.assert(
        fc.property(
          arbPositiveExpense,
          arbTodoCounts,
          (expense, todos) => {
            const at18 = computeEveningRecap({
              currentHour: 18,
              alreadyShownToday: false,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            const at17 = computeEveningRecap({
              currentHour: 17,
              alreadyShownToday: false,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(at18.shouldDisplay).toBe(true);
            expect(at17.shouldDisplay).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('hour 23 is the last valid evening hour', () => {
      fc.assert(
        fc.property(
          arbPositiveExpense,
          arbTodoCounts,
          (expense, todos) => {
            const at23 = computeEveningRecap({
              currentHour: 23,
              alreadyShownToday: false,
              totalExpenseToday: expense,
              doneTodoCount: todos.doneTodoCount,
              totalTodoCount: todos.totalTodoCount,
            });
            expect(at23.shouldDisplay).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('zero expense with zero todos means no activity', () => {
      fc.assert(
        fc.property(arbEveningHour, (hour) => {
          const result = computeEveningRecap({
            currentHour: hour,
            alreadyShownToday: false,
            totalExpenseToday: 0,
            doneTodoCount: 0,
            totalTodoCount: 0,
          });
          expect(result.shouldDisplay).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });
});
