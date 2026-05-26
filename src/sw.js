import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

clientsClaim();
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ── Push notifications ──────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'WAY FIT', message: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'WAY FIT', {
      body: data.message || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'wayfit',
      renotify: true,
      data: { url: data.url || '/aluno/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/aluno/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const open = clients.find(c => c.url.includes(location.origin));
      if (open) { open.focus(); open.postMessage({ type: 'navigate', url }); return; }
      return self.clients.openWindow(url);
    })
  );
});
