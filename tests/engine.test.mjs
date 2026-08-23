import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
for (const f of ['js/core.js', 'js/engine.js', 'js/levels.js', 'js/save.js']) {
  (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
}
const GG = globalThis.GG;

test('mirror slash map reflects correctly', () => {
  assert.deepEqual(GG.engine.MIRROR_SLASH_MAP, [1, 0, 3, 2]);
  const up = 0;
  assert.equal(GG.engine.MIRROR_SLASH_MAP[1], 0);
});

test('mirror back map reflects correctly', () => {
  assert.deepEqual(GG.engine.MIRROR_BACK_MAP, [3, 2, 1, 0]);
});

test('parseLevel extracts entities', () => {
  const lv = GG.engine.parseLevel({
    id: 99, name: 't', par: 1,
    grid: ['T...', '>./..']
  });
  assert.equal(lv.w, 5);
  assert.equal(lv.h, 2);
  assert.equal(lv.emitters.length, 1);
  assert.equal(lv.emitters[0].dir, 1);
  assert.equal(lv.targets.length, 1);
  assert.equal(lv.rotatables.length, 1);
});

test('meta colors and needs applied', () => {
  const lv = GG.engine.parseLevel({
    id: 98, name: 't', par: 1,
    grid: ['T.r.v'],
    meta: { emitters: [{ x: 4, y: 0, color: 'g' }], needs: [{ x: 0, y: 0, need: 'b' }] }
  });
  assert.equal(lv.emitters[0].color, 'g');
  assert.equal(lv.targets[0].need, 'b');
});

test('splitOrient sets initial orientation', () => {
  const lv = GG.engine.parseLevel({
    id: 97, name: 't', par: 1,
    grid: ['s...'],
    meta: { splitOrient: [{ x: 0, y: 0, orient: 1 }] }
  });
  assert.equal(lv.rotatables[0].orient, 1);
});

test('beam stops at wall', () => {
  const lv = GG.engine.parseLevel({ id: 96, name: 't', par: 1, grid: ['>.#....'] });
  const res = GG.engine.trace(lv);
  assert.equal(res.litSet.size, 0);
  const last = res.segments[res.segments.length - 1];
  assert.ok(last.spark);
});

test('beam lights tree and absorbs', () => {
  const lv = GG.engine.parseLevel({ id: 95, name: 't', par: 1, grid: ['>..T.'] });
  const res = GG.engine.trace(lv);
  assert.ok(res.litSet.has('3,0'));
});

test('gate blocks white but passes matching color', () => {
  const lvW = GG.engine.parseLevel({ id: 94, name: 't', par: 1, grid: ['>.A.T'] });
  assert.equal(GG.engine.trace(lvW).litSet.has('4,0'), false);
  const lvR = GG.engine.parseLevel({
    id: 93, name: 't', par: 1, grid: ['>rA.T']
  });
  assert.equal(GG.engine.trace(lvR).litSet.has('4,0'), true);
});

test('crystal recolors beam', () => {
  const lv = GG.engine.parseLevel({ id: 92, name: 't', par: 1, grid: ['>.rb.T'] });
  const res = GG.engine.traceWithColors ? null : null;
  const full = GG.engine.isLevelSolved;
  const r = GG.engine.trace(lv);
  void r; void full; void res;
  const lv2 = GG.engine.parseLevel({
    id: 91, name: 't', par: 1, grid: ['>.bC.T'], meta: { needs: [{ x: 4, y: 0, need: 'b' }] }
  });
  assert.equal(GG.engine.isLevelSolved(lv2), true);
  const lv3 = GG.engine.parseLevel({
    id: 90, name: 't', par: 1, grid: ['>.rC.T'], meta: { needs: [{ x: 4, y: 0, need: 'b' }] }
  });
  assert.equal(GG.engine.isLevelSolved(lv3), false);
});

test('splitter emits reflected and straight beams', () => {
  const lv = GG.engine.parseLevel({
    id: 89, name: 't', par: 2,
    grid: ['....T...', '.>..s..T']
  });
  lv.rotatables[0].orient = 0;
  const resSlash = GG.engine.trace(lv);
  assert.equal(resSlash.litSet.size, 2);
  assert.ok(resSlash.litSet.has('4,0'));
  assert.ok(resSlash.litSet.has('7,1'));

  lv.rotatables[0].orient = 1;
  const resBack = GG.engine.trace(lv);
  assert.equal(resBack.litSet.size, 1);
  assert.ok(resBack.litSet.has('7,1'));
});

test('portal teleports preserving direction', () => {
  const lv = GG.engine.parseLevel({ id: 88, name: 't', par: 1, grid: ['>P....QT'] });
  const res = GG.engine.trace(lv);
  assert.ok(res.litSet.has('7,0'));
});

test('infinite mirror loop terminates', () => {
  const lv = GG.engine.parseLevel({ id: 87, name: 't', par: 1, grid: ['>/..', '.\\./', '.\\..', '>...'] });
  const t0 = Date.now();
  const res = GG.engine.trace(lv);
  assert.ok(Date.now() - t0 < 100);
  assert.ok(Array.isArray(res.segments));
});

test('solve finds optimal flips on L1', () => {
  const def = GG.LEVELS.find(l => l.id === 1);
  const lv = GG.engine.parseLevel(def);
  const sol = GG.engine.solve(lv);
  assert.equal(sol.moves, 1);
  assert.equal(sol.flips.length, 1);
});

test('solution flips solve every level', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    const sol = GG.engine.solve(lv);
    assert.ok(sol, `L${def.id} solvable`);
    const orients = lv.initialOrients.slice();
    for (const i of sol.flips) orients[i] ^= 1;
    for (let i = 0; i < lv.rotatables.length; i++) lv.rotatables[i].orient = orients[i];
    assert.ok(GG.engine.isLevelSolved(lv), `L${def.id} flips verify`);
    GG.engine.restoreInitial(lv);
  }
});

test('hintMove returns progress toward solution', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    const hint = GG.engine.hintMove(lv, lv.initialOrients.slice());
    assert.ok(hint && typeof hint.idx === 'number', `L${def.id} hint`);
  }
});
