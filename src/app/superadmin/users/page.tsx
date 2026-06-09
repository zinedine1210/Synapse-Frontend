'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Alert, Modal, useToast, DataTable, Card } from '@/components/ui';
import type { Column } from '@/components/ui';
import { Users, Shield, Loader2 } from 'lucide-react';

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'SUPERADMIN';
  plan: string;
  uploadCount: number;
  createdAt: string;
  _count: { classes: number; payments: number };
}

interface PricingPlan {
  id: string;
  name: string;
}

export default function SuperadminUsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [configs, setConfigs] = useState<PricingPlan[]>([]);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [assignPlanName, setAssignPlanName] = useState<string>('FREE');
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, configsData] = await Promise.all([
        superadminService.getUsers(),
        superadminService.getPlanConfigs(),
      ]);
      setUsersList(usersData);
      setConfigs(configsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAssignModal = (usr: UserListItem) => {
    setSelectedUser(usr);
    setAssignPlanName(usr.plan);
    setAssignError(null);
    setShowAssignModal(true);
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsAssigningPlan(true);
    setAssignError(null);
    try {
      await superadminService.assignUserPlan(selectedUser.id, assignPlanName);
      showToast(`Berhasil mengubah paket ${selectedUser.fullName} menjadi ${assignPlanName}!`, 'success');
      await loadData();
      setShowAssignModal(false);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Gagal meng-assign paket.');
    } finally {
      setIsAssigningPlan(false);
    }
  };

  const columns: Column<UserListItem>[] = [
    {
      key: 'fullName',
      label: 'Nama & Email',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'white' }}>{row.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(160,160,200,0.6)', marginTop: '0.1rem' }}>{row.email}</div>
        </div>
      ),
      exportValue: (row) => `${row.fullName} (${row.email})`,
    },
    {
      key: 'createdAt',
      label: 'Tanggal Gabung',
      render: (row) => new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      exportValue: (row) => new Date(row.createdAt).toISOString().split('T')[0],
    },
    {
      key: 'classes',
      label: 'Kelas',
      render: (row) => row._count.classes,
      exportValue: (row) => row._count.classes,
    },
    {
      key: 'uploadCount',
      label: 'Upload',
    },
    {
      key: 'plan',
      label: 'Paket',
      render: (row) => (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: row.plan === 'FREE' ? 'rgba(160,160,200,0.1)' : 'rgba(0, 212, 255, 0.15)',
          color: row.plan === 'FREE' ? 'rgba(160,160,200,0.8)' : 'rgb(0, 212, 255)',
        }}>
          {row.plan}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: row.role === 'SUPERADMIN' ? 'rgb(248, 113, 113)' : 'rgba(160,160,200,0.7)',
        }}>
          {row.role === 'SUPERADMIN' && <Shield size={12} />}
          {row.role}
        </span>
      ),
    },
  ];

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Manajemen Pengguna" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div style={{ minHeight: 'calc(100vh - var(--appbar-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={48} style={{ color: 'rgb(0, 212, 255)' }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Users size={24} style={{ color: 'rgb(0, 212, 255)' }} />
                  Akun Pengguna Terdaftar
                </h2>
                <p style={{ color: 'rgba(160, 160, 200, 0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Kelola semua akun pengguna, lihat detail aktivitas, dan assign paket berlangganan.
                </p>
              </div>

              {error && <Alert type="error" message={error} />}

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{usersList.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(160,160,200,0.6)' }}>Total Pengguna</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(0, 245, 160)' }}>{usersList.filter((u) => u.plan === 'PRO').length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(160,160,200,0.6)' }}>Pengguna PRO</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(160,160,200,0.8)' }}>{usersList.filter((u) => u.plan !== 'PRO').length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(160,160,200,0.6)' }}>Pengguna FREE</span>
                </Card>
              </div>

              <DataTable<UserListItem>
                columns={columns}
                data={usersList}
                rowKey="id"
                searchPlaceholder="Cari nama atau email pengguna..."
                searchKeys={['fullName', 'email', 'plan']}
                exportFilename="users-synapse"
                emptyMessage="Belum ada pengguna terdaftar."
                actions={(row) => (
                  <Button size="sm" variant="secondary" onClick={() => handleOpenAssignModal(row)}>
                    Ubah Paket
                  </Button>
                )}
              />
            </div>
          )}
        </div>

        {/* Assign Plan Modal */}
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Paket – ${selectedUser?.fullName}`}>
          <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignError && <Alert type="error" message={assignError} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(160,160,200,0.8)' }}>Pilih Paket</label>
              <select
                value={assignPlanName}
                onChange={(e) => setAssignPlanName(e.target.value)}
                className="themed-input"
                style={{ width: '100%' }}
              >
                {configs.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>Batal</Button>
              <Button type="submit" isLoading={isAssigningPlan}>Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
