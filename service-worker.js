const CACHE_NAME = 'osgb-saas-cache-step3-index-tenant';
const APP_SHELL = [
  './',
  './risk.html',
  './dashboard.html',
  './saas-admin.html',
  './actions.html',
  './company-detail.html',
  './login.html',
  './offline.html',
  './offline-db.js',
  './sync-risks.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppFile = url.origin === self.location.origin;
  const isSupabaseRequest = url.hostname.endsWith('.supabase.co');

  // Supabase API ve Storage istekleri asla cache'lenmemeli.
  // Aksi halde internet geri gelince tablo eski Supabase cevabini gosterebilir.
  if (isSupabaseRequest) {
    return;
  }

  if (isAppFile) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('./offline.html');
        }))
    );
    return;
  }

  // Supabase disindaki harici kaynaklar icin cache-first kullanabiliriz.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
