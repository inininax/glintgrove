import { colorOf } from '../core/colors.js';
import { centerOf } from './layout.js';

// Original optical-thread treatment, authored 2026-09-13. No VFX textures.
export function invalidateGlowSprites() {}
const clamp = value => Math.min(1, Math.max(0, value));
function segmentPoints(segment, layout, fraction) {
  const start = centerOf(layout, segment.x1, segment.y1);
  const end = centerOf(layout, segment.x2, segment.y2);
  const distance = (segment.endFrac ?? 1) * fraction;
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
  const reveal = clamp(opts.reveal ?? 1);
  if (!reveal) return;
  ctx.save();
  ctx.lineCap = 'butt';
  let ordinal = 0;
  for (const segment of result.segments) {
    if (segment.portalJump) continue;
    const coords = segmentPoints(segment, layout, reveal);
    const color = colorOf(segment.color);
    ctx.setLineDash(opts.colorblind ? pattern(segment.color, layout.cell) : []);
    ctx.strokeStyle = color;
    ctx.globalAlpha = .11 * reveal;
    ctx.lineWidth = Math.max(3.5, layout.cell * .088);
    stroke(ctx, coords);
    ctx.globalAlpha = .76 * reveal;
    ctx.lineWidth = Math.max(1.35, layout.cell * .025);
    stroke(ctx, coords);
    ctx.globalAlpha = .85 * reveal;
    ctx.strokeStyle = segment.color === 'white' ? '#fff0c9' : color;
    ctx.lineWidth = Math.max(.65, layout.cell * .009);
    stroke(ctx, coords);
    ctx.setLineDash([]);
    // A tiny moving lozenge makes direction legible without an animated texture.
    const phase = (time * .25 + ordinal++ * .23) % 1;
    if (opts.reducedMotion || segment.spark || phase > reveal) continue;
    const position = segmentPoints(segment, layout, phase);
    const x = position[2], y = position[3];
    const angle = Math.atan2(coords[3] - coords[1], coords[2] - coords[0]);
    const half = Math.max(1.3, layout.cell * .029);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = segment.color === 'white' ? '#ffeac0' : color;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * .7;
    ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(0, -half * .34); ctx.lineTo(half, 0); ctx.lineTo(0, half * .34); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export function drawPortalLinks(ctx, result, layout, time) {
  ctx.save();
  ctx.lineWidth = .8;
  for (const segment of result.segments) {
    if (!segment.portalJump) continue;
    const a = centerOf(layout, segment.fromX, segment.fromY);
    const b = centerOf(layout, segment.toX, segment.toY);
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const bend = Math.min(layout.cell * .6, distance * .15);
    ctx.strokeStyle = colorOf(segment.color);
    ctx.globalAlpha = .23;
    ctx.setLineDash([1, 5]);
    ctx.lineDashOffset = -time * 4;
    ctx.beginPath(); ctx.moveTo(a.cx, a.cy);
    ctx.bezierCurveTo(a.cx + dx * .3 - dy / distance * bend, a.cy + dy * .3 + dx / distance * bend, a.cx + dx * .7 - dy / distance * bend, a.cy + dy * .7 + dx / distance * bend, b.cx, b.cy);
    ctx.stroke();
  }
  ctx.restore();
}
