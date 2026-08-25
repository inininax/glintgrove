import { parseLevel, solve, restoreInitial, isLevelSolved, portalPartner, hintMove } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

const problems = [];
let solvedCount = 0;
let totalOptimal = 0;

for (const def of LEVELS) {
  const tag = `L${def.id}(${def.name})`;
  if (!Array.isArray(def.grid)) {
    problems.push(`${tag}: grid missing`);
    continue;
  }
  const widths = new Set(def.grid.map(r => r.length));
  if (widths.size > 1) problems.push(`${tag}: ragged rows ${[...widths].join(',')}`);

  let level;
  try {
    level = parseLevel(def);
  } catch (e) {
    problems.push(`${tag}: parse error ${e.message}`);
    continue;
  }

  if (level.emitters.length === 0) problems.push(`${tag}: no emitter`);
  if (level.targets.length === 0) problems.push(`${tag}: no targets`);

  for (const t of level.targets) {
    const ch = level.cells[t.y][t.x];
    if (!'TfMO'.includes(ch)) problems.push(`${tag}: target cell mismatch at ${t.x},${t.y}='${ch}'`);
  }
  for (const e of level.emitters) {
    const ch = level.cells[e.y][e.x];
    if (!'><^v'.includes(ch)) problems.push(`${tag}: emitter cell mismatch at ${e.x},${e.y}='${ch}'`);
  }
  for (const n of def.meta?.needs || []) {
    if (n.x < 0 || n.y < 0 || n.x >= level.w || n.y >= level.h || !'TfMO'.includes(level.cells[n.y][n.x])) {
      problems.push(`${tag}: needs coord mismatch at ${n.x},${n.y}`);
    }
  }
  for (const s of def.meta?.splitOrient || []) {
    const r = level.rotatables.find(r0 => r0.x === s.x && r0.y === s.y);
    if (!r || r.kind !== 'splitter') problems.push(`${tag}: splitOrient coord mismatch at ${s.x},${s.y}`);
  }
  for (const e of def.meta?.emitters || []) {
    const ch = level.cells[e.y]?.[e.x];
    if (!ch || !'><^v'.includes(ch)) problems.push(`${tag}: emitter meta mismatch at ${e.x},${e.y}`);
  }

  for (const pk in level.portals) {
    const p = level.portals[pk];
    if (!level.portals[portalPartner(pk)]) problems.push(`${tag}: portal ${pk} has no partner`);
    if (level.cells[p.y][p.x] !== pk) problems.push(`${tag}: portal cell mismatch ${pk}`);
  }

  let sol;
  try {
    sol = solve(level);
  } catch (e) {
    problems.push(`${tag}: solver error ${e.message}`);
    continue;
  }
  if (!sol) {
    problems.push(`${tag}: UNSOLVABLE`);
    continue;
  }
  solvedCount++;
  totalOptimal += sol.moves;

  if (sol.moves === 0 && level.rotatables.length > 0) problems.push(`${tag}: already solved at start`);
  if (def.par < sol.moves) problems.push(`${tag}: par ${def.par} < optimal ${sol.moves}`);

  const verifyOrients = level.initialOrients.slice();
  for (const flipIdx of sol.flips) verifyOrients[flipIdx] ^= 1;
  for (let i = 0; i < level.rotatables.length; i++) level.rotatables[i].orient = verifyOrients[i];
  if (!isLevelSolved(level)) problems.push(`${tag}: solution flips do not produce solved state`);
  restoreInitial(level);

  try {
    if (!hintMove(level, level.initialOrients.slice())) problems.push(`${tag}: no hint from start`);
  } catch (e) {
    problems.push(`${tag}: hintMove error ${e.message}`);
  }
}

console.log(`levels: ${LEVELS.length}, solvable: ${solvedCount}, avg optimal: ${(totalOptimal / Math.max(solvedCount, 1)).toFixed(2)}`);
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('ALL LEVEL CHECKS PASSED');
