import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { collectLocalAssets, writeLocalAssetIndex } from '../tools/index-local-assets.mjs';

async function fixture(context) {
  const root = await mkdtemp(join(tmpdir(), 'glintgrove-local-assets-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  async function put(path) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), 'fixture');
  }
  return { root, put };
}

test('indexes original and archived media outside the runtime manifest, with portable paths', async context => {
  const { root, put } = await fixture(context);
  for (const path of ['art/history/old/forest.WEBP', 'art/source/한글 원본.png', 'art/previews/review.jpg', 'assets/audio/music.wav', 'art/source/score.json', 'art/build/temp.png', 'art/history/production/verifier-publish-test/art/source/corrupt.png']) await put(path);
  const entries = await collectLocalAssets(root);
  assert.deepEqual(entries.map(e => [e.path, e.kind, e.group]), [
    ['assets/audio/music.wav', 'audio', 'runtime'],
    ['art/source/한글 원본.png', 'image', 'source'],
    ['art/previews/review.jpg', 'image', 'review'],
    ['art/history/old/forest.WEBP', 'image', 'history']
  ]);
  assert.ok(entries.every(entry => entry.bytes === 7 && Number.isFinite(entry.modified)));
});

test('does not traverse symlink files, directories or library roots', async context => {
  const { root, put } = await fixture(context);
  await put('outside/private.png');
  await mkdir(join(root, 'art/source'), { recursive: true });
  await symlink(join(root, 'outside'), join(root, 'assets'));
  await symlink(join(root, 'outside'), join(root, 'art/source/linked-folder'));
  await symlink(join(root, 'outside/private.png'), join(root, 'art/source/linked.png'));
  await put('art/source/.hidden.png');
  assert.deepEqual(await collectLocalAssets(root), []);
});

test('regeneration replaces stale entries after files are removed', async context => {
  const { root, put } = await fixture(context);
  await mkdir(join(root, 'tools'));
  await put('assets/old.png');
  await writeLocalAssetIndex(root);
  await rm(join(root, 'assets/old.png'));
  await put('art/source/new.png');
  await writeLocalAssetIndex(root);
  const index = JSON.parse(await readFile(join(root, 'tools/local-assets.json'), 'utf8'));
  assert.equal(index.version, 1);
  assert.deepEqual(index.entries.map(entry => entry.path), ['art/source/new.png']);
  assert.ok(!JSON.stringify(index).includes(root));
});
