'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Alert, useToast, useConfirm, DataTable, Card } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useCache } from '@/lib/cache';
import { School, Trash2 } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  description?: string;
  code?: string;
  createdAt: string;
  _count: { members: number; sessions: number; forumPosts: number; tasks: number };
  members: { user: { fullName: string; email: string } }[];
}

export default function SuperadminClassesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const classesFetcher = useCallback(async () => {
    const result = await superadminService.getAllClasses();
    return result.data || [];
  }, []);
  const { data: classes = [], loading, error: cacheError, revalidate: reloadClasses } = useCache<ClassItem[]>('superadmin:classes', classesFetcher);
  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat data kelas.') : null;

  const handleDelete = async (cls: ClassItem) => {
    const ok = await confirm({ title: 'Hapus Kelas', message: `Hapus kelas "${cls.name}" beserta semua datanya? Tindakan ini tidak dapat dibatalkan.`, confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await superadminService.deleteClass(cls.id);
      showToast('Kelas berhasil dihapus.', 'success');
      reloadClasses();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus kelas.', 'error');
    }
  };

  const columns: Column<ClassItem>[] = [
    {
      key: 'name',
      label: 'Nama Kelas',
      render: (row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{row.name}</span>
            {row.code && (
              <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(var(--color-primary) / 0.12)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
                {row.code}
              </span>
            )}
          </div>
          {row.description && <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: '0.1rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</div>}
        </div>
      ),
      exportValue: (row) => row.name,
    },
    {
      key: 'owner',
      label: 'Pemilik',
      render: (row) => row.members[0]?.user.fullName || '-',
      exportValue: (row) => row.members[0]?.user.fullName || '-',
    },
    {
      key: 'members',
      label: 'Anggota',
      render: (row) => row._count.members,
      exportValue: (row) => row._count.members,
    },
    {
      key: 'sessions',
      label: 'Pertemuan',
      render: (row) => row._count.sessions,
      exportValue: (row) => row._count.sessions,
    },
    {
      key: 'forumPosts',
      label: 'Post',
      render: (row) => row._count.forumPosts,
      exportValue: (row) => row._count.forumPosts,
    },
    {
      key: 'tasks',
      label: 'Tugas',
      render: (row) => row._count.tasks,
      exportValue: (row) => row._count.tasks,
    },
    {
      key: 'createdAt',
      label: 'Dibuat',
      render: (row) => new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      exportValue: (row) => new Date(row.createdAt).toISOString().split('T')[0],
    },
  ];

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Manajemen Kelas" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

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
                  <School size={24} style={{ color: 'rgb(var(--color-secondary))' }} />
                  Semua Kelas ({classes.length})
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Kelola semua kelas yang terdaftar di platform.
                </p>
              </div>

              {error && <Alert type="error" message={error} />}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{classes.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Kelas</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{classes.reduce((s, c) => s + c._count.members, 0)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Anggota</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-secondary))' }}>{classes.reduce((s, c) => s + c._count.sessions, 0)}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Pertemuan</span>
                </Card>
              </div>

              <DataTable<ClassItem>
                columns={columns}
                data={classes}
                rowKey="id"
                searchPlaceholder="Cari kelas atau pemilik..."
                searchKeys={['name', 'code' as keyof ClassItem]}
                exportFilename="classes-synapse"
                emptyMessage="Belum ada kelas terdaftar."
                actions={(row) => (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} style={{ color: 'rgb(248, 113, 113)' }}>
                    <Trash2 size={14} />
                  </Button>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
