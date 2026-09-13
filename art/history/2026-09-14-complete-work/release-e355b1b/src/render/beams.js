import { colorOf } from '../core/colors.js';
import { DX, DY } from '../core/tiles.js';
import { centerOf } from './layout.js';

// Original optical-thread treatment. Geometry and contact light are code, not textures.
export function invalidateGlowSprites() {}
const clamp = value => Math.min(1, Math.max(0, value));
const cellKey = (x, y) => `${x},${y}`;
const stateKey = (x, y, dir, color) => `${x},${y}:${dir}:${color}`;
const direction = segment => DX.findIndex((dx, dir) => dx === segment.x2 - segment.x1 && DY[dir] === segment.y2 - segment.y1);
const plans = new WeakMap();

// Connect only segments that the simulator actually produced. Distances are
// visual reveal timing; neither the trace nor its shortened collision ends change.
export function buildBeamPlan(result, level) {
  const cached = plans.get(result);
  if (cached && cached.level === level) return cached;
  const targets = new Map((level?.targets || []).map(target => [cellKey(target.x, target.y), target]));
  const gates = new Map((level?.gates || []).map(gate => [cellKey(gate.x, gate.y), gate]));
  const crystals = new Map((level?.crystals || []).map(crystal => [cellKey(crystal.x, crystal.y), crystal]));
  const reflectors = new Map((level?.rotatables || []).map(piece => [cellKey(piece.x, piece.y), piece]));
  const devices = new Set([...targets.keys(), ...gates.keys(), ...crystals.keys(), ...reflectors.keys(),
    ...(level?.emitters || []).map(item => cellKey(item.x, item.y)),
    ...Object.values(level?.portals || {}).map(item => cellKey(item.x, item.y))]);
  const entries = [], byState = new Map(), jumps = [];
  for (const segment of result.segments) {
    if (segment.portalJump) { jumps.push({ segment, distance: Infinity }); continue; }
    const key = cellKey(segment.x2, segment.y2), target = targets.get(key);
    const blockedGate = segment.spark && gates.has(key);
    const length = target ? 1 : blockedGate ? .82 : segment.endFrac ?? 1;
    const entry = { segment, target, blockedGate, length, distance: Infinity, dir: direction(segment),
      startDevice: devices.has(cellKey(segment.x1, segment.y1)), endDevice: devices.has(key) };
    entries.push(entry);
    byState.set(stateKey(segment.x1, segment.y1, entry.dir, segment.color), entry);
  }
  const pending = [];
  const visit = (entry, distance) => {
    if (!entry || entry.distance <= distance) return;
    entry.distance = distance;
    pending.push(entry);
  };
  for (const emitter of level?.emitters || []) visit(byState.get(stateKey(emitter.x, emitter.y, emitter.dir, emitter.color)), 0);
  if (!level && entries.length) visit(entries[0], 0);
  for (let cursor = 0; cursor < pending.length; cursor++) {
    const entry = pending[cursor], segment = entry.segment;
    if (segment.spark || (segment.endFrac ?? 1) < 1) continue;
    const key = cellKey(segment.x2, segment.y2), at = entry.distance + entry.length;
    const jump = jumps.find(item => item.segment.fromX === segment.x2 && item.segment.fromY === segment.y2 && item.segment.color === segment.color);
    if (jump) {
      for (const item of jumps) if (item.segment.fromX === segment.x2 && item.segment.fromY === segment.y2 && item.segment.color === segment.color) item.distance = Math.min(item.distance, at);
      visit(byState.get(stateKey(jump.segment.toX, jump.segment.toY, entry.dir, segment.color)), at);
      continue;
    }
    const color = crystals.get(key)?.color || segment.color;
    const piece = reflectors.get(key);
    // Ordinary crossings cannot transfer arrival time sideways to another ray.
    const reflected = piece ? (piece.orient === 0 ? [1, 0, 3, 2] : [3, 2, 1, 0])[entry.dir] : entry.dir;
    const dirs = piece?.kind === 'splitter' ? [entry.dir, reflected] : [reflected];
    for (const dir of dirs) visit(byState.get(stateKey(segment.x2, segment.y2, dir, color)), at);
  }
  const totalDistance = Math.max(1, ...entries.filter(entry => Number.isFinite(entry.distance)).map(entry => entry.distance + entry.length));
  const plan = { level, result, entries, jumps, totalDistance };
  plans.set(result, plan);
  return plan;
}

export function beamFrame(result, level, reveal = 1, reducedMotion = false) {
  const plan = buildBeamPlan(result, level);
  const frontier = (reducedMotion ? 1 : clamp(reveal)) * plan.totalDistance;
  return { plan, entries: plan.entries.map(entry => ({ ...entry, fraction: clamp((frontier - entry.distance) / entry.length) })),
    jumps: plan.jumps.filter(item => frontier > item.distance), frontier };
}

export function gateIsReached(frame, gate) {
  return !!frame?.entries.some(({ segment, fraction }) => fraction >= 1 && !segment.spark &&
    segment.x2 === gate.x && segment.y2 === gate.y && segment.color === gate.needColor);
}

