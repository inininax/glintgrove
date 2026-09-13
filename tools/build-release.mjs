// Build a runtime-only directory. Authoring sources and retired art stay local.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { ASSET_LIMITS, validateAssetManifest, validateRaster } from '../src/assets/assetStore.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const dest = path.join(root, 'dist');
const stage = path.join(root, `.release-stage-${process.pid}`);
const realRoot = await fs.realpath(root);
async function localSource(relative) {
  const source = path.join(root, relative);
  let ancestor = root;
  for (const part of relative.split('/')) {
    ancestor = path.join(ancestor, part);
    if ((await fs.lstat(ancestor)).isSymbolicLink()) throw new Error(`Symlink in runtime source: ${relative}`);
  }
  const realSource = await fs.realpath(source);
  if (!realSource.startsWith(realRoot + path.sep)) throw new Error(`Source outside project: ${relative}`);
  return source;
}
const manifestBytes = await fs.readFile(await localSource('assets/game/manifest.json'));
if (manifestBytes.length > ASSET_LIMITS.manifestBytes) throw new Error('Oversized manifest');
const manifest = validateAssetManifest(JSON.parse(manifestBytes), 'https://release.invalid/assets/game/manifest.json');
const artEntries = new Map(Object.values(manifest.assets).map(asset => [`assets/game/${asset.src}`, asset]));
const files = new Set(['index.html', 'css/style.css', 'manifest.webmanifest', 'sw.js',
  'config.json', 'assets/site/icon.svg', 'assets/site/share.png',
  'assets/site/ilyndrel-wordmark-v2.webp',
  'assets/audio/ancient-forest-v2.wav', 'assets/game/manifest.json', 'THIRD_PARTY_NOTICES.md']);
async function sourceFiles(directory) {
  for (const item of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    if (item.name === '.DS_Store') continue;
    const relative = path.posix.join(directory, item.name);
    if (item.isDirectory()) await sourceFiles(relative);
    else if (item.isFile() && item.name.endsWith('.js')) files.add(relative);
    else throw new Error(`Unexpected runtime source: ${relative}`);
  }
}
await sourceFiles('src');
for (const asset of Object.values(manifest.assets)) files.add(`assets/game/${asset.src}`);
// Only replace a directory previously created by this tool.
const existing = await fs.lstat(dest).catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (existing) {
  const stat = existing;
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('dist is not an owned directory');
  const marker = JSON.parse(await fs.readFile(path.join(dest, 'release-files.json')));
  if (marker.builder !== 'ilyndrel-runtime-release-v1' || !Array.isArray(marker.files)) throw new Error('Unrecognized dist contents');
  const recorded = new Map(marker.files.map(entry => [entry.path, entry.sha256]));
  const allowedDirectories = new Set();
  for (const entry of marker.files) {
    if (typeof entry.path !== 'string' || entry.path.startsWith('/') || entry.path.split('/').includes('..')) throw new Error('Invalid release marker');
    const parts = entry.path.split('/');
    for (let i = 1; i < parts.length; i++) allowedDirectories.add(parts.slice(0, i).join('/'));
  }
  async function checkOwned(directory = '') {
    for (const item of await fs.readdir(path.join(dest, directory), { withFileTypes: true })) {
      const relative = path.posix.join(directory, item.name);
      if (item.isDirectory() && allowedDirectories.has(relative)) await checkOwned(relative);
      else if (item.isFile() && relative === 'release-files.json') continue;
      else if (item.isFile() && recorded.has(relative)) {
        const data = await fs.readFile(path.join(dest, relative));
        if (createHash('sha256').update(data).digest('hex') !== recorded.get(relative)) throw new Error(`Preserving modified dist file: ${relative}`);
      } else throw new Error(`Preserving unrecognized dist content: ${relative}`);
    }
  }
  await checkOwned();
}

const entries = [];
let createdStage = false;
let artBytes = 0;
try {
  await fs.mkdir(stage);
  createdStage = true;
  for (const relative of [...files].sort()) {
    const source = await localSource(relative);
    const stat = await fs.lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Not a regular file: ${relative}`);
    const data = relative === 'assets/game/manifest.json' ? manifestBytes : await fs.readFile(source);
    const digest = createHash('sha256').update(data).digest('hex');
    if (artEntries.has(relative)) {
      validateRaster(data, artEntries.get(relative));
      artBytes += data.length;
      if (artBytes > ASSET_LIMITS.totalBytes) throw new Error('Art release exceeds byte budget');
      const embeddedHash = relative.match(/-([a-f0-9]{12})\.(?:png|webp)$/)?.[1];
      if (embeddedHash && !digest.startsWith(embeddedHash)) throw new Error(`Art content hash mismatch: ${relative}`);
    }
    const target = path.join(stage, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    entries.push({ path: relative, bytes: data.length, sha256: digest });
  }
  await fs.writeFile(path.join(stage, 'release-files.json'), JSON.stringify({
    builder: 'ilyndrel-runtime-release-v1', artRevision: manifest.revision, files: entries
  }, null, 2) + '\n');
  const backup = path.join(root, `.release-previous-${process.pid}`);
  let moved = false;
  try { await fs.rename(dest, backup); moved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await fs.rename(stage, dest); } catch (error) { if (moved) await fs.rename(backup, dest); throw error; }
  if (moved) await fs.rm(backup, { recursive: true });
  console.log(`Built ${entries.length} runtime files in dist/; no upload or deployment performed.`);
} finally {
  if (createdStage) await fs.rm(stage, { recursive: true, force: true });
}
