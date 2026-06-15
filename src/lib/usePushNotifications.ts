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

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      const wasSubscribed = localStorage.getItem(PUSH_SUBSCRIBED_KEY) === 'true';
      if (wasSubscribed && Notification.permission === 'granted') {
        setIsSubscribed(true);
      }
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      // Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Wait for service worker to be ready (with timeout)
      let registration: ServiceWorkerRegistration;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Service Worker not available')), 5000)
          ),
        ]);
      } catch {
        // SW not registered yet — register manually (try sw.js first, then custom-sw.js)
        try {
          let swUrl = '/sw.js';
          // Check if sw.js exists (next-pwa disables it in dev)
          const probe = await fetch('/sw.js', { method: 'HEAD' }).catch(() => null);
          if (!probe || !probe.ok) swUrl = '/custom-sw.js';

          registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
          // Wait for it to become active
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('SW activation timeout')), 8000);
            if (registration.active) { clearTimeout(timeout); resolve(); return; }
            const sw = registration.installing || registration.waiting;
            if (sw) {
              sw.addEventListener('statechange', () => {
                if (sw.state === 'activated') { clearTimeout(timeout); resolve(); }
              });
            } else {
              clearTimeout(timeout);
              reject(new Error('No SW to wait for'));
            }
          });
        } catch {
          console.warn('Could not register service worker for push');
          setLoading(false);
          return false;
        }
      }

      // Get VAPID public key
      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        (await apiFetch<{ publicKey: string }>('/notifications/push/vapid-key').then(
          (r) => r.publicKey,
        ));

      if (!vapidKey) {
        console.warn('No VAPID public key available');
        setLoading(false);
        return false;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const appServerKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as BufferSource,
        });
      }

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await apiFetch('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh,
              auth: subJson.keys?.auth,
            },
          },
        }),
      });

      setIsSubscribed(true);
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true');
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend
        await apiFetch('/notifications/push/unsubscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
