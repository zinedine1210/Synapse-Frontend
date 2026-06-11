/**
 * Property 17: Notification Time-Period Grouping
 * Property 18: Notification Category Filter
 * Feature: synapse-mega-upgrade
 *
 * Validates: Requirements 16.1, 16.3
 *
 * Property 17: For any set of notifications with varying createdAt timestamps,
 * grouping them by time period SHALL always produce correct groups (Today,
 * Yesterday, This Week, Older) where each notification appears in exactly one group.
 *
 * Property 18: For any set of notifications with varying categories and a selected
 * filter, filtering SHALL return only notifications matching the selected category
 * (or all if "all" is selected), and the count SHALL never exceed the total count.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getTimeGroup,
  groupNotifications,
  filterByCategory,
  TimeGroup,
  CategoryFilter,
} from '@/services/notificationLogic';
import type { Notification, NotificationCategory } from '@/services/notificationService';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const CATEGORIES: NotificationCategory[] = ['kelas', 'keuangan', 'todo', 'achievement', 'qna'];
const ALL_FILTERS: CategoryFilter[] = ['all', ...CATEGORIES];

// Epoch range for safe date generation (2024-01-01 to 2025-12-31)
const MIN_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
const MAX_EPOCH = new Date('2025-12-31T23:59:59Z').getTime();

/** Generate a valid NotificationCategory */
const arbCategory = fc.constantFrom<NotificationCategory>(...CATEGORIES);

/** Generate a CategoryFilter (including 'all') */
const arbCategoryFilter = fc.constantFrom<CategoryFilter>(...ALL_FILTERS);

/** Generate a category that can be null/undefined (like real data) */
const arbOptionalCategory = fc.oneof(
  arbCategory.map((c) => c as NotificationCategory | null | undefined),
  fc.constant(null as NotificationCategory | null | undefined),
  fc.constant(undefined as NotificationCategory | null | undefined)
);

/** Generate a reference "now" date using integer epoch for safety */
const arbReferenceDate: fc.Arbitrary<Date> = fc
  .integer({ min: MIN_EPOCH, max: MAX_EPOCH })
  .map((ms) => new Date(ms));

/** Generate a realistic date within the last 30 days relative to a reference date */
function arbDateRelativeTo(referenceDate: Date): fc.Arbitrary<Date> {
  return fc.integer({ min: 0, max: 30 * 24 * 60 }).map((minutesAgo) => {
    return new Date(referenceDate.getTime() - minutesAgo * 60 * 1000);
  });
}

/** Generate a notification with a specific createdAt ISO string */
function arbNotification(createdAtIso: string): fc.Arbitrary<Notification> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    message: fc.string({ minLength: 1, maxLength: 100 }),
    isRead: fc.boolean(),
    category: arbOptionalCategory,
    actionUrl: fc.constant(null as string | null),
    createdAt: fc.constant(createdAtIso),
  }) as fc.Arbitrary<Notification>;
}

/** Generate a notification with a random date within 30 days of a reference */
function arbNotificationRelativeTo(referenceDate: Date): fc.Arbitrary<Notification> {
  return arbDateRelativeTo(referenceDate).chain((date) => arbNotification(date.toISOString()));
}

/** Generate a list of notifications relative to a reference date */
function arbNotificationsRelativeTo(referenceDate: Date): fc.Arbitrary<Notification[]> {
  return fc.array(arbNotificationRelativeTo(referenceDate), { minLength: 0, maxLength: 30 });
}

/** Generate a createdAt ISO string from epoch range */
const arbCreatedAt: fc.Arbitrary<string> = fc
  .integer({ min: MIN_EPOCH, max: MAX_EPOCH })
  .map((ms) => new Date(ms).toISOString());

/** Generate a notification with a specific category */
function arbNotificationWithCategory(category: NotificationCategory | null | undefined): fc.Arbitrary<Notification> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    message: fc.string({ minLength: 1, maxLength: 100 }),
    isRead: fc.boolean(),
    category: fc.constant(category),
    actionUrl: fc.constant(null as string | null),
    createdAt: arbCreatedAt,
  }) as fc.Arbitrary<Notification>;
}

/** Generate a mixed array of notifications with various categories */
const arbMixedCategoryNotifications: fc.Arbitrary<Notification[]> = fc.array(
  fc.oneof(
    ...CATEGORIES.map((cat) => arbNotificationWithCategory(cat)),
    arbNotificationWithCategory(null),
    arbNotificationWithCategory(undefined)
  ),
  { minLength: 0, maxLength: 30 }
);

// ─── Property 17: Notification Time-Period Grouping Tests ────────────────────

