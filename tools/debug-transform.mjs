import { parseLevel, solve } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';
import { transformDef } from '../src/services/generator.js';

let nullCount = 0, zeroCount = 0, okCount = 0;
const broken = [];
for (const seed of LEVELS) {
  for (const mode of ['x', 't', 'both', 'none']) {
    const tf = transformDef(seed, mode);
    const lv = parseLevel({ ...tf, id: 9999, par: 99 });
    const sol = solve(lv);
    if (!sol) {
      nullCount++;
      if (broken.length < 8) broken.push({ seed: seed.id, mode, w: tf.grid[0].length, h: tf.grid.length });
    } else if (sol.moves === 0) zeroCount++;
    else okCount++;
  }
}
console.log({ nullCount, zeroCount, okCount });
console.log('broken samples:', JSON.stringify(broken));
