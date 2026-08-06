const CACHE_NAME = 'etat-major-personnel-v1';
const SHELL_ASSETS = ['/', '/manifest.json', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys.map((key) => (key === CACHE_NAME ? Promise.resolve() : caches.delete(key)))
      );
    })
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.status === 200) {
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, copy);
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const copy = response.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put('/', copy);
    }
    return response;
  } catch {
    const cached = await caches.match('/') || await caches.match('/index.html');
    if (cached) return cached;
    throw new Error('Offline');
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
