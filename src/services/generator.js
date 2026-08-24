import { parseLevel } from '../sim/parser.js';
import { solve, applyOrients, restoreInitial, isLevelSolved } from '../sim/index.js';
import { mulberry32, xmur3 } from '../core/math.js';

const TARGET_KINDS = ['T', 'f', 'M', 'O'];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function clampY(y, h) {
  return Math.max(0, Math.min(h - 1, y));
}

function buildGrid(w, h, cells) {
  const g = Array.from({ length: h }, () => new Array(w).fill('.'));
  for (const [x, y, ch] of cells) {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    if (g[y][x] !== '.') return null;
    g[y][x] = ch;
  }
  return g.map(row => row.join(''));
}

function extendEntry(built, extraPairs, rng) {
  const cells = built.cells.map(c => c.slice());
  const eIdx = cells.findIndex(c => '><^v'.includes(c[2]));
  if (eIdx < 0) return null;
  const [ex, ey] = cells[eIdx];
  cells.splice(eIdx, 1);

  const dx = extraPairs * 3 + ex;
  for (const c of cells) c[0] += dx;

  let y = ey;
  const laneCells = [[1, y, '>']];
  let col = 3;
  for (let i = 0; i < extraPairs; i++) {
    const down = i % 2 === 1;
    const m = down ? '\\' : '/';
    const y2 = down ? y + 2 : y - 2;
    if (y2 < 0) return null;
    laneCells.push([col, y, m]);
    laneCells.push([col, y2, m]);
    y = y2;
    col += 3;
  }

  const dy = -Math.min(0, ...laneCells.map(c => c[1]), ...cells.map(c => c[1]));
  for (const c of laneCells) c[1] += dy;
  for (const c of cells) c[1] += dy;

  const all = cells.concat(laneCells);
  const newW = Math.max(...all.map(c => c[0])) + 2;
  const newH = Math.max(...all.map(c => c[1])) + 2;
  const grid = buildGrid(newW, newH, all);
  if (!grid) return null;
  return { cells: all, w: newW, h: newH };
}