export function segmentPoints(segment, layout, fraction = 1, length = segment.endFrac ?? 1) {
  const start = centerOf(layout, segment.x1, segment.y1);
  const end = centerOf(layout, segment.x2, segment.y2);
  const distance = length * fraction;
  return [start.cx, start.cy, start.cx + (end.cx - start.cx) * distance, start.cy + (end.cy - start.cy) * distance];
}
function stroke(ctx, coords) {
  ctx.beginPath(); ctx.moveTo(coords[0], coords[1]); ctx.lineTo(coords[2], coords[3]); ctx.stroke();
}
function pattern(color, cell) {
  const unit = Math.max(.65, cell / 85);
  return color === 'r' ? [7 * unit, 4 * unit] : color === 'g' ? [13 * unit, 4 * unit] : color === 'b' ? [2 * unit, 4 * unit] : [];
}

export function drawBeams(ctx, result, layout, time, opts = {}) {
  const frame = opts.frame || beamFrame(result, opts.level, opts.reveal ?? 1, opts.reducedMotion);
  ctx.save();
  ctx.lineCap = 'round';
  let ordinal = 0;
  for (const entry of frame.entries) {
    const { segment, fraction, length } = entry;
    if (!(fraction > 0)) continue;
    const coords = segmentPoints(segment, layout, fraction, length);
    const color = colorOf(segment.color);
    ctx.setLineDash(opts.colorblind ? pattern(segment.color, layout.cell) : []);
    ctx.strokeStyle = color;
    ctx.globalAlpha = .11;
    ctx.lineWidth = Math.max(3.5, layout.cell * .088);
    stroke(ctx, coords);
    ctx.globalAlpha = .76;
    ctx.lineWidth = Math.max(1.35, layout.cell * .025);
    stroke(ctx, coords);
    ctx.globalAlpha = .85;
    ctx.strokeStyle = segment.color === 'white' ? '#fff0c9' : color;
    ctx.lineWidth = Math.max(.65, layout.cell * .009);
    stroke(ctx, coords);
    ctx.setLineDash([]);
    const phase = (time * .25 + ordinal++ * .23) % 1;
    if (opts.reducedMotion || segment.spark || phase > fraction) continue;
    const position = segmentPoints(segment, layout, phase, length);
    const angle = Math.atan2(coords[3] - coords[1], coords[2] - coords[0]);
    const half = Math.max(1.3, layout.cell * .029);
    ctx.save();
    ctx.translate(position[2], position[3]); ctx.rotate(angle);
    ctx.fillStyle = segment.color === 'white' ? '#ffeac0' : color;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * .7;
    ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(0, -half * .34); ctx.lineTo(half, 0); ctx.lineTo(0, half * .34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// The sections touching a device sit above its opaque base. The board-wide
// beam stays behind objects while its source and receiver remain visibly joined.
export function drawBeamContacts(ctx, frame, layout, { colorblind = false } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  for (const { segment, fraction, length, startDevice, endDevice } of frame.entries) {
    const end = length * fraction;
    if (!(end > 0)) continue;
    const spans = [];
    if (startDevice) spans.push([0, Math.min(.49, end)]);
    if (endDevice && end > .51) spans.push([.51, end]);
    ctx.setLineDash(colorblind ? pattern(segment.color, layout.cell) : []);
    for (const [from, to] of spans) {
      const a = segmentPoints(segment, layout, from, 1), b = segmentPoints(segment, layout, to, 1);
      const points = [a[2], a[3], b[2], b[3]];
      ctx.strokeStyle = colorOf(segment.color); ctx.globalAlpha = .18; ctx.lineWidth = Math.max(2.6, layout.cell * .058); stroke(ctx, points);
      ctx.globalAlpha = .75; ctx.lineWidth = Math.max(.8, layout.cell * .013); stroke(ctx, points);
    }
  }
  ctx.restore();
}

export function drawPortalLinks(ctx, result, layout, time, opts = {}) {
  const frame = opts.frame || beamFrame(result, opts.level, opts.reveal ?? 1, opts.reducedMotion);
  ctx.save();
  ctx.lineWidth = .8;
  for (const { segment } of frame.jumps) {
    const a = centerOf(layout, segment.fromX, segment.fromY);
    const b = centerOf(layout, segment.toX, segment.toY);
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const bend = Math.min(layout.cell * .6, distance * .15);
    ctx.strokeStyle = colorOf(segment.color);
    ctx.globalAlpha = .18;
    ctx.setLineDash([1, 5]);
    ctx.lineDashOffset = opts.reducedMotion ? 0 : -time * 4;
    ctx.beginPath(); ctx.moveTo(a.cx, a.cy);
    ctx.bezierCurveTo(a.cx + dx * .3 - dy / distance * bend, a.cy + dy * .3 + dx / distance * bend, a.cx + dx * .7 - dy / distance * bend, a.cy + dy * .7 + dx / distance * bend, b.cx, b.cy);
    ctx.stroke();
  }
  ctx.restore();
}
