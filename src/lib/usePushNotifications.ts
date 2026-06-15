'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

const PUSH_SUBSCRIBED_KEY = 'synapse_push_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Verify actual subscription state (don't just trust localStorage)
      (async () => {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub && Notification.permission === 'granted') {
            setIsSubscribed(true);
            localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
          } else {
            setIsSubscribed(false);
            localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
          }
        } catch {
          // SW not ready yet — fall back to localStorage
          const wasSubscribed = localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true';
          if (wasSubscribed && Notification.permission === 'granted') {
            setIsSubscribed(true);
          }
        }
      })();
    }
  }, []);

  const subscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) {
      const msg = 'Browser tidak mendukung push notification.';
      setError(msg);
      return { ok: false, error: msg };
    }

    // iOS check — must be installed as PWA
    if (isIOS() && !isStandalone()) {
      const msg = 'Di iOS, tambahkan website ke Home Screen terlebih dahulu (Share → Add to Home Screen), lalu aktifkan push dari sana.';
      setError(msg);
      return { ok: false, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        const msg = perm === 'denied'
          ? 'Izin notifikasi ditolak. Buka pengaturan browser dan izinkan notifikasi untuk situs ini.'
          : 'Izin notifikasi belum diberikan. Silakan coba lagi dan klik "Izinkan".';
        setError(msg);
        setLoading(false);
        return { ok: false, error: msg };
      }

      // Get or register service worker
      let registration: ServiceWorkerRegistration | undefined;

      // Step 1: Check if SW is already registered
      registration = await navigator.serviceWorker.getRegistration('/');

      // Step 2: If not registered, register manually
      if (!registration) {
        try {
          let swUrl = '/sw.js';
          const probe = await fetch('/sw.js', { method: 'HEAD' }).catch(() => null);
          if (!probe || !probe.ok) swUrl = '/custom-sw.js';
          registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
        } catch (e) {
          const msg = 'Gagal mendaftarkan service worker. Coba refresh halaman dan ulangi.';
          setError(msg);
          setLoading(false);
          console.error('SW register error:', e);
          return { ok: false, error: msg };
        }
      }

      // Step 3: Wait for SW to become active (handles installing/waiting states)
      if (!registration.active) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('SW activation timeout')), 20000);

            // Check if it activated while we were setting up
            if (registration!.active) { clearTimeout(timeout); resolve(); return; }

            const sw = registration!.installing || registration!.waiting;
            if (sw) {
              sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') { clearTimeout(timeout); resolve(); }
                if (sw.state === 'redundant') { clearTimeout(timeout); reject(new Error('SW became redundant')); }
              });
            } else {
              // No installing/waiting/active — try navigator.serviceWorker.ready as last resort
              clearTimeout(timeout);
              const readyTimeout = setTimeout(() => reject(new Error('SW ready timeout')), 20000);
              navigator.serviceWorker.ready.then((reg) => {
                clearTimeout(readyTimeout);
                registration = reg;
                resolve();
              }).catch(reject);
            }
          });
        } catch (e) {
          // Last resort: try navigator.serviceWorker.ready without timeout
          // This promise NEVER rejects and always eventually resolves
          try {
            registration = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('final timeout')), 25000)),
            ]);
          } catch {
            const msg = 'Service worker belum siap. Coba tutup dan buka ulang aplikasi.';
            setError(msg);
            setLoading(false);
            console.error('SW activation error:', e);
            return { ok: false, error: msg };
          }
        }
      }

      // Get VAPID public key
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        (await apiFetch<{ publicKey: string }>('/notifications/push/vapid-key').then(
          (r) => r.publicKey,
        ));

      if (!vapidKey) {
        const msg = 'VAPID key tidak tersedia. Hubungi administrator.';
        setError(msg);
        setLoading(false);
        return { ok: false, error: msg };
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const appServerKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      // Send subscription to backend
      const subJson = subscription.toJSON();

      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        const msg = 'Data subscription tidak lengkap. Coba hapus data situs di pengaturan browser dan ulangi.';
        setError(msg);
        setLoading(false);
        return { ok: false, error: msg };
      }

      const result = await apiFetch<{ success?: boolean; error?: string }>('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          },
        }),
      });

      if (result?.error) {
        const msg = result.error;
        setError(msg);
        setLoading(false);
        return { ok: false, error: msg };
      }

      setIsSubscribed(true);
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
      setError(null);
      setLoading(false);
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || 'Gagal mengaktifkan push notification. Coba lagi.';
      setError(msg);
      console.error('Push subscription failed:', err);
      setLoading(false);
      return { ok: false, error: msg };
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported) return { ok: false, error: 'Tidak didukung' };
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend
        try {
          await apiFetch('/notifications/push/unsubscribe', {
            method: 'DELETE',
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        } catch {
          // Backend might fail but still unsubscribe locally
        }

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
      setLoading(false);
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || 'Gagal menonaktifkan push notification.';
      setError(msg);
      console.error('Push unsubscribe failed:', err);
      setLoading(false);
      return { ok: false, error: msg };
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
