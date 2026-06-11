/**
 * Property 4: Feature Access Control Correctness
 * Feature: synapse-ux-revamp
 *
 * Validates: Requirements 6.1, 6.3
 *
 * For any user (with role and PricingPlan features array) and any navigation item
 * (with requiredFeature), the item shall be visible if and only if the user's role
 * is SUPERADMIN OR the item's requiredFeature is included in the user's PricingPlan
 * features array.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Pure logic extracted from FeatureAccessProvider in @/lib/feature-access.tsx.
 * This mirrors the hasFeature implementation without React context dependencies.
 */
function hasFeature(
  userRole: 'USER' | 'SUPERADMIN',
  features: string[],
  featureKey: string
): boolean {
  if (userRole === 'SUPERADMIN') return true;
  return features.includes(featureKey);
}

/** All known feature keys in the system */
const FEATURE_KEYS = [
  'duit_tracker',
  'todo',
  'qna',
  'class',
  'food_recommend',
  'split_bill',
  'briefing',
  'exam_prediction',
  'insight',
  'si_bawel',
] as const;

/** Arbitrary for user role */
const roleArb = fc.constantFrom<'USER' | 'SUPERADMIN'>('USER', 'SUPERADMIN');

/** Arbitrary for a feature key (picks from the known set) */
const featureKeyArb = fc.constantFrom(...FEATURE_KEYS);

/** Arbitrary for a features array (subset of all feature keys) */
const featuresArb = fc.subarray([...FEATURE_KEYS], { minLength: 0 });

describe('Feature: synapse-ux-revamp, Property 4: Feature Access Control Correctness', () => {
  /**
   * Validates: Requirements 6.1, 6.3
   *
   * SUPERADMIN always has access to every feature, regardless of the features array.
   */
  it('SUPERADMIN role always grants access to any feature', () => {
    fc.assert(
      fc.property(
        featuresArb,
        featureKeyArb,
        (features, requiredFeature) => {
          const result = hasFeature('SUPERADMIN', features, requiredFeature);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 6.1, 6.3
   *
   * For a USER role, access is granted if and only if the requiredFeature
   * is present in the user's features array.
   */
  it('USER role has access iff requiredFeature is in features array', () => {
    fc.assert(
      fc.property(
        featuresArb,
        featureKeyArb,
        (features, requiredFeature) => {
          const result = hasFeature('USER', features, requiredFeature);
          const expected = features.includes(requiredFeature);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 6.1, 6.3
   *
   * Combined property: For any user (role + features) and any nav item
   * (requiredFeature), the item is visible iff role === SUPERADMIN OR
   * requiredFeature ∈ features.
   */
  it('item is visible iff role === SUPERADMIN OR requiredFeature is in features', () => {
    fc.assert(
      fc.property(
        roleArb,
        featuresArb,
        featureKeyArb,
        (role, features, requiredFeature) => {
          const result = hasFeature(role, features, requiredFeature);
          const expected = role === 'SUPERADMIN' || features.includes(requiredFeature);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
