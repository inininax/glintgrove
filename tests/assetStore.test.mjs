import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { AssetStore, ASSET_LIMITS, validateAssetManifest, readBoundedResponse, readRasterDimensions } from '../src/assets/assetStore.js';

const URL_ROOT = 'https://game.test/assets/game/';
const MANIFEST = URL_ROOT + 'manifest.json';
const png = (width = 2, height = 2) => {
  // Minimal header for pre-decode validation; injected decoder below models the
  // browser's independent decode boundary (including corrupt-stream failures).
  const bytes = new Uint8Array(32);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
};
const entry = (src = 'sprites/tree-v1.png', extra = {}) => ({ src, width: 2, height: 2, ...extra });
const manifest = (assets = { tree: entry() }, revision = 'v1') => ({ schemaVersion: 1, revision, assets });
const decode = async (_blob, descriptor) => ({ naturalWidth: descriptor.width, naturalHeight: descriptor.height });
function fixture(options = {}) {
  const state = { manifest: manifest(), files: new Map([[URL_ROOT + entry().src, png()]]), calls: [] };
  const fetchImpl = async (url, init) => {
    state.calls.push({ url, init });
    if (url === MANIFEST) return new Response(JSON.stringify(state.manifest));
    const bytes = state.files.get(url);
    return bytes ? new Response(bytes) : new Response('missing', { status: 404 });
  };
  return { state, store: new AssetStore({ baseURL: MANIFEST, fetchImpl, decodeImage: decode, ...options }) };
}

test('publishes only decoded image data and a revision for render cache invalidation', async () => {
  let release;
  const { store } = fixture({ decodeImage: () => new Promise(resolve => { release = () => resolve({ naturalWidth: 2, naturalHeight: 2 }); }) });
  const loading = store.load();
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(store.get('tree'), undefined);
  assert.equal(store.revision, 0);
  release();
  assert.equal((await loading).phase, 'ready');
  assert.equal(store.get('tree').url, URL_ROOT + entry().src);
  assert.deepEqual(store.get('tree').anchor, [0.5, 0.5]);
  assert.equal(store.revision, 1);
  await store.load();
  assert.equal(store.revision, 1, 'an unchanged immutable set reuses decoded data');
});

test('a missing or corrupt replacement retains the last decoded entry; initial failure stays optional', async () => {
  const { store, state } = fixture();
  await store.load();
  const previous = store.get('tree');
  state.manifest = manifest({ tree: entry('sprites/tree-v2.png'), new: entry('sprites/missing-v1.png') }, 'v2');
  assert.equal((await store.load()).phase, 'partial');
  assert.equal(store.get('tree'), previous);
  assert.equal(store.get('new'), undefined);
  assert.equal(store.revision, 1);
  state.files.set(URL_ROOT + 'sprites/tree-v2.png', png());
  store._decode = async () => { throw new Error('corrupt compressed stream'); };
  await store.load();
  assert.equal(store.get('tree'), previous);
  assert.equal(store.status.failed.length, 2);
});

test('changed dimensions, anchor and scale publish together after successful decode', async () => {
  const { store, state } = fixture();
  await store.load();
  state.manifest = manifest({ tree: entry('sprites/tree-v2.png', { width: 3, height: 4, anchor: [0.4, 0.8], scale: 1.12 }) }, 'v2');
  state.files.set(URL_ROOT + 'sprites/tree-v2.png', png(3, 4));
  await store.load();
  assert.equal(store.status.phase, 'ready');
  assert.equal(store.get('tree').width, 3);
  assert.equal(store.get('tree').height, 4);
  assert.deepEqual(store.get('tree').anchor, [0.4, 0.8]);
  assert.equal(store.get('tree').scale, 1.12);
  assert.equal(store.revision, 2);
});

test('wrong declared or decoded dimensions cannot replace working art', async () => {
  const { store, state } = fixture();
  await store.load();
  const previous = store.get('tree');
  state.manifest = manifest({ tree: entry('sprites/tree-v2.png', { width: 3 }) }, 'v2');
  state.files.set(URL_ROOT + 'sprites/tree-v2.png', png());
  await store.load();
  assert.equal(store.get('tree'), previous);
  state.files.set(URL_ROOT + 'sprites/tree-v2.png', png(3, 2));
  store._decode = async () => ({ naturalWidth: 20000, naturalHeight: 2 });
  await store.load();
  assert.equal(store.get('tree'), previous);
  assert.equal(store.status.phase, 'partial');
});

