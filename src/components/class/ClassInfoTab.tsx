'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { classService } from '@/services/classService';
import { Button, Modal, useToast, useConfirm, TextInput, SelectOption, UserAvatar } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { Pencil, Share2, Trash2, Shield, Plus, Crown, Users, X } from 'lucide-react';

// Constants moved outside component to avoid re-creation on each render
const PERMISSION_SECTIONS: { section: string; permissions: { key: string; label: string }[] }[] = [
  { section: '🏫 Kelas', permissions: [
    { key: 'MANAGE_CLASS', label: 'Edit Info Kelas' },
    { key: 'MANAGE_MEMBERS', label: 'Kelola Anggota' },
    { key: 'MANAGE_ROLES', label: 'Kelola Roles' },
  ]},
  { section: '📅 Pertemuan', permissions: [
    { key: 'MANAGE_SESSIONS', label: 'Kelola Pertemuan' },
  ]},
  { section: '📄 Materi', permissions: [
    { key: 'MATERIAL_UPLOAD', label: 'Upload Materi' },
    { key: 'MATERIAL_DELETE', label: 'Hapus Materi' },
  ]},
  { section: '📝 Tugas', permissions: [
    { key: 'TASK_CREATE', label: 'Buat Tugas' },
    { key: 'TASK_EDIT', label: 'Edit/Hapus Tugas' },
  ]},
  { section: '💬 Forum', permissions: [
    { key: 'FORUM_DISCUSSION', label: 'Kelola Pembahasan' },
    { key: 'FORUM_ANNOUNCEMENT', label: 'Buat Pengumuman' },
    { key: 'FORUM_REMINDER', label: 'Buat Reminder' },
    { key: 'FORUM_POLL', label: 'Buat Polling' },
    { key: 'FORUM_PIN', label: 'Pin Post' },
    { key: 'FORUM_DELETE', label: 'Hapus Post/Reply' },
  ]},
  { section: '💰 Kas', permissions: [
    { key: 'KAS_CREATE', label: 'Buat Kas' },
    { key: 'KAS_TRANSACTION', label: 'Catat Transaksi' },
  ]},
  { section: '👥 Kelompok', permissions: [
    { key: 'GROUP_MANAGE', label: 'Kelola Kelompok' },
  ]},
  { section: '🧠 Kuis', permissions: [
    { key: 'QUIZ_MANAGE', label: 'Kelola Kuis' },
  ]},
  { section: '📊 Prediksi', permissions: [
    { key: 'PREDICTION_MANAGE', label: 'Kelola Prediksi Ujian' },
  ]},
];

const PERMISSION_LABELS: Record<string, string> = {};
PERMISSION_SECTIONS.forEach(s => s.permissions.forEach(p => { PERMISSION_LABELS[p.key] = p.label; }));
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

function PendingMembersSection({ classId, showToast }: { classId: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    classService.getPendingMembers(classId).then(setPending).catch(() => {}).finally(() => setLoading(false));
  }, [classId]);
  const handleApprove = async (userId: string) => {
    try { await classService.approveMember(classId, userId); setPending(p => p.filter(m => m.userId !== userId)); showToast('Member udah di-approve! ✅', 'success'); } catch { showToast('Gagal approve nih.', 'error'); }
  };
  const handleReject = async (userId: string) => {
    try { await classService.rejectMember(classId, userId); setPending(p => p.filter(m => m.userId !== userId)); showToast('Request ditolak.', 'success'); } catch { showToast('Gagal nolak nih.', 'error'); }
  };
  if (loading) return <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.5rem' }}>Memuat...</div>;
  if (pending.length === 0) return <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.5rem' }}>Tidak ada permintaan bergabung.</p>;
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <h5 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))', marginBottom: '0.4rem' }}>⏳ Menunggu Persetujuan ({pending.length})</h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {pending.map((m) => (
          <div key={m.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'rgba(var(--color-warning) / 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-warning) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, color: 'rgb(var(--color-warning))' }}>{m.user.fullName.charAt(0)}</div>
              <div>
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>{m.user.fullName}</span>
                <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.3rem' }}>{m.user.email}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <Button size="sm" onClick={() => handleApprove(m.userId)} style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-xs)', background: '#22c55e', color: 'white', borderRadius: 'var(--radius-sm)' }}>✓ Setujui</Button>
              <Button size="sm" variant="danger" onClick={() => handleReject(m.userId)} style={{ padding: '0.2rem 0.5rem', fontSize: 'var(--font-xs)', borderRadius: 'var(--radius-sm)' }}>✕ Tolak</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ClassInfoTabProps {
  classData: any;
  setClassData: (fn: (prev: any) => any) => void;
  classMembers: any[];
  setClassMembers: (members: any[]) => void;
  classRoles: any[];
  setClassRoles: (roles: any[]) => void;
  userId: string;
  onEditClass: () => void;
  onShareClass: () => void;
}