describe('Feature: synapse-mega-upgrade, Property 17: Notification Time-Period Grouping', () => {
  describe('Each notification appears in exactly one group', () => {
    it('total notifications across all groups equals input length', () => {
      fc.assert(
        fc.property(
          arbReferenceDate.chain((refDate) =>
            arbNotificationsRelativeTo(refDate).map((notifs) => ({ notifs, refDate }))
          ),
          ({ notifs, refDate }) => {
            const grouped = groupNotifications(notifs, refDate);
            const totalGrouped =
              grouped.today.length +
              grouped.yesterday.length +
              grouped.thisWeek.length +
              grouped.older.length;
            expect(totalGrouped).toBe(notifs.length);
          }
        ),
        { numRuns: 150 }
      );
    });

    it('no notification appears in more than one group', () => {
      fc.assert(
        fc.property(
          arbReferenceDate.chain((refDate) =>
            arbNotificationsRelativeTo(refDate).map((notifs) => ({ notifs, refDate }))
          ),
          ({ notifs, refDate }) => {
            const grouped = groupNotifications(notifs, refDate);
            const allIds = [
              ...grouped.today.map((n) => n.id),
              ...grouped.yesterday.map((n) => n.id),
              ...grouped.thisWeek.map((n) => n.id),
              ...grouped.older.map((n) => n.id),
            ];
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);
          }
        ),
        { numRuns: 150 }
      );
    });

    it('every input notification appears in exactly one group (by id)', () => {
      fc.assert(
        fc.property(
          arbReferenceDate.chain((refDate) =>
            arbNotificationsRelativeTo(refDate).map((notifs) => ({ notifs, refDate }))
          ),
          ({ notifs, refDate }) => {
            const grouped = groupNotifications(notifs, refDate);
            const allGroupedIds = new Set([
              ...grouped.today.map((n) => n.id),
              ...grouped.yesterday.map((n) => n.id),
              ...grouped.thisWeek.map((n) => n.id),
              ...grouped.older.map((n) => n.id),
            ]);
            for (const notif of notifs) {
              expect(allGroupedIds.has(notif.id)).toBe(true);
            }
          }
        ),
        { numRuns: 150 }
      );
    });
  });

  describe('Correct group assignment based on timestamp', () => {
    it('notifications created "today" land in the today group', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 0, max: 23 * 60 + 59 }), // minutes into the day
          (refDate, minutesIntoDay) => {
            // Create a timestamp on the same date as refDate, at a time <= refDate
            const startOfRefDay = new Date(
              refDate.getFullYear(),
              refDate.getMonth(),
              refDate.getDate()
            );
            const todayDate = new Date(startOfRefDay.getTime() + minutesIntoDay * 60 * 1000);
            // Only test if the date is not after refDate
            if (todayDate > refDate) return;

            const group = getTimeGroup(todayDate.toISOString(), refDate);
            expect(group).toBe('today');
          }
        ),
        { numRuns: 150 }
      );
    });

    it('notifications created "yesterday" land in the yesterday group', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 0, max: 23 * 60 + 59 }), // minutes into the day
          (refDate, minutesIntoDay) => {
            const startOfToday = new Date(
              refDate.getFullYear(),
              refDate.getMonth(),
              refDate.getDate()
            );
            const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
            const yesterday = new Date(startOfYesterday.getTime() + minutesIntoDay * 60 * 1000);

            const group = getTimeGroup(yesterday.toISOString(), refDate);
            expect(group).toBe('yesterday');
          }
        ),
        { numRuns: 150 }
      );
    });

    it('notifications more than a week old land in the older group', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 8, max: 30 }),
          (refDate, daysAgo) => {
            const oldDate = new Date(refDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            const group = getTimeGroup(oldDate.toISOString(), refDate);
            expect(group).toBe('older');
          }
        ),
        { numRuns: 150 }
      );
    });

    it('getTimeGroup returns one of the four valid group values', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 0, max: 30 * 24 * 60 }),
          (refDate, minutesAgo) => {
            const date = new Date(refDate.getTime() - minutesAgo * 60 * 1000);
            const group = getTimeGroup(date.toISOString(), refDate);
            const validGroups: TimeGroup[] = ['today', 'yesterday', 'thisWeek', 'older'];
            expect(validGroups).toContain(group);
          }
        ),
        { numRuns: 150 }
      );
    });
  });

  describe('Group ordering properties', () => {
    it('today notifications have timestamps >= start of today', () => {
      fc.assert(
        fc.property(
          arbReferenceDate.chain((refDate) =>
            arbNotificationsRelativeTo(refDate).map((notifs) => ({ notifs, refDate }))
          ),
          ({ notifs, refDate }) => {
            const grouped = groupNotifications(notifs, refDate);
            const startOfToday = new Date(
              refDate.getFullYear(),
              refDate.getMonth(),
              refDate.getDate()
            );
            for (const notif of grouped.today) {
              expect(new Date(notif.createdAt).getTime()).toBeGreaterThanOrEqual(startOfToday.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    it('yesterday notifications have timestamps in the yesterday range', () => {
      fc.assert(
        fc.property(
          arbReferenceDate.chain((refDate) =>
            arbNotificationsRelativeTo(refDate).map((notifs) => ({ notifs, refDate }))
          ),
          ({ notifs, refDate }) => {
            const grouped = groupNotifications(notifs, refDate);
            const startOfToday = new Date(
              refDate.getFullYear(),
              refDate.getMonth(),
              refDate.getDate()
            );
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);

            for (const notif of grouped.yesterday) {
              const ts = new Date(notif.createdAt).getTime();
              expect(ts).toBeGreaterThanOrEqual(startOfYesterday.getTime());
              expect(ts).toBeLessThan(startOfToday.getTime());
            }
          }
        ),
        { numRuns: 150 }
      );
    });
  });
});

// ─── Property 18: Notification Category Filter Tests ─────────────────────────

describe('Feature: synapse-mega-upgrade, Property 18: Notification Category Filter', () => {
  describe('Filter correctness', () => {
    it('"all" filter returns all notifications unchanged', () => {
      fc.assert(
        fc.property(arbMixedCategoryNotifications, (notifications) => {
          const result = filterByCategory(notifications, 'all');
          expect(result.length).toBe(notifications.length);
          expect(result).toEqual(notifications);
        }),
        { numRuns: 150 }
      );
    });

    it('category filter returns only notifications matching that category', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategory,
          (notifications, category) => {
            const result = filterByCategory(notifications, category);
            for (const notif of result) {
              expect(notif.category).toBe(category);
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    it('filtered count never exceeds total count', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategoryFilter,
          (notifications, filter) => {
            const result = filterByCategory(notifications, filter);
            expect(result.length).toBeLessThanOrEqual(notifications.length);
          }
        ),
        { numRuns: 150 }
      );
    });

    it('filtered results are a subset of the original notifications', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategoryFilter,
          (notifications, filter) => {
            const result = filterByCategory(notifications, filter);
            const originalIds = new Set(notifications.map((n) => n.id));
            for (const notif of result) {
              expect(originalIds.has(notif.id)).toBe(true);
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    it('no matching notifications are excluded by the filter', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategory,
          (notifications, category) => {
            const result = filterByCategory(notifications, category);
            const resultIds = new Set(result.map((n) => n.id));
            // Every notification with this category must be in the result
            for (const notif of notifications) {
              if (notif.category === category) {
                expect(resultIds.has(notif.id)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 150 }
      );
    });

    it('filtering by different categories partitions matching notifications correctly', () => {
      fc.assert(
        fc.property(arbMixedCategoryNotifications, (notifications) => {
          const counts: Record<string, number> = {};
          for (const cat of CATEGORIES) {
            counts[cat] = filterByCategory(notifications, cat).length;
          }
          // Sum of all category filters should be <= total (some may have null/undefined category)
          const totalFiltered = Object.values(counts).reduce((a, b) => a + b, 0);
          expect(totalFiltered).toBeLessThanOrEqual(notifications.length);
        }),
        { numRuns: 150 }
      );
    });

    it('notifications without a category are excluded by any specific category filter', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategory,
          (notifications, category) => {
            const result = filterByCategory(notifications, category);
            for (const notif of result) {
              expect(notif.category).not.toBeNull();
              expect(notif.category).not.toBeUndefined();
            }
          }
        ),
        { numRuns: 150 }
      );
    });
  });

  describe('Idempotence and consistency', () => {
    it('filtering twice with same category yields same result', () => {
      fc.assert(
        fc.property(
          arbMixedCategoryNotifications,
          arbCategoryFilter,
          (notifications, filter) => {
            const firstResult = filterByCategory(notifications, filter);
            const secondResult = filterByCategory(firstResult, filter);
            expect(secondResult).toEqual(firstResult);
          }
        ),
        { numRuns: 150 }
      );
    });

    it('empty input always produces empty output regardless of filter', () => {
      fc.assert(
        fc.property(arbCategoryFilter, (filter) => {
          const result = filterByCategory([], filter);
          expect(result.length).toBe(0);
        }),
        { numRuns: 20 }
      );
    });
  });
});
