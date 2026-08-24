import { parseLevel, solve, isLevelSolved } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

for (const id of [41, 42, 56]) {
  const def = LEVELS.find(l => l.id === id);
  const lv = parseLevel(def);
  const sol = solve(lv);
  console.log(
    `L${id}`, JSON.stringify(def.name), 'par', def.par,
    'arch', def.archetype || '(fallback)',
    '->', sol ? `moves=${sol.moves}` : 'NULL',
    'solvedAtInitial?', isLevelSolved(lv)
  );
}
