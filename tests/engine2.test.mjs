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

test('hintMove preserves current orientations on every level', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    if (lv.rotatables.length === 0) continue;
    const cur = lv.initialOrients.slice();
    cur[0] ^= 1;
    GG.engine.hintMove(lv, cur);
    const after = lv.rotatables.map(r => r.orient);
    assert.deepEqual(after, cur, `L${def.id} board must keep player state`);
  }
});

test('unified trace targetColors satisfies needs at solution', () => {
  for (const def of GG.LEVELS) {
    const lv = GG.engine.parseLevel(def);
    const sol = GG.engine.solve(lv);
    assert.ok(sol, `L${def.id} solvable`);
    const orients = lv.initialOrients.slice();
    for (const i of sol.flips) orients[i] ^= 1;
    for (let i = 0; i < lv.rotatables.length; i++) lv.rotatables[i].orient = orients[i];
    const res = GG.engine.trace(lv);
    for (const t of lv.targets) {
      const key = t.x + ',' + t.y;
      assert.ok(res.litSet.has(key), `L${def.id} target ${key} lit`);
      if (t.need) {
        assert.equal(res.targetColors[key], t.need, `L${def.id} target ${key} color`);
      }
    }
    GG.engine.restoreInitial(lv);
  }
});
