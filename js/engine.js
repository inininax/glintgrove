(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};
  const CELL = GG.CELL;
  const DX = GG.DX;
  const DY = GG.DY;

  const MIRROR_SLASH_MAP = [1, 0, 3, 2];
  const MIRROR_BACK_MAP = [3, 2, 1, 0];

  function isMirror(ch) { return ch === CELL.MIRROR_SLASH || ch === CELL.MIRROR_BACK; }
  function isSplitter(ch) { return ch === CELL.SPLITTER; }
  function isCrystal(ch) { return ch === 'r' || ch === 'g' || ch === 'b'; }
  function isGate(ch) { return ch === 'A' || ch === 'B' || ch === 'C'; }
  function gateColorOf(ch) { return ch === 'A' ? 'r' : (ch === 'B' ? 'g' : 'b'); }
  function isPortal(ch) { return ch === 'P' || ch === 'Q' || ch === 'R' || ch === 'S'; }
  function portalPartner(ch) {
    if (ch === 'P') return 'Q';
    if (ch === 'Q') return 'P';
    if (ch === 'R') return 'S';
    return 'R';
  }
  function isTargetChar(ch) {
    return ch === 'T' || ch === 'f' || ch === 'M' || ch === 'O';
  }

  function parseLevel(def) {
    const rows = def.grid;
    const h = rows.length;
    const w = Math.max(...rows.map(r => r.length));
    const cells = [];
    const emitters = [];
    const targets = [];
    const rotatables = [];
    const portals = {};

    for (let y = 0; y < h; y++) cells.push(new Array(w).fill(CELL.EMPTY));
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        cells[y][x] = ch;
        if (ch === '>' || ch === '<' || ch === '^' || ch === 'v') {
          const dir = ch === '>' ? 1 : (ch === '<' ? 3 : (ch === '^' ? 0 : 2));
          emitters.push({ x, y, dir, color: 'white' });
        } else if (isMirror(ch) || isSplitter(ch)) {
          rotatables.push({ x, y, orient: ch === '\\' ? 1 : 0, kind: isSplitter(ch) ? 'splitter' : 'mirror', spin: 0 });
        } else if (isTargetChar(ch)) {
          const type = ch === 'T' ? 'tree' : (ch === 'f' ? 'flower' : (ch === 'M' ? 'mushroom' : 'owl'));
          targets.push({ x, y, type, need: null });
        } else if (isPortal(ch)) {
          portals[ch] = { x, y };
        }
      }
    }

    const meta = def.meta || {};
    if (meta.emitters) {
      for (const e of meta.emitters) {
        const found = emitters.find(t => t.x === e.x && t.y === e.y);
        if (found && e.color) found.color = e.color;
        if (found && typeof e.dir === 'number') found.dir = e.dir;
      }
    }
    if (meta.needs) {
      for (const n of meta.needs) {
        const found = targets.find(t => t.x === n.x && t.y === n.y);
        if (found) found.need = n.need;
      }
    }
    if (meta.splitOrient) {
      for (const s of meta.splitOrient) {
        const found = rotatables.find(r => r.x === s.x && r.y === s.y);
        if (found) found.orient = s.orient ? 1 : 0;
      }
    }

    const initialOrients = rotatables.map(r => r.orient);

    return {
      id: def.id, name: def.name, chapter: def.chapter || 1,
      hint: meta.hint || '', w, h, cells,
      emitters, targets, rotatables, portals,
      par: def.par || 6,
      initialOrients
    };
  }

  function findRotatable(level, x, y) {
    for (const r of level.rotatables) {
      if (r.x === x && r.y === y) return r;
    }
    return null;
  }

  function gatePasses(beamColor, gateColor) {
    return beamColor === gateColor;
  }

  function traceCore(level) {
    const segments = [];
    const litSet = new Set();
    const targetColors = {};
    const hits = [];
    const visited = new Set();
    const queue = [];

    for (const e of level.emitters) {
      queue.push({ x: e.x, y: e.y, dir: e.dir, color: e.color });
    }

    while (queue.length > 0) {
      const seed = queue.shift();
      let cx = seed.x;
      let cy = seed.y;
      let dir = seed.dir;
      let color = seed.color;

      let stepsLeft = (level.w + 2) * (level.h + 2) * 8 + 64;

      while (stepsLeft-- > 0) {
        const stateKey = GG.key(cx, cy, dir, color);
        if (visited.has(stateKey)) break;
        visited.add(stateKey);

        const nx = cx + DX[dir];
        const ny = cy + DY[dir];

        if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h) {
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 1 });
          break;
        }

        const ch = level.cells[ny][nx];

        if (ch === CELL.WALL) {
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.72, spark: true });
          hits.push({ x: nx, y: ny, color, kind: 'wall' });
          break;
        }

        if (isTargetChar(ch)) {
          litSet.add(nx + ',' + ny);
          if (!targetColors[nx + ',' + ny]) targetColors[nx + ',' + ny] = color;
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.5, spark: true });
          hits.push({ x: nx, y: ny, color, kind: ch });
          break;
        }

        if (isGate(ch)) {
          if (!gatePasses(color, gateColorOf(ch))) {
            segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.32, spark: true });
            hits.push({ x: nx, y: ny, color, kind: 'gate' });
            break;
          }
          segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 1 });
          cx = nx; cy = ny;
          continue;
        }

        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 1 });

        if (isCrystal(ch)) {
          color = ch;
          cx = nx; cy = ny;
          continue;
        }

        if (isPortal(ch)) {
          const partnerCh = portalPartner(ch);
          const partner = level.portals[partnerCh];
          if (partner) {
            segments.push({ portalJump: true, fromX: nx, fromY: ny, toX: partner.x, toY: partner.y, color });
            cx = partner.x; cy = partner.y;
            continue;
          }
        }

        if (isMirror(ch) || isSplitter(ch)) {
          const ro = findRotatable(level, nx, ny);
          const slash = ro ? ro.orient === 0 : ch === '/';
          const map = slash ? MIRROR_SLASH_MAP : MIRROR_BACK_MAP;
          const outDir = map[dir];
          if (isSplitter(ch)) {
            const sKey = GG.key(nx, ny, outDir, color);
            if (!visited.has(sKey)) queue.push({ x: nx, y: ny, dir: outDir, color });
          } else {
            dir = outDir;
          }
          cx = nx; cy = ny;
          continue;
        }

        cx = nx; cy = ny;
      }
    }

    return { segments, litSet, targetColors, hits };
  }

  function trace(level) { return traceCore(level); }

  function allTargetsSatisfied(level, result) {
    if (!result.targetColors) return false;
    for (const t of level.targets) {
      if (!result.litSet.has(t.x + ',' + t.y)) return false;
      if (t.need && result.targetColors[t.x + ',' + t.y] !== t.need) return false;
    }
    return true;
  }

  function isLevelSolved(level) {
    return allTargetsSatisfied(level, traceCore(level));
  }

  function applyOrients(level, orients) {
    for (let i = 0; i < level.rotatables.length; i++) {
      level.rotatables[i].orient = orients[i];
    }
  }

  function restoreInitial(level) {
    applyOrients(level, level.initialOrients);
  }

  function solve(level) {
    const n = level.rotatables.length;
    if (n > 24) return null;

    const start = level.initialOrients.slice();
    applyOrients(level, start);

    const parents = new Map();
    parents.set(start.join(''), null);
    const queue = [start];
    let head = 0;

    if (allTargetsSatisfied(level, traceCore(level))) {
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

        applyOrients(level, next);
        if (allTargetsSatisfied(level, traceCore(level))) {
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

  function hintMove(level, currentOrients) {
    applyOrients(level, currentOrients);
    for (let i = 0; i < level.rotatables.length; i++) {
      level.rotatables[i].orient ^= 1;
      const solvedNow = allTargetsSatisfied(level, traceCore(level));
      level.rotatables[i].orient ^= 1;
      if (solvedNow) return { idx: i };
    }
    const savedInitial = level.initialOrients.slice();
    applyOrients(level, savedInitial);
    for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = currentOrients[i];
    const sol = solve(level);
    for (let i = 0; i < level.rotatables.length; i++) level.initialOrients[i] = savedInitial[i];
    applyOrients(level, currentOrients);
    return sol && sol.flips.length > 0 ? { idx: sol.flips[0] } : null;
  }

  GG.engine = {
    parseLevel,
    trace,
    isLevelSolved,
    allTargetsSatisfied,
    solve,
    hintMove,
    restoreInitial,
    applyOrients,
    gatePasses,
    findRotatable,
    MIRROR_SLASH_MAP,
    MIRROR_BACK_MAP,
    isMirror, isSplitter, isCrystal, isGate, isPortal, isTargetChar,
    gateColorOf, portalPartner
  };

})(typeof window !== 'undefined' ? window : globalThis);
