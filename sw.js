import { ASSET_LIMITS, validateAssetManifest, readBoundedResponse, validateRaster } from './src/assets/assetStore.js';

// Bump CORE_CACHE whenever application code changes. Runtime art uses independent
// complete snapshots, so editing artwork cannot strand the offline application.
const CORE_CACHE = 'glintgrove-core-v9-jeweled-title';
// Retire the previous image-generation edition during activation. Future
// complete snapshots within this geometry edition still support open clients.
const ART_INDEX = 'glintgrove-art-index-v2-original';
const ART_PREFIX = 'glintgrove-art-snapshot-v2-original-';
const MANIFEST_URL = new URL('./assets/game/manifest.json', self.location.href).href;
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './assets/site/icon.svg',
  './assets/site/ilyndrel-wordmark-v2.webp',
  './src/main.js',
  './src/assets/assetStore.js',
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
  './src/data/levels.generated.js',
  './src/services/generator.js',
  './src/state/saveStore.js',
  './src/fx/particles.js',
  './src/fx/sound.js',
  './src/fx/music.js',
  './src/render/renderer.js',
  './src/render/bloom.js',
  './src/render/gradientCache.js',
  './src/render/layout.js',
  './src/render/background.js',
  './src/render/beams.js',
  './src/render/targetFx.js',
  './src/render/entities.js',
  './src/render/sprites.js',
  './src/game/game.js',
  './src/ui/ui.js',
  './src/ui/colorMarks.js',
  './src/ui/deviceGuide.js',
  './src/ui/symbols.js',
  './src/ui/strings.js',
  './src/services/daily.js',
  './src/services/achievements.js',
  './src/infra/analytics.js',
  './src/infra/errorHandler.js',
  './src/core/skins.js',
  './src/services/config.js',
  './src/services/tutorial.js',
  './config.json'
];

// Music is cached on its first request, after the user enables playback. It is
// deliberately absent from installation so the opening screen stays lightweight.
const LAZY_ASSETS = ['./assets/audio/ancient-forest-v2.wav'];
const CORE_URLS = new Set([...ASSETS, ...LAZY_ASSETS].map(path => new URL(path, self.location.href).href));
let artRefresh = null;

function refreshArt() {
  if (artRefresh) return artRefresh;
  artRefresh = buildArtSnapshot().finally(() => { artRefresh = null; });
  return artRefresh;
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Art cache timed out'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    promise.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) value?.close?.();
      else resolve(value);
    }, error => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
  });
}

