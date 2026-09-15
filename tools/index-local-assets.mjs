import { readdir, lstat, writeFile, rename } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const images = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif']);
const audio = new Set(['.wav', '.mp3', '.ogg', '.m4a', '.flac']);

export async function collectLocalAssets(directory) {
  const entries = [];
  async function walk(relative) {
    const absolute = join(directory, relative);
    const info = await lstat(absolute).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!info || info.isSymbolicLink()) return;
    if (info.isDirectory()) {
      for (const child of await readdir(absolute, { withFileTypes: true })) {
        // Archived exporter test folders contain deliberate corrupt/blank images,
        // not authoring assets. Keep the evidence on disk without listing it here.
        if (!child.name.startsWith('.') && !child.name.startsWith('verifier-publish-')) await walk(`${relative}/${child.name}`);
      }
      return;
    }
    if (!info.isFile()) return;
    const extension = extname(relative).toLowerCase();
    const kind = images.has(extension) ? 'image' : audio.has(extension) ? 'audio' : null;
    if (!kind) return;
    const group = relative.startsWith('assets/') ? 'runtime'
      : relative.startsWith('art/history/') ? 'history'
        : relative.startsWith('art/previews/') ? 'review' : 'source';
    entries.push({ path: relative, kind, group, bytes: info.size, modified: Math.trunc(info.mtimeMs) });
  }
  // Include editable originals and archived work even when absent from the game manifest.
  // Temporary build directories are not part of the library.
  for (const folder of ['assets', 'art/source', 'art/renders', 'art/previews', 'art/history']) await walk(folder);
  const order = { runtime: 0, source: 1, review: 2, history: 3 };
  const kinds = { image: 0, audio: 1 };
  return entries.sort((a, b) => order[a.group] - order[b.group] || kinds[a.kind] - kinds[b.kind] || a.path.localeCompare(b.path, 'en'));
}

export async function writeLocalAssetIndex(directory = root) {
  const entries = await collectLocalAssets(directory);
  const output = join(directory, 'tools/local-assets.json');
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), entries }, null, 2) + '\n');
  await rename(temporary, output);
  return entries;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const entries = await writeLocalAssetIndex();
  console.log(`Local asset library: ${entries.length} files · http://localhost:8000/tools/asset-library.html`);
}
