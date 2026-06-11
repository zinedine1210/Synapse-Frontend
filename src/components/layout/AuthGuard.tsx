'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { completeOnboarding, skipOnboarding } from '@/lib/onboarding-service';
import { Loader2 } from 'lucide-react';
import { QuickActionFAB } from './QuickActionFAB';
import { BottomNav } from './BottomNav';
import { MobileNavSheet } from './MobileNavSheet';
import { CommandPalette } from './CommandPalette';
import { OnboardingFlow } from './OnboardingFlow';
import type { OnboardingData } from './OnboardingFlow';
import { TutorialOverlay } from './TutorialOverlay';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'USER' | 'SUPERADMIN';
  requiredFeature?: string;
}

export function AuthGuard({ children, requiredRole, requiredFeature }: AuthGuardProps) {
  const { user, session, loading, refetchProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [navSheetOpen, setNavSheetOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const onboardingKey = `synapse_onboarding_${user.id}`;
      const tourKey = `synapse_tour_${user.id}`;
      // Check both localStorage and backend flag
      const isOnboarded = localStorage.getItem(onboardingKey) || user.onboardingCompleted;
      if (!isOnboarded) {
        setShowOnboarding(true);
      } else if (!localStorage.getItem(tourKey)) {
        setShowTutorial(true);
      }
    }
  }, [loading, user]);

  /**
   * Marks onboarding as completed on the backend and updates local state.
   * After completion or skip, triggers the Tour Guide.
   */
  const triggerTourGuide = useCallback(() => {
    if (!user) return;
    setShowOnboarding(false);
    if (!localStorage.getItem(`synapse_tour_${user.id}`)) {
      setShowTutorial(true);
    }
  }, [user]);

  /**
   * Handle onboarding completion: save profile data to backend,
   * mark onboardingCompleted = true, then trigger Tour Guide.
   */
  const handleOnboardingComplete = useCallback(async (data: OnboardingData) => {
    if (!user) return;
    await completeOnboarding(user.id, data);
    await refetchProfile();
    triggerTourGuide();
  }, [user, refetchProfile, triggerTourGuide]);

  /**
   * Handle onboarding skip: mark onboardingCompleted = true WITHOUT saving
   * profile data, then trigger Tour Guide.
   */
  const handleOnboardingSkip = useCallback(async () => {
    if (!user) return;
    await skipOnboarding(user.id);
    await refetchProfile();
    triggerTourGuide();
  }, [user, refetchProfile, triggerTourGuide]);

  useEffect(() => {
    if (!loading) {
      if (!session || !user) {
        // Simpan path yang ingin dikunjungi ke query params jika diperlukan
        router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) {
        // Superadmin dialihkan langsung ke halaman superadmin
        router.push('/superadmin');
      } else if (requiredRole && user.role !== requiredRole) {
        // Jika butuh role superadmin tapi user biasa
        router.push('/dashboard');
      } else if (requiredFeature && user.pricingPlan && !user.pricingPlan.features.includes(requiredFeature)) {
        // Jika user tidak memiliki fitur ini pada paketnya, alihkan ke billing
        router.push('/billing');
      }
    }
  }, [loading, session, user, requiredRole, requiredFeature, router, pathname]);

  if (loading || !session || !user || 
      (user.role === 'SUPERADMIN' && !pathname.startsWith('/superadmin') && !pathname.startsWith('/settings')) ||
      (requiredRole && user.role !== requiredRole) ||
      (requiredFeature && user.pricingPlan && !user.pricingPlan.features.includes(requiredFeature))) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgb(6, 11, 24)',
          color: 'rgba(0, 212, 255, 0.8)',
          gap: '1rem',
        }}
      >
        <Loader2 className="animate-spin" size={48} />
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'rgba(160, 160, 200, 0.8)' }}>
          Memuat sesi belajar...
        </span>
      </div>
    );
  }

  return (
    <>
      {showOnboarding && user && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      {showTutorial && user && (
        <TutorialOverlay onClose={() => {
          localStorage.setItem(`synapse_tour_${user.id}`, 'done');
          setShowTutorial(false);
        }} />
      )}
      {children}
      <BottomNav onMoreTap={() => setNavSheetOpen(true)} />
      <MobileNavSheet open={navSheetOpen} onClose={() => setNavSheetOpen(false)} />
      <QuickActionFAB />
      <CommandPalette />
    </>
  );
}
