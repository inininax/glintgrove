import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, solve } from '../src/sim/index.js';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';

test('all levels have unique sequential ids', () => {
  const ids = LEVELS.map(l => l.id);
  assert.deepEqual(ids, Array.from({ length: LEVELS.length }, (_, i) => i + 1));
});

test('every level parses with required entities and hint', () => {
  for (const def of LEVELS) {
    const lv = parseLevel(def);
    assert.ok(lv.emitters.length >= 1, `L${def.id} emitter`);
    assert.ok(lv.targets.length >= 1, `L${def.id} targets`);
    assert.ok(def.name, `L${def.id} name`);
    assert.ok(def.meta?.hint, `L${def.id} hint`);
    assert.equal(new Set(def.grid.map(r => r.length)).size === 1, true, `L${def.id} ragged`);
  }
});

test('levels solvable with optimal <= par and non-trivial', () => {
  for (const def of LEVELS) {
    const lv = parseLevel(def);
    const sol = solve(lv);
    assert.ok(sol, `L${def.id} unsolvable`);
    assert.ok(sol.moves <= def.par, `L${def.id} optimal ${sol.moves} > par ${def.par}`);
    assert.ok(sol.moves > 0 || lv.rotatables.length === 0, `L${def.id} trivially solved`);
  }
});

test('chapters cover all levels', () => {
  const chapterIds = new Set(CHAPTERS.map(c => c.id));
  for (const def of LEVELS) {
    assert.ok(chapterIds.has(def.chapter), `L${def.id} chapter ${def.chapter}`);
  }
});
