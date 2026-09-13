import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = '/Users/kyungseok.lee/workspace-git/glintgrove';
const rel = 'tools/record-visual-provenance.mjs';
const registry = 'docs/legal/replacement-register.json';
const raw = await fs.readFile(path.join(root, registry));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const before = digest(raw);
const old = JSON.parse(raw);
const script = await fs.readFile(path.join(root, rel), 'utf8');
const sourcePaths = [...script.split('const sourceFiles = [')[1].split('\n];')[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
const paths = new Set([...sourcePaths, registry, 'assets/game/manifest.json', 'art/retired/retirement-register.json']);
for (const entry of [...old.masters, ...old.assets.flatMap(a => [a.source, a.runtime]), ...old.siteImages, ...old.reviewImages]) paths.add(entry.path);
paths.add('art/source/procedural/share-v2.png');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ilyndrel-recorder-'));
let passed = 0;
const run = () => {
  execFileSync(process.execPath, [path.join(temp, rel)], { cwd: temp, stdio: 'pipe' });
  return fs.readFile(path.join(temp, registry), 'utf8').then(JSON.parse);
};
const review = item => assert.equal(item.provenanceStatus, 'renewed-provenance-review-required');
const change = async (file, check) => {
  const target = path.join(temp, file), saved = await fs.readFile(target);
  try { await fs.appendFile(target, '\nchanged fixture bytes'); await check(await run()); }
  finally { await fs.writeFile(target, saved); }
};
try {
  for (const file of paths) {
    const target = path.join(temp, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, file), target).catch(e => { if (e.code !== 'ENOENT' || !file.startsWith('art/retired/')) throw e; });
  }
  const baseline = await run();
  assert.equal(baseline.assets.length, 25);
  for (const item of baseline.assets) {
    assert.equal(item.provenanceStatus, 'verified-against-local-generation-records');
    assert.equal(item.production, item.id.includes('.') || !['forest','depths','garden','heart'].includes(item.id) ? 'retained-local-blender-sculpture' : 'new-local-blender-environment');
  }
  assert.equal(baseline.recordedDate, new Date().toISOString().slice(0,10));
  assert.ok(Math.abs(Date.now() - Date.parse(baseline.recordedAt)) < 5000);
  assert.equal(baseline.copyrightClearance, 'not-established');
  passed++; console.log('PASS known 25 sources/masters, actual timestamp, no clearance');
  const sprite = baseline.assets.find(a => a.production === 'retained-local-blender-sculpture');
  const forest = baseline.assets.find(a => a.id === 'forest');
  for (const item of [sprite, forest]) {
    await change(item.source.path, next => { review(next.assets.find(a => a.id === item.id)); assert.equal(next.assets.filter(a => a.provenanceStatus.startsWith('verified')).length,24); });
    passed++; console.log('PASS changed source:', item.id);
  }
  for (const master of baseline.masters) {
    await change(master.path, next => {
      const affected = next.assets.filter(a => a.master?.path === master.path || a.parentMaster?.path === master.path);
      assert.equal(affected.length, master.path.includes('grove-library') ? 21 : 4);
      affected.forEach(review);
    });
    passed++; console.log('PASS changed master:', master.path);
  }
  const masterPath = path.join(temp, baseline.masters[0].path);
  await fs.rename(masterPath, masterPath + '.fixture-save');
  try { const next = await run(); next.assets.filter(a => a.master?.path === baseline.masters[0].path || a.parentMaster?.path === baseline.masters[0].path).forEach(review); }
  finally { await fs.rename(masterPath + '.fixture-save', masterPath); }
  passed++; console.log('PASS missing old master records review without aborting');
  const catalogPath = path.join(temp, 'art/recipes/catalog.json');
  const catalogBytes = await fs.readFile(catalogPath);
  const catalog = JSON.parse(catalogBytes);
  catalog.assets[sprite.id].source = 'art/renders/sprites/new-fixture.png';
  await fs.copyFile(path.join(temp, sprite.source.path), path.join(temp, catalog.assets[sprite.id].source));
  await fs.writeFile(catalogPath, JSON.stringify(catalog));
  try { review((await run()).assets.find(a => a.id === sprite.id)); }
  finally { await fs.writeFile(catalogPath, catalogBytes); }
  passed++; console.log('PASS unknown source path needs review despite identical bytes');
  await change('art/source/procedural/share-v2.png', next => review(next.siteImages.find(a => a.source)));
  await change('assets/site/icon.svg', next => {
    const icon = next.siteImages.find(a => a.path.endsWith('.svg'));
    assert.equal(icon.production, 'recorded-svg-source');
    assert.equal(icon.provenanceStatus, 'authorship-review-required');
  });
  passed++; console.log('PASS site source changes and SVG recording do not inherit authorship');
  const prior = await run();
  await fs.rm(path.join(temp, 'art/retired'), { recursive: true, force: true });
  const noArchive = await run();
  assert.deepEqual(noArchive.retiredFiles, prior.retiredFiles);
  assert.match(noArchive.retiredFilesNote, /preserved.*local archives absent\/not verified/);
  passed++; console.log('PASS absent ignored archives preserve explicitly historical inventory');
  await fs.rm(path.join(temp, registry));
  const neither = await run();
  assert.deepEqual(neither.retiredFiles, []);
  assert.match(neither.retiredFilesNote, /No historical inventory available/);
  passed++; console.log('PASS no archive or previous register produces empty historical inventory');
  assert.equal(digest(await fs.readFile(path.join(root, registry))), before);
  console.log(`PASS ${passed} isolated checks; real registry unchanged (${before})`);
} finally { await fs.rm(temp, { recursive: true, force: true }); }
