import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyConfig, todayStr } from '../src/services/daily.js';
import { parseLevel } from '../src/sim/parser.js';
import { applyOrients, trace, allTargetsSatisfied } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

test('todayStr returns ISO date', () => {
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/);
});

test('daily config is deterministic per date', () => {
  const a = buildDailyConfig('2026-08-23');
  const b = buildDailyConfig('2026-08-23');
  assert.deepEqual(a, b);
});

test('daily configs differ across dates', () => {
  const seen = new Set();
  for (let i = 1; i <= 10; i++) {
    const cfg = buildDailyConfig(`2026-09-${String(i).padStart(2, '0')}`);
    seen.add(`${cfg.baseId}:${cfg.orients.join('')}`);
  }
  assert.ok(seen.size > 1, 'expected variety across dates');
});

test('every daily config is solvable and non-trivial', () => {
  const checkedOrients = new Set();
  for (let i = 0; i < 30; i++) {
    const date = new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10);
    const cfg = buildDailyConfig(date);
    if (cfg.orients) {
      const key = `${cfg.baseId}:${cfg.orients.join('')}`;
      if (checkedOrients.has(key)) continue;
      checkedOrients.add(key);

      const def = LEVELS.find(l => l.id === cfg.baseId);
      const lv = parseLevel(def);
      applyOrients(lv, cfg.orients);
      const res = trace(lv);
      assert.ok(res.segments.length > 0, `${date} traces`);

      const solvedNow = allTargetsSatisfied(lv, res);
      assert.equal(solvedNow, false, `${date} must not start solved`);
      assert.ok(cfg.optimal >= 3, `${date} optimal ${cfg.optimal} >= 3`);
    }
  }
});