async function buildArtSnapshot() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const index = await caches.open(ART_INDEX);
  const previous = await index.match(MANIFEST_URL);
  let snapshotName;
  let committed = false;
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store', signal: controller.signal });
    if (response.url && new URL(response.url).origin !== self.location.origin) throw new Error('Nonlocal manifest');
    const bytes = await readBoundedResponse(response, ASSET_LIMITS.manifestBytes, controller.signal);
    const json = new TextDecoder().decode(bytes);
    const manifest = validateAssetManifest(JSON.parse(json), MANIFEST_URL);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
    snapshotName = ART_PREFIX + hash.slice(0, 24);
    const snapshot = await caches.open(snapshotName);
    const complete = await snapshot.match(MANIFEST_URL);
    if (!complete) {
      let totalBytes = 0;
      const entries = Object.values(manifest.assets);
      let cursor = 0;
      const worker = async () => {
        while (cursor < entries.length) {
          const descriptor = entries[cursor++];
          const imageResponse = await fetch(descriptor.url, { cache: 'no-store', signal: controller.signal });
          if (imageResponse.url && new URL(imageResponse.url).origin !== self.location.origin) throw new Error('Nonlocal image');
          const imageBytes = await readBoundedResponse(imageResponse, ASSET_LIMITS.fileBytes, controller.signal);
          totalBytes += imageBytes.byteLength;
          if (totalBytes > ASSET_LIMITS.totalBytes) throw new Error('Art download budget exceeded');
          const raster = validateRaster(imageBytes, descriptor);
          const blob = new Blob([imageBytes], { type: raster.type });
          if (typeof createImageBitmap === 'function') {
            const bitmap = await abortable(createImageBitmap(blob), controller.signal);
            const valid = bitmap.width === descriptor.width && bitmap.height === descriptor.height;
            bitmap.close();
            if (!valid) throw new Error('Art decode mismatch');
          }
          await snapshot.put(descriptor.url, new Response(blob, { headers: { 'Content-Type': raster.type } }));
        }
      };
      // Settle every writer before deleting an incomplete snapshot on failure.
      const results = await Promise.allSettled(Array.from({ length: Math.min(4, entries.length) }, worker));
      const failure = results.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
      if (controller.signal.aborted) throw new Error('Art cache timed out');
    }
    const manifestResponse = new Response(json, {
      headers: { 'Content-Type': 'application/json', 'X-Glintgrove-Art-Cache': snapshotName }
    });
    // Publish the manifest only after every referenced image has been cached.
    await snapshot.put(MANIFEST_URL, manifestResponse.clone());
    await index.put(MANIFEST_URL, manifestResponse.clone());
    committed = true;
    const previousName = previous?.headers.get('X-Glintgrove-Art-Cache');
    // Refreshing the current manifest is not a version transition: its prior
    // snapshot still belongs to open tabs and must survive repeated refreshes.
    if (previousName !== snapshotName) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith(ART_PREFIX) && key !== snapshotName && key !== previousName).map(key => caches.delete(key)));
    }
    return manifestResponse;
  } finally {
    clearTimeout(timer);
    if (!committed && snapshotName && snapshotName !== previous?.headers.get('X-Glintgrove-Art-Cache')) {
      await caches.delete(snapshotName);
    }
  }
}

async function artManifest() {
  try { return await refreshArt(); }
  catch {
    const fallback = await (await caches.open(ART_INDEX)).match(MANIFEST_URL);
    return fallback || Response.error();
  }
}

async function artImage(request) {
  // A served manifest always points to a complete snapshot. Keep one previous
  // snapshot for tabs already running during an art update.
  const index = await caches.open(ART_INDEX);
  const manifest = await index.match(MANIFEST_URL);
  const current = manifest?.headers.get('X-Glintgrove-Art-Cache');
  if (current) {
    const cached = await (await caches.open(current)).match(request);
    if (cached) return cached;
  }
  const keys = await caches.keys();
  for (const key of keys.filter(key => key.startsWith(ART_PREFIX) && key !== current)) {
    const cache = await caches.open(key);
    if (!await cache.match(MANIFEST_URL)) continue; // Ignore incomplete snapshots.
    const cached = await cache.match(request);
    if (cached) return cached;
  }
  // Unlisted images and editable sources are never added to runtime caches.
  return fetch(request);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const requests = ASSETS.map(path => new Request(new URL(path, self.location.href), { cache: 'reload' }));
    await (await caches.open(CORE_CACHE)).addAll(requests);
    await refreshArt().catch(() => {}); // Optional art cannot reject core install.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('glintgrove-') &&
      key !== CORE_CACHE && key !== ART_INDEX && !key.startsWith(ART_PREFIX)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.href === MANIFEST_URL) {
    event.respondWith(artManifest());
    return;
  }
  if (url.pathname.startsWith(new URL('./assets/game/', self.location.href).pathname)) {
    event.respondWith(artImage(event.request));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CORE_CACHE);
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put('./index.html', response.clone());
        return response;
      } catch {
        return await cache.match('./index.html') || Response.error();
      }
    })());
    return;
  }
  // Cache only the explicit application shell, never Blender/image-generation
  // sources, research downloads, or unrelated same-origin requests.
  if (!CORE_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CORE_CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
