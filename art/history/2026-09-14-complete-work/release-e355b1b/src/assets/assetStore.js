// Runtime art is optional. Gameplay owns positions and hit areas; this module owns
// decoded pixels only. Keep exported files immutable and update manifest.json.
export const DEFAULT_MANIFEST_URL = new URL('../../assets/game/manifest.json', import.meta.url).href;
export const ASSET_LIMITS = Object.freeze({
  manifestBytes: 128 * 1024,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 32 * 1024 * 1024,
  dimension: 8192,
  pixels: 16 * 1024 * 1024,
  totalPixels: 48 * 1024 * 1024,
  entries: 128
});

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function dimensions(width, height) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 &&
    width <= ASSET_LIMITS.dimension && height <= ASSET_LIMITS.dimension && width * height <= ASSET_LIMITS.pixels;
}

// Shared by the runtime, offline cache, and authoring validator.
export function validateAssetManifest(raw, manifestURL = DEFAULT_MANIFEST_URL) {
  const base = new URL(manifestURL);
  invariant(record(raw) && raw.schemaVersion === 1, 'Unsupported art manifest schema');
  invariant(typeof raw.revision === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(raw.revision), 'Invalid art revision');
  invariant(record(raw.assets), 'Invalid asset map');
  const entries = Object.entries(raw.assets);
  invariant(entries.length <= ASSET_LIMITS.entries, 'Too many art assets');
  const assets = Object.create(null);
  let pixels = 0;
  for (const [id, entry] of entries) {
    invariant(/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/.test(id) && record(entry), `Invalid asset: ${id}`);
    // No remote URLs, escaping folders, query strings, encoded paths, or source files.
    invariant(typeof entry.src === 'string' && /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|webp|jpe?g)$/.test(entry.src), `Invalid asset path: ${id}`);
    const url = new URL(entry.src, base);
    invariant(url.origin === base.origin && url.href.startsWith(new URL('./', base).href), `Nonlocal asset: ${id}`);
    invariant(dimensions(entry.width, entry.height), `Invalid dimensions: ${id}`);
    pixels += entry.width * entry.height;
    invariant(pixels <= ASSET_LIMITS.totalPixels, 'Art exceeds decoded memory budget');
    const anchor = entry.anchor ?? [0.5, 0.5];
    invariant(Array.isArray(anchor) && anchor.length === 2 && anchor.every(n => Number.isFinite(n) && n >= 0 && n <= 1), `Invalid anchor: ${id}`);
    const scale = entry.scale ?? 1;
    invariant(Number.isFinite(scale) && scale >= 0.05 && scale <= 4, `Invalid scale: ${id}`);
    assets[id] = Object.freeze({ src: entry.src, url: url.href, width: entry.width, height: entry.height, anchor: Object.freeze([...anchor]), scale });
  }
  return Object.freeze({ schemaVersion: 1, revision: raw.revision, assets: Object.freeze(assets) });
}

// Reject oversized downloads while reading, even when Content-Length is absent.
export async function readBoundedResponse(response, limit, signal) {
  invariant(response?.ok, `Asset request failed (${response?.status ?? 'no response'})`);
  const declared = Number(response.headers?.get('content-length'));
  invariant(!Number.isFinite(declared) || declared <= limit, 'Asset response is too large');
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    invariant(bytes.byteLength <= limit, 'Asset response is too large');
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      if (signal?.aborted) throw new Error('Art request aborted');
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      invariant(length <= limit, 'Asset response is too large');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

// Read dimensions before browser decoding, so a tiny compressed file cannot
// unexpectedly allocate a huge bitmap. PNG, JPEG, and WebP are export formats.
export function readRasterDimensions(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at, length) => String.fromCharCode(...bytes.subarray(at, at + length));
  let width, height, type;
  if (bytes.length >= 24 && bytes[0] === 137 && ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR') {
    width = v.getUint32(16); height = v.getUint32(20); type = 'image/png';
  } else if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4);
    if (chunk === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      width = v.getUint16(26, true) & 0x3fff; height = v.getUint16(28, true) & 0x3fff;
    } else if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const bits = v.getUint32(21, true);
      width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    }
    type = 'image/webp';
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at++] !== 0xff) break;
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (at + 2 > bytes.length) break;
      const length = v.getUint16(at);
      if (length < 2 || at + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        height = v.getUint16(at + 3); width = v.getUint16(at + 5); break;
      }
      at += length;
    }
    type = 'image/jpeg';
  }
  invariant(dimensions(width, height), 'Unsupported, malformed, or oversized raster image');
  return { width, height, type };
}

export function validateRaster(bytes, descriptor) {
  invariant(bytes.byteLength <= ASSET_LIMITS.fileBytes, 'Art file is too large');
  const raster = readRasterDimensions(bytes);
  invariant(raster.width === descriptor.width && raster.height === descriptor.height, `Art dimensions do not match manifest: ${descriptor.src}`);
  return raster;
}

