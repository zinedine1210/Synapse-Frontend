'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast, useConfirm, TextInput, TagInput, TimePicker, SelectOption } from '@/components/ui';
import { apiFetch, apiUpload } from '@/lib/api';
import { useCache } from '@/lib/cache';
import { ProfileCard } from '@/components/gamification/ProfileCard';

import { usePushNotifications } from '@/lib/usePushNotifications';
import {
  Settings, User, Bell, Palette, Database, Shield,
  Camera, Save, Loader2, Moon, Sun, Monitor, Globe,
  Clock, ExternalLink, Mail, Link2, Check, Trash2, AlertTriangle,
  GraduationCap
} from 'lucide-react';

// Types
interface NotificationPreferences {
  deadlineReminder: boolean;
  budgetAlert: boolean;
  streakReminder: boolean;
  idleReminder: boolean;
  weeklyRecap: boolean;
  forumReply: boolean;
  qnaAnswer: boolean;
  achievementAlert: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface UserPreferences {
  theme: string;
  language: string;
  accountStatus: string;
  notifications: NotificationPreferences;
}

type TabId = 'profile' | 'notifications' | 'appearance' | 'data' | 'account';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profil', icon: <User size={16} /> },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell size={16} /> },
  { id: 'appearance', label: 'Tampilan', icon: <Palette size={16} /> },
  { id: 'data', label: 'Data', icon: <Database size={16} /> },
  { id: 'account', label: 'Akun', icon: <Shield size={16} /> },
];

const NOTIFICATION_TOGGLES: { key: keyof Omit<NotificationPreferences, 'quietHoursStart' | 'quietHoursEnd'>; label: string; description: string }[] = [
  { key: 'deadlineReminder', label: 'Reminder Deadline', description: 'Kasih tau kalo deadline udah mepet nih' },
  { key: 'budgetAlert', label: 'Alert Budget', description: 'Warning kalo budget kategori udah 80%' },
  { key: 'streakReminder', label: 'Reminder Streak', description: 'Ingetin biar streak harian gak putus' },
  { key: 'idleReminder', label: 'Reminder Idle', description: 'Nudge kalo 3 hari gak catat transaksi' },
  { key: 'weeklyRecap', label: 'Rekap Mingguan', description: 'Rangkuman aktivitas lo seminggu ini' },
  { key: 'forumReply', label: 'Balasan Forum', description: 'Ada yang bales di forum nih!' },
  { key: 'qnaAnswer', label: 'Jawaban Q&A', description: 'Pertanyaan lo udah dijawab!' },
  { key: 'achievementAlert', label: 'Achievement', description: 'Dapet achievement baru! 🎉' },
];

