'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useFeatureAccess } from '@/lib/feature-access';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';

interface FeatureLockProps {
  feature: string;
  children: React.ReactNode;
  /** Optional message shown in toast. Default: "Upgrade paket kamu untuk akses fitur ini!" */
  message?: string;
  /** If true, renders inline (no wrapper div). Useful inside flex containers. */
  inline?: boolean;
}

/**
 * FeatureLock — shows content in a locked/disabled state when user lacks the feature.
 * Instead of hiding, it shows the element with a lock overlay + opacity.
 * Clicking triggers a toast upsell and optionally navigates to /billing.
 *
 * Usage:
 * ```tsx
 * <FeatureLock feature="duit_tracker_budget">
 *   <button>Budget</button>
 * </FeatureLock>
 * ```
 */
export function FeatureLock({ feature, children, message, inline }: FeatureLockProps) {
  const { hasFeature } = useFeatureAccess();
  const { showToast } = useToast();
  const router = useRouter();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showToast(message || 'Fitur ini belum tersedia di paket kamu. Upgrade yuk! 🔓', 'warning');
    setTimeout(() => router.push('/billing'), 1500);
  };

  const Wrapper = inline ? 'span' : 'div';

  return (
    <Wrapper
      onClick={handleClick}
      style={{
        position: 'relative',
        cursor: 'pointer',
        display: inline ? 'inline-flex' : 'inline-block',
        opacity: 0.55,
        filter: 'grayscale(0.3)',
        transition: 'opacity 0.2s, filter 0.2s',
        userSelect: 'none',
      }}
      title="Fitur terkunci — upgrade paket untuk akses"
    >
      {/* Lock badge */}
      <span
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          zIndex: 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(var(--text-muted) / 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        <Lock size={10} color="white" />
      </span>
      {/* Render children with pointer-events disabled */}
      <span style={{ pointerEvents: 'none' }}>
        {children}
      </span>
    </Wrapper>
  );
}