export function ClassInfoTab({
  classData,
  setClassData,
  classMembers,
  setClassMembers,
  classRoles,
  setClassRoles,
  userId,
  onEditClass,
  onShareClass,
}: ClassInfoTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const router = useRouter();

  // Role management
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleOpenRoleModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRolePermissions(role.permissions || []);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRolePermissions([]);
    }
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!classData || !roleName.trim()) return;
    try {
      if (editingRole) {
        await classService.updateClassRole(classData.id, editingRole.id, { name: roleName.trim(), permissions: rolePermissions });
        showToast('Role udah di-update! ✅', 'success');
      } else {
        await classService.createClassRole(classData.id, roleName.trim(), rolePermissions);
        showToast('Role baru udah dibuat! 🎉', 'success');
      }
      setShowRoleModal(false);
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal save role nih.', 'error');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!classData) return;
    const ok = await confirm({ title: 'Hapus Role', message: 'Role bakal dihapus dan member yang punya role ini bakal kehilangan role-nya. Yakin?', confirmText: 'Gas Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await classService.deleteClassRole(classData.id, roleId);
      showToast('Role udah dihapus.', 'success');
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal hapus role nih.', 'error');
    }
  };

  const handleAssignRole = async (targetUserId: string, classRoleId: string | null) => {
    if (!classData) return;
    try {
      await classService.assignClassRole(classData.id, targetUserId, classRoleId);
      showToast('Jabatan udah diganti. ✅', 'success');
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal ganti jabatan nih.', 'error');
    }
  };

  const handleKickMember = async (memberId: string, fullName: string) => {
    const ok = await confirm({
      title: 'Keluarkan Anggota',
      message: `Keluarkan ${fullName} dari kelas ini?`,
      confirmText: 'Keluarkan',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await classService.kickMember(classData.id, memberId);
      showToast(res.message || 'Member udah dikeluarin.', 'success');
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal ngeluarin member.', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !classData) return;
    setIsAddingMember(true);
    try {
      const res = await classService.addMember(classData.id, inviteEmail.trim());
      showToast(res.message || 'Member udah ditambahin! 🎉', 'success');
      setInviteEmail('');
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal nambahin member.', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  if (!classData) return null;

  return (
    <>
      <div style={{ padding: '1.25rem', maxWidth: 700 }}>
        {/* Class Info */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'rgb(var(--text-primary))', marginBottom: '0.75rem' }}>{classData.name}</h3>
          {classData.description && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '0.75rem' }}>{classData.description}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {classData.lecturer && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>👨‍🏫 <strong>{classData.lecturer}</strong></div>}
            {classData.day && classData.time && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>📅 {classData.day}, {classData.time}</div>}
            {classData.room && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>🏫 {classData.room}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>🔑 Kode: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{classData.code || classData.id.slice(0, 8).toUpperCase()}</span></div>
          </div>
          {(classData.memberRole === 'OWNER' || classData.memberRole === 'ADMIN') && hasFeature('class_settings') && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button size="sm" leftIcon={<Pencil size={13} />} onClick={onEditClass}>Edit Kelas</Button>
              <Button size="sm" variant="ghost" leftIcon={<Share2 size={13} />} onClick={onShareClass}>Bagikan</Button>
            </div>
          )}
          {classData.memberRole === 'OWNER' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 size={13} />}
                onClick={async () => {
                  const ok = await confirm({ title: 'Hapus Kelas?', message: `Kelas "${classData.name}" dan semua data di dalamnya bakal dihapus permanen. Serius nih?`, confirmText: 'Gas Hapus', cancelText: 'Gak Jadi', variant: 'danger' });
                  if (!ok) return;
                  try {
                    await classService.deleteClass(classData.id);
                    showToast('Kelas udah dihapus. Bye bye~', 'success');
                    router.push('/dashboard');
                  } catch (e: any) {
                    showToast(e.message || 'Gagal hapus kelas nih.', 'error');
                  }
                }}
                style={{ opacity: 0.7 }}
              >
                Hapus Kelas
              </Button>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.35rem' }}>Tindakan ini tidak dapat dibatalkan.</p>
            </div>
          )}
        </div>

        {/* Roles management (Owner only) */}
        {classData.memberRole === 'OWNER' && hasFeature('class_settings') && (
          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Shield size={16} /> Jabatan Kelas ({classRoles.length})
              </h4>
              <Button size="sm" variant="ghost" leftIcon={<Plus size={12} />} onClick={() => handleOpenRoleModal()}>Buat Jabatan</Button>
            </div>
            {classRoles.length === 0 ? (
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', fontStyle: 'italic' }}>Belum ada jabatan khusus.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {classRoles.map((role) => (
                  <div key={role.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: role.isDefault ? 'rgba(var(--color-primary) / 0.04)' : 'transparent' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Shield size={13} style={{ color: 'rgb(var(--color-primary))' }} />
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{role.name}</span>
                        {role.isDefault && <span style={{ fontSize: '0.55rem', padding: '0.05rem 0.25rem', borderRadius: '3px', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>Default</span>}
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>• {role._count.members} anggota</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        {role.permissions.slice(0, 4).map((p: string) => (
                          <span key={p} style={{ fontSize: '0.55rem', padding: '0.05rem 0.25rem', borderRadius: '3px', background: 'var(--input-bg)', color: 'rgb(var(--text-muted))' }}>{PERMISSION_LABELS[p] || p}</span>
                        ))}
                        {role.permissions.length > 4 && <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>+{role.permissions.length - 4}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenRoleModal(role)} style={{ padding: '0.2rem 0.4rem' }}><Pencil size={12} /></Button>
                      {!role.isDefault && <Button size="sm" variant="ghost" onClick={() => handleDeleteRole(role.id)} style={{ padding: '0.2rem 0.4rem', color: '#ef4444' }}><Trash2 size={12} /></Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Join Settings (Owner only) */}
        {classData.memberRole === 'OWNER' && hasFeature('class_settings') && (
          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'rgb(var(--text-primary))', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              ⚙️ Pengaturan Bergabung
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Mode Bergabung</span>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>
                    {classData.joinMode === 'APPROVAL' ? 'Anggota baru harus disetujui admin' : 'Siapapun bisa langsung masuk'}
                  </p>
                </div>
                <SelectOption
                  value={classData.joinMode || 'PUBLIC'}
                  onChange={async (v) => {
                    try {
                      await classService.updateClassSettings(classData.id, { joinMode: v });
                      setClassData((prev: any) => prev ? { ...prev, joinMode: v } : prev);
                      showToast('Setting udah diubah! ✅', 'success');
                    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal ubah setting nih.', 'error'); }
                  }}
                  options={[
                    { value: 'PUBLIC', label: 'Public (Langsung Masuk)' },
                    { value: 'APPROVAL', label: 'Approval (Perlu Persetujuan)' },
                  ]}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Auto Admin</span>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>Anggota baru otomatis mendapat jabatan Admin</p>
                </div>
                <input
                  type="checkbox"
                  checked={classData.autoRoleAssign || false}
                  onChange={async (e) => {
                    try {
                      await classService.updateClassSettings(classData.id, { autoRoleAssign: e.target.checked });
                      setClassData((prev: any) => prev ? { ...prev, autoRoleAssign: e.target.checked } : prev);
                      showToast('Setting udah diubah! ✅', 'success');
                    } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal ubah setting nih.', 'error'); }
                  }}
                  style={{ accentColor: 'rgb(var(--color-primary))', width: 16, height: 16 }}
                />
              </label>
            </div>
            {classData.joinMode === 'APPROVAL' && (
              <PendingMembersSection classId={classData.id} showToast={showToast} />
            )}
          </div>
        )}

        {/* Members list */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'rgb(var(--text-primary))', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={16} /> Anggota ({classMembers.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[...classMembers]
              .sort((a, b) => {
                if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
                if (b.role === 'OWNER' && a.role !== 'OWNER') return 1;
                if (a.userId === userId && b.userId !== userId) return -1;
                if (b.userId === userId && a.userId !== userId) return 1;
                return a.user.fullName.localeCompare(b.user.fullName);
              })
              .map((m) => {
                const isMe = m.userId === userId;
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isMe ? 'rgba(var(--color-primary) / 0.06)' : 'transparent',
                    border: isMe ? '1px solid rgba(var(--color-primary) / 0.15)' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <UserAvatar name={m.user.fullName} avatarUrl={m.user.avatarUrl} size={28} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: isMe ? 600 : 500, color: 'rgb(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.user.fullName}{isMe ? ' (Anda)' : ''}
                          </span>
                          {m.role === 'OWNER' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.55rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: 'rgba(var(--color-warning) / 0.1)', color: 'rgb(var(--color-warning))', fontWeight: 600 }}><Crown size={8} /> Pembuat</span>}
                          {m.role === 'ADMIN' && <span style={{ fontSize: '0.55rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>Admin</span>}
                          {m.classRole && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.55rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 600 }}><Shield size={8} /> {m.classRole.name}</span>}
                        </div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{m.user.email}</span>
                      </div>
                    </div>
                    {classData.memberRole === 'OWNER' && m.role !== 'OWNER' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                        <div style={{ maxWidth: 130 }}>
                        <SelectOption
                          value={m.classRoleId || ''}
                          onChange={(v) => handleAssignRole(m.userId, v || null)}
                          options={[
                            { value: '', label: 'Tanpa Jabatan' },
                            ...classRoles.map((r) => ({ value: r.id, label: r.name })),
                          ]}
                        />
                        </div>
                        <button onClick={() => handleKickMember(m.userId, m.user.fullName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.15rem' }} title="Keluarkan">
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          {classData.memberRole === 'OWNER' && (
            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <TextInput type="email" placeholder="Tambah anggota via email..." value={inviteEmail} onChange={v => setInviteEmail(v)} required />
              <Button type="submit" size="sm" isLoading={isAddingMember}>Tambah</Button>
            </form>
          )}
        </div>
      </div>

      {/* Role create/edit modal */}
      <Modal isOpen={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? `Edit Jabatan: ${editingRole.name}` : 'Buat Jabatan Baru'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput label="Nama Jabatan" value={roleName} onChange={v => setRoleName(v)} placeholder="Contoh: Bendahara, Sekretaris, Koordinator..." disabled={editingRole?.isDefault} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Hak Akses (Permissions)</label>
            <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PERMISSION_SECTIONS.map((section) => (
                <div key={section.section}>
                  <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-primary))', marginBottom: '0.35rem', paddingBottom: '0.2rem', borderBottom: '1px solid var(--border-subtle)' }}>{section.section}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                    {section.permissions.map(({ key: perm, label }) => {
                      const isChecked = rolePermissions.includes(perm);
                      return (
                        <label key={perm} style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.5rem',
                          borderRadius: 'var(--radius-sm)', border: `1px solid ${isChecked ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                          background: isChecked ? 'rgba(var(--color-primary) / 0.05)' : 'transparent',
                          cursor: 'pointer', transition: 'var(--transition-fast)',
                        }}>
                          <input type="checkbox" checked={isChecked} onChange={() => {
                            setRolePermissions((prev) => isChecked ? prev.filter((p) => p !== perm) : [...prev, perm]);
                          }} style={{ accentColor: 'rgb(var(--color-primary))', width: 14, height: 14 }} />
                          <span style={{ fontSize: 'var(--font-xs)', color: isChecked ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', fontWeight: isChecked ? 600 : 400 }}>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
              <button onClick={() => setRolePermissions([...ALL_PERMISSIONS])} style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Pilih Semua</button>
              <button onClick={() => setRolePermissions([])} style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Hapus Semua</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>Batal</Button>
            <Button size="sm" onClick={handleSaveRole} disabled={!roleName.trim()}>
              {editingRole ? 'Simpan Perubahan' : 'Buat Jabatan'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
