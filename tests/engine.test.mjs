import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLevel, trace, solve, hintMove, restoreInitial,
  isLevelSolved, applyOrients
} from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

test('mirror reflects beam per orientation', () => {
  const back = parseLevel({ id: 100, grid: ['>.\\....'] });
  assert.equal(trace(back).litSet.size, 0);
  applyOrients(back, [0]);
  assert.equal(trace(back).litSet.size, 0);

  const slashUp = parseLevel({ id: 99, grid: ['>./..T.'] });
  slashUp.rotatables[0].orient = 1;
  void slashUp;
});

test('parseLevel extracts all entity kinds', () => {
  const lv = parseLevel({
    id: 90,
    grid: ['T.r.b.ABCPQ', '>.s.v.#\\.RS']
  });
  assert.equal(lv.emitters.length, 2);
  assert.ok(lv.targets.length >= 1);
  assert.equal(lv.rotatables.filter(r => r.kind === 'splitter').length >= 1, true);
  assert.equal(lv.crystals.length, 2);
  assert.equal(lv.gates.length, 3);
  assert.equal(Object.keys(lv.portals).length, 4);
  assert.equal(lv.walls.length, 1);
});

test('meta colors, needs and splitOrient applied', () => {
  const lv = parseLevel({
    id: 89,
    grid: ['T.s.v'],
    meta: {
      emitters: [{ x: 4, y: 0, color: 'g' }],
      needs: [{ x: 0, y: 0, need: 'b' }],
      splitOrient: [{ x: 2, y: 0, orient: 1 }]
    }
  });
  assert.equal(lv.emitters[0].color, 'g');
  assert.equal(lv.targets[0].need, 'b');
  assert.equal(lv.rotatables[0].orient, 1);
  assert.equal(lv.initialOrients[0], 1);
});

test('beam stops at wall with spark', () => {
  const lv = parseLevel({ id: 88, grid: ['>.#....'] });
  const res = trace(lv);
  assert.equal(res.litSet.size, 0);
  const last = res.segments[res.segments.length - 1];
  assert.ok(last.spark);
});

test('gate blocks white, passes exact color', () => {
  const whiteBlocked = parseLevel({ id: 86, grid: ['>.A.T'] });
  assert.equal(trace(whiteBlocked).litSet.has('4,0'), false);
  const redPasses = parseLevel({ id: 85, grid: ['>rA.T'] });
  assert.equal(trace(redPasses).litSet.has('4,0'), true);
  const blueBlocked = parseLevel({ id: 84, grid: ['>bA.T'] });
  assert.equal(trace(blueBlocked).litSet.has('4,0'), false);
});

test('crystal recolors beam for need satisfaction', () => {
  const good = parseLevel({
    id: 82,
    grid: ['>.bC.T'],
    meta: { needs: [{ x: 4, y: 0, need: 'b' }] }
  });
  assert.equal(isLevelSolved(good), true);
  const bad = parseLevel({
    id: 81,
    grid: ['>.rC.T'],
    meta: { needs: [{ x: 4, y: 0, need: 'b' }] }
  });
  assert.equal(isLevelSolved(bad), false);
});

test('splitter reflects and passes through', () => {
  const lv = parseLevel({ grid: ['....T...', '.>..s..T'], id: 80 });
  lv.rotatables[0].orient = 0;
  const both = trace(lv);
  assert.equal(both.litSet.size, 2);
  lv.rotatables[0].orient = 1;
  const one = trace(lv);
  assert.equal(one.litSet.size, 1);
  assert.ok(one.litSet.has('7,1'));
});

test('portal teleports preserving direction', () => {
  const lv = parseLevel({ id: 79, grid: ['>P....QT'] });
  assert.equal(trace(lv).litSet.has('7,0'), true);
});

test('infinite mirror loop terminates fast', () => {
  const lv = parseLevel({ id: 78, grid: ['>/..', '.\\./', '.\\..', '>...'] });
  const t0 = Date.now();
  trace(lv);
  assert.ok(Date.now() - t0 < 100);
});

test('solve returns optimal flips for L1', () => {
  const def = LEVELS.find(l => l.id === 1);
  const lv = parseLevel(def);
  assert.equal(solve(lv).moves, 1);
});

test('solution flips solve every level via unified tracer', () => {
  for (const def of LEVELS) {
    const lv = parseLevel(def);
    const sol = solve(lv);
    assert.ok(sol, `L${def.id} solvable`);
    const orients = lv.initialOrients.slice();
    for (const i of sol.flips) orients[i] ^= 1;
    applyOrients(lv, orients);
    const res = trace(lv);
    for (const t of lv.targets) {
      const key = `${t.x},${t.y}`;
      assert.ok(res.litSet.has(key), `L${def.id} ${key} lit`);
      if (t.need) assert.equal(res.targetColors[key], t.need, `L${def.id} ${key} color`);
    }
    restoreInitial(lv);
  }
});

test('hintMove preserves current orientations on every level', () => {
  for (const def of LEVELS) {
    const lv = parseLevel(def);
    if (lv.rotatables.length === 0) continue;
    const cur = lv.initialOrients.slice();
    cur[0] ^= 1;
    hintMove(lv, cur);
    assert.deepEqual(
      lv.rotatables.map(r => r.orient),
      cur,
      `L${def.id} board must keep player state`
    );
  }
});
