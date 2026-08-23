import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
function loadScript(file) {
  (0, eval)(fs.readFileSync(path.join(root, file), 'utf8'));
}
loadScript('js/core.js');
loadScript('js/engine.js');
loadScript('js/levels.js');

const GG = globalThis.GG;
const id = Number(process.argv[2]);
const def = GG.LEVELS.find(l => l.id === id);
if (!def) { console.error('no level', id); process.exit(1); }
const level = GG.engine.parseLevel(def);

const orients = process.argv[3] ? process.argv[3].split('').map(Number) : level.initialOrients.slice();
for (let i = 0; i < level.rotatables.length; i++) level.rotatables[i].orient = orients[i];

const result = GG.engine.trace(level);
console.log(`L${id} ${def.name}  rotatables=${level.rotatables.map(r => `${r.x},${r.y}:${r.orient}`).join(' ')}`);
console.log('orients:', orients.join(''));

const overlay = [];
for (let y = 0; y < level.h; y++) overlay.push(level.cells[y].slice());
for (const seg of result.segments) {
  const steps = Math.max(Math.abs(seg.x2 - seg.x1), Math.abs(seg.y2 - seg.y1));
  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 0 : s / steps;
    const x = Math.round(seg.x1 + (seg.x2 - seg.x1) * t);
    const y = Math.round(seg.y1 + (seg.y2 - seg.y1) * t);
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) continue;
    if ('.s'.includes(overlay[y][x]) || overlay[y][x] === '/') overlay[y][x] = '*';
  }
}
console.log('lit:', [...result.litSet].join(' | ') || '(none)');
console.log('targets lit?:', level.targets.map(t => `${t.type}@${t.x},${t.y}${t.need ? ':' + t.need : ''}=${result.litSet.has(t.x + ',' + t.y) ? 'Y' + (result.targetColors[t.x + ',' + t.y] || '') : 'n'}`).join('  '));
console.log('SOLVED:', GG.engine.allTargetsSatisfied(level, result));
for (let y = 0; y < level.h; y++) console.log(String(y).padStart(2), overlay[y].join(''));

const sol = GG.engine.solve(level);
console.log('solver:', sol ? `moves=${sol.moves} flips=${JSON.stringify(sol.flips)} states=${JSON.stringify(sol.flips.map(i => { const o = level.initialOrients.slice(); for (const f of sol.flips.slice(0, sol.flips.indexOf(i) + 1)) o[f] ^= 1; return o.join(''); }))}` : 'NULL');
