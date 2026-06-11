/**
 * Property 5: Search Results Category Grouping
 * Feature: synapse-ux-revamp
 *
 * Validates: Requirements 7.4
 *
 * For any set of search results where each result has a category field,
 * grouping the results by category shall produce groups where every result
 * within a group has a matching category, and no result is omitted from
 * the output.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { groupSearchResults, SearchResult } from '@/lib/search-grouping';

/** Known search categories from the Command Palette design */
const SEARCH_CATEGORIES = [
  'tugas',
  'todo',
  'transaksi',
  'qna',
  'pertemuan',
  'navigasi',
] as const;

/** Arbitrary for a single SearchResult */
const searchResultArb: fc.Arbitrary<SearchResult> = fc.record({
  id: fc.uuid(),
  category: fc.constantFrom(...SEARCH_CATEGORIES),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  relevanceScore: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
});

/** Arbitrary for an array of search results */
const searchResultsArb = fc.array(searchResultArb, { minLength: 0, maxLength: 50 });

describe('Feature: synapse-ux-revamp, Property 5: Search Results Category Grouping', () => {
  /**
   * Validates: Requirements 7.4
   *
   * Every result within a group must have the same category as the group key.
   */
  it('every result in a group has a matching category key', () => {
    fc.assert(
      fc.property(searchResultsArb, (results) => {
        const grouped = groupSearchResults(results);

        for (const [category, items] of Object.entries(grouped)) {
          for (const item of items) {
            expect(item.category).toBe(category);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 7.4
   *
   * No result from the input is omitted — the total count of all grouped
   * results equals the input count.
   */
  it('no result is omitted from the output (total count preserved)', () => {
    fc.assert(
      fc.property(searchResultsArb, (results) => {
        const grouped = groupSearchResults(results);

        const totalGrouped = Object.values(grouped).reduce(
          (sum, items) => sum + items.length,
          0
        );

        expect(totalGrouped).toBe(results.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 7.4
   *
   * No result appears in multiple groups — each result ID appears exactly
   * once across all groups.
   */
  it('no result appears in multiple groups (no duplicates across groups)', () => {
    fc.assert(
      fc.property(searchResultsArb, (results) => {
        const grouped = groupSearchResults(results);

        const allIds: string[] = [];
        for (const items of Object.values(grouped)) {
          for (const item of items) {
            allIds.push(item.id);
          }
        }

        // Each input result ID should appear exactly the same number of times
        // as it does in the input (handles duplicate IDs in input gracefully)
        expect(allIds.length).toBe(results.length);

        // Verify the grouped results contain the exact same set of IDs
        const inputIds = results.map((r) => r.id).sort();
        const outputIds = allIds.sort();
        expect(outputIds).toEqual(inputIds);
      }),
      { numRuns: 100 }
    );
  });
});
