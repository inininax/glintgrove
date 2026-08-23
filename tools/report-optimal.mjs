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
for (const def of GG.LEVELS) {
  const level = GG.engine.parseLevel(def);
  const sol = GG.engine.solve(level);
  const flag = def.par === sol.moves ? '' : (def.par < sol.moves ? ' <<PAR TOO LOW' : ' (loose)');
  console.log(`L${String(def.id).padStart(2)} ${def.name.padEnd(10)} optimal=${sol.moves} par=${def.par}${flag}`);
}
