// Record exact local production inputs/outputs, not a legal clearance claim.
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = path => fs.readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const record = async path => {
  const bytes = await read(path);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
};
const catalog = await json('art/recipes/catalog.json');
const manifest = await json('assets/game/manifest.json');
const evidenceRecords = await Promise.all([
  'art/recipes/procedural-environments-v2.json',
  'art/recipes/procedural-environments-v3.json',
  'art/recipes/ancient-gates-v2.json'
].map(async path => ({ path, data: await json(path) })));
const spriteEvidence = evidenceRecords[0];
const imageGenerationRecords = await Promise.all([
  'art/recipes/gpt-forest-v4.json', 'art/recipes/gpt-forest-v5.json', 'art/recipes/gpt-forest-v6.json',
  'art/recipes/ilyndrel-symbol-v1.json', 'art/recipes/ilyndrel-wordmark-v1.json',
  'art/recipes/ilyndrel-wordmark-v2-design.json', 'art/recipes/ilyndrel-wordmark-v2.json'
].map(async path => ({ path, data: await json(path) })));
const masterSpecs = new Map(evidenceRecords.flatMap(({ data }) =>
  [data.retainedSpriteMaster, data.master, data.parentMaster].filter(Boolean).map(item => [item.path, item])));
const masters = await Promise.all([...masterSpecs.values()].map(async item => {
  try { return await record(item.path); } catch (error) {
    if (error.code === 'ENOENT') return { path: item.path, sha256: null, status: 'missing-requires-provenance-review' };
    throw error;
  }
}));
const validRecord = item => Boolean(item && typeof item.path === 'string' && item.path.length > 0
  && typeof item.sha256 === 'string' && /^[a-f0-9]{64}$/.test(item.sha256));
const matches = (actual, expected) => Boolean(validRecord(actual) && validRecord(expected)
  && actual.path === expected.path && actual.sha256 === expected.sha256
  && (expected.bytes === undefined || actual.bytes === expected.bytes));
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
  const evidenceRecord = evidenceRecords.find(({ data }) => data.outputs.some(item => item.path === source?.path && (!scene || item.scene === scene)));
  const output = evidenceRecord?.data.outputs.find(item => item.path === source?.path && (!scene || item.scene === scene));
  const master = [evidenceRecord?.data.master, evidenceRecord?.data.retainedSpriteMaster].find(item => item?.path === output?.inputMaster);
  return provenance(source, output, master, production, evidenceRecord);
};
const optionalRecord = async path => {
  if (typeof path !== 'string' || !path) return null;
  try { return await record(path); } catch (error) {
    if (error.code === 'ENOENT') return { path, sha256: null, status: 'missing-requires-provenance-review' };
    throw error;
  }
};
const verifiedOrigin = item => item.provenanceStatus === 'verified-against-local-generation-records'
  || item.provenanceStatus === 'verified-against-recorded-image-generation-inputs';
