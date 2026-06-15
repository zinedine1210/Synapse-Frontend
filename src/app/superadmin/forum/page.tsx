'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert, DataTable } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useCache } from '@/lib/cache';
import { MessageSquare, Loader2, MessagesSquare, Reply, Calendar, TrendingUp } from 'lucide-react';

interface ForumStats {
  totalPosts: number;
  totalReplies: number;
  postsToday: number;
  activeClasses: number;
}

interface StatRow {
  id: string;
  metric: string;
  value: number;
  description: string;
}

export default function SuperadminForumPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: stats, loading, error: cacheError } = useCache<ForumStats>('superadmin:forum', () => superadminService.getForumStats());
  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat statistik forum.') : null;

  const statRows: StatRow[] = stats ? [
    { id: '1', metric: 'Total Post Forum', value: stats.totalPosts, description: 'Jumlah seluruh post di semua kelas' },
    { id: '2', metric: 'Total Balasan', value: stats.totalReplies, description: 'Jumlah balasan/reply thread' },
    { id: '3', metric: 'Post Hari Ini', value: stats.postsToday, description: 'Post yang dibuat hari ini' },
    { id: '4', metric: 'Kelas Aktif', value: stats.activeClasses, description: 'Kelas yang memiliki post forum' },
  ] : [];

  const columns: Column<StatRow>[] = [
    {
      key: 'metric',
      label: 'Metrik',
      render: (row) => <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{row.metric}</span>,
    },
    {
      key: 'value',
      label: 'Nilai',
      render: (row) => <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'rgb(var(--color-primary))' }}>{row.value.toLocaleString()}</span>,
    },
    {
      key: 'description',
      label: 'Keterangan',
    },
  ];

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Monitor Forum" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: 22, width: '50%', borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 44, borderRadius: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4,5].map(n => <div key={n} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
              </div>
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <MessageSquare size={24} style={{ color: 'rgb(var(--color-primary))' }} />
                  Monitor Forum
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Statistik aktivitas forum di seluruh kelas.
                </p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                      <MessagesSquare size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{stats.totalPosts.toLocaleString()}</span>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))' }}>Total Post</div>
                      </div>
                    </Card>
                    <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                      <Reply size={20} style={{ color: 'rgb(var(--color-secondary))' }} />
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{stats.totalReplies.toLocaleString()}</span>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))' }}>Total Balasan</div>
                      </div>
                    </Card>
                    <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                      <Calendar size={20} style={{ color: 'rgb(var(--color-warning))' }} />
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{stats.postsToday}</span>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))' }}>Post Hari Ini</div>
                      </div>
                    </Card>
                    <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                      <TrendingUp size={20} style={{ color: 'rgb(168, 85, 247)' }} />
                      <div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{stats.activeClasses}</span>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))' }}>Kelas Aktif</div>
                      </div>
                    </Card>
                  </div>

                  <DataTable<StatRow>
                    columns={columns}
                    data={statRows}
                    rowKey="id"
                    searchPlaceholder="Cari metrik..."
                    searchKeys={['metric']}
                    exportFilename="forum-stats-synapse"
                    emptyMessage="Tidak ada data statistik."
                  />
                </>
              )}

              <Card style={{ border: '1px solid var(--border-default)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'rgb(var(--text-primary))', marginBottom: '0.5rem' }}>Ringkasan</h3>
                <p style={{ fontSize: '0.85rem', color: 'rgb(var(--text-muted))', lineHeight: 1.6 }}>
                  Forum adalah fitur kolaborasi utama di Synapse. Pengguna menggunakan forum untuk berdiskusi, bertanya, 
                  membuat polling, dan mengirim pengingat. Setiap kelas memiliki forum real-time dengan fitur chat, reply thread, 
                  dan tag anggota.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
