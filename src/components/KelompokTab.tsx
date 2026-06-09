'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { groupService, TaskGroupFull } from '@/services/groupService';
import { Card, Button, Modal, useToast, useConfirm } from '@/components/ui';
import {
  Users, Plus, Trash2, Loader2, Shuffle, UserPlus, UserMinus, ChevronRight,
} from 'lucide-react';

interface KelompokTabProps {
  classId: string;
  memberRole?: string;
  permissions?: string[];
  userId: string;
  classMembers?: { id: string; userId: string; role: string; user: { id: string; fullName: string; email: string; avatarUrl?: string } }[];
  urlGroupId?: string;
  onGroupSelect?: (groupId: string | null) => void;
}

export function KelompokTab({ classId, memberRole, permissions, userId, classMembers = [], urlGroupId, onGroupSelect }: KelompokTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canManageGroup = memberRole === 'OWNER' || (permissions || []).includes('GROUP_MANAGE');
  const [groups, setGroups] = useState<TaskGroupFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroupFull | null>(null);

  // Create group
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-generate
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [autoCount, setAutoCount] = useState('4');
  const [isAutoGen, setIsAutoGen] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try { const data = await groupService.getClassGroups(classId); setGroups(data || []); }
    catch { } finally { setLoading(false); }
  }, [classId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // Open group from URL
  useEffect(() => {
    if (urlGroupId && groups.length > 0 && !selectedGroup) {
      const g = groups.find(gr => gr.id === urlGroupId);
      if (g) setSelectedGroup(g);
    }
  }, [urlGroupId, groups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    try { await groupService.createGroup(classId, newGroupName.trim()); setShowCreate(false); setNewGroupName(''); fetchGroups(); showToast('Kelompok dibuat!', 'success'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal.', 'error'); }
    finally { setIsCreating(false); }
  };

  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAutoGen(true);
    try { await groupService.autoGenerate(classId, parseInt(autoCount)); setShowAutoGen(false); fetchGroups(); showToast('Kelompok berhasil digenerate!', 'success'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal.', 'error'); }
    finally { setIsAutoGen(false); }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const ok = await confirm({ title: 'Konfirmasi', message: 'Hapus kelompok ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try { await groupService.deleteGroup(groupId); setSelectedGroup(null); onGroupSelect?.(null); fetchGroups(); showToast('Kelompok dihapus.', 'success'); }
    catch { showToast('Gagal menghapus.', 'error'); }
  };

  const handleRemoveMember = async (groupId: string, targetUserId: string) => {
    try { await groupService.removeMember(groupId, targetUserId); fetchGroups(); showToast('Anggota dihapus.', 'success'); }
    catch { showToast('Gagal menghapus anggota.', 'error'); }
  };

  const handleAddMember = async (groupId: string, targetUserId: string) => {
    try { await groupService.addMember(groupId, targetUserId); fetchGroups(); showToast('Anggota ditambahkan.', 'success'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal menambahkan anggota.', 'error'); }
  };

  // Add member search filter
  const [addMemberSearch, setAddMemberSearch] = useState('');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} /></div>;

  const activeGroup = selectedGroup ? groups.find((g) => g.id === selectedGroup.id) || null : null;

  if (activeGroup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => { setSelectedGroup(null); onGroupSelect?.(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}>← Semua Kelompok</button>
          {canManageGroup && <Button size="sm" variant="ghost" leftIcon={<Trash2 size={12} />} onClick={() => handleDeleteGroup(activeGroup.id)}>Hapus</Button>}
        </div>

        <Card style={{ padding: '0.75rem' }}>
          <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={16} style={{ color: 'rgb(var(--color-primary))' }} /> {activeGroup.name}
          </h3>
          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{activeGroup.members.length} anggota</span>
          {activeGroup.tasks.length > 0 && (
            <div style={{ marginTop: '0.4rem' }}>
              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Tugas: </span>
              {activeGroup.tasks.map((t) => (
                <span key={t.id} style={{ fontSize: 'var(--font-xs)', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(var(--color-primary) / 0.08)', color: 'rgb(var(--color-primary))', fontWeight: 500, marginRight: '0.2rem' }}>{t.title}</span>
              ))}
            </div>
          )}
        </Card>

        <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase' }}>Anggota</h4>
        {activeGroup.members.map((m) => (
          <Card key={m.id} style={{ padding: '0.5rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {m.user.avatarUrl ? (
                <img src={m.user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600, color: 'rgb(var(--color-primary))' }}>{m.user.fullName.charAt(0)}</div>
              )}
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{m.user.fullName}</span>
            </div>
            {canManageGroup && (
              <button onClick={() => handleRemoveMember(activeGroup.id, m.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))', opacity: 0.5, padding: '0.1rem' }}><UserMinus size={12} /></button>
            )}
          </Card>
        ))}
        {activeGroup.members.length === 0 && (
          <Card style={{ textAlign: 'center', padding: '1rem' }}><p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada anggota.</p></Card>
        )}

        {/* Add member section */}
        {canManageGroup && classMembers.length > 0 && (() => {
          const existingMemberIds = new Set(activeGroup.members.map((m) => m.userId));
          const availableMembers = classMembers.filter((cm) => !existingMemberIds.has(cm.userId));
          const filtered = availableMembers.filter((cm) =>
            !addMemberSearch || cm.user.fullName.toLowerCase().includes(addMemberSearch.toLowerCase()) || cm.user.email.toLowerCase().includes(addMemberSearch.toLowerCase())
          );
          if (availableMembers.length === 0) return null;
          return (
            <div style={{ marginTop: '0.3rem' }}>
              <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Tambah Anggota</h4>
              <input className="themed-input" type="text" value={addMemberSearch} onChange={(e) => setAddMemberSearch(e.target.value)} placeholder="Cari nama anggota kelas..." style={{ marginBottom: '0.3rem', width: '100%' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxHeight: 180, overflowY: 'auto' }}>
                {filtered.slice(0, 10).map((cm) => (
                  <Card key={cm.userId} style={{ padding: '0.4rem 0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {cm.user.avatarUrl ? (
                        <img src={cm.user.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 600, color: 'rgb(var(--color-primary))' }}>{cm.user.fullName.charAt(0)}</div>
                      )}
                      <div>
                        <div style={{ fontSize: 'var(--font-xs)', fontWeight: 500 }}>{cm.user.fullName}</div>
                        <div style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>{cm.user.email}</div>
                      </div>
                    </div>
                    <button onClick={() => handleAddMember(activeGroup.id, cm.userId)} style={{ background: 'rgba(var(--color-primary) / 0.08)', border: 'none', borderRadius: '3px', padding: '0.2rem 0.4rem', cursor: 'pointer', fontSize: '0.6rem', color: 'rgb(var(--color-primary))', fontWeight: 600, fontFamily: 'inherit' }}>+ Tambah</button>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // My groups highlight
  const myGroups = groups.filter((g) => g.members.some((m) => m.userId === userId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Users size={18} style={{ color: 'rgb(var(--color-primary))' }} /> Kelompok
        </h3>
        {canManageGroup && (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <Button size="sm" variant="ghost" leftIcon={<Shuffle size={12} />} onClick={() => setShowAutoGen(true)}>Acak</Button>
            <Button size="sm" leftIcon={<Plus size={12} />} onClick={() => setShowCreate(true)}>Buat</Button>
          </div>
        )}
      </div>

      {myGroups.length > 0 && (
        <Card style={{ padding: '0.5rem 0.65rem', borderLeft: '3px solid rgb(var(--color-primary))' }}>
          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--color-primary))' }}>Kelompok Saya</span>
          {myGroups.map((g) => (
            <div key={g.id} style={{ fontSize: 'var(--font-sm)', marginTop: '0.15rem' }}>{g.name} ({g.members.length} anggota)</div>
          ))}
        </Card>
      )}

      {groups.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <Users size={28} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.4rem' }}>Belum ada kelompok.</p>
        </Card>
      ) : groups.map((group) => (
        <Card key={group.id} hoverable style={{ padding: '0.6rem 0.85rem', cursor: 'pointer' }} onClick={() => { setSelectedGroup(group); onGroupSelect?.(group.id); }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 500 }}>{group.name}</h4>
              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{group.members.length} anggota • {group.tasks.length} tugas</span>
            </div>
            <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
          </div>
        </Card>
      ))}

      {/* Create group modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Buat Kelompok">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input className="themed-input" type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nama kelompok" required />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isCreating}>Buat</Button>
          </div>
        </form>
      </Modal>

      {/* Auto-generate modal */}
      <Modal isOpen={showAutoGen} onClose={() => setShowAutoGen(false)} title="Generate Kelompok Otomatis">
        <form onSubmit={handleAutoGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Acak semua anggota kelas ke dalam kelompok secara merata.</p>
          <input className="themed-input" type="number" value={autoCount} onChange={(e) => setAutoCount(e.target.value)} min="2" max="20" placeholder="Jumlah kelompok" required />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAutoGen(false)}>Batal</Button>
            <Button type="submit" size="sm" isLoading={isAutoGen} leftIcon={<Shuffle size={12} />}>Generate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