async function decodeBrowserImage(blob, descriptor, signal) {
  invariant(typeof Image !== 'undefined', 'Image decoding is unavailable');
  const image = new Image();
  const url = URL.createObjectURL(blob);
  const abort = () => { image.src = ''; };
  signal.addEventListener('abort', abort, { once: true });
  try {
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    invariant(!signal.aborted && image.naturalWidth === descriptor.width && image.naturalHeight === descriptor.height, 'Decoded art dimensions are invalid');
    return image;
  } finally {
    signal.removeEventListener('abort', abort);
    URL.revokeObjectURL(url);
  }
}

export class AssetStore {
  constructor({ fetchImpl = (...args) => globalThis.fetch(...args), decodeImage = decodeBrowserImage, timeoutMs = 12000, baseURL = DEFAULT_MANIFEST_URL } = {}) {
    this._fetch = fetchImpl;
    this._decode = decodeImage;
    this._timeoutMs = timeoutMs;
    this._baseURL = new URL(baseURL).href;
    this._entries = new Map();
    this._generation = 0;
    this._controller = null;
    this.revision = 0;
    this.status = Object.freeze({ phase: 'idle', loaded: 0, total: 0, failed: [], manifestRevision: null });
  }

  get(id) { return this._entries.get(id); }

  async load(manifestURL = this._baseURL) {
    const generation = ++this._generation;
    this._controller?.abort();
    const controller = new AbortController();
    this._controller = controller;
    const { signal } = controller;
    const previousStatus = this.status;
    this.status = Object.freeze({ ...previousStatus, phase: 'loading' });
    let timer;
    let abortListener;
    try {
      const url = new URL(manifestURL, this._baseURL);
      invariant(/^https?:$/.test(url.protocol) && url.origin === new URL(this._baseURL).origin && url.href.startsWith(new URL('./', this._baseURL).href), 'Manifest must be local to this project');
      const work = async () => {
        const response = await this._fetch(url.href, { cache: 'no-cache', signal });
        invariant(!response.url || new URL(response.url).origin === url.origin, 'Manifest redirected outside project');
        const bytes = await readBoundedResponse(response, ASSET_LIMITS.manifestBytes, signal);
        const manifest = validateAssetManifest(JSON.parse(new TextDecoder().decode(bytes)), url.href);
        const entries = Object.entries(manifest.assets);
        const next = new Map();
        const failed = [];
        let cursor = 0, totalBytes = 0;
        const worker = async () => {
          while (cursor < entries.length && !signal.aborted) {
            const [id, descriptor] = entries[cursor++];
            const previous = this._entries.get(id);
            // A revision identifies one immutable set. Metadata changes still reload.
            if (previous?.manifestRevision === manifest.revision &&
                JSON.stringify(descriptor) === JSON.stringify(previous.descriptor)) {
              next.set(id, previous); continue;
            }
            try {
              const response = await this._fetch(descriptor.url, { cache: 'force-cache', signal });
              invariant(!response.url || new URL(response.url).origin === url.origin, 'Image redirected outside project');
              const bytes = await readBoundedResponse(response, ASSET_LIMITS.fileBytes, signal);
              totalBytes += bytes.byteLength;
              invariant(totalBytes <= ASSET_LIMITS.totalBytes, 'Art exceeds download budget');
              const raster = validateRaster(bytes, descriptor);
              const image = await this._decode(new Blob([bytes], { type: raster.type }), descriptor, signal);
              invariant(image && !signal.aborted &&
                (image.naturalWidth ?? image.width) === descriptor.width &&
                (image.naturalHeight ?? image.height) === descriptor.height, `Invalid decoded image: ${id}`);
              next.set(id, Object.freeze({ ...descriptor, image, descriptor, manifestRevision: manifest.revision }));
            } catch (error) {
              failed.push(Object.freeze({ id, message: String(error.message || error) }));
              if (previous) next.set(id, previous);
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(4, entries.length) }, worker));
        return { manifest, next, failed };
      };
      const aborted = new Promise((_, reject) => {
        abortListener = () => reject(new Error('Art loading timed out or was superseded'));
        signal.addEventListener('abort', abortListener, { once: true });
        timer = setTimeout(() => controller.abort(), this._timeoutMs);
      });
      const { manifest, next, failed } = await Promise.race([work(), aborted]);
      if (generation !== this._generation || signal.aborted) return this.status;
      const changed = next.size !== this._entries.size || [...next].some(([id, entry]) => this._entries.get(id) !== entry);
      this._entries = next; // IDs absent from a valid manifest are intentional removals.
      if (changed) this.revision++;
      this.status = Object.freeze({ phase: failed.length ? 'partial' : 'ready', loaded: next.size, total: Object.keys(manifest.assets).length, failed: Object.freeze(failed), manifestRevision: manifest.revision });
    } catch (error) {
      if (generation === this._generation) {
        this.status = Object.freeze({ ...previousStatus, phase: 'error', message: String(error.message || error) });
      }
    } finally {
      clearTimeout(timer);
      if (abortListener) signal.removeEventListener('abort', abortListener);
      if (generation === this._generation) this._controller = null;
    }
    return this.status;
  }
}

export const artAssets = new AssetStore();
