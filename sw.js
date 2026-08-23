const CACHE = 'glintgrove-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './src/main.js',
  './src/core/version.js',
  './src/core/tiles.js',
  './src/core/colors.js',
  './src/core/math.js',
  './src/core/emitter.js',
  './src/sim/index.js',
  './src/sim/parser.js',
  './src/sim/tracer.js',
  './src/sim/solver.js',
  './src/data/levels.js',
  './src/state/saveStore.js',
  './src/fx/particles.js',
  './src/fx/sound.js',
  './src/render/renderer.js',
  './src/render/layout.js',
  './src/render/background.js',
  './src/render/beams.js',
  './src/render/entities.js',
  './src/game/game.js',
  './src/ui/ui.js',
  './src/ui/strings.js',
  './src/services/daily.js',
  './src/services/achievements.js',
  './src/infra/analytics.js',
  './src/infra/errorHandler.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ||
      fetch(event.request)
        .then(res => {
          if (res.ok && new URL(event.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached)
    )
  );
});