function zigzag(rng, w, h, n) {
  const maxN = w - 4;
  n = Math.min(n, maxN);
  if (n < 2) return null;
  const cells = [];
  let x = 1;
  let y = clampY(2 + Math.floor(rng() * (h - 4)), h);
  cells.push([1, y, '>']);
  let vert = rng() < 0.5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const step = 1 + Math.floor(rng() * 2);
    let ny = clampY(y + vert * step, h);
    if (ny === y) {
      vert = -vert;
      ny = clampY(y + vert * step, h);
      if (ny === y) return null;
    }
    cells.push([x, ny, '/']);
    x += 1 + Math.floor(rng() * 2);
    if (x > w - 2) return null;
    cells.push([x, ny, '/']);
    y = ny;
    vert = -vert;
  }
  const ty = clampY(y + vert * (1 + Math.floor(rng() * 2)), h);
  cells.push([x, ty, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function twins(rng, w, h, n) {
  const maxN = Math.floor((w - 5) / 2) + 2;
  n = Math.min(n, maxN);
  if (n < 2) return null;
  const cells = [];
  const y0 = Math.floor(h / 2);
  cells.push([1, y0, '>']);
  const sx = 3;
  cells.push([sx, y0, 's']);
  const ty = rng() < 0.5 ? clampY(y0 - 3, h) : clampY(y0 + 3, h);
  if (ty === y0) return null;
  cells.push([sx, ty, pick(rng, TARGET_KINDS)]);

  let x = sx + 1;
  let y = y0;
  let vert = rng() < 0.5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const step = 1 + Math.floor(rng() * 2);
    let ny = clampY(y + vert * step, h);
    if (ny === y) {
      vert = -vert;
      ny = clampY(y + vert * step, h);
    }
    cells.push([x, ny, '/']);
    x += 1 + Math.floor(rng() * 2);
    if (x > w - 2) return null;
    cells.push([x, ny, '/']);
    y = ny;
    vert = -vert;
  }
  const t2x = x;
  const t2y = clampY(y + vert * 2, h);
  cells.push([t2x, t2y, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function cascade(rng, w, h, n) {
  const maxS = Math.min(3, Math.floor((w - 6) / 2));
  const splitCount = Math.min(n - 1, maxS);
  if (splitCount < 2) return null;
  const cells = [];
  const y0 = Math.floor(h / 2);
  cells.push([1, y0, '>']);
  let x = 3;
  const lanes = [];
  for (let i = 0; i < splitCount; i++) {
    cells.push([x, y0, 's']);
    const ly = clampY(y0 - 3, h);
    if (ly === y0) return null;
    lanes.push([x, ly]);
    x += 2;
  }
  for (const [lx, ly] of lanes) {
    cells.push([lx, ly, pick(rng, TARGET_KINDS)]);
  }
  cells.push([x, y0, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function portalBox(rng, w, h, n) {
  if (w < 12 || h < 8) return null;
  const bx = w - 5;
  const by = 2;
  const bh = Math.min(6, h - 3);
  if (bh < 4) return null;
  const maxN = bx - 3;
  n = Math.min(n, maxN);
  if (n < 3) return null;

  const cells = [];
  for (let x = bx; x < bx + 4; x++) {
    cells.push([x, by, '#']);
    cells.push([x, by + bh - 1, '#']);
  }
  for (let y = by; y < by + bh; y++) {
    cells.push([bx, y, '#']);
    cells.push([bx + 3, y, '#']);
  }
  cells.push([bx + 2, by, 'Q']);
  cells.push([bx + 2, by + 2, pick(rng, TARGET_KINDS)]);
  cells.push([bx + 1, by + bh - 2, pick(rng, TARGET_KINDS)]);
  cells.push([bx + 2, 1, 'P']);

  cells.push([1, 1, '>']);
  let x = 3;
  let row = 1;
  let placed = 0;
  while (placed < n - 1 && x < bx - 2) {
    cells.push([x, 1, '/']);
    cells.push([x, 0, '/']);
    placed++;
    x += 1 + Math.floor(rng() * 2);
    if (x >= bx - 2) break;
    cells.push([x, 0, '\\']);
    cells.push([x, 1, '\\']);
    placed++;
    x += 1 + Math.floor(rng() * 2);
  }
  cells.push([bx + 2, 1, '\\']);

  const sy = by + bh + 1 <= h - 2 ? by + bh + 1 : by - 2;
  if (sy < 0 || sy > h - 1 || sy === by) return null;
  cells.push([3, sy, 's']);
  const ty2 = sy + 2 <= h - 1 ? sy + 2 : sy - 2;
  cells.push([3, ty2, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function gateRun(rng, w, h) {
  if (w < 12) return null;
  const cells = [];
  const y0 = Math.floor(h / 2);
  cells.push([1, y0, '>']);
  const gates = ['A', 'B', 'C'];
  const cries = ['r', 'g', 'b'];
  const pairs = Math.min(3, Math.floor((w - 5) / 3));
  if (pairs < 2) return null;
  let x = 3;
  for (let i = 0; i < pairs; i++) {
    cells.push([x, y0, cries[i]]);
    cells.push([x + 2, y0, gates[i]]);
    x += 3;
  }
  cells.push([Math.min(x, w - 2), y0, pick(rng, TARGET_KINDS)]);

  const maY = clampY(y0 - 3, h);
  if (maY === y0) return null;
  cells.push([3, y0, 's']);
  cells.push([3, maY, '\\']);
  cells.push([1, maY, pick(rng, TARGET_KINDS)]);

  const s2x = 8;
  const mbY = clampY(y0 + 2, h);
  if (mbY === y0) return null;
  cells.push([s2x, y0, 's']);
  cells.push([s2x, mbY, '/']);
  cells.push([Math.min(w - 2, s2x + 2), mbY, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function spiral(rng, w, h) {
  if (w < 11 || h < 8) return null;
  const cells = [];
  const mid = Math.floor(h / 2);
  cells.push([1, 1, '>']);
  cells.push([w - 2, 1, '/']);
  cells.push([w - 2, h - 2, '/']);
  cells.push([1, h - 2, '/']);
  cells.push([1, mid, '\\']);
  const sx = 4 + Math.floor(rng() * 2);
  cells.push([sx, mid, 's']);
  cells.push([sx, clampY(mid + 2, h), pick(rng, TARGET_KINDS)]);
  cells.push([Math.min(w - 2, sx + 4), mid, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function hub(rng, w, h) {
  if (w < 12 || h < 8) return null;
  const cells = [];
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  cells.push([1, cy, '>']);
  cells.push([cx, cy, 's']);
  cells.push([cx, 1, '/']);
  cells.push([cx - 2, 1, pick(rng, TARGET_KINDS)]);
  const ex = w - 3;
  cells.push([ex, cy, 's']);
  cells.push([ex, clampY(cy - 2, h), pick(rng, TARGET_KINDS)]);
  cells.push([w - 2, cy, '/']);
  cells.push([w - 2, clampY(cy + 2, h), pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}

function dual(rng, w, h) {
  if (w < 12 || h < 9) return null;
  const cells = [];
  const y1 = 2;
  const y2 = h - 3;
  const my = Math.floor(h / 2);
  if (my <= y1 || my >= y2) return null;
  const mx = Math.floor(w / 2);
  cells.push([1, y1, '>']);
  cells.push([w - 2, y2, '<']);
  cells.push([mx, y1, '\\']);
  cells.push([mx, my, 's']);
  cells.push([mx, y2, '\\']);
  cells.push([mx, my + 2, pick(rng, TARGET_KINDS)]);
  cells.push([2, my, pick(rng, TARGET_KINDS)]);
  cells.push([mx, 2, '\\']);
  cells.push([3, 2, pick(rng, TARGET_KINDS)]);
  cells.push([mx + 3, my, pick(rng, TARGET_KINDS)]);
  return { cells, w, h };
}


function forcedHub(rng, w, h, targetRot) {
  if (w < 13 || h < 9) return null;
  const my = Math.max(2, Math.min(h - 7, 2 + Math.floor(rng() * 2)));
  const cells = [];
  const finals = new Map();
  const setF = (x, y, ch, f) => {
    cells.push([x, y, ch]);
    finals.set(`${x},${y}`, f);
  };

  cells.push([1, my, '>']);

  const put = (x, y, ch, f) => setF(x, y, ch, f);

  if (targetRot <= 2) {
    put(3, my, '\\', '\\');
    put(3, my + 2, '\\', '\\');
    put(5, my + 2, pick(rng, TARGET_KINDS), null);
    return finish(cells, finals, w, h, 2);
  }

  const sCount = targetRot <= 5 ? Math.min(2, Math.floor((targetRot - 1) / 2)) : 3;
  for (let i = 0; i < sCount; i++) {
    const sx = 3 + 3 * i;
    put(sx, my, 's', 's/');
    put(sx, my - 2, '\\', '\\');
    put(sx - 2, my - 2, pick(rng, TARGET_KINDS), null);
  }
  let rot = 2 * sCount + 1;
  let lastX = 3 + 3 * (sCount - 1);
  let bendRow = my;

  if (rot < targetRot || targetRot > 7) {
    const mdX = Math.min(w - 2, lastX + 3);
    put(mdX, bendRow, '\\', '\\');
    rot += 1;
    bendRow += 2;
    put(mdX, bendRow, 's', 'sB');
    rot += 1;
    if (rot < targetRot) {
      put(mdX - 2, bendRow, '/', '/L');
      put(mdX - 2, Math.min(h - 1, bendRow + 2), pick(rng, TARGET_KINDS), null);
      rot += 1;
    }
    if (rot < targetRot) {
      put(mdX, Math.min(h - 1, bendRow + 2), pick(rng, TARGET_KINDS), null);
      rot += 1;
    }
    if (rot < targetRot) {
      put(mdX + 2, bendRow, 's', 'sC');
      put(mdX + 2, bendRow - 2, '\\', '\\');
      put(mdX + 4, bendRow - 2, pick(rng, TARGET_KINDS), null);
      rot += 2;
    }
  }

  return finish(cells, finals, w, h, rot);
}

function finish(cells, finals, w, h, rot) {
  const gridCells = cells.map(c => {
    const f = finals.get(`${c[0]},${c[1]}`);
    if (f === undefined || f === null) return c;
    if (f === 's/' || f === 'sB' || f === 'sC') return [c[0], c[1], 's'];
    return [c[0], c[1], f];
  });
  return { cells: gridCells, w, h, rotHint: rot, guaranteedPar: rot };
}

const ARCHETYPES = [
  { fn: forcedHub, diffs: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { fn: zigzag, diffs: [1, 2, 3, 4, 5, 6] },
  { fn: twins, diffs: [3, 4, 5, 6, 7] },
  { fn: cascade, diffs: [4, 5, 6, 7] },
  { fn: portalBox, diffs: [5, 6, 7, 8, 9] },
  { fn: gateRun, diffs: [5, 6, 7, 8, 9] },
  { fn: spiral, diffs: [4, 5, 6, 7] },
  { fn: hub, diffs: [4, 5, 6, 7] },
  { fn: dual, diffs: [6, 7] }
];

const KO_PRE = ['잊혔던', '손끝의', '유리의', '별조각', '이슬의', '안개의', '달그림자', '새벽의', '여명의', '영겁의', '하늘빛', '물빛', '숨결의', '시간의', '별빛의'];
const KO_NOUN = ['숲길', '강', '정원', '계곡', '회랑', '탑', '미로', '호수', '문', '정적', '속삭임', '눈빛', '서곡', '왈츠', '야상곡', '기억', '약속', '기도'];
const EN_PRE = ['Forgotten', 'Glassy', 'Starlit', 'Misty', 'Moonlit', 'Dawning', 'Eternal', 'Skytint', 'Whispering', 'Timeless'];
const EN_NOUN = ['Path', 'River', 'Garden', 'Vale', 'Gallery', 'Tower', 'Maze', 'Lake', 'Gate', 'Stillness', 'Nocturne', 'Waltz', 'Rhapsody', 'Vigil', 'Promise'];

function difficultyBand(optimal) {
  if (optimal <= 3) return 'easy';
  if (optimal <= 5) return 'normal';
  if (optimal === 6) return 'hard';
  return 'extreme';
}

export function bandFor(diffTarget) {
  if (diffTarget <= 3) return { min: 2, max: 3 };
  if (diffTarget <= 5) return { min: 4, max: 5 };
  if (diffTarget <= 7) return { min: 6, max: 7 };
  if (diffTarget <= 9) return { min: 7, max: 9 };
  return { min: 8, max: 11 };
}

export function generateLevel(id, opts = {}) {
  const band = opts.band ?? bandFor(opts.diffTarget ?? 5);
  const minOpt = band.min;
  const maxOpt = band.max;
  const seedFn = xmur3(`glintgrove-l${id}`);
  const baseSeed = seedFn();
  const diffTarget = opts.diffTarget ?? 5;

  const candidates = ARCHETYPES.filter(a => a.diffs.includes(diffTarget));
  let pool = candidates.length ? candidates : ARCHETYPES;
  if (band.min >= 8) {
    const forced = pool.filter(a => a.fn === forcedHub);
    if (forced.length) pool = forced;
  }

  const attemptMax = band.min >= 8 ? 8 : 40;
  for (let attempt = 0; attempt < attemptMax; attempt++) {
    const rng = mulberry32(baseSeed + attempt * 7919);
    const arch = pool[Math.floor(rng() * pool.length)];

    const w = Math.min(15, Math.max(11, 10 + Math.floor(diffTarget / 2) + Math.floor(rng() * 3)));
    const h = Math.min(11, Math.max(8, 8 + Math.floor(rng() * 3)));
    const rotCap = band.min >= 8 ? 9 : 13;
    const rotCount = Math.max(minOpt + 1, Math.min(rotCap, minOpt + 1 + Math.floor(rng() * 4)));

    const built = arch.fn(rng, w, h, rotCount);
    if (!built) continue;

    const isForced = arch.fn === forcedHub;
    const baseRot = built.cells.filter(c => '/\\s'.includes(c[2])).length;
    const extraPairs = isForced ? 0 : Math.max(0, Math.min(3, Math.floor((maxOpt - baseRot) / 2)));
    let extended = built;
    if (extraPairs > 0) {
      extended = extendEntry(built, extraPairs, rng);
      if (!extended) continue;
    }

    const cells = extended.cells.slice();
    const grid = buildGrid(extended.w, extended.h, cells);
    if (!grid) continue;

    const taken = new Set(cells.map(c => `${c[0]},${c[1]}`));
    const wallCount = Math.floor(rng() * 3);
    for (let i = 0; i < wallCount; i++) {
      const wx = 1 + Math.floor(rng() * (extended.w - 2));
      const wy = 1 + Math.floor(rng() * (extended.h - 2));
      if (!taken.has(`${wx},${wy}`)) {
        taken.add(`${wx},${wy}`);
        cells.push([wx, wy, '#']);
      }
    }

    const finalGrid = buildGrid(extended.w, extended.h, cells);
    if (!finalGrid) continue;

    const def = {
      id,
      name: `${pick(rng, KO_PRE)} ${pick(rng, KO_NOUN)}`,
      nameEn: `${pick(rng, EN_PRE)} ${pick(rng, EN_NOUN)}`,
      chapter: opts.chapter || 1,
      par: 99,
      grid: finalGrid,
      meta: { hint: '빛의 길을 찾아 숲을 깨우세요.', hintEn: 'Find the path of light and wake the forest.' }
    };

    const level = parseLevel(def);
    if (level.targets.length === 0 || level.emitters.length === 0) continue;
    const n = level.rotatables.length;
    if (n < minOpt || n > 10) continue;

    const guaranteed = built.guaranteedPar || 0;

    if (isForced) {
      const finals = level.rotatables.map(r => r.orient);
      const initial = finals.map(f => f ^ 1);
      const mirrorCells = [];
      const splitOrient = [];
      for (let i = 0; i < level.rotatables.length; i++) {
        const r = level.rotatables[i];
        if (r.kind === 'mirror') {
          mirrorCells.push({ x: r.x, y: r.y, orient: initial[i] });
        } else {
          splitOrient.push({ x: r.x, y: r.y, orient: initial[i] });
        }
      }
      for (const mc of mirrorCells) {
        const row = def.grid[mc.y];
        def.grid[mc.y] = row.slice(0, mc.x) + (mc.orient === 0 ? '/' : '\\') + row.slice(mc.x + 1);
      }
      if (splitOrient.length > 0) def.meta.splitOrient = splitOrient;

      const verifyLevel = parseLevel(def);
      applyOrients(verifyLevel, initial);
      const res = solve(verifyLevel);
      restoreInitial(verifyLevel);
      if (res && res.moves === guaranteed && res.moves >= minOpt && res.moves <= maxOpt) {
        def.par = res.moves;
        def.diff = difficultyBand(res.moves);
        def.archetype = arch.fn.name;
        def.solutionOrients = finals;
        return def;
      }
      continue;
    }

    let solvedOrients = null;
    let criticalCount = 0;
    const seedCandidates = [
      new Array(n).fill(0),
      new Array(n).fill(1),
      Array.from({ length: n }, () => (rng() < 0.5 ? 0 : 1)),
      Array.from({ length: n }, () => (rng() < 0.5 ? 0 : 1)),
      Array.from({ length: n }, () => (rng() < 0.5 ? 0 : 1)),
      Array.from({ length: n }, () => (rng() < 0.5 ? 0 : 1))
    ];
    for (const cand of seedCandidates) {
      applyOrients(level, cand);
      const probeRes = solve(level);
      if (probeRes) {
        solvedOrients = cand.slice();
        for (const f of probeRes.flips) solvedOrients[f] ^= 1;
        criticalCount = probeRes.flips.length;
        break;
      }
    }
    restoreInitial(level);
    if (!solvedOrients) continue;
    if (criticalCount > maxOpt) continue;

    const nonCritical = Array.from({ length: n }, (_, i) => i);

    const tOrder = [];
    for (let t = Math.max(minOpt, criticalCount); t <= Math.min(maxOpt, n); t++) tOrder.push(t);
    for (let i = tOrder.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tOrder[i], tOrder[j]] = [tOrder[j], tOrder[i]];
    }

    for (const t of tOrder) {
      const extraNeed = t - criticalCount;
      if (extraNeed < 0) continue;
      if (extraNeed > nonCritical.length) continue;
      const shuffled = nonCritical.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const candidate = level.initialOrients.slice();
      for (let i = 0; i < extraNeed; i++) candidate[shuffled[i]] ^= 1;

      applyOrients(level, candidate);
      const res = solve(level);
      const opt = res ? res.moves : -1;
      restoreInitial(level);

      if (opt >= minOpt && opt <= maxOpt) {
        const solutionOrients = candidate.slice();
        for (const f of res.flips) solutionOrients[f] ^= 1;

        def.par = opt;
        def.diff = difficultyBand(opt);
        def.archetype = arch.fn.name;
        def.solutionOrients = solutionOrients;
        return def;
      }
    }
  }

  return null;
}

export const CHAPTER_INFO = [
  { id: 6, name: '빛의 강', nameEn: 'River of Light', desc: '흐르는 빛을 따라가세요', lo: 31, hi: 57 },
  { id: 7, name: '별의 계곡', nameEn: 'Valley of Stars', desc: '갈라진 빛의 계곡', lo: 58, hi: 84 },
  { id: 8, name: '안개 정원', nameEn: 'Misty Garden', desc: '색을 잃은 정원', lo: 85, hi: 111 },
  { id: 9, name: '유리 숲', nameEn: 'Glass Forest', desc: '비침과 반사의 숲', lo: 112, hi: 138 },
  { id: 10, name: '달빛 사막', nameEn: 'Moonlit Desert', desc: '문이 있는 광활한 땅', lo: 139, hi: 165 },
  { id: 11, name: '극광의 밤', nameEn: 'Aurora Night', desc: '극광이 흐르는 밤', lo: 166, hi: 192 },
  { id: 12, name: '심연의 별', nameEn: 'Abyssal Stars', desc: '가장 깊은 곳의 별', lo: 193, hi: 219 },
  { id: 13, name: '여명의 문', nameEn: 'Gates of Dawn', desc: '새벽으로 이어지는 문', lo: 220, hi: 246 },
  { id: 14, name: '영겁의 숲', nameEn: 'Eternal Forest', desc: '모든 것이 섞이는 숲', lo: 247, hi: 273 },
  { id: 15, name: '영원의 새벽', nameEn: 'Forever Dawn', desc: '최종장 — 빛의 대합주', lo: 274, hi: 300 }
];

export function chapterForId(id) {
  for (const c of CHAPTER_INFO) {
    if (id >= c.lo && id <= c.hi) return c.id;
  }
  return 1;
}

export function difficultyWaveForId(id) {
  const idx = id - 31;
  if (idx < 0) return 4;
  const wave = idx % 27;
  if (wave < 6) return 3 + Math.floor(wave / 2);
  if (wave < 20) return 6 + Math.floor((wave - 6) / 3);
  return 9 + Math.min(3, Math.floor((wave - 20) / 2));
}

export function generateAll(startId, endId, verifiedPool = []) {
  const out = [];
  const failures = [];
  for (let id = startId; id <= endId; id++) {
    const chapter = chapterForId(id);
    const diffTarget = difficultyWaveForId(id);
    const band = bandFor(diffTarget);
    let def = generateLevel(id, { chapter, diffTarget, band });
    if (!def) {
      def = generateLevel(id, { chapter, diffTarget: Math.max(1, diffTarget - 1), band: bandFor(Math.max(1, diffTarget - 1)) });
    }
    if (!def) {
      const pool = verifiedPool.filter(l => l.par >= Math.max(1, band.min - 2));
      const ordered = pool.length ? pool : verifiedPool;
      for (let pi = 0; pi < ordered.length && !def; pi++) {
        const idx = (id * 7919 + pi * 104729) % ordered.length;
        const pick0 = ordered[idx];
        const copy = {
          ...pick0,
          id,
          name: `변이된 ${pick0.name}`,
          nameEn: `${EN_PRE[(id * 7) % EN_PRE.length]} ${EN_NOUN[(id * 13) % EN_NOUN.length]}`,
          chapter,
          par: pick0.par,
          diff: difficultyBand(pick0.par)
        };
        const lv = parseLevel(copy);
        const sol = solve(lv);
        if (sol && sol.moves >= 1 && sol.moves <= 13) {
          copy.par = sol.moves;
          copy.diff = difficultyBand(sol.moves);
          def = copy;
        }
      }
    }
    if (!def) failures.push(id);
    else out.push(def);
  }
  return { levels: out, failures };
}




