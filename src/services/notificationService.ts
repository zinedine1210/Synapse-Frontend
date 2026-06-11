import { apiFetch } from '@/lib/api';

export type NotificationCategory = 'kelas' | 'keuangan' | 'todo' | 'achievement' | 'qna';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  category?: NotificationCategory | null;
  actionUrl?: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
}

export const notificationService = {
  getNotifications: (params?: GetNotificationsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.category) searchParams.set('category', params.category);
    const query = searchParams.toString();
    return apiFetch<PaginatedNotifications>(`/notifications${query ? `?${query}` : ''}`);
  },

  markAsRead: (id: string) =>
    apiFetch<any>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () =>
    apiFetch<any>('/notifications/read-all', { method: 'PATCH' }),

  getUnreadCount: () =>
    apiFetch<{ count: number }>('/notifications/unread-count'),
};
