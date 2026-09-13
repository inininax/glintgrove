import { TILE, DX, DY } from '../core/tiles.js';
import { stateKey } from '../core/math.js';
import {
  isMirror, isSplitter, isCrystal, isGate, isPortal,
  portalPartner, isTargetChar, gateColorOf
} from './parser.js';

const SLASH_MAP = [1, 0, 3, 2];
const BACK_MAP = [3, 2, 1, 0];

export function gatePasses(beamColor, gateColor) {
  return beamColor === gateColor;
}

export function findRotatable(level, x, y) {
  return level.rotatables.find(r => r.x === x && r.y === y) || null;
}

export function trace(level) {
  const segments = [];
  const litSet = new Set();
  const targetColors = {};
  const hits = [];
  const visited = new Set();
  const queue = [];

  const portalByCell = {};
  for (const k in level.portals) {
    const p = level.portals[k];
    portalByCell[`${p.x},${p.y}`] = k;
  }

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
      const sKey = stateKey(cx, cy, dir, color);
      if (visited.has(sKey)) break;
      visited.add(sKey);

      const nx = cx + DX[dir];
      const ny = cy + DY[dir];

      if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h) {
        segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 1 });
        break;
      }

      segments.push({ x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 1 });

      const ch = level.cells[ny][nx];

      if (ch === TILE.WALL) {
        segments[segments.length - 1] = { x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.72, spark: true };
        hits.push({ x: nx, y: ny, color, kind: 'wall' });
        break;
      }

      if (isTargetChar(ch)) {
        litSet.add(`${nx},${ny}`);
        if (!targetColors[`${nx},${ny}`]) targetColors[`${nx},${ny}`] = color;
        segments[segments.length - 1] = { x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.5, spark: true };
        hits.push({ x: nx, y: ny, color, kind: ch });
        break;
      }

      if (isGate(ch)) {
        if (!gatePasses(color, gateColorOf(ch))) {
          segments[segments.length - 1] = { x1: cx, y1: cy, x2: nx, y2: ny, color, endFrac: 0.32, spark: true };
          hits.push({ x: nx, y: ny, color, kind: 'gate' });
          break;
        }
        cx = nx;
        cy = ny;
        continue;
      }

      if (isCrystal(ch)) {
        color = ch;
        cx = nx;
        cy = ny;
        continue;
      }

      if (isPortal(ch)) {
        const partnerCh = portalPartner(ch);
        const partner = level.portals[partnerCh];
        if (partner) {
          segments.push({
            portalJump: true,
            fromX: nx,
            fromY: ny,
            toX: partner.x,
            toY: partner.y,
            color
          });
          cx = partner.x;
          cy = partner.y;
          continue;
        }
      }

      if (isMirror(ch) || isSplitter(ch)) {
        const ro = findRotatable(level, nx, ny);
        const slash = ro ? ro.orient === 0 : ch === TILE.MIRROR_SLASH;
        const map = slash ? SLASH_MAP : BACK_MAP;
        const outDir = map[dir];
        if (isSplitter(ch)) {
          const branchKey = stateKey(nx, ny, outDir, color);
          if (!visited.has(branchKey)) queue.push({ x: nx, y: ny, dir: outDir, color });
        } else {
          dir = outDir;
        }
        cx = nx;
        cy = ny;
        continue;
      }

      cx = nx;
      cy = ny;
    }
  }

  return { segments, litSet, targetColors, hits };
}
