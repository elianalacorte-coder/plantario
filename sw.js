const CACHE = 'piante-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/storage.js',
  './src/import.js',
  './src/export.js',
  './src/notifiche.js',
  './src/app.js',
  'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js',
  'https://unpkg.com/vue@3/dist/vue.global.js',
];

// Installazione — mette in cache tutti gli asset
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Attivazione — rimuove cache vecchie
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve dalla cache se offline
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Notifica mattutina — controllata ogni volta che il SW si sveglia
self.addEventListener('periodicsync', e => {
  if (e.tag === 'check-notifiche') {
    e.waitUntil(inviaNotificaMattutina());
  }
});

async function inviaNotificaMattutina() {
  const ora = new Date().getHours();
  if (ora < 7 || ora > 9) return; // solo tra le 7 e le 9
  self.registration.showNotification('🌿 Buongiorno!', {
    body: 'Controlla gli interventi di oggi nel tuo balcone',
    icon: 'icon-192.png',
  });
}
