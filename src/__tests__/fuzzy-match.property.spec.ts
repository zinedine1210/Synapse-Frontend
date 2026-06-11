/**
 * Property 6: Fuzzy Matching Relevance
 * Feature: synapse-ux-revamp
 *
 * Validates: Requirements 7.8
 *
 * For any target string and a query that is a substring of the target or differs
 * by at most 2 character edits (insertions, deletions, substitutions), the fuzzy
 * matcher shall return a positive relevance score greater than the score for a
 * completely unrelated random string.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { fuzzyScore } from '@/lib/fuzzy-match';

/** Arbitrary for lowercase alpha strings (target/query generation) */
const alphaArb = (minLength: number, maxLength: number) =>
  fc.string({
    minLength,
    maxLength,
    unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  });

/** Arbitrary for numeric-only strings (guaranteed unrelated to alpha targets) */
const numericArb = (minLength: number, maxLength: number) =>
  fc.string({
    minLength,
    maxLength,
    unit: fc.constantFrom(...'0123456789'.split('')),
  });

/**
 * Apply a single character edit (insertion, deletion, or substitution) to a string.
 */
function applyEdit(
  str: string,
  editType: 'insert' | 'delete' | 'substitute',
  position: number,
  char: string,
): string {
  switch (editType) {
    case 'insert':
      return str.slice(0, position) + char + str.slice(position);
    case 'delete':
      return str.slice(0, position) + str.slice(position + 1);
    case 'substitute':
      return str.slice(0, position) + char + str.slice(position + 1);
  }
}

describe('Feature: synapse-ux-revamp, Property 6: Fuzzy Matching Relevance', () => {
  /**
   * Validates: Requirements 7.8
   *
   * For any target string and a query that is a substring of the target,
   * fuzzyScore returns a positive score.
   */
  it('substring queries always produce a positive score', () => {
    fc.assert(
      fc.property(
        alphaArb(3, 30),
        fc.nat(),
        fc.integer({ min: 1, max: 15 }),
        (target, startSeed, lenSeed) => {
          const start = startSeed % target.length;
          const maxLen = target.length - start;
          const len = Math.min(lenSeed, maxLen);
          if (len < 1) return;

          const query = target.substring(start, start + len);
          const score = fuzzyScore(query, target);
          expect(score).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 7.8
   *
   * For any target string and a query that differs by at most 2 character edits,
   * fuzzyScore returns a positive score.
   */
  it('queries with ≤2 edits from target produce a positive score', () => {
    fc.assert(
      fc.property(
        alphaArb(4, 20),
        fc.integer({ min: 1, max: 2 }),
        fc.array(
          fc.record({
            editType: fc.constantFrom(
              'insert' as const,
              'delete' as const,
              'substitute' as const,
            ),
            positionSeed: fc.nat(),
            char: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          }),
          { minLength: 2, maxLength: 2 },
        ),
        (target, numEdits, edits) => {
          let query = target;
          for (let i = 0; i < numEdits; i++) {
            const edit = edits[i];
            if (query.length === 0) return;

            const position =
              edit.positionSeed %
              (edit.editType === 'insert' ? query.length + 1 : query.length);

            let char = edit.char;
            if (edit.editType === 'substitute' && query[position] === char) {
              char = char === 'a' ? 'b' : 'a';
            }

            query = applyEdit(query, edit.editType, position, char);
          }

          if (query.length === 0) return;

          const score = fuzzyScore(query, target);
          expect(score).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 7.8
   *
   * For any target and a related query (substring), the score is greater than
   * the score for a completely unrelated random string.
   */
  it('substring query scores higher than unrelated random string', () => {
    fc.assert(
      fc.property(
        alphaArb(5, 25),
        fc.nat(),
        fc.integer({ min: 2, max: 10 }),
        numericArb(5, 15),
        (target, startSeed, lenSeed, unrelated) => {
          const start = startSeed % target.length;
          const maxLen = target.length - start;
          const len = Math.min(lenSeed, maxLen);
          if (len < 2) return;

          const substringQuery = target.substring(start, start + len);

          const relatedScore = fuzzyScore(substringQuery, target);
          const unrelatedScore = fuzzyScore(unrelated, target);

          expect(relatedScore).toBeGreaterThan(unrelatedScore);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 7.8
   *
   * For any target and a query with ≤2 edits, the score is greater than
   * the score for a completely unrelated random string.
   */
  it('close-edit query scores higher than unrelated random string', () => {
    fc.assert(
      fc.property(
        alphaArb(4, 20),
        fc.integer({ min: 1, max: 2 }),
        fc.array(
          fc.record({
            editType: fc.constantFrom(
              'insert' as const,
              'delete' as const,
              'substitute' as const,
            ),
            positionSeed: fc.nat(),
            char: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          }),
          { minLength: 2, maxLength: 2 },
        ),
        numericArb(5, 15),
        (target, numEdits, edits, unrelated) => {
          let query = target;
          for (let i = 0; i < numEdits; i++) {
            const edit = edits[i];
            if (query.length === 0) return;

            const position =
              edit.positionSeed %
              (edit.editType === 'insert' ? query.length + 1 : query.length);

            let char = edit.char;
            if (edit.editType === 'substitute' && query[position] === char) {
              char = char === 'a' ? 'b' : 'a';
            }

            query = applyEdit(query, edit.editType, position, char);
          }

          if (query.length === 0) return;

          const relatedScore = fuzzyScore(query, target);
          const unrelatedScore = fuzzyScore(unrelated, target);

          expect(relatedScore).toBeGreaterThan(unrelatedScore);
        },
      ),
      { numRuns: 100 },
    );
  });
});
