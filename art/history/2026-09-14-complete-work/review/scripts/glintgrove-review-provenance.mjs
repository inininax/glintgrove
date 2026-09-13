import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = '/Users/kyungseok.lee/workspace-git/glintgrove/';
const readJson = async path => JSON.parse(await readFile(root + path, 'utf8'));
const hash = async path => createHash('sha256').update(await readFile(root + path)).digest('hex');
const evidence = await readJson('art/recipes/procedural-environments-v3.json');
for (const item of [evidence.master,evidence.parentMaster,...evidence.outputs,...(evidence.scripts || [])]) {
  assert.ok(item?.path && item.sha256, 'evidence record contains path and SHA256');
  assert.equal(await hash(item.path),item.sha256,item.path);
}
const original = await readFile(root + 'tools/record-visual-provenance.mjs','utf8');
const redirected = original
  .replace("const root = new URL('../', import.meta.url);", `const root = new URL(${JSON.stringify('file://' + root)});`)
  .replace("const target = new URL('docs/legal/replacement-register.json', root);", "const target = new URL('file:///tmp/glintgrove-reviewed-register.json');");
assert.notEqual(redirected,original);
await writeFile('/tmp/glintgrove-reviewed-recorder.mjs',redirected);
await import('/tmp/glintgrove-reviewed-recorder.mjs?review=' + Date.now());
const recorded = JSON.parse(await readFile('/tmp/glintgrove-reviewed-register.json','utf8'));
const catalog=await readJson('art/recipes/catalog.json');
const manifest=await readJson('assets/game/manifest.json');
const backgrounds = recorded.assets.filter(asset=>catalog.assets[asset.id].kind === 'background');
assert.equal(backgrounds.length,4);
for (const asset of recorded.assets) {
  assert.equal(asset.provenanceStatus,'verified-against-local-generation-records',asset.id);
  assert.equal(asset.source.sha256,await hash(asset.source.path));
  assert.equal(asset.runtime.sha256,await hash('assets/game/' + manifest.assets[asset.id].src));
  assert.equal(asset.generationEvidence,`art/recipes/procedural-environments-v${catalog.assets[asset.id].kind === 'background' ? 3 : 2}.json`);
}
for (const asset of backgrounds) {
  assert.equal(asset.master.path,evidence.master.path);
  assert.equal(asset.parentMaster.path,evidence.parentMaster.path);
}
const share=recorded.siteImages.find(item=>item.path==='assets/site/share.png');
assert.equal(share.generationEvidence,'art/recipes/procedural-environments-v2.json');
assert.equal(share.provenanceStatus,'verified-against-local-generation-records');
const contact=recorded.reviewImages.find(item=>item.intendedUse==='contact-sheet');
assert.equal(contact.generationEvidence,'art/recipes/procedural-environments-v2.json');
assert.equal(contact.provenanceStatus,'verified-against-local-generation-records');
for (const item of recorded.sourceCodeAndRecipes) assert.equal(item.sha256,await hash(item.path));
console.log(`PASS: v3 exact master/parent/output/script hashes; ${backgrounds.length} v3 backgrounds; ${recorded.assets.length-backgrounds.length} retained v2 sprites; v2 share/contact; all ${recorded.sourceCodeAndRecipes.length} source records current. Register output isolated under /tmp.`);
