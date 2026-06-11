/**
 * Search results grouping utility for CommandPalette.
 * Groups raw search results by category for display.
 *
 * Exports pure functions for testability (Property 5).
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Category identifiers matching SEARCH_CATEGORIES in CommandPalette */
export type SearchCategoryId = 'tugas' | 'todo' | 'transaksi' | 'qna' | 'pertemuan' | 'navigasi';

/** A categorized search result item */
export interface CategorizedResult {
  id: string;
  category: SearchCategoryId;
  title: string;
  description?: string;
  relevanceScore: number;
}

/** A group of results under a single category */
export interface ResultGroup {
  category: SearchCategoryId;
  label: string;
  results: CategorizedResult[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Category display labels in Indonesian */
export const CATEGORY_LABELS: Record<SearchCategoryId, string> = {
  tugas: 'Tugas',
  todo: 'To-Do',
  transaksi: 'Transaksi',
  qna: 'Q&A',
  pertemuan: 'Pertemuan',
  navigasi: 'Navigasi',
};

/** Display order for categories */
export const CATEGORY_ORDER: SearchCategoryId[] = [
  'tugas',
  'todo',
  'transaksi',
  'qna',
  'pertemuan',
  'navigasi',
];

// ─── Grouping Function ──────────────────────────────────────────────────────────

/**
 * Group an array of categorized search results by their category field.
 *
 * Properties guaranteed:
 * - Every result appears in exactly one group
 * - No result is omitted from the output
 * - Groups maintain the defined CATEGORY_ORDER
 * - Within each group, results are sorted by relevanceScore descending
 * - Empty categories are excluded from the output
 *
 * @param results Array of categorized results to group
 * @returns Array of ResultGroup, ordered by CATEGORY_ORDER, excluding empty groups
 */
export function groupResultsByCategory(results: CategorizedResult[]): ResultGroup[] {
  // Build a map of category → results
  const grouped = new Map<SearchCategoryId, CategorizedResult[]>();

  for (const result of results) {
    const existing = grouped.get(result.category);
    if (existing) {
      existing.push(result);
    } else {
      grouped.set(result.category, [result]);
    }
  }

  // Sort each group by relevanceScore descending
  grouped.forEach((items) => {
    items.sort((a: CategorizedResult, b: CategorizedResult) => b.relevanceScore - a.relevanceScore);
  });

  // Build output in defined category order, skipping empty groups
  const output: ResultGroup[] = [];
  for (const categoryId of CATEGORY_ORDER) {
    const items = grouped.get(categoryId);
    if (items && items.length > 0) {
      output.push({
        category: categoryId,
        label: CATEGORY_LABELS[categoryId],
        results: items,
      });
    }
  }

  return output;
}

/**
 * Flatten grouped results back into a single ordered array.
 * Useful for keyboard navigation which needs a flat index.
 *
 * @param groups Grouped results from groupResultsByCategory
 * @returns Flat array of results in display order
 */
export function flattenGroups(groups: ResultGroup[]): CategorizedResult[] {
  const flat: CategorizedResult[] = [];
  for (const group of groups) {
    for (const result of group.results) {
      flat.push(result);
    }
  }
  return flat;
}

// ─── Aliases for Property Test Compatibility ────────────────────────────────────

/** Alias type for property test compatibility */
export interface SearchResult {
  id: string;
  category: SearchCategoryId;
  title: string;
  description?: string;
  relevanceScore?: number;
}

/**
 * Alternative grouping function that returns a Record<category, results[]> format.
 * Used by property tests (Property 5) which expect a flat record rather than ResultGroup[].
 *
 * @param results Array of categorized results to group
 * @returns Record where keys are categories and values are arrays of results
 */
export function groupSearchResults(results: SearchResult[]): Record<string, SearchResult[]> {
  const grouped: Record<string, SearchResult[]> = {};

  for (const result of results) {
    if (!grouped[result.category]) {
      grouped[result.category] = [];
    }
    grouped[result.category].push(result);
  }

  return grouped;
}
