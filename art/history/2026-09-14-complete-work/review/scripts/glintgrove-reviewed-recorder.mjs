// Record exact local production inputs/outputs, not a legal clearance claim.
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL("file:///Users/kyungseok.lee/workspace-git/glintgrove/");
const read = path => fs.readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const record = async path => ({ path, sha256: createHash('sha256').update(await read(path)).digest('hex') });
const catalog = await json('art/recipes/catalog.json');
const manifest = await json('assets/game/manifest.json');
const evidenceRecords = await Promise.all([
  'art/recipes/procedural-environments-v2.json',
  'art/recipes/procedural-environments-v3.json'
].map(async path => ({ path, data: await json(path) })));
const spriteEvidence = evidenceRecords[0];
const masterSpecs = new Map(evidenceRecords.flatMap(({ data }) =>
  [data.retainedSpriteMaster, data.master, data.parentMaster].filter(Boolean).map(item => [item.path, item])));
const masters = await Promise.all([...masterSpecs.values()].map(async item => {
  try { return await record(item.path); } catch (error) {
    if (error.code === 'ENOENT') return { path: item.path, sha256: null, status: 'missing-requires-provenance-review' };
    throw error;
  }
}));
const matches = (actual, expected) => Boolean(expected && actual?.path === expected.path && actual.sha256 === expected.sha256);
const provenance = (source, expectedSource, expectedMaster, production, evidenceRecord) => {
  const master = masters.find(item => item.path === expectedMaster?.path);
  const parentSpec = evidenceRecord?.data.parentMaster;
  const parent = masters.find(item => item.path === parentSpec?.path);
  const verified = matches(source, expectedSource) && matches(master, expectedMaster)
    && (!parentSpec || matches(parent, parentSpec));
  return {
    production: verified ? production : 'unverified-source-or-master',
    provenanceStatus: verified ? 'verified-against-local-generation-records' : 'renewed-provenance-review-required',
    verificationScope: 'Source, master and recorded parent-master path/SHA256 match only; runtime bytes are recorded separately.',
    generationEvidence: evidenceRecord?.path ?? null,
    master: master ?? null,
    ...(parentSpec ? { parentMaster: parent ?? null } : {})
  };
};
const outputProvenance = (source, production, scene) => {
  const evidenceRecord = evidenceRecords.find(({ data }) => data.outputs.some(item => item.path === source.path && (!scene || item.scene === scene)));
  const output = evidenceRecord?.data.outputs.find(item => item.path === source.path && (!scene || item.scene === scene));
  const master = [evidenceRecord?.data.master, evidenceRecord?.data.retainedSpriteMaster].find(item => item?.path === output?.inputMaster);
  return provenance(source, output, master, production, evidenceRecord);
};
const optionalJson = async path => {
  try { return await json(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const archivedInventory = await optionalJson('art/retired/retirement-register.json');
const previousInventory = archivedInventory === null ? await optionalJson('docs/legal/replacement-register.json') : null;
const sourceFiles = [
  'src/ui/symbols.js', 'src/ui/ui.js', 'src/ui/strings.js', 'index.html', 'css/style.css',
  'src/render/background.js', 'src/render/beams.js', 'src/render/bloom.js', 'src/render/entities.js',
  'src/render/layout.js', 'src/render/renderer.js', 'src/render/sprites.js', 'src/render/gradientCache.js',
  'src/fx/particles.js', 'src/fx/sound.js', 'src/game/game.js', 'src/core/colors.js', 'src/core/skins.js',
  'src/state/saveStore.js', 'manifest.webmanifest', 'sw.js',
  'src/data/levels.js', 'src/data/levels.generated.js', 'src/services/generator.js',
  'src/services/achievements.js', 'src/services/tutorial.js', 'src/main.js',
  'tools/art/build_blender.py', 'tools/art/render_library.py',
  'tools/art/build_procedural_environments.py', 'tools/art/render_procedural_environments.py',
  'tools/art/upgrade_procedural_environments_v3.py', 'tools/art/render_procedural_environments_v3.py',
  'tools/art/render_geometry_contact_sheet.py', 'tools/art/publish_art.py',
  'tools/art/LICENSES.md', 'tools/art/COPYING.GPL-3.0', 'tools/build-release.mjs',
  'tools/record-visual-provenance.mjs', 'art/recipes/catalog.json',
  'art/recipes/nocturne-v1.json', 'art/recipes/procedural-environments-v2.md',
  'art/recipes/procedural-environments-v2.json',
  'art/recipes/procedural-environments-v3.md', 'art/recipes/procedural-environments-v3.json'
];
const assets = [];
for (const [id, asset] of Object.entries(manifest.assets)) {
  const source = catalog.assets[id];
  if (!source) throw new Error(`Missing recipe for ${id}`);
  if (source.source.includes('/imagegen/')) throw new Error(`Retired image-model input still active: ${id}`);
  const input = await record(source.source);
  const references = spriteEvidence.data.originalSpriteReferences.filter(item => item.id === id);
  const origin = source.kind === 'sprite'
    ? provenance(input, references.find(item => item.role === 'source'), references.find(item => item.role === 'master'), 'retained-local-blender-sculpture', spriteEvidence)
    : source.kind === 'background'
      ? outputProvenance(input, 'new-local-blender-environment', id)
      : provenance(input, null, null, null);
  assets.push({ id, ...origin,
    source: input, runtime: await record(`assets/game/${asset.src}`),
    width: asset.width, height: asset.height });
}
const shareSource = await record('art/source/procedural/share-v2.png');
const recordedAt = new Date().toISOString();
const result = {
  schemaVersion: 1, recordedDate: recordedAt.slice(0, 10), recordedAt, runtimeRevision: manifest.revision,
  status: 'recorded-with-provenance-status-per-entry', copyrightClearance: 'not-established',
  explanation: 'Exact file and local generation records; not an assertion of human-only authorship, exclusive rights, or zero infringement risk.',
  runtimeManifest: await record('assets/game/manifest.json'),
  masters,
  assets, siteImages: [
    { ...await record('assets/site/icon.svg'), production: 'recorded-svg-source',
      provenanceStatus: 'authorship-review-required',
      explanation: 'Recording current SVG bytes does not verify authorship, including after future replacements.' },
    { ...await record('assets/site/share.png'), ...outputProvenance(shareSource, 'known-local-blender-source', 'share'),
      source: shareSource, exporter: 'tools/art/publish_art.py',
      runtimeExportStatus: 'recorded-not-revalidated-by-this-recorder' }
  ],
  reviewImages: await Promise.all([
    'sprite-contact-sheet-v1.jpg', 'remade-title-desktop.png', 'remade-game-mobile.png',
    'remade-settings-mobile.png', 'remade-simple-mobile.png', 'remade-win-mobile.png'
  ].map(async name => {
    const input = await record(`art/previews/${name}`);
    return { ...input, ...(name === 'sprite-contact-sheet-v1.jpg'
      ? outputProvenance(input, 'wordless-local-blender-contact-sheet', 'contact-sheet')
      : { production: 'recorded-review-image', provenanceStatus: 'capture-origin-not-revalidated' }),
      intendedUse: name === 'sprite-contact-sheet-v1.jpg' ? 'contact-sheet' : 'browser-screenshot',
      includedInRelease: false };
  })),
  sourceCodeAndRecipes: await Promise.all(sourceFiles.map(record)),
  sourceCodeRecordingScope: 'Current file hashes only; recording new or changed code does not establish its authorship.',
  retiredFiles: archivedInventory ?? previousInventory?.retiredFiles ?? [],
  retiredFilesNote: archivedInventory !== null
    ? 'Historical inventory from local archive register; archived file contents were not revalidated.'
    : previousInventory?.retiredFiles != null
      ? 'Historical inventory preserved from the previous replacement register; local archives absent/not verified.'
      : 'No historical inventory available; local archives absent/not verified.',
  remainingQuestions: ['Contractual ownership and employment arrangements', 'Trademark clearance for new working name',
    'Ownership of retained nonvisual application code', 'Worldwide non-infringement cannot be established by this inventory']
};
const target = new URL('file:///tmp/glintgrove-reviewed-register.json');
await fs.writeFile(target, JSON.stringify(result, null, 2) + '\n');
console.log(`Recorded ${assets.length} runtime images, ${sourceFiles.length} source/recipe files: ${fileURLToPath(target)}`);
