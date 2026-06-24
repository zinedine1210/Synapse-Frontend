'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Search } from 'lucide-react';
import { Notification } from '@/services/notificationService';
import { useAuth } from '@/lib/AuthContext';
import { useNotifications } from '@/lib/NotificationContext';
import { openCommandPalette } from './CommandPalette';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
  const router = useRouter();
  const resolvedUserName = userName || authUser?.fullName || 'Mahasiswa';
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const handleNotifClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    setShowPanel(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
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
      <h1 style={{ fontSize: 'var(--font-md)', fontWeight: 600, margin: 0, color: 'rgb(var(--text-primary))' }}>
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
            minWidth: 180,
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
                      onClick={() => handleNotifClick(notif)}
                      style={{
                        padding: '0.65rem 1rem',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: notif.isRead ? 'transparent' : 'rgba(var(--color-primary) / 0.03)',
                        cursor: 'pointer',
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
          className="appbar-user-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.65rem 0.3rem 0.3rem',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <UserAvatar name={resolvedUserName} avatarUrl={authUser?.avatarUrl} size={26} style={{ borderRadius: 'var(--radius-sm)' }} />
          <span className="appbar-user-name" style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
            {resolvedUserName}
          </span>
        </div>
      </div>
    </header>
  );
}
