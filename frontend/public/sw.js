const CACHE = 'pico-boq-v1';
const PRECACHE = ['/', '/login', '/register', '/app/dashboard'];

// ── Install: pre-cache app shell ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ──────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // API calls: network-first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Pico Bello BOQ', message: 'You have a new notification.' };
  try { data = event.data.json(); } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: data.tag || 'boq-notification',
      renotify: true,
      data: { url: data.link || '/app/dashboard' },
    })
  );
});

// ── Notification click ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/app/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
