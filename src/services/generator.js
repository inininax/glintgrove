import { mulberry32, xmur3 } from '../core/math.js';
import { parseLevel } from '../sim/parser.js';
import { solve, applyOrients, isLevelSolved } from '../sim/solver.js';

// Authored 2026-09-13. Routes are constructed from an empty board; no previous
// level layouts, transformed templates, external grids or artwork are inputs.
export const LEVEL_REMAKE_SEED = 'ilyndrel-rainpaths-2026-09-13-v1';
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const key = (x, y) => `${x},${y}`;
const pick = (rng, items) => items[Math.floor(rng() * items.length)];
const integer = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const turnOrient = (incoming, outgoing) => [1, 0, 3, 2][incoming] === outgoing ? 0 : 1;
function shuffle(rng, items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = integer(rng, 0, i); [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CHAPTER_NAMES = [
  ['물방울 길', 'Droplet Paths', '작은 굽이에서 시작합니다', 'Begin with a small turn'],
  ['갈래 수로', 'Branching Channels', '빛을 나누어 두 길을 엽니다', 'Share a beam between paths'],
  ['물든 둔덕', 'Tinted Banks', '빛의 색을 길 끝까지 보냅니다', 'Carry a color to the end'],
  ['건너편 연못', 'The Far Pool', '떨어진 길을 이어 봅니다', 'Join paths across a gap'],
  ['모이는 물줄기', 'Meeting Streams', '배운 길을 함께 엮습니다', 'Combine the routes you learned'],
  ['조약돌 여울', 'Pebble Shallows'], ['물결의 모서리', 'Edges of Ripples'],
  ['이슬 수집가', 'Dew Collectors'], ['돌담 사이', 'Between Stone Walls'],
  ['물빛 편지', 'Letters in Water'], ['비스듬한 비', 'Slanting Rain'],
  ['깊은 웅덩이', 'Deep Puddles'], ['잎 끝의 무게', 'At the Leaf Tip'],
  ['겹친 물소리', 'Overlapping Drops'], ['비가 쉬는 곳', 'Where Rain Rests'],
  ['작은 합류점', 'Small Confluences'], ['돌아오는 물결', 'Returning Ripples'],
  ['젖은 등성이', 'Rainlit Ridges'], ['마지막 수문', 'The Last Sluice'],
  ['고요한 물마루', 'Quiet Waterline']
];
export const CHAPTER_INFO = CHAPTER_NAMES.map(([name, nameEn, desc, descEn], index) => ({
  id: index + 1, name, nameEn,
  desc: desc || '굽이와 갈래를 차근차근 읽어 보세요',
  descEn: descEn || 'Read each bend and branch in turn'
}));
const WORDS_KO = ['낮은', '고른', '둥근', '가느다란', '잔잔한', '포개진', '깊은', '흩어진', '맑은', '비껴난', '느린', '너른', '짧은', '이어진', '먼'];
const WORDS_EN = ['Low', 'Even', 'Rounded', 'Slender', 'Still', 'Layered', 'Deep', 'Scattered', 'Clear', 'Oblique', 'Slow', 'Wide', 'Short', 'Joined', 'Distant'];
const NOUNS_KO = ['낙숫물', '돌 틈', '물자국', '물매', '빗방울', '모래턱', '젖은 잎', '작은 만', '물고리', '돌계단', '잎 그늘', '샛물', '물길', '여울목', '물거울', '징검돌', '잔물결', '비의 쉼표', '모퉁이', '물가'];
const NOUNS_EN = ['Drip', 'Stone Gap', 'Watermark', 'Slope', 'Raindrop', 'Sandbar', 'Wet Leaf', 'Small Bay', 'Water Ring', 'Stone Step', 'Leaf Shade', 'Rill', 'Waterway', 'Shallow Bend', 'Water Mirror', 'Stepping Stone', 'Ripple', 'Rain Pause', 'Corner', 'Shore'];

function planFor(id) {
  if (id === 300) return { turns: 5, branches: 2, branchTurns: 1, color: true, portal: true, secondEmitter: true, flips: 8 };
  if (id <= 5) return { turns: id === 2 ? 2 : id === 5 ? 4 : 3, branches: 0, branchTurns: 0, flips: id < 3 ? 1 : id < 5 ? 2 : 3 };
  if (id <= 16) return { turns: id === 6 ? 2 : 3 + id % 3, branches: id < 10 ? 1 : 1 + id % 2, branchTurns: id > 11 ? 1 : 0, flips: id === 6 ? 1 : id < 9 ? 2 : 3 + id % 2 };
  if (id <= 22) return { turns: 3 + id % 2, branches: id === 17 ? 1 : 1 + id % 2, branchTurns: id > 19 ? 1 : 0, color: true, flips: id === 17 ? 2 : 3 + id % 3 };
  if (id <= 26) return { turns: id === 23 ? 3 : 4, branches: id === 23 ? 0 : 1, branchTurns: 0, portal: true, color: id > 24, flips: id === 23 ? 2 : 3 + id % 2 };
  if (id <= 30) return { turns: 4 + id % 2, branches: 2, branchTurns: 1, color: true, portal: true, flips: 5 + id % 2 };
  const band = Math.floor((id - 31) / 54);
  return { turns: 3 + (id % 3), branches: 1 + ((id + band) % 2), branchTurns: band > 0 && id % 3 !== 0 ? 1 : 0,
    color: id % 3 !== 0, portal: id % 4 === 0 || (band > 2 && id % 4 === 1),
    secondEmitter: id % 10 === 0, flips: Math.min(7, 2 + band + id % 3) };
}

function emptyBoard(rng, id) {
  const w = id < 6 ? 11 : integer(rng, 13, 16);
  const h = id < 6 ? 9 : integer(rng, 10, 13);
  return { w, h, grid: Array.from({ length: h }, () => Array(w).fill('.')),
    used: new Set(), turns: [], terminals: [], branches: [], portalUsed: false };
}
function free(board, x, y) {
  return x >= 1 && y >= 1 && x < board.w - 1 && y < board.h - 1 && !board.used.has(key(x, y));
}
function occupy(board, x, y, char = '.') {
  board.used.add(key(x, y)); board.grid[y][x] = char;
}
function origin(board, rng) {
  for (const dir of shuffle(rng, [0, 1, 2, 3])) {
    for (const n of shuffle(rng, Array.from({ length: (dir % 2 ? board.h : board.w) - 2 }, (_, i) => i + 1))) {
      const x = dir === 1 ? 1 : dir === 3 ? board.w - 2 : n;
      const y = dir === 2 ? 1 : dir === 0 ? board.h - 2 : n;
      if (free(board, x, y) && free(board, x + DX[dir] * 2, y + DY[dir] * 2)) return { x, y, dir };
    }
  }
  return null;
}
function segment(board, from, dir, min, max, rng) {
  const options = [];
  const cells = [];
  for (let distance = 1; distance <= max; distance++) {
    const x = from.x + DX[dir] * distance, y = from.y + DY[dir] * distance;
    if (!free(board, x, y)) break;
    cells.push({ x, y });
    if (distance >= min) options.push(cells.slice());
  }
  if (!options.length) return null;
  const selected = pick(rng, options);
  for (const cell of selected) occupy(board, cell.x, cell.y);
  return selected;
}
function addRoute(board, start, count, rng, { color = false, portal = false, root = false } = {}) {
  let cursor = { x: start.x, y: start.y }, dir = start.dir;
  if (root) occupy(board, cursor.x, cursor.y, ['^', '>', 'v', '<'][dir]);
  for (let i = 0; i <= count; i++) {
    if (portal && !board.portalUsed && i === Math.floor(count / 2)) {
      const entry = segment(board, cursor, dir, 1, 2, rng);
      if (!entry) return false;
      const p = entry.at(-1); board.grid[p.y][p.x] = 'P';
      const exits = [];
      for (let y = 2; y < board.h - 2; y++) for (let x = 2; x < board.w - 2; x++) {
        if (free(board, x, y) && free(board, x + DX[dir], y + DY[dir]) && free(board, x + DX[dir] * 2, y + DY[dir] * 2)
          && Math.abs(x - p.x) + Math.abs(y - p.y) >= 5) exits.push({ x, y });
      }
      if (!exits.length) return false;
      cursor = pick(rng, exits); occupy(board, cursor.x, cursor.y, 'Q'); board.portalUsed = true;
    }
    const terminal = i === count;
    const cells = segment(board, cursor, dir, terminal && color ? 3 : 2, terminal && color ? 5 : 4, rng);
    if (!cells) return false;
    cursor = cells.at(-1);
    if (terminal) {
      board.grid[cursor.y][cursor.x] = pick(rng, ['T', 'f', 'M', 'O']);
      board.terminals.push({ ...cursor, cells, color });
    } else {
      const exits = shuffle(rng, [(dir + 1) % 4, (dir + 3) % 4]).filter(next =>
        free(board, cursor.x + DX[next], cursor.y + DY[next]) && free(board, cursor.x + DX[next] * 2, cursor.y + DY[next] * 2));
      if (!exits.length) return false;
      const outgoing = exits[0];
      const orient = turnOrient(dir, outgoing);
      board.grid[cursor.y][cursor.x] = orient ? '\\' : '/';
      board.turns.push({ ...cursor, orient, incoming: dir });
      if (root) board.branches.push({ ...cursor, dir });
      dir = outgoing;
    }
  }
  return true;
}

function construct(id, rng, plan) {
  const board = emptyBoard(rng, id);
  const start = origin(board, rng);
  if (!start || !addRoute(board, start, plan.turns, rng, { ...plan, root: true })) return null;
  for (let n = 0; n < plan.branches; n++) {
    const candidates = shuffle(rng, board.branches).filter(p => board.grid[p.y][p.x] !== 's'
      && free(board, p.x + DX[p.dir], p.y + DY[p.dir]));
    if (!candidates.length) return null;
    const p = candidates[0];
    if (!addRoute(board, p, plan.branchTurns, rng, { color: plan.color })) return null;
    board.grid[p.y][p.x] = 's';
  }
  if (plan.secondEmitter) {
    const second = origin(board, rng);
    if (!second || !addRoute(board, second, 2, rng, { color: plan.color, root: true })) return null;
  }
  const needs = [];
  if (plan.color) {
    for (const [i, t] of board.terminals.entries()) {
      const color = ['r', 'g', 'b'][(id + i) % 3];
      const crystal = t.cells.at(-3), gate = t.cells.at(-2);
      board.grid[crystal.y][crystal.x] = color;
      board.grid[gate.y][gate.x] = { r: 'A', g: 'B', b: 'C' }[color];
      needs.push({ x: t.x, y: t.y, need: color });
    }
  }
  // Wall islands use only cells outside every intended beam route.
  for (let y = 1; y < board.h - 1; y++) for (let x = 1; x < board.w - 1; x++) {
    if (free(board, x, y) && rng() < 0.075) board.grid[y][x] = '#';
  }
  const meta = { needs, splitOrient: board.turns.filter(t => board.grid[t.y][t.x] === 's').map(t => ({ x: t.x, y: t.y, orient: t.orient })) };
  return { grid: board.grid.map(row => row.join('')), meta };
}

function decorate(id, raw) {
  const chapter = id <= 5 ? 1 : id <= 16 ? 2 : id <= 22 ? 3 : id <= 26 ? 4 : id <= 30 ? 5 : 6 + Math.floor((id - 31) / 18);
  const a = Math.floor((id - 1) / 20), b = (id - 1) % 20;
  const plan = planFor(id);
  const hint = plan.portal ? '입구에 닿은 빛은 짝 출구에서 같은 방향으로 이어집니다.' : plan.color ? '수정과 문을 지난 빛의 색이 생명이 원하는 색과 같아야 합니다.' : plan.branches ? '갈림돌에서는 곧은 길과 꺾이는 길을 함께 확인하세요.' : '빛이 굽이를 지날 때마다 다음 거울과 생명의 위치를 확인하세요.';
  const hintEn = plan.portal ? 'At a paired exit, light keeps its incoming direction.' : plan.color ? 'After a crystal and gate, the light must match the target color.' : plan.branches ? 'At a splitter, check both the straight path and the turning path.' : 'At each bend, look for the next mirror and the waiting life.';
  return { id, name: `${WORDS_KO[a]} ${NOUNS_KO[b]}`, nameEn: `${WORDS_EN[a]} ${NOUNS_EN[b]}`, chapter,
    grid: raw.grid, meta: { ...raw.meta, hint, hintEn }, origin: 'rainpaths-v1', archetype: plan.portal ? 'paired-route' : plan.color ? 'tinted-tributaries' : plan.branches ? 'branch-route' : 'turn-route' };
}

function scramble(def, rng, requestedFlips) {
  const level = parseLevel(def);
  if (!isLevelSolved(level) || level.rotatables.length > 10) return null;
  const solutionOrients = level.initialOrients.slice();
  const candidates = def.id === 6
    ? level.rotatables.map((r, i) => r.kind === 'splitter' ? i : -1).filter(i => i >= 0)
    : shuffle(rng, level.rotatables.map((_, i) => i));
  const changed = new Set(candidates.slice(0, Math.min(requestedFlips, level.rotatables.length)));
  const initial = solutionOrients.map((orient, i) => orient ^ Number(changed.has(i)));
  const grid = def.grid.map(row => [...row]);
  def.meta.splitOrient = [];
  for (const [i, r] of level.rotatables.entries()) {
    if (r.kind === 'splitter') def.meta.splitOrient.push({ x: r.x, y: r.y, orient: initial[i] });
    else grid[r.y][r.x] = initial[i] ? '\\' : '/';
  }
  def.grid = grid.map(row => row.join(''));
  const scrambled = parseLevel(def), sol = solve(scrambled);
  if (!sol || sol.moves < 1 || sol.moves !== changed.size) return null;
  def.par = sol.moves;
  def.diff = sol.moves >= 7 ? 'extreme' : sol.moves >= 6 ? 'hard' : sol.moves >= 4 ? 'normal' : 'easy';
  def.solutionOrients = solutionOrients;
  applyOrients(scrambled, solutionOrients);
  if (!isLevelSolved(scrambled)) return null;
  return def;
}

// Ignore decorative walls, target species, emitter heading and mirror state.
// Trim and compare all rotations/reflections to reject re-skinned old layouts.
export function canonicalLayoutSignature(def) {
  const points = [];
  for (const [y, row] of def.grid.entries()) for (const [x, ch] of [...row].entries()) {
    if ('.#'.includes(ch)) continue;
    const kind = '/\\'.includes(ch) ? 'm' : '><^v'.includes(ch) ? 'e' : 'TfMO'.includes(ch) ? 't' : 'PQRS'.includes(ch) ? 'p' : ch;
    points.push({ x, y, kind });
  }
  return Array.from({ length: 8 }, (_, transform) => {
    const q = points.map(p => {
      let x = p.x, y = p.y;
      if (transform & 1) x = -x;
      if (transform & 2) y = -y;
      if (transform & 4) [x, y] = [y, x];
      return { x, y, kind: p.kind };
    });
    const minX = Math.min(...q.map(p => p.x)), minY = Math.min(...q.map(p => p.y));
    return q.map(p => `${p.x - minX},${p.y - minY}:${p.kind}`).sort().join(';');
  }).sort()[0];
}

export function generateLevel(id, { seed = LEVEL_REMAKE_SEED, reject = () => false } = {}) {
  if (!Number.isInteger(id) || id < 1 || id > 300) throw new RangeError('level id must be an integer from 1 to 300');
  const rng = mulberry32(xmur3(`${seed}:level:${id}`)());
  if (id === 1) {
    const def = decorate(1, { grid: ['.........', '....../.T', '.........', '.........', '.........', '.>....\\..', '.#.......'], meta: {} });
    def.par = 1; def.diff = 'easy'; def.solutionOrients = [0, 0];
    def.meta.hint = '아래쪽 거울을 한 번 돌려 빛을 위의 거울로 보내세요.';
    def.meta.hintEn = 'Turn the lower mirror once to send light to the upper mirror.';
    if (reject(canonicalLayoutSignature(def))) throw new Error('authored introduction duplicates a retired layout');
    return def;
  }
  const plan = planFor(id);
  for (let attempt = 0; attempt < 25000; attempt++) {
    const raw = construct(id, rng, plan);
    if (!raw) continue;
    const def = scramble(decorate(id, raw), rng, plan.flips);
    if (def && !reject(canonicalLayoutSignature(def))) return def;
  }
  throw new Error(`could not construct level ${id} for seed ${seed}`);
}

export function generateAll(start = 1, end = 300, { seed = LEVEL_REMAKE_SEED, reject = () => false } = {}) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 300 || end < start) throw new RangeError('invalid level range');
  const seen = new Set(), levels = [], failures = [];
  for (let id = start; id <= end; id++) {
    try {
      const def = generateLevel(id, { seed, reject: signature => seen.has(signature) || reject(signature) });
      seen.add(canonicalLayoutSignature(def)); levels.push(def);
    } catch (error) { failures.push({ id, message: error.message }); }
  }
  return { levels, failures };
}
