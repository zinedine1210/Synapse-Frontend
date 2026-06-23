'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast, TextArea } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { apiFetch, apiUpload } from '@/lib/api';
import { useCache } from '@/lib/cache';
import {
  Camera, Trash2, Upload, Loader2, User, ArrowLeft, ImagePlus, Save, Brain,
} from 'lucide-react';
import Link from 'next/link';

// Constants for validation
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS_LABEL = 'JPG, PNG, atau WebP';

// AI Context field limits
const AI_CONTEXT_LIMITS = {
  dailyHabits: 300,
  lifeGoals: 300,
  studySchedule: 200,
  personalNotes: 200,
} as const;

interface ProfileData {
  avatarUrl: string | null;
  dailyHabits: string | null;
  lifeGoals: string | null;
  studySchedule: string | null;
  personalNotes: string | null;
}

export default function UserProfilePage() {
  const { user, refetchProfile } = useAuth();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Context fields state
  const [dailyHabits, setDailyHabits] = useState('');
  const [lifeGoals, setLifeGoals] = useState('');
  const [studySchedule, setStudySchedule] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [savingContext, setSavingContext] = useState(false);

  // Cached profile loading
  const { data: profileData } = useCache<ProfileData>(
    user ? 'user:profile' : null,
    () => apiFetch<ProfileData>('/user/profile')
  );

  useEffect(() => {
    if (user) setAvatarUrl(user.avatarUrl || null);
  }, [user]);

  useEffect(() => {
    if (profileData) {
      setAvatarUrl(profileData.avatarUrl || null);
      setDailyHabits(profileData.dailyHabits || '');
      setLifeGoals(profileData.lifeGoals || '');
      setStudySchedule(profileData.studySchedule || '');
      setPersonalNotes(profileData.personalNotes || '');
    }
  }, [profileData]);

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'Ukuran foto maks 2MB';
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Format harus JPG, PNG, atau WebP';
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = '';

    // Client-side validation
    const error = validateFile(file);
    if (error) {
      showToast(error, 'error');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload to backend
    await uploadAvatar(file);
  };

  // Upload avatar to backend
  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiUpload<{ avatarUrl: string }>('/user/profile/avatar', formData);

      setAvatarUrl(result.avatarUrl);
      setAvatarPreview(null);
      await refetchProfile();
      showToast('Foto profil berhasil diubah.', 'success');
    } catch (err: any) {
      // Revert preview on error
      setAvatarPreview(null);
      showToast(err.message || 'Gagal upload foto profil.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      await apiFetch('/user/profile/avatar', { method: 'DELETE' });
      setAvatarUrl(null);
      setAvatarPreview(null);
      await refetchProfile();
      showToast('Foto profil berhasil dihapus.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus foto profil.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Trigger file input
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      showToast(error, 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    await uploadAvatar(file);
  };

  // The displayed image (preview takes priority over saved avatar)
  const displayedImage = avatarPreview || avatarUrl;

  // Save AI context fields
  const handleSaveAIContext = async () => {
    setSavingContext(true);
    try {
      await apiFetch('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          dailyHabits,
          lifeGoals,
          studySchedule,
          personalNotes,
        }),
      });
      showToast('Konteks AI berhasil disimpan.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan konteks AI.', 'error');
    } finally {
      setSavingContext(false);
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Profil" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header with back link */}
            <div style={{ marginBottom: '1.5rem' }}>
              <Link
                href="/settings"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: 'var(--font-sm)',
                  color: 'rgb(var(--text-muted))',
                  textDecoration: 'none',
                  marginBottom: '0.75rem',
                  transition: 'color 0.2s',
                }}
              >
                <ArrowLeft size={14} />
                Kembali ke Pengaturan
              </Link>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                Profil Pengguna
              </h2>
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>
                Kelola foto profil dan informasi personal Anda.
              </p>
            </div>

            {/* Avatar Upload Card */}
            {hasFeature('profile_avatar') && <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1.25rem' }}>
                Foto Profil
              </h3>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Avatar Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: displayedImage
                        ? `url(${displayedImage}) center/cover no-repeat`
                        : 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '2.5rem',
                      overflow: 'hidden',
                      border: '3px solid var(--border-default)',
                      position: 'relative',
                    }}
                  >
                    {!displayedImage && (user?.fullName?.charAt(0).toUpperCase() || 'U')}
                    {uploading && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                      }}>
                        <Loader2 size={24} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  {/* Action buttons below avatar */}
                  {displayedImage && !uploading && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Camera size={12} />}
                        onClick={handleClickUpload}
                      >
                        Ganti
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 size={12} />}
                        onClick={handleRemoveAvatar}
                      >
                        Hapus
                      </Button>
                    </div>
                  )}
                </div>

                {/* Upload Area */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClickUpload}
                    style={{
                      border: `2px dashed ${isDragging ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '2rem 1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: isDragging
                        ? 'rgba(var(--color-primary) / 0.05)'
                        : 'rgba(var(--text-muted) / 0.02)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(var(--color-primary) / 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <ImagePlus size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
                          {isDragging ? 'Lepaskan file di sini' : 'Klik atau drag foto ke sini'}
                        </p>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.25rem' }}>
                          {ALLOWED_EXTENSIONS_LABEL}. Maksimal 2MB.
                        </p>
                      </div>
                      {!displayedImage && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Upload size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickUpload();
                          }}
                        >
                          Pilih Foto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </Card>}

            {/* AI Context Fields Card */}
            {hasFeature('profile_ai_context') && <Card style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Brain size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                  Konteks AI
                </h3>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)', marginTop: '0.25rem' }}>
                  Informasi ini akan digunakan AI untuk memberikan respons yang lebih personal dan relevan.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Daily Habits */}
                <div>
                  <TextArea
                    label="Kebiasaan Harian"
                    value={dailyHabits}
                    onChange={v => setDailyHabits(v)}
                    maxLength={AI_CONTEXT_LIMITS.dailyHabits}
                    placeholder="Contoh: Bangun jam 6 pagi, olahraga 30 menit, belajar malam jam 8-10..."
                    rows={3}
                    showCount
                  />
                </div>

                {/* Life Goals */}
                <div>
                  <TextArea
                    label="Tujuan Hidup"
                    value={lifeGoals}
                    onChange={v => setLifeGoals(v)}
                    maxLength={AI_CONTEXT_LIMITS.lifeGoals}
                    placeholder="Contoh: Lulus cum laude, membangun startup edtech, menjadi software engineer..."
                    rows={3}
                    showCount
                  />
                </div>

                {/* Study Schedule */}
                <div>
                  <TextArea
                    label="Jadwal Belajar"
                    value={studySchedule}
                    onChange={v => setStudySchedule(v)}
                    maxLength={AI_CONTEXT_LIMITS.studySchedule}
                    placeholder="Contoh: Senin-Jumat kuliah 8-15, belajar mandiri malam, Sabtu libur..."
                    rows={2}
                    showCount
                  />
                </div>

                {/* Personal Notes */}
                <div>
                  <TextArea
                    label="Catatan Personal"
                    value={personalNotes}
                    onChange={v => setPersonalNotes(v)}
                    maxLength={AI_CONTEXT_LIMITS.personalNotes}
                    placeholder="Contoh: Saya introvert, suka belajar visual, perlu reminder sering..."
                    rows={2}
                    showCount
                  />
                </div>
              </div>

              {/* Save Button */}
              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  leftIcon={savingContext ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                  onClick={handleSaveAIContext}
                  disabled={savingContext}
                >
                  {savingContext ? 'Menyimpan...' : 'Simpan Konteks AI'}
                </Button>
              </div>
            </Card>}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
