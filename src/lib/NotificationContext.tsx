'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { notificationService, Notification } from '@/services/notificationService';
import { useAuth } from '@/lib/AuthContext';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loaded: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationState>({
  notifications: [],
  unreadCount: 0,
  loaded: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Single socket connection + fetch for entire app lifecycle
  useEffect(() => {
    if (!userId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const wsBase = apiUrl.replace(/\/api\/v\d+\/?$/, '');
    const socket = io(`${wsBase}/notifications`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUser', { userId });
    });

    socket.on('connect_error', () => {});

    socket.on('newNotification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('unreadCount', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    // Fetch initial notifications once
    notificationService.getNotifications().then((data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setLoaded(true);
    }).catch(() => setLoaded(true));

    return () => {
      socket.emit('leaveUser', { userId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await notificationService.markAsRead(id); } catch { }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await notificationService.markAllAsRead(); } catch { }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loaded, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