test('valid manifest omissions remove art; malformed manifests preserve the entire set', async () => {
  const { store, state } = fixture();
  await store.load();
  state.manifest = { schemaVersion: 99, assets: {} };
  assert.equal((await store.load()).phase, 'error');
  assert.ok(store.get('tree'));
  assert.equal(store.revision, 1);
  state.manifest = manifest({}, 'v2');
  await store.load();
  assert.equal(store.get('tree'), undefined);
  assert.equal(store.revision, 2);
});

test('newer load wins even when an aborted old fetch resolves late', async () => {
  let release;
  let calls = 0;
  const store = new AssetStore({ baseURL: MANIFEST, decodeImage: decode, fetchImpl: async url => {
    if (url === MANIFEST && calls++ === 0) return new Promise(resolve => { release = () => resolve(new Response(JSON.stringify(manifest({ old: entry() }, 'old')))); });
    if (url === MANIFEST) return new Response(JSON.stringify(manifest({ fresh: entry() }, 'new')));
    return new Response(png());
  } });
  const oldLoad = store.load();
  const newLoad = store.load();
  await newLoad;
  release();
  await oldLoad;
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(store.get('fresh'));
  assert.equal(store.get('old'), undefined);
  assert.equal(store.status.manifestRevision, 'new');
  assert.equal(store.revision, 1);
});

test('timeout settles even if an injected network never honors abort', async () => {
  const store = new AssetStore({ baseURL: MANIFEST, timeoutMs: 15, fetchImpl: () => new Promise(() => {}) });
  assert.equal((await store.load()).phase, 'error');
  assert.equal(store.revision, 0);
});

test('rejects external paths, traversal, unsafe metadata and decoded budgets', () => {
  for (const change of [
    { src: 'https://elsewhere.test/tree.png' }, { src: '../tree.png' }, { src: 'tree.png?new=1' },
    { src: '%2e%2e/tree.png' }, { src: 'sources/tree.blend' }, { width: NaN }, { height: -1 },
    { width: 8192, height: 8192 }, { anchor: [0, Infinity] }, { anchor: [1, 2] },
    { scale: 0 }, { scale: Infinity }, { scale: '1' }
  ]) assert.throws(() => validateAssetManifest(manifest({ tree: entry(undefined, change) }), MANIFEST));
  assert.throws(() => validateAssetManifest(manifest(Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`a${i}`, entry(`a${i}-v1.png`, { width: 4096, height: 4096 })]))), MANIFEST));
});

test('rejects foreign manifests and foreign redirects without fetching remote art', async () => {
  const { store, state } = fixture();
  await store.load('https://elsewhere.test/manifest.json');
  assert.equal(state.calls.length, 0);
  assert.equal(store.status.phase, 'error');
  store._fetch = async () => ({ ok: true, url: 'https://elsewhere.test/stolen.json' });
  await store.load();
  assert.equal(store.status.phase, 'error');
});

test('bounded response reader rejects advertised and streamed oversized bytes', async () => {
  await assert.rejects(readBoundedResponse(new Response('small', { headers: { 'Content-Length': ASSET_LIMITS.fileBytes + 1 } }), ASSET_LIMITS.fileBytes));
  await assert.rejects(readBoundedResponse(new Response(new Uint8Array(11)), 10));
  await assert.rejects(readBoundedResponse(new Response('missing', { status: 404 }), 10));
  assert.equal((await readBoundedResponse(new Response('okay'), 10)).byteLength, 4);
});

test('image headers reject decompression bombs before decoding and parse common exports', () => {
  assert.throws(() => readRasterDimensions(png(20000, 20000)));
  assert.throws(() => readRasterDimensions(new Uint8Array(30)));
  assert.deepEqual(readRasterDimensions(png(3, 4)), { width: 3, height: 4, type: 'image/png' });
  const webp = new Uint8Array(30);
  webp.set(new TextEncoder().encode('RIFF'), 0);
  webp.set(new TextEncoder().encode('WEBPVP8X'), 8);
  webp[24] = 2; webp[27] = 3;
  assert.deepEqual(readRasterDimensions(webp), { width: 3, height: 4, type: 'image/webp' });
});

