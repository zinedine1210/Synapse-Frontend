'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { QuickActionFAB } from './QuickActionFAB';
import { BottomNav } from './BottomNav';
import { MobileNavSheet } from './MobileNavSheet';
import { CommandPalette } from './CommandPalette';
import { OnboardingFlow } from './OnboardingFlow';
import { PostTourPrompt } from './PostTourPrompt';
import { useFeatureAccess } from '@/lib/feature-access';
import { TourGuide, type TourStep } from './TourGuide';
import { SplashScreen } from './SplashScreen';

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="dashboard"]', title: '🏠 Dashboard', description: 'Pusat kendali kuliahmu. Lihat kelas aktif, jadwal hari ini, dan ringkasan AI di satu tempat.', position: 'bottom' },
  { targetSelector: '[data-tour="classes"]', title: '🎓 Kelas', description: 'Gabung atau buat kelas. Diskusi forum, materi, tugas, dan quiz semuanya di sini.', position: 'right' },
  { targetSelector: '[data-tour="duit-tracker"]', title: '💰 Duit Tracker', description: 'Catat pengeluaran harian, atur budget per kategori, dan lihat AI roast keuanganmu tiap minggu.', position: 'right' },
  { targetSelector: '[data-tour="todos"]', title: '✅ To-Do & Jadwal', description: 'Kelola tugas dan jadwal kuliah. Drag & drop prioritas, kalender, dan Pomodoro timer bawaan.', position: 'right' },
  { targetSelector: '[data-tour="qna"]', title: '❓ Ruang Tanya', description: 'Tanya apapun, jawab pertanyaan orang lain, dan kumpulkan poin reputasi.', position: 'right' },
  { targetSelector: '[data-tour="skripsweet"]', title: '🎓 Skripsweet', description: 'Tracker skripsi lengkap. Pantau progress, bimbingan, dan deadline siding.', position: 'right' },
  { targetSelector: '[data-tour="search"]', title: '🔍 Pencarian Cepat', description: 'Tekan Ctrl+K (atau ⌘K di Mac) untuk cari tugas, transaksi, kelas, dan navigasi cepat.', position: 'bottom', allowInteraction: true },
  { targetSelector: '[data-tour="settings"]', title: '⚙️ Pengaturan', description: 'Atur profil, tema gelap/terang, preferensi notifikasi, dan kelola akun di sini.', position: 'top' },
];

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'SUPERADMIN';
  requiredFeature?: string;
}

export function AuthGuard({ children, requiredRole, requiredFeature }: AuthGuardProps) {
  const { user, session, loading, refetchProfile } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const router = useRouter();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showPostTour, setShowPostTour] = useState(false);
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  // Track if we've ever been authed so we can keep DOM alive during
  // brief loading flickers (e.g. returning from native camera)
  const [wasAuthed, setWasAuthed] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setWasAuthed(true);
      const onboardingKey = `synapse_onboarding_${user.id}`;
      const tourKey = `synapse_tour_${user.id}`;
      const isOnboarded = localStorage.getItem(onboardingKey) || user.onboardingCompleted;
      if (!isOnboarded) {
        setShowOnboarding(true);
      } else if (!localStorage.getItem(tourKey)) {
        setShowTour(true);
      }
    }
  }, [loading, user]);

  const finishOnboarding = useCallback(() => {
    if (!user) return;
    localStorage.setItem(`synapse_onboarding_${user.id}`, 'done');
    setShowOnboarding(false);
    refetchProfile();
    if (!localStorage.getItem(`synapse_tour_${user.id}`)) {
      // Small delay to let dashboard render before tour starts
      setTimeout(() => setShowTour(true), 600);
    }
  }, [user, refetchProfile]);

  const finishTour = useCallback(() => {
    if (!user) return;
    localStorage.setItem(`synapse_tour_${user.id}`, 'done');
    setShowTour(false);
    // Show post-tour prompts if not already dismissed
    const postTourKey = `synapse_post_tour_${user.id}`;
    if (!localStorage.getItem(postTourKey)) {
      setTimeout(() => setShowPostTour(true), 400);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) {
        router.push('/superadmin');
      } else if (requiredRole && user.role !== requiredRole) {
        router.push('/dashboard');
      } else if (requiredFeature && !hasFeature(requiredFeature)) {
        router.push('/fitur-tidak-tersedia');
      }
    }
  }, [loading, session, user, requiredRole, requiredFeature, router, pathname, hasFeature]);

  const shouldBlock = loading || !session || !user ||
      (user?.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) ||
      (requiredRole && user?.role !== requiredRole) ||
      (requiredFeature && !hasFeature(requiredFeature));

  // First load — never been authed, hard block with SplashScreen (unmount children)
  if (shouldBlock && !wasAuthed) {
    return <SplashScreen />;
  }

  return (
    <>
      {/* If briefly loading after being authed (e.g. returning from camera), overlay splash without unmounting children/inputs */}
      {shouldBlock && wasAuthed && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
          <SplashScreen />
        </div>
      )}
      {showOnboarding && <OnboardingFlow onComplete={finishOnboarding} />}
      {showTour && <TourGuide steps={TOUR_STEPS} onComplete={finishTour} onSkip={finishTour} />}
      {showPostTour && (
        <PostTourPrompt
          onDismiss={() => {
            if (user) localStorage.setItem(`synapse_post_tour_${user.id}`, 'done');
            setShowPostTour(false);
          }}
        />
      )}
      {children}
      <BottomNav onMoreTap={() => setNavSheetOpen(true)} />
      <MobileNavSheet open={navSheetOpen} onClose={() => setNavSheetOpen(false)} />
      {hasFeature('quick_action') && <QuickActionFAB />}
      <CommandPalette />
    </>
  );
}
