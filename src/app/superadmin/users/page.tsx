'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Alert, Modal, useToast, useConfirm, DataTable, Card, SelectOption, TextInput, PasswordInput } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useCache, clearCache } from '@/lib/cache';
import { Users, Shield, Trash2, UserPlus } from 'lucide-react';

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
  price: number;
}

export default function SuperadminUsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const usersFetcher = useCallback(async () => {
    const [usersData, configsData] = await Promise.all([
      superadminService.getUsers(),
      superadminService.getPlanConfigs(),
    ]);
    return { users: usersData.data ?? [], configs: configsData };
  }, []);
  const { data: usersData, loading, error: cacheError, revalidate: loadData } = useCache<{ users: UserListItem[]; configs: PricingPlan[] }>('superadmin:users', usersFetcher);
  const usersList = usersData?.users ?? [];
  const configs = usersData?.configs ?? [];
  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat data pengguna.') : null;

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [assignPlanName, setAssignPlanName] = useState<string>('');
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<string>('USER');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      clearCache('superadmin:users');
      await loadData();
      setShowAssignModal(false);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Gagal meng-assign paket.');
    } finally {
      setIsAssigningPlan(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      await superadminService.createUser({
        email: createEmail,
        fullName: createFullName,
        password: createPassword,
        role: createRole as 'USER' | 'SUPERADMIN',
      });
      showToast(`User ${createEmail} berhasil dibuat!`, 'success');
      await loadData();
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setCreateRole('USER');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat user.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (usr: UserListItem) => {
    if (usr.role === 'SUPERADMIN') {
      showToast('Tidak bisa menghapus akun SUPERADMIN.', 'error');
      return;
    }
    const ok = await confirm({
      title: 'Hapus Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${usr.fullName}" (${usr.email})? Semua data terkait akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Hapus',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await superadminService.deleteUser(usr.id);
      showToast(`User ${usr.email} berhasil dihapus.`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus user.', 'error');
    }
  };

  const columns: Column<UserListItem>[] = [
    {
      key: 'fullName',
      label: 'Nama & Email',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{row.fullName}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))', marginTop: '0.1rem' }}>{row.email}</div>
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
      render: (row) => {
        const planConfig = configs.find(c => c.name === row.plan);
        const isPaid = planConfig ? planConfig.price > 0 : false;
        return (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '6px',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isPaid ? 'rgba(var(--color-primary) / 0.15)' : 'rgba(var(--text-muted) / 0.1)',
          color: isPaid ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
        }}>
          {row.plan}
        </span>
        );
      },
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
          color: row.role === 'SUPERADMIN' ? 'rgb(248, 113, 113)' : 'rgb(var(--text-muted))',
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
                  <Users size={24} style={{ color: 'rgb(var(--color-primary))' }} />
                  Akun Pengguna Terdaftar
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Kelola semua akun pengguna, lihat detail aktivitas, dan assign paket berlangganan.
                </p>
              </div>

              {error && <Alert type="error" message={error} />}

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{usersList.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Pengguna</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-secondary))' }}>{usersList.filter((u) => { const pc = configs.find(c => c.name === u.plan); return pc && pc.price > 0; }).length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Pengguna Berbayar</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-secondary))' }}>{usersList.filter((u) => { const pc = configs.find(c => c.name === u.plan); return !pc || pc.price === 0; }).length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Pengguna Gratis</span>
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
                headerActions={
                  <Button size="sm" onClick={() => { setCreateError(null); setShowCreateModal(true); }}>
                    <UserPlus size={16} style={{ marginRight: '0.4rem' }} />
                    Tambah User
                  </Button>
                }
                actions={(row) => (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Button size="sm" variant="secondary" onClick={() => handleOpenAssignModal(row)}>
                      Ubah Paket
                    </Button>
                    {row.role !== 'SUPERADMIN' && (
                      <Button size="sm" variant="danger" onClick={() => handleDeleteUser(row)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
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
              <SelectOption label="Pilih Paket" value={assignPlanName} onChange={v => setAssignPlanName(v)} options={configs.map((c) => ({ value: c.name, label: c.name }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setShowAssignModal(false)}>Batal</Button>
              <Button type="submit" isLoading={isAssigningPlan}>Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Create User Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tambah User Baru">
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {createError && <Alert type="error" message={createError} />}
            <TextInput label="Nama Lengkap" value={createFullName} onChange={setCreateFullName} required />
            <TextInput label="Email" value={createEmail} onChange={setCreateEmail} required />
            <PasswordInput label="Password" value={createPassword} onChange={setCreatePassword} required />
            <SelectOption
              label="Role"
              value={createRole}
              onChange={setCreateRole}
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'SUPERADMIN', label: 'SUPERADMIN' },
              ]}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Batal</Button>
              <Button type="submit" isLoading={isCreating}>Buat User</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
