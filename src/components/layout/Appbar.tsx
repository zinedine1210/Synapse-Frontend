'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell, Check, CheckCheck, X, Search } from 'lucide-react';
import { notificationService, Notification } from '@/services/notificationService';
import { useAuth } from '@/lib/AuthContext';
import { openCommandPalette } from './CommandPalette';

interface AppbarProps {
  title?: string;
  userName?: string;
  userId?: string;
  unreadCount?: number;
  sidebarCollapsed?: boolean;
}

export function Appbar({
  title = 'Dashboard',
  userName,
  userId,
  unreadCount: initialUnread = 0,
  sidebarCollapsed = false,
}: AppbarProps) {
  const { user: authUser } = useAuth();
  const resolvedUserName = userName || authUser?.fullName || 'Sobat';
  const resolvedUserId = userId || authUser?.id;
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [loaded, setLoaded] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Connect to notification socket
  useEffect(() => {
    if (!resolvedUserId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const wsBase = apiUrl.replace(/\/api\/v\d+\/?$/, '');
    const socket = io(`${wsBase}/notifications`, { transports: ['polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUser', { userId: resolvedUserId });
    });

    socket.on('newNotification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('unreadCount', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    return () => {
      socket.emit('leaveUser', { userId: resolvedUserId });
      socket.disconnect();
    };
  }, [resolvedUserId]);

  // Fetch notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    if (loaded) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setLoaded(true);
    } catch { }
  }, [loaded]);

  useEffect(() => {
    if (showPanel && !loaded) fetchNotifications();
  }, [showPanel, loaded, fetchNotifications]);

  // Fetch initial unread count
  useEffect(() => {
    if (!resolvedUserId) return;
    notificationService.getNotifications().then((data) => {
      setUnreadCount(data.unreadCount);
    }).catch(() => {});
  }, [resolvedUserId]);

  // Close panel on outside click
  useEffect(() => {
    if (!showPanel) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await notificationService.markAsRead(id); } catch { }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try { await notificationService.markAllAsRead(); } catch { }
  };

  const timeAgo = (date: string) => {
    const d = new Date(date); const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} jam lalu`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <header
      className="app-appbar"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        height: 'var(--appbar-height)',
        background: 'rgb(var(--bg-surface))',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 40,
        transition: 'left 0.3s ease',
      }}
    >
      <h1 className="appbar-title" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, margin: 0, color: 'rgb(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Search input trigger for Command Palette */}
        <button
          onClick={() => openCommandPalette()}
          className="appbar-search-trigger"
          data-tour="search"
          aria-label="Open search (Ctrl+K)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'rgb(var(--text-muted))',
            fontSize: 'var(--font-xs)',
            transition: 'var(--transition-fast)',
            minWidth: 120,
            maxWidth: 180,
          }}
        >
          <Search size={14} />
          <span style={{ flex: 1, textAlign: 'left' }}>Cari...</span>
          <kbd
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: 3,
              background: 'rgb(var(--bg-secondary))',
              border: '1px solid var(--border-default)',
              fontFamily: 'inherit',
            }}
          >
            ⌘K
          </kbd>
        </button>
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPanel((p) => !p)}
            className="appbar-bell"
            style={{
              position: 'relative',
              background: showPanel ? 'rgba(var(--color-primary) / 0.1)' : 'var(--input-bg)',
              border: `1px solid ${showPanel ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-sm)',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showPanel ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
              transition: 'var(--transition-fast)',
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: 'rgb(var(--color-primary))',
                  color: 'rgb(var(--bg-base))',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgb(var(--bg-surface))',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showPanel && (
            <div className="notif-panel" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: 360,
              maxHeight: 480,
              background: 'var(--modal-bg)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                  Notifikasi {unreadCount > 0 && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', fontWeight: 500 }}>({unreadCount} baru)</span>}
                </span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <CheckCheck size={12} /> Tandai semua dibaca
                  </button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <Bell size={28} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3, margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: notif.isRead ? 'transparent' : 'rgba(var(--color-primary) / 0.03)',
                        cursor: notif.isRead ? 'default' : 'pointer',
                        transition: 'background 0.1s',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                      }}
                    >
                      {!notif.isRead && (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--color-primary))', flexShrink: 0, marginTop: '0.4rem' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: notif.isRead ? 400 : 600, color: 'rgb(var(--text-primary))', display: 'block' }}>
                          {notif.title}
                        </span>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: '0.1rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.6rem', color: 'rgb(var(--text-muted))' }}>
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {authUser?.avatarUrl ? (
            <img
              src={authUser.avatarUrl}
              alt={resolvedUserName}
              style={{
                width: 26,
                height: 26,
                borderRadius: 'var(--radius-sm)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {resolvedUserName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="appbar-username" style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))', paddingRight: '0.35rem' }}>
            {resolvedUserName}
          </span>
        </div>
      </div>
    </header>
  );
}
