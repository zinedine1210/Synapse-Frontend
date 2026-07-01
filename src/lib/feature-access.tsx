'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { UserRole } from '@/models/User';

interface FeatureAccessContextType {
  features: string[];
  userRole: UserRole;
  hasFeature: (featureKey: string) => boolean;
  maxFileSizeMb: number;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<FeatureAccessContextType>(() => {
    const features = user?.pricingPlan?.features ?? [];
    const userRole: UserRole = user?.role ?? 'USER';
    const maxFileSizeMb = user?.pricingPlan?.maxFileSizeMb ?? 5;

    const hasFeature = (featureKey: string): boolean => {
      // SUPERADMIN bypasses all feature restrictions
      if (userRole === 'SUPERADMIN') return true;
      return features.includes(featureKey);
    };

    return { features, userRole, hasFeature, maxFileSizeMb };
  }, [user?.pricingPlan?.features, user?.pricingPlan?.maxFileSizeMb, user?.role]);

  return (
    <FeatureAccessContext.Provider value={value}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess(): FeatureAccessContextType {
  const context = useContext(FeatureAccessContext);
  if (context === undefined) {
    throw new Error('useFeatureAccess harus digunakan di dalam FeatureAccessProvider');
  }
  return context;
}

/**
 * FeatureGate — conditionally renders children based on feature access.
 *
 * Usage modes:
 * 1. Inline gating (with fallback): renders fallback if user lacks the feature.
 * 2. Page-level gating (redirect): redirects to /fitur-tidak-tersedia if no fallback is provided.
 */
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps): React.ReactNode {
  const { hasFeature } = useFeatureAccess();
  const router = useRouter();

  const hasAccess = hasFeature(feature);

  useEffect(() => {
    // Page-level gating: redirect when no fallback and no access
    if (!hasAccess && fallback === undefined) {
      router.replace('/fitur-tidak-tersedia');
    }
  }, [hasAccess, fallback, router]);

  // User has access — render children normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // User does NOT have access — render fallback if provided (inline gating)
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  // No fallback — page-level gating: show nothing while redirect happens
  return null;
}
