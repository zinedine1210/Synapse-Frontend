/**
 * Property 20: Recipe Budget Filter
 * Feature: synapse-mega-upgrade
 *
 * Validates: Requirements 18.2
 *
 * For any remaining food budget and set of recipes with prices, the filter SHALL
 * return only recipes whose price is <= the remaining budget, and SHALL never
 * return recipes exceeding the budget.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterRecipesByBudget, Recipe } from '@/services/recipeBudgetFilter';

/**
 * Arbitrary: generate a valid Recipe with a random estimated cost
 */
const recipeArb = (minCost = 1000, maxCost = 500000): fc.Arbitrary<Recipe> =>
  fc
    .record({
      name: fc.string({ minLength: 3, maxLength: 30 }),
      cookTime: fc.constantFrom('5 menit', '10 menit', '15 menit', '30 menit', '45 menit', '60 menit'),
      difficulty: fc.constantFrom('Mudah', 'Sedang', 'Sulit'),
      estimatedCost: fc.integer({ min: minCost, max: maxCost }),
      ingredients: fc.array(fc.string({ minLength: 2, maxLength: 20 }), { minLength: 1, maxLength: 8 }),
      steps: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 6 }),
      tags: fc.array(fc.constantFrom('hemat', 'cepat', 'sehat', 'mengenyangkan', 'pedas'), { minLength: 0, maxLength: 3 }),
    });

/**
 * Arbitrary: generate a list of recipes with varied prices
 */
const recipesArb = fc.array(recipeArb(), { minLength: 0, maxLength: 20 });

/**
 * Arbitrary: generate a positive remaining budget value
 */
const positiveBudgetArb = fc.integer({ min: 1, max: 1000000 });

describe('Feature: synapse-mega-upgrade, Property 20: Recipe Budget Filter', () => {
  /**
   * Validates: Requirements 18.2
   *
   * Property 20a: Every recipe in the filtered result SHALL have estimatedCost <= remainingBudget.
   * No recipe exceeding the budget should ever appear in the output.
   */
  it('all returned recipes have estimatedCost <= remainingBudget', () => {
    fc.assert(
      fc.property(recipesArb, positiveBudgetArb, (recipes, budget) => {
        const filtered = filterRecipesByBudget(recipes, budget);

        // Every recipe in the result must be within budget
        for (const recipe of filtered) {
          expect(recipe.estimatedCost).toBeLessThanOrEqual(budget);
        }
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20b: No recipe with estimatedCost <= remainingBudget SHALL be excluded
   * from the result (completeness — all affordable recipes are included).
   */
  it('all recipes within budget are included in the result', () => {
    fc.assert(
      fc.property(recipesArb, positiveBudgetArb, (recipes, budget) => {
        const filtered = filterRecipesByBudget(recipes, budget);

        // Count recipes that should pass the filter
        const expectedWithinBudget = recipes.filter((r) => r.estimatedCost <= budget);
        expect(filtered.length).toBe(expectedWithinBudget.length);

        // Each recipe within budget should appear in the result
        for (const recipe of expectedWithinBudget) {
          expect(filtered).toContainEqual(recipe);
        }
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20c: The filter SHALL never return a recipe whose price exceeds the budget.
   * This is the complement property — explicitly asserting no over-budget recipe leaks through.
   */
  it('no recipe exceeding the budget is ever returned', () => {
    fc.assert(
      fc.property(recipesArb, positiveBudgetArb, (recipes, budget) => {
        const filtered = filterRecipesByBudget(recipes, budget);

        // Explicit check: none of the filtered recipes exceed the budget
        const overBudgetInResult = filtered.filter((r) => r.estimatedCost > budget);
        expect(overBudgetInResult).toHaveLength(0);
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20d: The filtered result SHALL be a subset of the input recipes
   * (no new recipes are invented, and order/data is preserved).
   */
  it('filtered result is a subset of input recipes with preserved data', () => {
    fc.assert(
      fc.property(recipesArb, positiveBudgetArb, (recipes, budget) => {
        const filtered = filterRecipesByBudget(recipes, budget);

        // Every returned recipe must exist in the original input
        for (const recipe of filtered) {
          expect(recipes).toContainEqual(recipe);
        }

        // Result length cannot exceed input length
        expect(filtered.length).toBeLessThanOrEqual(recipes.length);
      }),
      { numRuns: 150 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20e: When budget is null or undefined (no budget set),
   * all recipes SHALL be returned unfiltered.
   */
  it('returns all recipes when budget is null or undefined', () => {
    fc.assert(
      fc.property(recipesArb, (recipes) => {
        const filteredNull = filterRecipesByBudget(recipes, null);
        const filteredUndefined = filterRecipesByBudget(recipes, undefined);

        expect(filteredNull).toEqual(recipes);
        expect(filteredUndefined).toEqual(recipes);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20f: When budget is 0 or negative (exhausted budget),
   * no recipes SHALL be returned.
   */
  it('returns empty array when budget is zero or negative', () => {
    fc.assert(
      fc.property(
        recipesArb,
        fc.integer({ min: -100000, max: 0 }),
        (recipes, budget) => {
          const filtered = filterRecipesByBudget(recipes, budget);
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 18.2
   *
   * Property 20g: For any budget that is strictly less than all recipe costs,
   * the result SHALL be empty. For any budget >= all recipe costs, the result
   * SHALL contain all recipes.
   */
  it('returns empty when budget < all costs, returns all when budget >= all costs', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb(10000, 500000), { minLength: 1, maxLength: 15 }),
        (recipes) => {
          const maxCost = Math.max(...recipes.map((r) => r.estimatedCost));
          const minCost = Math.min(...recipes.map((r) => r.estimatedCost));

          // Budget below the cheapest recipe => empty result
          if (minCost > 1) {
            const filteredBelow = filterRecipesByBudget(recipes, minCost - 1);
            expect(filteredBelow.every((r) => r.estimatedCost <= minCost - 1)).toBe(true);
          }

          // Budget at or above the most expensive recipe => all recipes returned
          const filteredAbove = filterRecipesByBudget(recipes, maxCost);
          expect(filteredAbove.length).toBe(recipes.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
