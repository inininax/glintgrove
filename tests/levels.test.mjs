import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
for (const f of ['js/core.js', 'js/engine.js', 'js/levels.js']) {
  (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
}
const GG = globalThis.GG;

test('all levels have unique sequential ids', () => {
  const ids = GG.LEVELS.map(l => l.id);
  assert.deepEqual(ids, Array.from({ length: GG.LEVELS.length }, (_, i) => i + 1));
});

test('every level parses and has required entities', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    assert.ok(lv.emitters.length >= 1, `L${def.id} emitter`);
    assert.ok(lv.targets.length >= 1, `L${def.id} targets`);
    assert.ok(lv.name, `L${def.id} name`);
    assert.ok(def.meta && def.meta.hint, `L${def.id} hint`);
  }
});

test('grids are rectangular within tolerance', () => {
  for (const def of GG.LEVELS) {
    const widths = new Set(def.grid.map(r => r.length));
    assert.equal(widths.size, 1, `L${def.id} ragged: ${[...widths].join(',')}`);
  }
});

test('levels are solvable with optimal <= par', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    const sol = GG.engine.solve(lv);
    assert.ok(sol, `L${def.id} unsolvable`);
    assert.ok(sol.moves <= def.par, `L${def.id} optimal ${sol.moves} > par ${def.par}`);
    assert.ok(sol.moves > 0 || lv.rotatables.length === 0, `L${def.id} trivially solved`);
  }
});

test('chapters cover all levels', () => {
  const chapterIds = new Set(GG.CHAPTERS.map(c => c.id));
  for (const def of GG.LEVELS) {
    assert.ok(chapterIds.has(def.chapter), `L${def.id} chapter ${def.chapter}`);
  }
});

test('no target is fully sealed without portal', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    const sol = GG.engine.solve(lv);
    assert.ok(sol, `L${def.id} reachable via solver`);
  }
});
