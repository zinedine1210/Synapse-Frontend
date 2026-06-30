'use client';

import React, { useState } from 'react';
import { classService } from '@/services/classService';
import { Button, Modal, useToast, PasswordInput, TextInput, SelectOption, TextArea } from '@/components/ui';

interface ClassEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any;
}

export function ClassEditModal({ isOpen, onClose, classData }: ClassEditModalProps) {
  const { showToast } = useToast();
  const [editClassName, setEditClassName] = useState(classData?.name || '');
  const [editDescription, setEditDescription] = useState(classData?.description || '');
  const [editLecturer, setEditLecturer] = useState(classData?.lecturer || '');
  const [editDay, setEditDay] = useState(classData?.day || '');
  const [editTime, setEditTime] = useState(classData?.time || '');
  const [editRoom, setEditRoom] = useState(classData?.room || '');
  const [editPassword, setEditPassword] = useState(classData?.password || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when classData or open changes
  React.useEffect(() => {
    if (isOpen && classData) {
      setEditClassName(classData.name || '');
      setEditDescription(classData.description || '');
      setEditLecturer(classData.lecturer || '');
      setEditDay(classData.day || '');
      setEditTime(classData.time || '');
      setEditRoom(classData.room || '');
      setEditPassword(classData.password || '');
    }
  }, [isOpen, classData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classData) return;
    setIsSaving(true);
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
      showToast('Info kelas udah di-update! ✨', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal save info kelas.', 'error');
    } finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Info Kelas">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Batal</Button>
          <Button type="submit" size="sm" isLoading={isSaving}>Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

interface ClassShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any;
}

export function ClassShareModal({ isOpen, onClose, classData }: ClassShareModalProps) {
  const { showToast } = useToast();

  const copyShareLink = () => {
    if (!classData) return;
    const joinUrl = `${window.location.origin}/class/join/${classData.id}`;
    navigator.clipboard.writeText(joinUrl);
    showToast('Link join udah di-copy! 📎', 'success');
  };

  const copyClassCode = () => {
    if (!classData) return;
    const code = classData.code || classData.id.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(code);
    showToast('Kode kelas udah di-copy! 📎', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bagikan Kelas" size="sm">
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
  );
}
