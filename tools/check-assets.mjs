#!/usr/bin/env node
// Dependency-free export checks. Browser Image.decode remains the final decoder.
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ASSET_LIMITS, validateAssetManifest, validateRaster } from '../src/assets/assetStore.js';

const manifestPath = resolve(process.argv[2] || fileURLToPath(new URL('../assets/game/manifest.json', import.meta.url)));
try {
  const root = await realpath(dirname(manifestPath));
  const manifestBytes = await readFile(manifestPath);
  if (manifestBytes.byteLength > ASSET_LIMITS.manifestBytes) throw new Error('Manifest exceeds 128 KB');
  const manifest = validateAssetManifest(JSON.parse(manifestBytes.toString('utf8')), pathToFileURL(manifestPath).href);
  let total = 0;
  for (const [id, asset] of Object.entries(manifest.assets)) {
    if (!/-v\d+(?:[a-zA-Z0-9_-]*)\.(?:png|webp|jpe?g)$/.test(asset.src)) {
      throw new Error(`${id}: exported filename must contain a version suffix, e.g. tree-v2.png`);
    }
    const path = await realpath(fileURLToPath(asset.url));
    const inside = relative(root, path);
    if (inside === '..' || inside.startsWith(`..${sep}`)) throw new Error(`${id}: export escapes assets/game via a symlink`);
    const info = await stat(path);
    if (!info.isFile() || info.size > ASSET_LIMITS.fileBytes) throw new Error(`${id}: invalid file or export larger than 8 MB`);
    total += info.size;
    if (total > ASSET_LIMITS.totalBytes) throw new Error('Art exports exceed total 32 MB budget');
    const raster = validateRaster(new Uint8Array(await readFile(path)), asset);
    console.log(`${id}: ${raster.width}×${raster.height}, ${(info.size / 1024).toFixed(1)} KB, ${asset.src}`);
  }
  console.log(`Art exports valid: ${Object.keys(manifest.assets).length} assets, ${(total / 1024 / 1024).toFixed(2)} MB, revision ${manifest.revision}`);
} catch (error) {
  console.error(`Art validation failed: ${error.message}`);
  process.exitCode = 1;
}
