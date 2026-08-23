import { LEVELS } from '../data/levels.js';
import { parseLevel } from '../sim/parser.js';
import { applyOrients, solve, restoreInitial } from '../sim/solver.js';
import { mulberry32, xmur3 } from '../core/math.js';

const POOL_MIN_ID = 9;
const POOL_MAX_ID = 25;
const MIN_OPTIMAL = 3;

export function todayStr(now) {
  const d = now ? new Date(now) : new Date();
  return d.toISOString().slice(0, 10);
}

export function buildDailyConfig(dateStr, opts = {}) {
  const minOptimal = opts.min ?? 3;
  const maxOptimal = opts.max ?? 8;
  const seedFn = xmur3('glintgrove-daily-' + dateStr);
  const seed = seedFn();
  const rng = mulberry32(seed);

  for (let attempt = 0; attempt < 20; attempt++) {
    const baseId = POOL_MIN_ID + Math.floor(rng() * (POOL_MAX_ID - POOL_MIN_ID + 1));
    const def = LEVELS.find(l => l.id === baseId);
    if (!def) continue;

    const level = parseLevel(def);
    if (level.rotatables.length < 2 || level.rotatables.length > 12) continue;

    const scrambled = level.initialOrients.map(o => (rng() < 0.5 ? o ^ 1 : o));
    applyOrients(level, scrambled);

    const savedInitial = level.initialOrients.slice();
    for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = scrambled[i];

    const sol = solve(level);

    for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = savedInitial[i];
    restoreInitial(level);

    if (sol && sol.moves >= minOptimal && sol.moves <= maxOptimal) {
      return { date: dateStr, baseId, orients: scrambled, optimal: sol.moves };
    }
  }

  const fallback = LEVELS.find(l => l.id === POOL_MIN_ID + 2);
  return { date: dateStr, baseId: fallback.id, orients: fallback ? null : null, optimal: fallback.par };
}