const generatedProvenance = async (source, production = 'gpt-image-generated-environment', visited = new Set()) => {
  if (!source?.path || visited.has(source.path)) return {
    production: 'unverified-generation-inputs', provenanceStatus: 'renewed-provenance-review-required',
    generationEvidence: null, reason: source?.path ? 'cyclic-image-reference' : 'missing-image-reference'
  };
  const candidates = imageGenerationRecords.filter(({ data }) => Array.isArray(data?.outputs)
    && data.outputs.some(item => item?.path === source.path));
  // Ambiguous records are not evidence that one particular generation chain was used.
  const evidenceRecord = candidates.length === 1 ? candidates[0] : null;
  const data = evidenceRecord?.data;
  const output = data?.outputs?.find(item => item?.path === source.path);
  const prompt = await optionalRecord(data?.prompt?.path);
  const nextVisited = new Set(visited).add(source.path);
  const hasReferenceList = Array.isArray(data?.referenceInputs);
  const referenceInputs = await Promise.all((hasReferenceList ? data.referenceInputs : []).map(async expected => {
    const actual = await optionalRecord(expected?.path);
    const isGenerated = typeof actual?.path === 'string' && (actual.path.startsWith('art/source/gpt/')
      || imageGenerationRecords.some(({ data: candidate }) => Array.isArray(candidate?.outputs)
        && candidate.outputs.some(item => item?.path === actual.path)));
    const origin = isGenerated
      ? await generatedProvenance(actual, 'gpt-image-generated-reference', nextVisited)
      : outputProvenance(actual, 'local-blender-reference');
    return { ...(actual ?? { path: null, sha256: null }), ...origin, role: expected?.role ?? null,
      matchesGenerationRecord: matches(actual, expected)
        && typeof expected?.generationEvidence === 'string' && expected.generationEvidence.length > 0
        && origin.generationEvidence === expected.generationEvidence };
  }));
  const verified = data?.schemaVersion === 1 && data.method === 'built-in-image_gen'
    && matches(source, output) && matches(prompt, data.prompt) && hasReferenceList
    && (referenceInputs.length > 0 || ['symbol', 'wordmark'].includes(data.purpose))
    && referenceInputs.every(item => item.matchesGenerationRecord && verifiedOrigin(item));
  return {
    production: verified ? production : 'unverified-generation-inputs',
    provenanceStatus: verified ? 'verified-against-recorded-image-generation-inputs' : 'renewed-provenance-review-required',
    verificationScope: 'Output, exact prompt and every recursively referenced path/SHA256 match saved generation records, including Blender source/master records where referenced. An explicit empty reference list is allowed for text-only inputs. This checks file-record consistency, not the generation service, exact model identity or usage rights.',
    generationEvidence: evidenceRecord?.path ?? null,
    modelIdentity: data?.modelIdentity ?? null,
    prompt, referenceInputs
  };
};
const optionalJson = async path => {
  try { return await json(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const archivedInventory = await optionalJson('art/history/2026-09-14-complete-work/retired/retirement-register.json');
const previousInventory = archivedInventory === null ? await optionalJson('docs/legal/replacement-register.json') : null;
const sourceFiles = [
  'src/ui/symbols.js', 'src/ui/ui.js', 'src/ui/strings.js', 'src/ui/colorMarks.js', 'src/ui/deviceGuide.js', 'index.html', 'css/style.css',
  'src/render/background.js', 'src/render/beams.js', 'src/render/targetFx.js', 'src/render/bloom.js', 'src/render/entities.js',
  'src/render/layout.js', 'src/render/renderer.js', 'src/render/sprites.js', 'src/render/gradientCache.js',
  'src/fx/particles.js', 'src/fx/sound.js', 'src/fx/music.js', 'src/game/game.js', 'src/core/colors.js', 'src/core/skins.js',
  'src/state/saveStore.js', 'manifest.webmanifest', 'sw.js',
  'src/data/levels.js', 'src/data/levels.generated.js', 'src/services/generator.js',
  'src/services/achievements.js', 'src/services/tutorial.js', 'src/main.js',
  'tools/art/build_blender.py', 'tools/art/render_library.py',
  'tools/art/build_procedural_environments.py', 'tools/art/render_procedural_environments.py',
  'tools/art/upgrade_procedural_environments_v3.py', 'tools/art/render_procedural_environments_v3.py',
  'tools/art/build_ancient_gates_v2.py', 'art/recipes/ancient-gates-v2.json',
  'tools/art/render_geometry_contact_sheet.py', 'tools/art/publish_art.py',
  'tools/art/LICENSES.md', 'tools/art/COPYING.GPL-3.0', 'tools/build-release.mjs',
  'tools/art-preview.html', 'tools/art-preview.css', 'tools/art-preview.js',
  'tools/record-visual-provenance.mjs', 'art/recipes/catalog.json',
  'art/recipes/nocturne-v1.json', 'art/recipes/procedural-environments-v2.md',
  'art/recipes/procedural-environments-v2.json',
  'art/recipes/procedural-environments-v3.md', 'art/recipes/procedural-environments-v3.json',
  'art/recipes/gpt-forest-v4.md', 'art/recipes/gpt-forest-v4.json', 'art/recipes/gpt-forest-v4.prompt.txt',
  'art/recipes/gpt-forest-v5.json', 'art/recipes/gpt-forest-v5.prompt.txt',
  'art/recipes/gpt-forest-v6.json', 'art/recipes/gpt-forest-v6.prompt.txt', 'art/recipes/ancient-forest-v6.md',
  'art/recipes/ilyndrel-symbol-v1.json', 'art/recipes/ilyndrel-symbol-v1.prompt.txt',
  'art/recipes/ilyndrel-wordmark-v1.json', 'art/recipes/ilyndrel-wordmark-v1.prompt.txt',
  'art/recipes/ilyndrel-wordmark-v2-design.json', 'art/recipes/ilyndrel-wordmark-v2.prompt.txt',
  'art/recipes/ilyndrel-wordmark-v2.json', 'art/recipes/ilyndrel-wordmark-v2-black.prompt.txt',
  'art/recipes/jeweled-title-v2.md',
  'art/recipes/title-forest-music.md', 'art/recipes/forest-reverie-v1-music.md',
  'art/recipes/forest-reverie-v1-music.json', 'art/source/audio/forest-reverie-v1.score.json',
  'tools/audio/render-forest-music.mjs',
  'art/recipes/ancient-forest-v2-music.md', 'art/recipes/ancient-forest-v2-music.json',
  'art/source/audio/ancient-forest-v2.score.json', 'tools/audio/render-ancient-forest-music-v2.mjs'
];
const assets = [];
for (const [id, asset] of Object.entries(manifest.assets)) {
  const source = catalog.assets[id];
  if (!source) throw new Error(`Missing recipe for ${id}`);
  if (source.source.includes('/imagegen/')) throw new Error(`Retired image-model input still active: ${id}`);
  const input = await record(source.source);
  const references = spriteEvidence.data.originalSpriteReferences.filter(item => item.id === id);
  const hasNewSpriteRecord = evidenceRecords.some(({ data }) => data.outputs.some(item => item.path === input.path && item.scene === id));
  const origin = source.kind === 'sprite'
    ? hasNewSpriteRecord
      ? outputProvenance(input, 'new-local-blender-sculpture', id)
      : provenance(input, references.find(item => item.role === 'source'), references.find(item => item.role === 'master'), 'retained-local-blender-sculpture', spriteEvidence)
    : source.kind === 'background'
      ? source.source.startsWith('art/source/gpt/')
        ? await generatedProvenance(input)
        : outputProvenance(input, 'new-local-blender-environment', id)
      : provenance(input, null, null, null);
  assets.push({ id, ...origin,
    source: input, runtime: await record(`assets/game/${asset.src}`),
    width: asset.width, height: asset.height });
}
const shareSource = await record('art/source/procedural/share-v2.png');
const brandImages = await Promise.all([
  { sourcePath: 'art/source/gpt/ilyndrel-wordmark-v2.png', runtimePath: 'assets/site/ilyndrel-wordmark-v2.webp', production: 'gpt-image-generated-brand-wordmark' }
].map(async ({ sourcePath, runtimePath, production }) => {
  const source = await optionalRecord(sourcePath);
  const runtime = await optionalRecord(runtimePath);
  const origin = await generatedProvenance(source, production);
  const evidenceRecord = imageGenerationRecords.find(item => item.path === origin.generationEvidence);
  const exportMatches = matches(runtime, evidenceRecord?.data.runtimeExport);
  return { ...runtime, ...origin, source,
    production: exportMatches ? origin.production : 'unverified-runtime-export',
    provenanceStatus: exportMatches ? origin.provenanceStatus : 'renewed-provenance-review-required',
    runtimeExportStatus: exportMatches ? 'verified-against-recorded-export' : 'renewed-runtime-export-review-required',
    runtimeExport: evidenceRecord?.data.runtimeExport ?? null,
    runtimeExportVerificationScope: 'Runtime path, SHA256 and byte count match the saved export record; this does not independently re-perform the image conversion.' };
}));
const musicEvidencePath = 'art/recipes/ancient-forest-v2-music.json';
const musicEvidence = await json(musicEvidencePath);
const musicRuntime = await optionalRecord('assets/audio/ancient-forest-v2.wav');
const musicScore = await optionalRecord('art/source/audio/ancient-forest-v2.score.json');
const musicGenerator = await optionalRecord('tools/audio/render-ancient-forest-music-v2.mjs');
let musicFormat = null;
if (validRecord(musicRuntime)) {
  const wav = await read(musicRuntime.path);
  // The project's generator writes canonical PCM WAV with a 44-byte header.
  if (wav.length >= 44 && wav.toString('ascii', 0, 4) === 'RIFF'
      && wav.toString('ascii', 8, 16) === 'WAVEfmt ' && wav.readUInt32LE(16) === 16
      && wav.readUInt16LE(20) === 1 && wav.toString('ascii', 36, 40) === 'data'
      && wav.readUInt32LE(4) === wav.length - 8 && wav.readUInt32LE(40) === wav.length - 44) {
    const sampleRate = wav.readUInt32LE(24), channels = wav.readUInt16LE(22);
    const bitsPerSample = wav.readUInt16LE(34), blockAlign = wav.readUInt16LE(32);
    if (sampleRate > 0 && channels > 0 && blockAlign === channels * bitsPerSample / 8
        && wav.readUInt32LE(28) === sampleRate * blockAlign && (wav.length - 44) % blockAlign === 0) {
      const frames = (wav.length - 44) / blockAlign;
      musicFormat = { sampleRate, channels, bitsPerSample, frames, duration: frames / sampleRate };
    }
  }
}
const musicVerified = matches(musicRuntime, { path: musicEvidence.runtime, sha256: musicEvidence.sha256, bytes: musicEvidence.bytes })
  && matches(musicScore, { path: musicEvidence.score, sha256: musicEvidence.scoreSha256 })
  && matches(musicGenerator, { path: musicEvidence.generator, sha256: musicEvidence.generatorSha256 })
  && musicFormat?.sampleRate === 24000 && musicFormat.channels === 2 && musicFormat.bitsPerSample === 16
  && musicFormat.duration === 96
  && Object.entries(musicFormat).every(([key, value]) => musicEvidence[key] === value);
const music = {
  ...musicRuntime, title: musicEvidence.title,
  production: musicVerified ? 'local-score-and-mathematical-instrument-synthesis' : 'unverified-music-generation-inputs',
  provenanceStatus: musicVerified ? 'verified-against-recorded-audio-generation-inputs' : 'renewed-provenance-review-required',
  source: musicScore, generator: musicGenerator, generationEvidence: await record(musicEvidencePath),
  format: musicFormat,
  verificationScope: 'WAV, score and generator path/SHA256 match the saved local production record; the PCM header, length and recorded format also match. Signal-quality measurements below are copied from that record, not remeasured here. This checks file-record consistency, not exclusive authorship or usage rights.',
  recordedOriginStatement: musicEvidence.provenance,
  recordedSignalMeasurements: Object.fromEntries(['peak', 'rms', 'seamDelta', 'sampleDeltaRms',
    'maxSampleDelta', 'quietestSecondRms', 'loudestSecondRms'].map(key => [key, musicEvidence[key]]))
};
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
      runtimeExportStatus: 'recorded-not-revalidated-by-this-recorder' },
    ...brandImages
  ],
  audio: [music],
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
const target = new URL('docs/legal/replacement-register.json', root);
await fs.writeFile(target, JSON.stringify(result, null, 2) + '\n');
console.log(`Recorded ${assets.length} game images, ${result.siteImages.length} site images, ${result.audio.length} audio track and ${sourceFiles.length} source/recipe files: ${fileURLToPath(target)}`);