// Exercise actual SW handlers without a browser: complete snapshot publication,
// failed replacement fallback, offline reads, and isolation from unrelated caches.
test('service worker keeps a complete offline art snapshot through a broken update', async () => {
  const saved = Object.fromEntries(['self', 'caches', 'fetch', 'crypto', 'createImageBitmap'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const handlers = new Map();
  const storage = new Map();
  const scope = 'https://game.test/';
  const keyOf = request => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const cacheStorage = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const data = storage.get(name);
      return {
        async match(key) { return data.get(keyOf(key))?.clone(); },
        async put(key, value) { data.set(keyOf(key), value.clone()); },
        async addAll(requests) {
          // Model an HTTP cache still holding yesterday's application code.
          for (const request of requests) {
            const body = request.cache === 'reload' ? 'current application code' : 'stale application code';
            data.set(keyOf(request), new Response(body));
          }
        }
      };
    },
    async keys() { return [...storage.keys()]; },
    async delete(key) { return storage.delete(key); }
  };
  let liveManifest = manifest();
  let offline = false;
  let missing = false;
  let claimed = false;
  let skipped = false;
  try {
    Object.defineProperties(globalThis, {
      self: { configurable: true, value: { location: new URL(scope + 'sw.js'), addEventListener: (name, handler) => handlers.set(name, handler), skipWaiting: async () => { skipped = true; }, clients: { claim: async () => { claimed = true; } } } },
      caches: { configurable: true, value: cacheStorage },
      crypto: { configurable: true, value: webcrypto },
      createImageBitmap: { configurable: true, value: async blob => ({ ...readRasterDimensions(new Uint8Array(await blob.arrayBuffer())), close() {} }) },
      fetch: { configurable: true, value: async request => {
        if (offline) throw new Error('offline');
        const url = keyOf(request);
        if (url === MANIFEST) return new Response(JSON.stringify(liveManifest));
        return missing ? new Response('missing', { status: 404 }) : new Response(png());
      } }
    });
    await import(`../sw.js?asset-tests=${Date.now()}`);
    const runLifecycle = async name => { let work; handlers.get(name)({ waitUntil: promise => { work = promise; } }); await work; };
    const fetchSW = async url => { let work; handlers.get('fetch')({ request: new Request(url), respondWith: promise => { work = promise; } }); return work; };
    await cacheStorage.open('other-app-cache');
    await runLifecycle('install');
    assert.equal(skipped, true);
    assert.equal(await (await fetchSW(scope + 'src/game/game.js')).text(), 'current application code',
      'a new service worker must not seed its application cache from stale HTTP cache entries');
    const first = await fetchSW(MANIFEST);
    assert.equal((await first.json()).revision, 'v1');
    liveManifest = manifest({ tree: entry('sprites/tree-v2.png') }, 'v2');
    missing = true;
    const failedUpdate = await fetchSW(MANIFEST);
    assert.equal((await failedUpdate.json()).revision, 'v1', 'broken update cannot publish a manifest with missing art');
    offline = true;
    const cachedManifest = await fetchSW(MANIFEST);
    assert.equal((await cachedManifest.json()).revision, 'v1');
    const cachedImage = await fetchSW(URL_ROOT + entry().src);
    assert.equal(cachedImage.ok, true);
    assert.equal((await cachedImage.arrayBuffer()).byteLength, png().byteLength);
    await runLifecycle('activate');
    assert.equal(claimed, true);
    assert.ok(storage.has('other-app-cache'));
    assert.equal(await fetchSW('https://game.test/art/source/tree.blend'), undefined, 'editable sources never enter runtime caching');
    assert.equal([...storage.keys()].filter(key => key.startsWith('glintgrove-art-snapshot')).length, 1);
    offline = false;
    missing = false;
    const upgraded = await fetchSW(MANIFEST);
    assert.equal((await upgraded.json()).revision, 'v2');
    assert.equal([...storage.keys()].filter(key => key.startsWith('glintgrove-art-snapshot')).length, 2);
    const refreshed = await fetchSW(MANIFEST);
    assert.equal((await refreshed.json()).revision, 'v2');
    assert.equal([...storage.keys()].filter(key => key.startsWith('glintgrove-art-snapshot')).length, 2,
      'unchanged refresh must retain the previous version for already-open tabs');
    offline = true;
    assert.equal((await fetchSW(URL_ROOT + entry().src)).ok, true, 'old-tab v1 art remains available offline after v2 refresh');
    assert.equal((await fetchSW(URL_ROOT + 'sprites/tree-v2.png')).ok, true);
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
