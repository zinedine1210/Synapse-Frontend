'use client';

import { useState, useEffect, useCallback } from 'react';

const VISIT_COUNT_KEY = 'synapse_pwa_visit_count';
const INSTALL_DISMISSED_KEY = 'synapse_pwa_install_dismissed';
const VISIT_THRESHOLD = 3;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hook for managing PWA install prompt.
 * Tracks visits in localStorage and shows the install prompt after 3 visits.
 * Uses the `beforeinstallprompt` event to defer and control install timing.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Track visit count
    const currentCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(newCount));

    // Check if user previously dismissed the prompt
    const isDismissed = localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';

    // Determine if we should show the prompt
    const shouldShow = newCount >= VISIT_THRESHOLD && !isDismissed;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);

      if (shouldShow) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
  }, []);

  return {
    isInstallable,
    isInstalled,
    showPrompt,
    installApp,
    dismissPrompt,
  };
}
