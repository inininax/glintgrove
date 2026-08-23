import { parseLevel, solve } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

for (const def of LEVELS) {
  const level = parseLevel(def);
  const sol = solve(level);
  const flag = def.par === sol.moves ? '' : def.par < sol.moves ? ' <<PAR TOO LOW' : ' (loose)';
  console.log(`L${String(def.id).padStart(2)} ${def.name.padEnd(10)} optimal=${sol.moves} par=${def.par}${flag}`);
}
