/**
 * Property 8: Saving Tree Growth Stage Mapping
 * Feature: synapse-ux-revamp
 *
 * Validates: Requirements 9.5
 *
 * For any saving tree with currentAmount ≥ 0 and targetAmount > 0, the growth
 * stage function shall return: "seed" when progress is 0%, "sprout" when 1–24%,
 * "sapling" when 25–49%, "growing" when 50–74%, "full" when 75–99%, and
 * "blooming" when 100%.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getTreeGrowthStage } from '@/components/duit-tracker/SavingTreeVisual';

describe('Feature: synapse-ux-revamp, Property 8: Saving Tree Growth Stage Mapping', () => {
  /**
   * Validates: Requirements 9.5
   *
   * Progress of exactly 0% always maps to "seed".
   */
  it('returns "seed" when progress is 0%', () => {
    fc.assert(
      fc.property(
        fc.constant(0),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('seed');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * Progress in [1, 24] always maps to "sprout".
   */
  it('returns "sprout" when progress is 1–24%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 24 }),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('sprout');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * Progress in [25, 49] always maps to "sapling".
   */
  it('returns "sapling" when progress is 25–49%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 25, max: 49 }),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('sapling');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * Progress in [50, 74] always maps to "growing".
   */
  it('returns "growing" when progress is 50–74%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 74 }),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('growing');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * Progress in [75, 99] always maps to "full".
   */
  it('returns "full" when progress is 75–99%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 75, max: 99 }),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('full');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * Progress of exactly 100% always maps to "blooming".
   */
  it('returns "blooming" when progress is 100%', () => {
    fc.assert(
      fc.property(
        fc.constant(100),
        (progress) => {
          expect(getTreeGrowthStage(progress)).toBe('blooming');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * For any currentAmount ≥ 0 and targetAmount > 0, computing progress as
   * floor(currentAmount / targetAmount * 100) clamped to [0, 100] and passing
   * it to getTreeGrowthStage returns the correct stage for that progress range.
   */
  it('maps currentAmount/targetAmount ratio to correct growth stage end-to-end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (currentAmount, targetAmount) => {
          const rawProgress = (currentAmount / targetAmount) * 100;
          const progress = Math.min(100, Math.max(0, Math.floor(rawProgress)));
          const stage = getTreeGrowthStage(progress);

          if (progress === 0) {
            expect(stage).toBe('seed');
          } else if (progress >= 1 && progress <= 24) {
            expect(stage).toBe('sprout');
          } else if (progress >= 25 && progress <= 49) {
            expect(stage).toBe('sapling');
          } else if (progress >= 50 && progress <= 74) {
            expect(stage).toBe('growing');
          } else if (progress >= 75 && progress <= 99) {
            expect(stage).toBe('full');
          } else {
            expect(stage).toBe('blooming');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.5
   *
   * The function always returns one of the six valid stage values for any
   * integer progress in [0, 100].
   */
  it('always returns a valid TreeGrowthStage for any progress in [0, 100]', () => {
    const validStages = ['seed', 'sprout', 'sapling', 'growing', 'full', 'blooming'];

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (progress) => {
          const stage = getTreeGrowthStage(progress);
          expect(validStages).toContain(stage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
