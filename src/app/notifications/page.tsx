'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast, SkeletonNotification, PullToRefresh, InfiniteScroll } from '@/components/ui';
import {
  notificationService,
  Notification,
  NotificationCategory,
} from '@/services/notificationService';
import {
  Bell, CheckCheck, Check, BookOpen, Wallet, ListTodo,
  Trophy, HelpCircle, Filter, Inbox,
} from 'lucide-react';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { getCache, setCache as setCacheStore } from '@/lib/cache';

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';
type CategoryFilter = 'all' | NotificationCategory;

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  older: Notification[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_TABS: { id: CategoryFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Semua', icon: <Filter size={14} /> },
  { id: 'kelas', label: 'Kelas', icon: <BookOpen size={14} /> },
  { id: 'keuangan', label: 'Keuangan', icon: <Wallet size={14} /> },
  { id: 'todo', label: 'Todo', icon: <ListTodo size={14} /> },
  { id: 'achievement', label: 'Achievement', icon: <Trophy size={14} /> },
  { id: 'qna', label: 'Q&A', icon: <HelpCircle size={14} /> },
];

const PAGE_LIMIT = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimeGroup(dateStr: string): TimeGroup {
  const date = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  // Start of this week (Monday)
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday && date < startOfToday) return 'yesterday';
  if (date >= startOfWeek) return 'thisWeek';
  return 'older';
}

