'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Session-only dismiss key (cleared when browser tab closes).
 * NOT localStorage — so next session will show popup again if not installed.
 */
const SESSION_DISMISSED_KEY = 'synapse_pwa_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent);
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS standalone detection
  if ('standalone' in window.navigator && (window.navigator as any).standalone) return true;
  // Standard display-mode detection (Chrome/Android/Edge)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // TWA / fullscreen PWA
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
}

/**
 * Hook for managing PWA install prompt.
 * 
 * Detection uses display-mode (standalone) — NOT localStorage.
 * This means if the user removes the app from home screen, the popup
 * will appear again on their next visit.
 * 
 * Dismiss uses sessionStorage (cleared per tab), so it won't annoy
 * during the same browsing session but will re-appear next session.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already running as installed app — don't show anything
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Only show on mobile devices
    if (!isMobileDevice()) return;

    // Check session dismiss (only lasts for this tab session)
    const dismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1';
    if (dismissed) return;

    // Detect iOS (no beforeinstallprompt — needs manual instructions)
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS: show prompt immediately (with manual instructions)
      setIsInstallable(true);
      setShowPrompt(true);
      return;
    }

    // Android/Chrome: listen for beforeinstallprompt
    let promptFired = false;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptFired = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback: if beforeinstallprompt doesn't fire within 3s,
    // still show a manual install prompt for Android
    const fallbackTimer = setTimeout(() => {
      if (!promptFired) {
        setIsInstallable(true);
        setShowPrompt(true);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
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
    // Session-only dismiss — will show again next browser session
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    canNativeInstall: deferredPrompt !== null,
    showPrompt,
    installApp,
    dismissPrompt,
  };
}
