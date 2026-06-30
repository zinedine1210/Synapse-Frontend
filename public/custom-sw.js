// ─── Synapse Custom Service Worker (Push Notifications) ───────────────
// This file handles push notifications. It can be:
// 1. Injected into the Workbox-generated sw.js via next-pwa's importScripts
// 2. Registered directly as a standalone SW (e.g. in dev mode)

/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

// ─── Lifecycle: Activate immediately ───────────────────────────────────
// These are essential when this file is registered as a standalone SW.
// When injected into Workbox's sw.js, Workbox handles skipWaiting/clientsClaim
// separately, so these are harmless duplicates.
sw.addEventListener('install', (event) => {
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});
// ─── Push Event: Receive push notification from server ─────────────────
sw.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Synapse',
      body: event.data.text(),
      url: '/notifications',
      icon: '/icons/icon-192x192.png',
    };
  }

  const title = data.title || 'Synapse';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    data: {
      url: data.url || '/notifications',
    },
    vibrate: [100, 50, 100],
    tag: data.tag || 'synapse-notification',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

// ─── Notification Click: Open the app to the relevant page ─────────────
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/notifications';
  const urlToOpen = new URL(targetUrl, sw.location.origin).href;

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(sw.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // Otherwise open a new window
        return sw.clients.openWindow(urlToOpen);
      }),
  );
});
