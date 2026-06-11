/**
 * Pure notification logic functions extracted for testability.
 * Used by the NotificationsPage component and tested via property-based tests.
 */

import type { Notification, NotificationCategory } from './notificationService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';
export type CategoryFilter = 'all' | NotificationCategory;

export interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Determines which time group a notification belongs to based on its createdAt
 * timestamp relative to a reference "now" date.
 */
export function getTimeGroup(dateStr: string, now?: Date): TimeGroup {
  const date = new Date(dateStr);
  const reference = now ?? new Date();

  const startOfToday = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  // Start of this week (Monday)
  const dayOfWeek = reference.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday && date < startOfToday) return 'yesterday';
  if (date >= startOfWeek) return 'thisWeek';
  return 'older';
}

/**
 * Groups an array of notifications into time-based buckets.
 */
export function groupNotifications(notifications: Notification[], now?: Date): GroupedNotifications {
  const groups: GroupedNotifications = { today: [], yesterday: [], thisWeek: [], older: [] };
  for (const notif of notifications) {
    const group = getTimeGroup(notif.createdAt, now);
    groups[group].push(notif);
  }
  return groups;
}

/**
 * Filters notifications by category. If filter is 'all', returns all notifications.
 * Otherwise returns only notifications whose category matches the filter.
 */
export function filterByCategory(
  notifications: Notification[],
  filter: CategoryFilter
): Notification[] {
  if (filter === 'all') return notifications;
  return notifications.filter((n) => n.category === filter);
}
