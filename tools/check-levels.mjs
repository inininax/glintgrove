import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadScript(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  (0, eval)(src);
}

loadScript('js/core.js');
loadScript('js/engine.js');
loadScript('js/levels.js');

const GG = globalThis.GG;
const problems = [];
let solvedCount = 0;
let totalOptimal = 0;

for (const def of GG.LEVELS) {
  const tag = `L${def.id}(${def.name})`;
  if (!def.grid || !Array.isArray(def.grid)) { problems.push(`${tag}: grid missing`); continue; }
  const widths = new Set(def.grid.map(r => r.length));
  if (widths.size > 1) problems.push(`${tag}: ragged rows ${[...widths].join(',')}`);

  let level;
  try {
    level = GG.engine.parseLevel(def);
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
  for (const pk in level.portals) {
    const p = level.portals[pk];
    const partnerCh = GG.engine.portalPartner(pk);
    if (!level.portals[partnerCh]) problems.push(`${tag}: portal ${pk} has no partner`);
    const ch = level.cells[p.y][p.x];
    if (ch !== pk) problems.push(`${tag}: portal cell mismatch ${pk}@${p.x},${p.y}='${ch}'`);
  }
  for (const row of def.grid) {
    for (const ch of row) {
      if (ch === 'P' || ch === 'Q') {
      } else if ('RS'.includes(ch)) {
      }
    }
  }

  let sol = null;
  try {
    sol = GG.engine.solve(level);
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

  if (sol.moves === 0 && level.rotatables.length > 0) {
    problems.push(`${tag}: already solved at start (par ${def.par})`);
  }
  if (def.par < sol.moves) {
    problems.push(`${tag}: par ${def.par} < optimal ${sol.moves}`);
  }
  if (sol.moves > def.par + 4) {
    console.log(`  note ${tag}: optimal=${sol.moves} par=${def.par} (loose)`);
  }

  const verifyOrients = level.initialOrients.slice();
  for (const flipIdx of sol.flips) verifyOrients[flipIdx] ^= 1;
  for (let i = 0; i < level.rotatables.length; i++) level.rotatables[i].orient = verifyOrients[i];
  if (!GG.engine.isLevelSolved(level)) {
    problems.push(`${tag}: solution flips do not produce solved state`);
  }
  GG.engine.restoreInitial(level);

  const r0 = GG.engine.isLevelSolved(level);
  if (r0 && sol.moves > 0) problems.push(`${tag}: initial state already solved`);

  let hint = null;
  try {
    const cur = level.initialOrients.slice();
    hint = GG.engine.hintMove(level, cur);
  } catch (e) {
    problems.push(`${tag}: hintMove error ${e.message}`);
  }
  if (!hint) problems.push(`${tag}: no hint available from start`);
}

console.log(`levels: ${GG.LEVELS.length}, solvable: ${solvedCount}, avg optimal: ${(totalOptimal / Math.max(solvedCount,1)).toFixed(2)}`);
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('ALL LEVEL CHECKS PASSED');