export default function SettingsPage() {
  const { user, supabaseUser, signOut, refetchProfile } = useAuth();
  const { setTheme } = useTheme();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Onboarding profile state
  const [onboardingUniversity, setOnboardingUniversity] = useState('');
  const [onboardingHobbies, setOnboardingHobbies] = useState<string[]>([]);
  const [onboardingJob, setOnboardingJob] = useState('');
  const [onboardingReason, setOnboardingReason] = useState('');
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  // Preferences state
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>({});
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [themeChoice, setThemeChoice] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState<'id' | 'en'>('id');

  // Push notification state
  const pushNotifications = usePushNotifications();

  // Cached data fetching
  const { data: prefData, loading } = useCache<UserPreferences>(
    user ? 'settings:preferences' : null,
    () => apiFetch<UserPreferences>('/settings/preferences')
  );

  const { data: onboardingData, loading: onboardingLoading } = useCache<{
    university: string | null; hobbies: string[]; job: string | null; reason: string | null;
  }>(
    user ? 'settings:onboarding-profile' : null,
    () => apiFetch('/user/profile')
  );

  // Hydrate state from cached data
  useEffect(() => {
    if (prefData) {
      const toggles: Record<string, boolean> = {};
      NOTIFICATION_TOGGLES.forEach(t => { toggles[t.key] = prefData.notifications[t.key]; });
      setNotifToggles(toggles);
      setQuietStart(prefData.notifications.quietHoursStart || '');
      setQuietEnd(prefData.notifications.quietHoursEnd || '');
      setThemeChoice(prefData.theme as 'light' | 'dark' | 'system');
      setLanguage(prefData.language as 'id' | 'en');
    }
  }, [prefData]);

  useEffect(() => {
    if (onboardingData) {
      setOnboardingUniversity(onboardingData.university || '');
      setOnboardingHobbies(onboardingData.hobbies || []);
      setOnboardingJob(onboardingData.job || '');
      setOnboardingReason(onboardingData.reason || '');
    }
  }, [onboardingData]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  // Profile handlers
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Format-nya harus JPG, PNG, atau WebP ya!', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Kegedean nih, maks 2MB ya!', 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiUpload<{ avatarUrl: string }>('/user/profile/avatar', formData);
      setAvatarUrl(result.avatarUrl);

      await refetchProfile();
      showToast('Avatar udah diganti! Fresh~ ✨', 'success');
    } catch (err: any) {
      showToast(err.message || 'Yah, gagal upload avatar. Coba lagi ya!', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      showToast('Nama-nya jangan kosong dong!', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      await refetchProfile();
      showToast('Profil udah ke-save! 💾', 'success');
    } catch (err: any) {
      showToast(err.message || 'Duh, gagal nyimpen profil. Coba lagi!', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save onboarding profile handler
  const handleSaveOnboardingProfile = async () => {
    setOnboardingSaving(true);
    try {
      await apiFetch('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          university: onboardingUniversity.trim(),
          hobbies: onboardingHobbies,
          job: onboardingJob.trim(),
          reason: onboardingReason.trim(),
        }),
      });
      showToast('Data onboarding udah ke-save! ✅', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal nyimpen data onboarding nih.', 'error');
    } finally {
      setOnboardingSaving(false);
    }
  };

  // Notification handlers
  const handleToggleNotif = async (key: string, value: boolean) => {
    setNotifToggles(prev => ({ ...prev, [key]: value }));
    try {
      await apiFetch('/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
      showToast(value ? 'Notif udah nyala! 🔔' : 'Notif dimatiin', 'success');
    } catch (err: any) {
      // Revert on error
      setNotifToggles(prev => ({ ...prev, [key]: !value }));
      showToast(err.message || 'Gagal update notif nih, coba lagi!', 'error');
    }
  };

  const handleSaveQuietHours = async () => {
    setSaving(true);
    try {
      await apiFetch('/settings/quiet-hours', {
        method: 'PATCH',
        body: JSON.stringify({
          quietHoursStart: quietStart || null,
          quietHoursEnd: quietEnd || null,
        }),
      });
      showToast('Quiet hours udah di-set! 🌙', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal nyimpen quiet hours nih.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Appearance handlers
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeChoice(newTheme);

    // Apply to ThemeContext immediately
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(newTheme);
    }

    // Persist to backend
    try {
      await apiFetch('/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (err: any) {
      showToast(err.message || 'Gagal ganti tema nih.', 'error');
    }
  };

  const handleLanguageChange = async (newLang: 'id' | 'en') => {
    setLanguage(newLang);
    try {
      await apiFetch('/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ language: newLang }),
      });
      showToast('Bahasa udah diganti! 🌍', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal ganti bahasa nih.', 'error');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Mau Cabut?',
      message: 'Yakin nih mau logout? Nanti harus login lagi loh~',
      confirmText: 'Gas Logout',
      variant: 'danger',
    });
    if (!ok) return;
    await signOut();
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Pengaturan" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in settings-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                Pengaturan
              </h2>
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>
                Atur profil, notif, tampilan & vibe app kamu di sini~ ✨
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="settings-tabs" style={{
              display: 'flex',
              gap: '0.25rem',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              borderBottom: '1px solid var(--border-default)',
              paddingBottom: '0',
              scrollbarWidth: 'none',
            }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1rem',
                    fontSize: 'var(--font-sm)',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="skeleton" style={{ height: 20, width: '40%', borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
                <div className="skeleton" style={{ height: 100, borderRadius: 14 }} />
                <div className="skeleton" style={{ height: 60, borderRadius: 14 }} />
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <ProfileTab
                    user={user}
                    fullName={fullName}
                    setFullName={setFullName}
                    avatarUrl={avatarUrl}
                    avatarUploading={avatarUploading}
                    fileInputRef={fileInputRef}
                    handleAvatarUpload={handleAvatarUpload}
                    handleSaveProfile={handleSaveProfile}
                    saving={saving}
                    onboardingUniversity={onboardingUniversity}
                    setOnboardingUniversity={setOnboardingUniversity}
                    onboardingHobbies={onboardingHobbies}
                    setOnboardingHobbies={setOnboardingHobbies}
                    onboardingJob={onboardingJob}
                    setOnboardingJob={setOnboardingJob}
                    onboardingReason={onboardingReason}
                    setOnboardingReason={setOnboardingReason}
                    onboardingSaving={onboardingSaving}
                    onboardingLoading={onboardingLoading}
                    handleSaveOnboardingProfile={handleSaveOnboardingProfile}
                  />
                )}

                {activeTab === 'notifications' && (
                  <NotificationsTab
                    notifToggles={notifToggles}
                    handleToggleNotif={handleToggleNotif}
                    quietStart={quietStart}
                    setQuietStart={setQuietStart}
                    quietEnd={quietEnd}
                    setQuietEnd={setQuietEnd}
                    handleSaveQuietHours={handleSaveQuietHours}
                    saving={saving}
                    pushNotifications={pushNotifications}
                  />
                )}

                {activeTab === 'appearance' && (
                  <AppearanceTab
                    themeChoice={themeChoice}
                    handleThemeChange={handleThemeChange}
                    language={language}
                    handleLanguageChange={handleLanguageChange}
                  />
                )}

                {activeTab === 'data' && (
                  <DataTab />
                )}

                {activeTab === 'account' && (
                  <AccountTab
                    user={user}
                    supabaseUser={supabaseUser}
                    handleSignOut={handleSignOut}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}


// ========================
// Profile Tab
// ========================
function ProfileTab({
  user,
  fullName,
  setFullName,
  avatarUrl,
  avatarUploading,
  fileInputRef,
  handleAvatarUpload,
  handleSaveProfile,
  saving,
  onboardingUniversity,
  setOnboardingUniversity,
  onboardingHobbies,
  setOnboardingHobbies,
  onboardingJob,
  setOnboardingJob,
  onboardingReason,
  setOnboardingReason,
  onboardingSaving,
  onboardingLoading,
  handleSaveOnboardingProfile,
}: {
  user: any;
  fullName: string;
  setFullName: (v: string) => void;
  avatarUrl: string | undefined;
  avatarUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveProfile: () => void;
  saving: boolean;
  onboardingUniversity: string;
  setOnboardingUniversity: (v: string) => void;
  onboardingHobbies: string[];
  setOnboardingHobbies: (v: string[]) => void;
  onboardingJob: string;
  setOnboardingJob: (v: string) => void;
  onboardingReason: string;
  setOnboardingReason: (v: string) => void;
  onboardingSaving: boolean;
  onboardingLoading: boolean;
  handleSaveOnboardingProfile: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1.25rem' }}>
          Informasi Profil
        </h3>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: avatarUrl
                ? `url(${avatarUrl}) center/cover`
                : 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgb(var(--bg-base))',
              fontWeight: 700,
              fontSize: '1.5rem',
              overflow: 'hidden',
            }}>
              {!avatarUrl && (user?.fullName?.charAt(0).toUpperCase() || 'U')}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgb(var(--color-primary))',
                border: '2px solid rgb(var(--bg-surface))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              {avatarUploading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
            </button>
          </div>
          <div>
            <p style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>Foto Profil</p>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
              JPG, PNG, atau WebP. Maks 2MB ya!
            </p>
          </div>
          <input
            ref={fileInputRef as React.LegacyRef<HTMLInputElement>}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarUpload}
          />
        </div>

        {/* Full Name */}
        <div style={{ marginBottom: '1rem' }}>
          <TextInput name="name" autoComplete="name" label="Nama Lengkap" value={fullName} onChange={setFullName} placeholder="Tulis nama kamu di sini" />
        </div>

        {/* Email (read only) */}
        <div style={{ marginBottom: '1.25rem' }}>
          <TextInput name="email" autoComplete="email" label="Email" value={user?.email || ''} onChange={() => {}} disabled placeholder="" />
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={saving}
          leftIcon={<Save size={14} />}
          onClick={handleSaveProfile}
        >
          Save Profil
        </Button>
      </Card>

      {/* Profil Onboarding Section */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GraduationCap size={16} style={{ color: 'rgb(var(--color-primary))' }} />
          Info Kampus & Diri
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1.25rem' }}>
          Isi biar Synapse makin kenal kamu & rekomendasi makin spot on! 🎯
        </p>

        {onboardingLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* University */}
            <TextInput
              name="university"
              autoComplete="organization"
              label="Kampus"
              value={onboardingUniversity}
              onChange={setOnboardingUniversity}
              placeholder="Contoh: Universitas Indonesia"
            />

            {/* Hobbies */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', fontWeight: 500, marginBottom: '0.4rem' }}>
                Hobi
              </label>
              <TagInput
                value={onboardingHobbies}
                onChange={setOnboardingHobbies}
                placeholder="Tambahin hobi kamu (Enter/koma buat nambah)"
                maxTags={10}
              />
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.25rem' }}>
                Tekan Enter atau koma buat nambahin hobi.
              </p>
            </div>

            {/* Job */}
            <TextInput
              name="job"
              autoComplete="organization-title"
              label="Kesibukan"
              value={onboardingJob}
              onChange={setOnboardingJob}
              placeholder="Contoh: Mahasiswa, Pekerja, Freelancer"
            />

            {/* Reason */}
            <TextInput
              name="reason"
              label="Kenapa Pakai Synapse?"
              value={onboardingReason}
              onChange={setOnboardingReason}
              placeholder="Contoh: Pengen lebih produktif di kampus"
            />

            <div style={{ marginTop: '0.25rem' }}>
              <Button
                variant="primary"
                size="md"
                isLoading={onboardingSaving}
                leftIcon={<Save size={14} />}
                onClick={handleSaveOnboardingProfile}
              >
                Save Data Kampus
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Digital Identity Card */}
      <ProfileCard
        data={{
          name: user?.fullName || 'User',
          avatarUrl: avatarUrl,
          university: onboardingUniversity || undefined,
          level: 1,
          levelName: 'Pemula',
          totalXp: 0,
          currentStreak: 0,
          longestStreak: 0,
          achievementCount: 0,
          totalSaved: 0,
          memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Jun 2026',
        }}
      />
    </div>
  );
}

// ========================
// Notifications Tab
// ========================
function NotificationsTab({
  notifToggles,
  handleToggleNotif,
  quietStart,
  setQuietStart,
  quietEnd,
  setQuietEnd,
  handleSaveQuietHours,
  saving,
  pushNotifications,
}: {
  notifToggles: Record<string, boolean>;
  handleToggleNotif: (key: string, value: boolean) => void;
  quietStart: string;
  setQuietStart: (v: string) => void;
  quietEnd: string;
  setQuietEnd: (v: string) => void;
  handleSaveQuietHours: () => void;
  saving: boolean;
  pushNotifications: {
    isSupported: boolean;
    isSubscribed: boolean;
    permission: NotificationPermission;
    loading: boolean;
    error: string | null;
    subscribe: () => Promise<{ ok: boolean; error?: string }>;
    unsubscribe: () => Promise<{ ok: boolean; error?: string }>;
  };
}) {
  const { showToast } = useToast();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Notification Toggles */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem' }}>
          Preferensi Notifikasi
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Pilih notif mana aja yang mau nyala, biar gak keganggu tapi tetep update!
        </p>

        {/* Push Notifications Toggle */}
        {pushNotifications.isSupported && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem', borderRadius: 'var(--radius-md)',
            background: pushNotifications.isSubscribed
              ? 'rgba(var(--color-secondary) / 0.06)'
              : 'rgba(var(--text-muted) / 0.03)',
            border: pushNotifications.isSubscribed
              ? '1px solid rgba(var(--color-secondary) / 0.15)'
              : '1px solid transparent',
            marginBottom: '0.75rem',
          }}>
            <div>
              <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                📱 Push Notification ke HP
              </p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                {pushNotifications.isSubscribed
                  ? 'Notifikasi akan muncul di HP kamu meskipun browser ditutup'
                  : pushNotifications.permission === 'denied'
                    ? 'Izin notifikasi diblokir. Aktifkan di pengaturan browser.'
                    : 'Aktifkan untuk menerima notifikasi langsung di HP kamu'}
              </p>
            </div>
            <Button
              size="sm"
              variant={pushNotifications.isSubscribed ? 'secondary' : 'primary'}
              isLoading={pushNotifications.loading}
              disabled={pushNotifications.permission === 'denied'}
              onClick={async () => {
                if (pushNotifications.isSubscribed) {
                  const result = await pushNotifications.unsubscribe();
                  if (result.ok) showToast('Push notification dinonaktifkan', 'success');
                  else showToast(result.error || 'Gagal menonaktifkan push notification', 'error');
                } else {
                  const result = await pushNotifications.subscribe();
                  if (result.ok) showToast('Push notification berhasil diaktifkan! 🔔', 'success');
                  else showToast(result.error || 'Gagal mengaktifkan push notification', 'error');
                }
              }}
              style={!pushNotifications.isSubscribed ? {
                background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
                color: 'black', fontWeight: 700, border: 'none',
              } : undefined}
            >
              {pushNotifications.isSubscribed ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {NOTIFICATION_TOGGLES.map(toggle => (
            <div
              key={toggle.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(var(--text-muted) / 0.03)',
              }}
            >
              <div>
                <p style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{toggle.label}</p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{toggle.description}</p>
              </div>
              <ToggleSwitch
                checked={notifToggles[toggle.key] ?? true}
                onChange={val => handleToggleNotif(toggle.key, val)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={16} />
          Quiet Hours
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Notif bakal ditahan dulu pas jam segini, biar gak ganggu tidur/me time kamu~ 🌙
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <TimePicker
              label="Mulai"
              value={quietStart}
              onChange={setQuietStart}
              minuteStep={15}
            />
          </div>
          <span style={{ color: 'rgb(var(--text-muted))', marginTop: '1.5rem' }}>—</span>
          <div style={{ flex: 1, minWidth: 120 }}>
            <TimePicker
              label="Selesai"
              value={quietEnd}
              onChange={setQuietEnd}
              minuteStep={15}
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <Button
            variant="secondary"
            size="sm"
            isLoading={saving}
            leftIcon={<Save size={14} />}
            onClick={handleSaveQuietHours}
          >
            Simpan Quiet Hours
          </Button>
        </div>
      </Card>

      {/* Si Bawel Settings Link */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>Pengaturan Si Bawel</h4>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
              Atur vibe & intensitas Si Bawel di Duit Tracker kamu.
            </p>
          </div>
          <a
            href="/duit-tracker"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: 'var(--font-sm)',
              color: 'rgb(var(--color-primary))',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Buka <ExternalLink size={12} />
          </a>
        </div>
      </Card>
    </div>
  );
}

// ========================
// Appearance Tab
// ========================
function AppearanceTab({
  themeChoice,
  handleThemeChange,
  language,
  handleLanguageChange,
}: {
  themeChoice: 'light' | 'dark' | 'system';
  handleThemeChange: (t: 'light' | 'dark' | 'system') => void;
  language: 'id' | 'en';
  handleLanguageChange: (l: 'id' | 'en') => void;
}) {
  const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Terang', icon: <Sun size={18} /> },
    { value: 'dark', label: 'Gelap', icon: <Moon size={18} /> },
    { value: 'system', label: 'Sistem', icon: <Monitor size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Theme */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem' }}>
          Tema
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Pilih tampilan yang paling lo vibe.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {themeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleThemeChange(opt.value)}
              style={{
                flex: '1 1 100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: themeChoice === opt.value
                  ? '2px solid rgb(var(--color-primary))'
                  : '1px solid var(--border-default)',
                background: themeChoice === opt.value
                  ? 'rgba(var(--color-primary) / 0.08)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                color: themeChoice === opt.value
                  ? 'rgb(var(--color-primary))'
                  : 'rgb(var(--text-primary))',
                fontFamily: 'inherit',
              }}
            >
              {opt.icon}
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: themeChoice === opt.value ? 600 : 400 }}>
                {opt.label}
              </span>
              {themeChoice === opt.value && <Check size={14} />}
            </button>
          ))}
        </div>
      </Card>

      {/* Language */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Globe size={16} />
          Bahasa
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Pilih bahasa tampilan app.
        </p>

        <SelectOption value={language} onChange={v => handleLanguageChange(v as 'id' | 'en')} options={[
          { value: 'id', label: '🇮🇩 Bahasa Indonesia' },
          { value: 'en', label: '🇬🇧 English' },
        ]} />
      </Card>
    </div>
  );
}

// ========================
// Data Tab — Export & Account Deletion
// ========================
function DataTab() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await apiFetch<{ csv: string; filename: string }>('/settings/export-data', {
        method: 'POST',
      });

      // Create a Blob from CSV string and trigger browser download
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || 'synapse-export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Data udah di-export! Check download-an kamu 📂', 'success');
    } catch (err: any) {
      // Rate limit (429) — backend enforces 1 export/hour
      showToast(err.message || 'Gagal export data nih. Coba lagi ya!', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // First confirmation via useConfirm dialog
    const firstConfirm = await confirm({
      title: 'Hapus Akun 😱',
      message: 'Beneran nih mau hapus akun? Semua data bakal ilang permanen setelah 30 hari. No turning back!',
      confirmText: 'Iya, Lanjut',
      cancelText: 'Gak Jadi',
      variant: 'danger',
    });

    if (!firstConfirm) return;

    // Show second confirmation dialog requiring user to type "HAPUS AKUN"
    setShowDeleteDialog(true);
    setConfirmationText('');
  };

  const handleConfirmDelete = async () => {
    if (confirmationText !== 'HAPUS AKUN') {
      showToast('Ketik "HAPUS AKUN" yang bener ya buat konfirmasi.', 'error');
      return;
    }

    setDeleting(true);
    try {
      await apiFetch('/settings/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText: 'HAPUS AKUN' }),
      });

      showToast('Akun udah dihapus. Kamu bakal di-logout bentar lagi...', 'success');
      setShowDeleteDialog(false);

      // Sign out after a brief delay
      setTimeout(() => {
        signOut();
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Gagal hapus akun nih. Coba lagi!', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Export Data Section */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Database size={16} />
          Ekspor Data
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Download semua data transaksi & todo kamu jadi CSV. Limit: 1x per jam ya!
        </p>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Database size={14} />}
          isLoading={exporting}
          onClick={handleExportData}
        >
          Ekspor Data (CSV)
        </Button>
      </Card>

      {/* Account Deletion Section */}
      <Card style={{ padding: '1.5rem', borderColor: 'rgba(var(--color-error) / 0.2)' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgb(var(--color-error))' }}>
          <Trash2 size={16} />
          Hapus Akun
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '1rem' }}>
          Hapus akun = semua data ilang permanen setelah 30 hari. No turning back, pikirin baik-baik! 🙅
        </p>
        <Button
          variant="danger"
          size="md"
          leftIcon={<Trash2 size={14} />}
          onClick={handleDeleteAccount}
        >
          Hapus Akun Saya
        </Button>
      </Card>

      {/* Double-confirmation Dialog for Account Deletion */}
      {showDeleteDialog && (
        <div
          onClick={() => setShowDeleteDialog(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-in"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: 420,
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(var(--color-error) / 0.1)',
                color: 'rgb(var(--color-error))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, margin: 0, color: 'rgb(var(--text-primary))' }}>
                  Yakin Hapus Akun?
                </h3>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>
                  Step terakhir nih, pikirin baik-baik ya
                </p>
              </div>
            </div>

            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', margin: 0, lineHeight: 1.6 }}>
              Ketik <strong style={{ color: 'rgb(var(--color-error))' }}>HAPUS AKUN</strong> di bawah buat konfirmasi penghapusan.
            </p>

            <TextInput value={confirmationText} onChange={setConfirmationText} placeholder='Ketik "HAPUS AKUN"' />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteDialog(false)}
                style={{ flex: 1 }}
              >
                Gak Jadi
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={deleting}
                disabled={confirmationText !== 'HAPUS AKUN'}
                style={{ flex: 1 }}
              >
                Gas Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================
// Account Tab
// ========================
function AccountTab({
  user,
  supabaseUser,
  handleSignOut,
}: {
  user: any;
  supabaseUser: any;
  handleSignOut: () => void;
}) {
  const googleIdentity = supabaseUser?.identities?.find(
    (i: any) => i.provider === 'google'
  );
  const emailIdentity = supabaseUser?.identities?.find(
    (i: any) => i.provider === 'email'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Linked Accounts */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Link2 size={16} />
          Akun Terhubung
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Email */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(var(--text-muted) / 0.03)',
          }}>
            <Mail size={18} style={{ color: 'rgb(var(--text-muted))' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>Email</p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                {user?.email || 'Tidak terhubung'}
              </p>
            </div>
            {emailIdentity && (
              <span style={{
                fontSize: 'var(--font-xs)',
                color: 'rgb(var(--color-success, 34 197 94))',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}>
                <Check size={12} /> Terhubung
              </span>
            )}
          </div>

          {/* Google */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(var(--text-muted) / 0.03)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>Google</p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                {googleIdentity
                  ? (googleIdentity.identity_data?.email || 'Terhubung')
                  : 'Tidak terhubung'}
              </p>
            </div>
            {googleIdentity && (
              <span style={{
                fontSize: 'var(--font-xs)',
                color: 'rgb(var(--color-success, 34 197 94))',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}>
                <Check size={12} /> Terhubung
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Account Info */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 'var(--font-md)',
          }}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{user?.fullName}</p>
            <span className={`badge ${user?.plan === 'PRO' ? 'badge-pro' : 'badge-free'}`} style={{ fontSize: 'var(--font-xs)' }}>
              Paket {user?.plan}
            </span>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Card style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>Keluar dari Akun</h4>
          <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
            Keluarkan sesi ini dari perangkat saat ini.
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleSignOut}
        >
          Keluar
        </Button>
      </Card>
    </div>
  );
}

// ========================
// Toggle Switch Component
// ========================
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? 'rgb(var(--color-primary))' : 'rgba(var(--text-muted) / 0.3)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}
