import { TILE, TARGET_CHARS, TARGET_TYPE_BY_CHAR } from '../core/tiles.js';

export function isMirror(ch) {
  return ch === TILE.MIRROR_SLASH || ch === TILE.MIRROR_BACK;
}

export function isSplitter(ch) {
  return ch === TILE.SPLITTER;
}

const CRYSTALS = new Set([TILE.CRYSTAL_R, TILE.CRYSTAL_G, TILE.CRYSTAL_B]);
export function isCrystal(ch) {
  return CRYSTALS.has(ch);
}

const GATES = new Set([TILE.GATE_R, TILE.GATE_G, TILE.GATE_B]);
export function isGate(ch) {
  return GATES.has(ch);
}

export function gateColorOf(ch) {
  return ch === TILE.GATE_R ? 'r' : ch === TILE.GATE_G ? 'g' : 'b';
}

const PORTALS = new Set([TILE.PORTAL_A, TILE.PORTAL_B, TILE.PORTAL_C, TILE.PORTAL_D]);
export function isPortal(ch) {
  return PORTALS.has(ch);
}

export function portalPartner(ch) {
  switch (ch) {
    case TILE.PORTAL_A: return TILE.PORTAL_B;
    case TILE.PORTAL_B: return TILE.PORTAL_A;
    case TILE.PORTAL_C: return TILE.PORTAL_D;
    default: return TILE.PORTAL_C;
  }
}

export function isTargetChar(ch) {
  return TARGET_CHARS.has(ch);
}

export function targetMeta(ch) {
  return TARGET_TYPE_BY_CHAR[ch] || null;
}

const EMITTER_DIRS = {
  [TILE.EMITTER_R]: 1,
  [TILE.EMITTER_L]: 3,
  [TILE.EMITTER_U]: 0,
  [TILE.EMITTER_D]: 2
};

export function parseLevel(def) {
  const rows = def.grid;
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const cells = [];
  const emitters = [];
  const targets = [];
  const rotatables = [];
  const portals = {};
  const crystals = [];
  const gates = [];
  const walls = [];

  for (let y = 0; y < h; y++) cells.push(new Array(w).fill(TILE.EMPTY));

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      cells[y][x] = ch;

      if (ch in EMITTER_DIRS) {
        emitters.push({ x, y, dir: EMITTER_DIRS[ch], color: 'white' });
      } else if (isMirror(ch) || isSplitter(ch)) {
        rotatables.push({
          x,
          y,
          orient: ch === TILE.MIRROR_BACK ? 1 : 0,
          kind: isSplitter(ch) ? 'splitter' : 'mirror'
        });
      } else if (isTargetChar(ch)) {
        targets.push({ x, y, type: targetMeta(ch), need: null });
      } else if (isPortal(ch)) {
        portals[ch] = { x, y };
      } else if (isCrystal(ch)) {
        crystals.push({ x, y, color: ch });
      } else if (isGate(ch)) {
        gates.push({ x, y, needColor: gateColorOf(ch), char: ch });
      } else if (ch === TILE.WALL) {
        walls.push({ x, y });
      }
    }
  }

  const meta = def.meta || {};

  for (const e of meta.emitters || []) {
    const found = emitters.find(t => t.x === e.x && t.y === e.y);
    if (!found) continue;
    if (e.color) found.color = e.color;
    if (typeof e.dir === 'number') found.dir = e.dir;
  }

  for (const n of meta.needs || []) {
    const found = targets.find(t => t.x === n.x && t.y === n.y);
    if (found) found.need = n.need;
  }

  for (const s of meta.splitOrient || []) {
    const found = rotatables.find(r => r.x === s.x && r.y === s.y && r.kind === 'splitter');
    if (found) found.orient = s.orient ? 1 : 0;
  }

  return {
    id: def.id,
    name: def.name,
    nameEn: def.nameEn || null,
    chapter: def.chapter || 1,
    hint: meta.hint || '',
    hintEn: meta.hintEn || null,
    w,
    h,
    cells,
    emitters,
    targets,
    rotatables,
    portals,
    crystals,
    gates,
    walls,
    par: def.par || 6,
    initialOrients: rotatables.map(r => r.orient)
  };
}
