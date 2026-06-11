'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { Settings, Loader2, Bell, BookOpen, Receipt, CheckSquare, Users } from 'lucide-react';

export default function SuperadminSystemPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getSystemStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Monitor Sistem" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div style={{ minHeight: 'calc(100vh - var(--appbar-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={36} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={22} style={{ color: 'rgb(var(--text-secondary))' }} />
                  Monitor Sistem
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>Notifikasi, briefing, split bill, todo, dan kolektif.</p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><Bell size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Notifikasi</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.notifications.total.toLocaleString()}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(248,113,113)' }}>{stats.notifications.unread.toLocaleString()} belum dibaca</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><BookOpen size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Briefing Hari Ini</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.briefings.today}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.briefings.total} total</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}><Receipt size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Split Bill</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.splitBills.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{fmt(stats.splitBills.totalAmount)}</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}><CheckSquare size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Todo Selesai</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.todos.completionRate}%</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.todos.completed}/{stats.todos.total} selesai</span>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Kolektif */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Kolektif
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Total Kolektif</span>
                          <span style={{ fontWeight: 700 }}>{stats.kolektif.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Total Terkumpul</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{fmt(stats.kolektif.totalCollected)}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Notification & Read Rate */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Bell size={16} style={{ color: '#F59E0B' }} /> Statistik Notifikasi
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Total Dikirim</span>
                          <span style={{ fontWeight: 700 }}>{stats.notifications.total.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Belum Dibaca</span>
                          <span style={{ fontWeight: 700, color: 'rgb(248,113,113)' }}>{stats.notifications.unread.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Read Rate</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-success))' }}>
                            {stats.notifications.total > 0 ? Math.round(((stats.notifications.total - stats.notifications.unread) / stats.notifications.total) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
