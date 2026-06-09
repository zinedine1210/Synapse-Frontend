import { apiFetch } from '@/lib/api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: () =>
    apiFetch<{ notifications: Notification[]; unreadCount: number }>('/notifications'),

  markAsRead: (id: string) =>
    apiFetch<any>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () =>
    apiFetch<any>('/notifications/read-all', { method: 'PATCH' }),
};
