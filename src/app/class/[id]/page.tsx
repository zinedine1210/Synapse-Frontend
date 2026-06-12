'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useClassDetail } from '@/viewmodels/useClassDetail';
import { classService } from '@/services/classService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button, Modal, useToast, useConfirm, PasswordInput, TextInput, SelectOption, TextArea } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { ForumTab } from '@/components/ForumTab';
import { PertemuanTab } from '@/components/PertemuanTab';
import { KolektifTab } from '@/components/KolektifTab';
import { TugasTab } from '@/components/TugasTab';
import { KelompokTab } from '@/components/KelompokTab';
import {
  Loader2,
  Share2,
  Pencil,
  MessagesSquare,
  BookOpen,
  Info,
  ClipboardList,
  Wallet,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
  Target,
  X,
  Trash2,
  Shield,
  Plus,
  Check,
} from 'lucide-react';
import { PrediksiUjianTab } from '@/components/PrediksiUjianTab';

function PendingMembersSection({ classId, showToast }: { classId: string; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    classService.getPendingMembers(classId).then(setPending).catch(() => {}).finally(() => setLoading(false));
  }, [classId]);
  const handleApprove = async (userId: string) => {
    try { await classService.approveMember(classId, userId); setPending(p => p.filter(m => m.userId !== userId)); showToast('Anggota disetujui.', 'success'); } catch { showToast('Gagal menyetujui.', 'error'); }
  };
  const handleReject = async (userId: string) => {
    try { await classService.rejectMember(classId, userId); setPending(p => p.filter(m => m.userId !== userId)); showToast('Permintaan ditolak.', 'success'); } catch { showToast('Gagal menolak.', 'error'); }
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

interface ClassDetailPageProps {
  params: { id: string };
}

export default function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    classData,
    setClassData,
    sessions,
    selectedSession,
    setSelectedSession,
    isLoading,
    error,
    isUploading,
    uploadedMaterials,
    uploadMaterial,
    quizzes,
    sessionDetailsLoading,
    refetchSessionDetails,
    createSession,
    updateSession,
    deleteSession,
    reorderSession,
  } = useClassDetail(params.id);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL-based feature tab
  const validFeatures = ['forum', 'pertemuan', 'tugas', 'kolektif', 'kelompok', 'prediksi', 'info'] as const;
  type FeatureType = typeof validFeatures[number];
  const urlTab = searchParams.get('tab') as FeatureType | null;
  const activeFeature: FeatureType = urlTab && validFeatures.includes(urlTab) ? urlTab : 'forum';

  const setActiveFeature = useCallback((feat: FeatureType) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', feat);
    if (feat !== 'pertemuan') {
      p.delete('session');
      p.delete('subtab');
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // URL-based session selection for pertemuan tab
  const urlSessionId = searchParams.get('session');
  useEffect(() => {
    if (activeFeature === 'pertemuan' && sessions.length > 0 && urlSessionId) {
      const sess = sessions.find(s => s.id === urlSessionId);
      if (sess && selectedSession?.id !== sess.id) {
        setSelectedSession(sess);
      }
    }
  }, [activeFeature, urlSessionId, sessions]);

  const handleSetSelectedSession = useCallback((sess: any) => {
    setSelectedSession(sess);
    if (sess) {
      const p = new URLSearchParams(searchParams.toString());
      p.set('session', sess.id);
      router.replace(`?${p.toString()}`, { scroll: false });
    }
  }, [router, searchParams, setSelectedSession]);

  // URL-based sub-tab for pertemuan
  const urlSubTab = searchParams.get('subtab');
  const urlTaskId = searchParams.get('taskId');
  const urlGroupId = searchParams.get('groupId');
  const handleSetSubTab = useCallback((sub: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('subtab', sub);
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Edit class modal
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editLecturer, setEditLecturer] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSavingClassInfo, setIsSavingClassInfo] = useState(false);
  const [editClassName, setEditClassName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Class info expanded
  const [showClassInfo, setShowClassInfo] = useState(false);

  // Share class modal
  const [showShareModal, setShowShareModal] = useState(false);

  const handleShareClass = () => {
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    if (!classData) return;
    const joinUrl = `${window.location.origin}/class/join/${classData.id}`;
    navigator.clipboard.writeText(joinUrl);
    showToast('Tautan bergabung berhasil disalin!', 'success');
  };

  const copyClassCode = () => {
    if (!classData) return;
    const code = classData.code || classData.id.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(code);
    showToast('Kode kelas berhasil disalin!', 'success');
  };

  const handleOpenEditClassModal = () => {
    if (!classData) return;
    setEditClassName(classData.name || '');
    setEditDescription(classData.description || '');
    setEditLecturer(classData.lecturer || '');
    setEditDay(classData.day || '');
    setEditTime(classData.time || '');
    setEditRoom(classData.room || '');
    setEditPassword(classData.password || '');
    setShowEditClassModal(true);
  };

  const handleSaveClassInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;
    setIsSavingClassInfo(true);
    try {
      const updated = await classService.updateClass(classData.id, {
        name: editClassName || undefined,
        description: editDescription || undefined,
        lecturer: editLecturer || undefined,
        day: editDay || undefined,
        time: editTime || undefined,
        room: editRoom || undefined,
        password: editPassword || undefined,
      });
      if (updated) window.location.reload();
      showToast('Info kelas berhasil diperbarui!', 'success');
      setShowEditClassModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan info kelas.', 'error');
    } finally { setIsSavingClassInfo(false); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !classData) return;
    setIsAddingMember(true);
    try {
      const res = await classService.addMember(classData.id, inviteEmail.trim());
      showToast(res.message || 'Anggota berhasil ditambahkan!', 'success');
      setInviteEmail('');
      const members = await classService.getClassMembers(classData.id);
      setClassMembers(members);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menambahkan anggota.', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleKickMember = async (userId: string, fullName: string) => {
    const ok = await confirm({
      title: 'Keluarkan Anggota',
      message: `Keluarkan ${fullName} dari kelas ini?`,
      confirmText: 'Keluarkan',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await classService.kickMember(classData!.id, userId);
      showToast(res.message || 'Anggota dikeluarkan.', 'success');
      const members = await classService.getClassMembers(classData!.id);
      setClassMembers(members);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengeluarkan anggota.', 'error');
    }
  };

  const hasQuizFeature = hasFeature('quiz');

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
        showToast('Role berhasil diperbarui!', 'success');
      } else {
        await classService.createClassRole(classData.id, roleName.trim(), rolePermissions);
        showToast('Role berhasil dibuat!', 'success');
      }
      setShowRoleModal(false);
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan role.', 'error');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!classData) return;
    const ok = await confirm({ title: 'Hapus Role', message: 'Role akan dihapus dan anggota yang memiliki role ini akan kehilangan rolenya.', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await classService.deleteClassRole(classData.id, roleId);
      showToast('Role berhasil dihapus.', 'success');
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus role.', 'error');
    }
  };

  const handleAssignRole = async (targetUserId: string, classRoleId: string | null) => {
    if (!classData) return;
    try {
      await classService.assignClassRole(classData.id, targetUserId, classRoleId);
      showToast('Jabatan berhasil diubah.', 'success');
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah jabatan.', 'error');
    }
  };

  // Class members for info panel
  const [classMembers, setClassMembers] = useState<{ id: string; userId: string; role: string; classRoleId?: string; classRole?: { id: string; name: string; permissions: string[]; isDefault: boolean }; user: { id: string; fullName: string; email: string; avatarUrl?: string } }[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);

  // Role management state
  const [classRoles, setClassRoles] = useState<{ id: string; name: string; permissions: string[]; isDefault: boolean; _count: { members: number } }[]>([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  // Fetch tasks for forum tagging
  const [classTasks, setClassTasks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (classData?.id) {
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
      import('@/services/taskService').then(({ taskService }) => {
        taskService.getClassTasks(classData.id).then((t) => setClassTasks((t || []).map((x: any) => ({ id: x.id, title: x.title })))).catch(() => {});
      });
    }
  }, [classData?.id]);

  const FEATURES = [
    { id: 'forum' as const, label: 'Forum', icon: MessagesSquare, featureKey: 'forum' },
    { id: 'pertemuan' as const, label: 'Pertemuan', icon: BookOpen, featureKey: 'class_sessions' },
    { id: 'tugas' as const, label: 'Tugas', icon: ClipboardList, featureKey: 'task' },
    { id: 'kolektif' as const, label: 'Kas', icon: Wallet, featureKey: 'kolektif' },
    { id: 'kelompok' as const, label: 'Kelompok', icon: Users, featureKey: 'group' },
    { id: 'prediksi' as const, label: 'Prediksi Ujian', icon: Target, featureKey: 'exam_prediction' },
    { id: 'info' as const, label: 'Info Kelas', icon: Info, featureKey: null },
  ];

  // Info tab is always available
  const availableFeatures = FEATURES.filter(f => !f.featureKey || hasFeature(f.featureKey));

  return (
    <AuthGuard requiredFeature="class">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ paddingTop: 0, overflowX: 'hidden' }}>

          {isLoading ? (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="class-page-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: '100vw', overflowX: 'hidden' }}>
              {/* Class header bar */}
              <div className="class-header-bar" style={{
                padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                background: 'rgb(var(--bg-surface))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                  <button onClick={() => router.push('/classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.2rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title="Kembali ke Daftar Kelas">
                    <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                  </button>
                  <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgb(var(--text-primary))', margin: 0 }}>
                    {classData?.name}
                  </h2>
                  {/* Class info toggle */}
                  <button onClick={() => setShowClassInfo((p) => !p)} title="Info kelas" style={{
                    background: showClassInfo ? 'rgba(var(--color-primary) / 0.08)' : 'none', border: 'none', cursor: 'pointer',
                    color: showClassInfo ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', padding: '0.2rem', borderRadius: '4px',
                  }}>
                    <Info size={15} />
                  </button>
                </div>
                <div className="class-header-actions" style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" leftIcon={<Share2 size={13} />} onClick={handleShareClass}><span>Bagikan</span></Button>
                  {(classData?.memberRole === 'OWNER' || classData?.memberRole === 'ADMIN') && hasFeature('class_settings') && (
                    <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={handleOpenEditClassModal}><span>Edit</span></Button>
                  )}
                </div>
              </div>

              {/* Class info dropdown */}
              {showClassInfo && (
                <div className="class-info-bar" style={{
                  padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border-default)',
                  fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))',
                  background: 'rgba(var(--color-primary) / 0.02)', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {classData?.lecturer && <span>👨‍🏫 <strong style={{ color: 'rgb(var(--text-primary))' }}>{classData.lecturer}</strong></span>}
                    {classData?.day && classData?.time && <span>📅 {classData.day}, {classData.time}</span>}
                    {classData?.room && <span>🏫 {classData.room}</span>}
                    {classData?.description && <span style={{ width: '100%', opacity: 0.7 }}>{classData.description}</span>}
                    {!classData?.lecturer && !classData?.day && !classData?.room && (
                      <span style={{ opacity: 0.5 }}>Belum ada info kelas. {classData?.memberRole === 'OWNER' && 'Klik Edit untuk menambahkan.'}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Feature tabs */}
              <div className="class-feature-tabs" style={{
                display: 'flex', gap: '0', borderBottom: '1px solid var(--border-default)', flexShrink: 0,
                background: 'rgb(var(--bg-surface))', paddingLeft: '0.75rem',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {availableFeatures.map((feat) => {
                  const isActive = activeFeature === feat.id;
                  const Icon = feat.icon;
                  return (
                    <button key={feat.id} onClick={() => setActiveFeature(feat.id)} style={{
                      padding: '0.55rem 1rem', background: 'none', border: 'none',
                      borderBottom: isActive ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                      color: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                      cursor: 'pointer', fontWeight: isActive ? 600 : 400, fontSize: 'var(--font-sm)',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      transition: 'var(--transition-fast)', whiteSpace: 'nowrap',
                    }}>
                      <Icon size={14} /> {feat.label}
                    </button>
                  );
                })}
              </div>

              {/* Feature content */}
              <div className="class-feature-content" style={{ flex: 1, minHeight: 0, overflow: activeFeature === 'forum' ? 'hidden' : 'auto', overflowX: 'hidden' }}>
                {activeFeature === 'forum' && classData && user && (
                  <ForumTab classId={classData.id} userId={user.id} memberRole={classData.memberRole} permissions={classData.permissions} sessions={sessions} tasks={classTasks} onNavigate={(tab, params) => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('tab', tab);
                    if (params) {
                      Object.entries(params).forEach(([k, v]) => p.set(k, v));
                    }
                    router.replace(`?${p.toString()}`, { scroll: false });
                  }} />
                )}

                {activeFeature === 'pertemuan' && (
                  <div style={{ padding: '0.75rem' }}>
                    <PertemuanTab
                      classData={classData}
                      sessions={sessions}
                      selectedSession={selectedSession}
                      setSelectedSession={handleSetSelectedSession}
                      uploadedMaterials={uploadedMaterials}
                      isUploading={isUploading}
                      uploadMaterial={uploadMaterial}
                      quizzes={quizzes}
                      sessionDetailsLoading={sessionDetailsLoading}
                      refetchSessionDetails={refetchSessionDetails}
                      hasQuizFeature={hasQuizFeature}
                      createSession={createSession}
                      updateSession={updateSession}
                      deleteSession={deleteSession}
                      reorderSession={reorderSession}
                      urlSubTab={urlSubTab || undefined}
                      onSubTabChange={handleSetSubTab}
                    />
                  </div>
                )}

                {activeFeature === 'tugas' && classData && (
                  <div style={{ padding: '0.75rem' }}>
                    <TugasTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} urlTaskId={urlTaskId || undefined} onTaskSelect={(taskId) => {
                      const p = new URLSearchParams(searchParams.toString());
                      if (taskId) p.set('taskId', taskId); else p.delete('taskId');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }} />
                  </div>
                )}

                {activeFeature === 'kolektif' && classData && (
                  <div style={{ padding: '0.75rem' }}>
                    <KolektifTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} />
                  </div>
                )}

                {activeFeature === 'kelompok' && classData && user && (
                  <div style={{ padding: '0.75rem' }}>
                    <KelompokTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} userId={user.id} classMembers={classMembers} urlGroupId={urlGroupId || undefined} onGroupSelect={(groupId) => {
                      const p = new URLSearchParams(searchParams.toString());
                      if (groupId) p.set('groupId', groupId); else p.delete('groupId');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }} />
                  </div>
                )}

                {activeFeature === 'prediksi' && classData && (
                  <div style={{ padding: '0.75rem' }}>
                    <PrediksiUjianTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} />
                  </div>
                )}

                {activeFeature === 'info' && classData && (
                  <div style={{ padding: '0.75rem', maxWidth: 700 }}>
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
                          <Button size="sm" leftIcon={<Pencil size={13} />} onClick={handleOpenEditClassModal}>Edit Kelas</Button>
                          <Button size="sm" variant="ghost" leftIcon={<Share2 size={13} />} onClick={handleShareClass}>Bagikan</Button>
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
                                  showToast('Pengaturan berhasil diubah.', 'success');
                                } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal mengubah pengaturan.', 'error'); }
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
                                  showToast('Pengaturan berhasil diubah.', 'success');
                                } catch (err) { showToast(err instanceof Error ? err.message : 'Gagal mengubah pengaturan.', 'error'); }
                              }}
                              style={{ accentColor: 'rgb(var(--color-primary))', width: 16, height: 16 }}
                            />
                          </label>
                        </div>

                        {/* Pending Members */}
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
                            if (a.userId === user?.id && b.userId !== user?.id) return -1;
                            if (b.userId === user?.id && a.userId !== user?.id) return 1;
                            return a.user.fullName.localeCompare(b.user.fullName);
                          })
                          .map((m) => {
                            const isMe = m.userId === user?.id;
                            return (
                              <div key={m.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                background: isMe ? 'rgba(var(--color-primary) / 0.06)' : 'transparent',
                                border: isMe ? '1px solid rgba(var(--color-primary) / 0.15)' : '1px solid transparent',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                  {m.user.avatarUrl ? (
                                    <img src={m.user.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                  ) : (
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, color: isMe ? '#fff' : 'rgb(var(--color-primary))' }}>{m.user.fullName.charAt(0)}</div>
                                  )}
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit class modal */}
      <Modal isOpen={showEditClassModal} onClose={() => setShowEditClassModal(false)} title="Edit Info Kelas">
        <form onSubmit={handleSaveClassInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput label="Nama Kelas" value={editClassName} onChange={v => setEditClassName(v)} placeholder="Contoh: Algoritma & Pemrograman" />
          <TextArea label="Deskripsi" value={editDescription} onChange={setEditDescription} placeholder="Deskripsi kelas (opsional)..." rows={2} />
          <TextInput label="Nama Dosen" value={editLecturer} onChange={v => setEditLecturer(v)} placeholder="Dr. Ahmad, M.Kom" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <SelectOption label="Hari" value={editDay} onChange={v => setEditDay(v)} options={[
              { value: '', label: 'Pilih Hari' },
              ...['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => ({ value: d, label: d })),
            ]} />
            <TextInput label="Jam" value={editTime} onChange={v => setEditTime(v)} placeholder="08:00 - 10:30" />
          </div>
          <TextInput label="Ruang Kelas" value={editRoom} onChange={v => setEditRoom(v)} placeholder="Lab Komputer 3 / A-305" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Password Kelas (Opsional)</label>
            <PasswordInput
              value={editPassword}
              onChange={setEditPassword}
              placeholder="Kosongkan jika ingin kelas bersifat publik"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowEditClassModal(false)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isSavingClassInfo}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Share class modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Bagikan Kelas" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Kode Kelas</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1, padding: '0.6rem 0.85rem', background: 'var(--input-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: 'var(--font-lg)', fontWeight: 700, letterSpacing: '0.15em', color: 'rgb(var(--color-primary))', textAlign: 'center' }}>
                {classData?.code || classData?.id.slice(0, 8).toUpperCase()}
              </div>
              <Button size="sm" variant="ghost" onClick={copyClassCode}>Salin</Button>
            </div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>Bagikan kode ini ke teman Anda untuk bergabung ke kelas.</p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
            <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Link Bergabung</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem' }}>
              <TextInput value={classData ? `${window.location.origin}/class/join/${classData.id}` : ''} onChange={() => {}} disabled placeholder="" />
              <Button size="sm" variant="ghost" onClick={copyShareLink}>Salin</Button>
            </div>
          </div>
        </div>
      </Modal>

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
    </AuthGuard>
  );
}