function groupNotifications(notifications: Notification[]): GroupedNotifications {
  const groups: GroupedNotifications = { today: [], yesterday: [], thisWeek: [], older: [] };
  for (const notif of notifications) {
    const group = getTimeGroup(notif.createdAt);
    groups[group].push(notif);
  }
  return groups;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} jam lalu`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getCategoryIcon(category?: NotificationCategory | null): React.ReactNode {
  switch (category) {
    case 'kelas': return <BookOpen size={16} />;
    case 'keuangan': return <Wallet size={16} />;
    case 'todo': return <ListTodo size={16} />;
    case 'achievement': return <Trophy size={16} />;
    case 'qna': return <HelpCircle size={16} />;
    default: return <Bell size={16} />;
  }
}

function getCategoryColor(category?: NotificationCategory | null): string {
  switch (category) {
    case 'kelas': return 'var(--color-primary)';
    case 'keuangan': return 'var(--color-warning, 234 179 8)';
    case 'todo': return 'var(--color-success, 34 197 94)';
    case 'achievement': return 'var(--color-secondary, 168 85 247)';
    case 'qna': return 'var(--color-info, 59 130 246)';
    default: return 'var(--text-muted)';
  }
}

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Hari Ini',
  yesterday: 'Kemarin',
  thisWeek: 'Minggu Ini',
  older: 'Lebih Lama',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  // Hydrate from cache for instant back-navigation
  const cachedKey = `notifications:${activeCategory}`;
  const cached = getCache<{ notifications: Notification[]; unreadCount: number }>(cachedKey);

  const [notifications, setNotifications] = useState<Notification[]>(cached?.notifications ?? []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(cached?.unreadCount ?? 0);
  const socketRef = useRef<Socket | null>(null);

  // Push notification state
  const push = usePushNotifications();
  const [pushDismissed, setPushDismissed] = useState(false);

  // ─── Fetch notifications ─────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (pageNum: number, category: CategoryFilter, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const data = await notificationService.getNotifications({
        page: pageNum,
        limit: PAGE_LIMIT,
        category: category === 'all' ? undefined : category,
      });

      const fetched = data.notifications ?? [];
      setNotifications(append ? (prev) => [...prev, ...fetched] : fetched);
      setUnreadCount(data.unreadCount ?? 0);
      setHasMore(fetched.length >= PAGE_LIMIT);
      // Cache page 1 for instant back-navigation
      if (!append) {
        setCacheStore(`notifications:${category}`, { notifications: fetched, unreadCount: data.unreadCount ?? 0 });
      }
    } catch (err) {
      if (!append) setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [notifications]);

  // Initial load + when category changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchNotifications(1, activeCategory, false);
  }, [activeCategory, fetchNotifications]);

  // ─── Infinite scroll ──────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, activeCategory, true);
  }, [page, loadingMore, hasMore, activeCategory, fetchNotifications]);

  // ─── Pull-to-refresh ──────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setPage(1);
    setHasMore(true);
    await fetchNotifications(1, activeCategory, false);
  }, [activeCategory, fetchNotifications]);

  // ─── Socket.IO real-time listener ─────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const wsBase = apiUrl.replace(/\/api\/v\d+\/?$/, '');
    const socket = io(`${wsBase}/notifications`, { transports: ['polling'], withCredentials: true, reconnectionAttempts: 5, reconnectionDelay: 3000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUser', { userId: user.id });
    });

    socket.on('connect_error', () => {});

    socket.on('newNotification', (notif: Notification) => {
      // Prepend new notification to the list (if matches active category filter)
      const matchesCategory = activeCategory === 'all' || notif.category === activeCategory;
      if (matchesCategory) {
        setNotifications((prev) => [notif, ...prev]);
      }
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.emit('leaveUser', { userId: user.id });
      socket.disconnect();
    };
  }, [user?.id, activeCategory]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = async (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    if (notif.isRead) return;

    setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await notificationService.markAsRead(notif.id);
    } catch {
      // Revert on failure
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: false } : n));
      setUnreadCount((prev) => prev + 1);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
      showToast('Semua notif udah dibaca! ✅', 'success');
    } catch {
      // Reload on failure
      fetchNotifications(1, activeCategory, false);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    // Mark as read if unread
    if (!notif.isRead) {
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      notificationService.markAsRead(notif.id).catch(() => {});
    }

    // Navigate to actionUrl if present
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  // ─── Grouped data ─────────────────────────────────────────────────────────

  const grouped = groupNotifications(notifications);
  const groupOrder: TimeGroup[] = ['today', 'yesterday', 'thisWeek', 'older'];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthGuard requiredFeature="notification">
      <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Appbar title="Notifikasi" sidebarCollapsed={sidebarCollapsed} />

      <div
        className="notif-page page-content"
        style={{
          maxWidth: 700,
          margin: '0 auto',
        }}
      >
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                Pusat Notif
              </h2>
              {unreadCount > 0 && (
                <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>
                  {unreadCount} belum dibaca
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: 'var(--font-sm)',
                  padding: '0.4rem 0.75rem',
                }}
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </Button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              marginBottom: '1rem',
              scrollbarWidth: 'none',
            }}
          >
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: `1px solid ${activeCategory === tab.id ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                  background: activeCategory === tab.id ? 'rgba(var(--color-primary) / 0.1)' : 'transparent',
                  color: activeCategory === tab.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                  fontSize: 'var(--font-sm)',
                  fontWeight: activeCategory === tab.id ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition-fast)',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Push Notification Banner */}
          {push.isSupported && !push.isSubscribed && !pushDismissed && push.permission !== 'denied' && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
              padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-lg)',
              background: 'rgba(var(--color-primary) / 0.06)',
              border: '1px solid rgba(var(--color-primary) / 0.12)',
              marginBottom: '0.75rem', flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', margin: 0 }}>
                  📱 Nyalain notif HP biar gak ketinggalan info penting!
                </p>
                {push.error && (
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-danger))', margin: '4px 0 0', lineHeight: 1.4 }}>
                    ⚠️ {push.error}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <Button
                  size="sm"
                  isLoading={push.loading}
                  onClick={async () => {
                    const result = await push.subscribe();
                    if (result.ok) {
                      showToast('Push notification aktif! 🎉', 'success');
                    } else {
                      showToast('Gagal nyalain push notif nih.', 'error');
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                    color: 'black', fontWeight: 700, border: 'none', fontSize: 'var(--font-xs)',
                  }}
                >
                  Aktifkan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPushDismissed(true)} style={{ fontSize: 'var(--font-xs)' }}>
                  Nanti
                </Button>
              </div>
            </div>
          )}

          {/* Push denied banner */}
          {push.isSupported && push.permission === 'denied' && !pushDismissed && (
            <div style={{
              padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-lg)',
              background: 'rgba(var(--color-danger) / 0.06)',
              border: '1px solid rgba(var(--color-danger) / 0.12)',
              marginBottom: '0.75rem',
            }}>
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', margin: 0 }}>
                🔇 Notif diblokir nih. Buka settings browser → Izin → Notifikasi → izinin situs ini, terus refresh ya!
              </p>
            </div>
          )}

          {/* Notifications List */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonNotification key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card style={{ padding: '3rem', textAlign: 'center' }}>
              <Inbox size={48} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3, margin: '0 auto 1rem' }} />
              <p style={{ fontSize: 'var(--font-md)', color: 'rgb(var(--text-muted))', margin: 0 }}>
                Belum ada notif nih
              </p>
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.25rem' }}>
                {activeCategory !== 'all'
                  ? 'Coba pilih kategori lain atau hapus filter'
                  : 'Notifikasi baru akan muncul di sini'}
              </p>
            </Card>
          ) : (
            <InfiniteScroll
              onLoadMore={handleLoadMore}
              loading={loadingMore}
              hasMore={hasMore}
              endMessage="Semua notifikasi sudah dimuat"
            >
              {groupOrder.map((groupKey) => {
                const items = grouped[groupKey];
                if (items.length === 0) return null;

                return (
                  <div key={groupKey} style={{ marginBottom: '1.5rem' }}>
                    {/* Group Header */}
                    <h3 style={{
                      fontSize: 'var(--font-sm)',
                      fontWeight: 600,
                      color: 'rgb(var(--text-muted))',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: '0 0 0.5rem',
                      padding: '0 0.25rem',
                    }}>
                      {TIME_GROUP_LABELS[groupKey]}
                    </h3>

                    {/* Notification Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {items.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleNotificationClick(notif); }}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: notif.isRead ? 'transparent' : 'rgba(var(--color-primary) / 0.04)',
                            cursor: notif.actionUrl ? 'pointer' : 'default',
                            transition: 'background 0.15s ease',
                            border: '1px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(var(--color-primary) / 0.06)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = notif.isRead ? 'transparent' : 'rgba(var(--color-primary) / 0.04)';
                          }}
                        >
                          {/* Category Icon */}
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-sm)',
                            background: `rgba(${getCategoryColor(notif.category)} / 0.1)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: `rgb(${getCategoryColor(notif.category)})`,
                            flexShrink: 0,
                          }}>
                            {getCategoryIcon(notif.category)}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <span style={{
                                fontSize: 'var(--font-sm)',
                                fontWeight: notif.isRead ? 400 : 600,
                                color: 'rgb(var(--text-primary))',
                                display: 'block',
                              }}>
                                {notif.title}
                              </span>
                              {!notif.isRead && (
                                <button
                                  onClick={(e) => handleMarkAsRead(e, notif)}
                                  title="Tandai dibaca"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.2rem',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'rgb(var(--text-muted))',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.color = 'rgb(var(--color-primary))';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.color = 'rgb(var(--text-muted))';
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                            <p style={{
                              fontSize: 'var(--font-xs)',
                              color: 'rgb(var(--text-muted))',
                              margin: '0.15rem 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {notif.message}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))' }}>
                                {formatTime(notif.createdAt)}
                              </span>
                              {notif.category && (
                                <span style={{
                                  fontSize: '0.6rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: `rgba(${getCategoryColor(notif.category)} / 0.1)`,
                                  color: `rgb(${getCategoryColor(notif.category)})`,
                                  fontWeight: 500,
                                }}>
                                  {notif.category}
                                </span>
                              )}
                              {!notif.isRead && (
                                <div style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: 'rgb(var(--color-primary))',
                                }} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </InfiniteScroll>
          )}
        </PullToRefresh>
      </div>
      </div>
      </div>
    </AuthGuard>
  );
}
