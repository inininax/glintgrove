import { colorOf } from '../core/colors.js';
import { centerOf } from './layout.js';

const SPRITE_SIZE = 64;
const sprites = new Map();

function getSprite(color) {
  let sprite = sprites.get(color);
  if (sprite) return sprite;

  const c = document.createElement('canvas');
  c.width = SPRITE_SIZE;
  c.height = SPRITE_SIZE;
  const g = c.getContext('2d');

  const rg = g.createRadialGradient(SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0, SPRITE_SIZE / 2, SPRITE_SIZE / 2, SPRITE_SIZE / 2);
  rg.addColorStop(0, 'rgba(255,255,255,0.95)');
  rg.addColorStop(0.25, color);
  rg.addColorStop(0.6, hexToRgba(color, 0.35));
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

  sprite = c;
  sprites.set(color, sprite);
  return sprite;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) || 255;
  const g = parseInt(full.slice(2, 4), 16) || 233;
  const b = parseInt(full.slice(4, 6), 16) || 184;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function invalidateGlowSprites() {
  sprites.clear();
}

export function drawBeams(ctx, result, layout, time, opts) {
  const reveal = opts.reveal === undefined ? 1 : Math.max(0, Math.min(1, opts.reveal));
  if (reveal <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (const seg of result.segments) {
    if (seg.portalJump) continue;
    const p1 = centerOf(layout, seg.x1, seg.y1);
    const p2 = centerOf(layout, seg.x2, seg.y2);
    const f = (seg.endFrac !== undefined ? seg.endFrac : 1) * reveal;
    const x2 = p1.cx + (p2.cx - p1.cx) * f;
    const y2 = p1.cy + (p2.cy - p1.cy) * f;
    const col = colorOf(seg.color);

    ctx.strokeStyle = col;
    ctx.setLineDash(dashFor(seg.color, opts.colorblind));

    ctx.globalAlpha = (0.1 + 0.05 * Math.sin(time * 3 + seg.x1)) * reveal;
    ctx.lineWidth = layout.cell * 0.34;
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const wobble = opts.reducedMotion ? 1 : 1 + 0.1 * Math.sin(time * 6 + seg.x1 * 2 + seg.y1);
    ctx.globalAlpha = 0.32 * reveal;
    ctx.lineWidth = layout.cell * 0.16 * wobble;
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  drawGlowCores(ctx, result, layout, opts, reveal);

  if (!opts.reducedMotion) drawPulses(ctx, result, layout, time, reveal);
}

function drawGlowCores(ctx, result, layout, opts, reveal = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const seg of result.segments) {
    if (seg.portalJump) continue;
    const p1 = centerOf(layout, seg.x1, seg.y1);
    const p2 = centerOf(layout, seg.x2, seg.y2);
    const f = seg.endFrac !== undefined ? seg.endFrac : 1;
    const dx = (p2.cx - p1.cx) * f;
    const dy = (p2.cy - p1.cy) * f;
    const len = Math.max(1, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    const thickness = Math.max(10, layout.cell * 0.5);

    ctx.save();
    ctx.translate(p1.cx, p1.cy);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.9 * reveal;
    ctx.drawImage(getSprite(colorOf(seg.color)), -thickness / 2, -thickness / 2, (len + thickness) * reveal, thickness);
    ctx.restore();
  }
  ctx.restore();
}

function dashFor(color, colorblind) {
  if (!colorblind || color === 'white') return [];
  if (color === 'r') return [14, 8];
  if (color === 'g') return [22, 7];
  return [4, 7];
}

function drawPulses(ctx, result, layout, time, reveal = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let i = 0;
  for (const seg of result.segments) {
    if (seg.portalJump || seg.spark) continue;
    i++;
    const phase = (time * 1.6 + i * 0.37) % 1;
    if (phase > 0.25 * reveal) continue;
    const p1 = centerOf(layout, seg.x1, seg.y1);
    const p2 = centerOf(layout, seg.x2, seg.y2);
    const t = phase / 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8 * (1 - t);
    ctx.beginPath();
    ctx.arc(p1.cx + (p2.cx - p1.cx) * t, p1.cy + (p2.cy - p1.cy) * t, Math.max(1.5, layout.cell * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPortalLinks(ctx, result, layout, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const seg of result.segments) {
    if (!seg.portalJump) continue;
    const a = centerOf(layout, seg.fromX, seg.fromY);
    const b = centerOf(layout, seg.toX, seg.toY);
    ctx.strokeStyle = colorOf(seg.color);
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 4);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -time * 30;
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.quadraticCurveTo((a.cx + b.cx) / 2, Math.min(a.cy, b.cy) - 40, b.cx, b.cy);
    ctx.stroke();
  }
  ctx.restore();
}
