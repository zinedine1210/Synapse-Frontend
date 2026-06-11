/**
 * Recipe Budget Filter
 *
 * Filters recipe recommendations based on the user's remaining food budget.
 * Only recipes whose estimated cost is within the remaining budget are returned.
 *
 * Requirement 18.2: THE Makan_Apa SHALL automatically filter recipe recommendations
 * to only show options within the user's remaining food budget.
 */

export interface Recipe {
  name: string;
  cookTime: string;
  difficulty: string;
  estimatedCost: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
}

/**
 * Filters recipes to only include those whose estimatedCost is <= the remaining budget.
 *
 * @param recipes - Array of recipe recommendations
 * @param remainingBudget - The user's remaining food budget (in Rupiah)
 * @returns Filtered array containing only recipes within budget
 *
 * Rules:
 * - If remainingBudget is null/undefined (no budget set), return all recipes unfiltered
 * - If remainingBudget <= 0, return empty array (no budget remaining)
 * - Otherwise, return only recipes where estimatedCost <= remainingBudget
 */
export function filterRecipesByBudget(
  recipes: Recipe[],
  remainingBudget: number | null | undefined
): Recipe[] {
  // If no budget is set, return all recipes (no filtering needed)
  if (remainingBudget === null || remainingBudget === undefined) {
    return recipes;
  }

  // If budget is 0 or negative, no recipes can fit
  if (remainingBudget <= 0) {
    return [];
  }

  // Filter: only return recipes whose cost is within remaining budget
  return recipes.filter((recipe) => recipe.estimatedCost <= remainingBudget);
}
