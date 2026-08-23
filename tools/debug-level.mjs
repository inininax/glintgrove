import { parseLevel, trace, solve, allTargetsSatisfied } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';

const id = Number(process.argv[2]);
const def = LEVELS.find(l => l.id === id);
if (!def) {
  console.error('no level', id);
  process.exit(1);
}
const level = parseLevel(def);

const orients = process.argv[3] ? process.argv[3].split('').map(Number) : level.initialOrients.slice();
for (let i = 0; i < level.rotatables.length; i++) level.rotatables[i].orient = orients[i];

const result = trace(level);
console.log(`L${id} ${def.name}  orients=${orients.join('')}`);

const overlay = [];
for (let y = 0; y < level.h; y++) overlay.push(level.cells[y].slice());
for (const seg of result.segments) {
  const steps = Math.max(Math.abs(seg.x2 - seg.x1), Math.abs(seg.y2 - seg.y1));
  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 0 : s / steps;
    const x = Math.round(seg.x1 + (seg.x2 - seg.x1) * t);
    const y = Math.round(seg.y1 + (seg.y2 - seg.y1) * t);
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) continue;
    overlay[y][x] = overlay[y][x] === '.' ? '*' : overlay[y][x];
  }
}
for (const t of level.targets) {
  const k = `${t.x},${t.y}`;
  const lit = result.litSet.has(k);
  console.log(`target ${t.type}@${k}${t.need ? ':' + t.need : ''} ${lit ? 'LIT(' + result.targetColors[k] + ')' : 'dark'}`);
}
console.log('SOLVED:', allTargetsSatisfied(level, result));
for (let y = 0; y < level.h; y++) console.log(String(y).padStart(2), overlay[y].join(''));

const sol = solve(level);
console.log('solver:', sol ? `moves=${sol.moves} flips=${JSON.stringify(sol.flips)}` : 'NULL');
