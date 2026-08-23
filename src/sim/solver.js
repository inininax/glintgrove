import { trace } from './tracer.js';

export function allTargetsSatisfied(level, result) {
  for (const t of level.targets) {
    if (!result.litSet.has(`${t.x},${t.y}`)) return false;
    if (t.need && result.targetColors[`${t.x},${t.y}`] !== t.need) return false;
  }
  return true;
}

export function isLevelSolved(level) {
  return allTargetsSatisfied(level, trace(level));
}

export function applyOrients(level, orients) {
  for (let i = 0; i < level.rotatables.length; i++) {
    level.rotatables[i].orient = orients[i];
  }
}

export function restoreInitial(level) {
  applyOrients(level, level.initialOrients);
}

export function solve(level) {
  const n = level.rotatables.length;
  if (n > 24) return null;

  const start = level.initialOrients.slice();
  applyOrients(level, start);

  const parents = new Map();
  parents.set(start.join(''), null);
  const queue = [start];
  let head = 0;

  const check = orients => {
    applyOrients(level, orients);
    return allTargetsSatisfied(level, trace(level));
  };

  if (check(start)) {
    restoreInitial(level);
    return { moves: 0, flips: [] };
  }

  while (head < queue.length) {
    const cur = queue[head++];
    const curKey = cur.join('');
    for (let i = 0; i < n; i++) {
      const next = cur.slice();
      next[i] = next[i] ^ 1;
      const nk = next.join('');
      if (parents.has(nk)) continue;
      parents.set(nk, { prev: curKey, idx: i });

      if (check(next)) {
        const flips = [];
        let k = nk;
        while (parents.get(k)) {
          flips.unshift(parents.get(k).idx);
          k = parents.get(k).prev;
        }
        restoreInitial(level);
        return { moves: flips.length, flips };
      }
      queue.push(next);
    }
  }

  restoreInitial(level);
  return null;
}

export function hintMove(level, currentOrients) {
  applyOrients(level, currentOrients);

  for (let i = 0; i < level.rotatables.length; i++) {
    level.rotatables[i].orient ^= 1;
    const solvedNow = allTargetsSatisfied(level, trace(level));
    level.rotatables[i].orient ^= 1;
    if (solvedNow) return { idx: i };
  }

  const savedInitial = level.initialOrients.slice();
  for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = currentOrients[i];

  const sol = solve(level);

  for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = savedInitial[i];
  applyOrients(level, currentOrients);

  return sol && sol.flips.length > 0 ? { idx: sol.flips[0] } : null;
}
