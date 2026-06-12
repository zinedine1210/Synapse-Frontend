// ─── Synapse Custom Service Worker (Push Notifications) ───────────────
// This file is injected into the generated sw.js via next-pwa's customWorkerDir
// or imported. It adds push notification handling to the Workbox service worker.

/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

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

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(sw.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        return sw.clients.openWindow(targetUrl);
      }),
  );
});
