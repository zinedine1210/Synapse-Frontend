'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { QuickActionFAB } from './QuickActionFAB';
import { BottomNav } from './BottomNav';
import { MobileNavSheet } from './MobileNavSheet';
import { CommandPalette } from './CommandPalette';
import { OnboardingFlow } from './OnboardingFlow';
import { useFeatureAccess } from '@/lib/feature-access';
import { TourGuide, type TourStep } from './TourGuide';
import { SplashScreen } from './SplashScreen';

const TOUR_STEPS: TourStep[] = [
  { targetSelector: '[data-tour="dashboard"]', title: 'Dashboard', description: 'Pusat kendali kuliahmu. Lihat kelas, jadwal, dan ringkasan AI di satu tempat.', position: 'bottom' },
  { targetSelector: '[data-tour="duit-tracker"]', title: 'Duit Tracker', description: 'Catat pengeluaran, atur budget, dan tanam pohon tabungan virtual.', position: 'right' },
  { targetSelector: '[data-tour="todos"]', title: 'To-Do List', description: 'Kelola tugas dengan drag & drop, kategori, dan kalender.', position: 'right' },
  { targetSelector: '[data-tour="qna"]', title: 'Ruang Tanya', description: 'Tanya, jawab, dan bangun reputasi bersama pengguna lain.', position: 'right' },
  { targetSelector: '[data-tour="search"]', title: 'Pencarian Cepat', description: 'Tekan Ctrl+K untuk mencari tugas, todo, transaksi, dan lainnya.', position: 'bottom', allowInteraction: true },
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
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) {
        router.push('/superadmin');
      } else if (requiredRole && user.role !== requiredRole) {
        router.push('/dashboard');
      } else if (requiredFeature && user.pricingPlan && !user.pricingPlan.features.includes(requiredFeature)) {
        router.push('/billing');
      }
    }
  }, [loading, session, user, requiredRole, requiredFeature, router, pathname]);

  const shouldBlock = loading || !session || !user ||
      (user?.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) ||
      (requiredRole && user?.role !== requiredRole) ||
      (requiredFeature && user?.pricingPlan && !user.pricingPlan.features.includes(requiredFeature));

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
      {children}
      <BottomNav onMoreTap={() => setNavSheetOpen(true)} />
      <MobileNavSheet open={navSheetOpen} onClose={() => setNavSheetOpen(false)} />
      {hasFeature('quick_action') && <QuickActionFAB />}
      <CommandPalette />
    </>
  );
}
