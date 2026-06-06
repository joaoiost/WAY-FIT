import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

clientsClaim();
self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Supabase REST API — NetworkFirst com fallback de 5s (funciona offline com cache)
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-api-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// Imagens de exercícios (Wikidata, CDN) — CacheFirst, duram 30 dias
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'exercise-images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Navegação (HTML do app shell) — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'app-shell-v1',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

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
