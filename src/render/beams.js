import { colorOf } from '../core/colors.js';
import { centerOf } from './layout.js';

export function drawBeams(ctx, result, layout, time, opts) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (const seg of result.segments) {
    if (seg.portalJump) continue;
    const p1 = centerOf(layout, seg.x1, seg.y1);
    const p2 = centerOf(layout, seg.x2, seg.y2);
    const f = seg.endFrac !== undefined ? seg.endFrac : 1;
    const x2 = p1.cx + (p2.cx - p1.cx) * f;
    const y2 = p1.cy + (p2.cy - p1.cy) * f;
    const col = colorOf(seg.color);

    ctx.strokeStyle = col;
    ctx.setLineDash(dashFor(seg.color, opts.colorblind));

    ctx.globalAlpha = 0.1 + 0.05 * Math.sin(time * 3 + seg.x1);
    ctx.lineWidth = layout.cell * 0.34;
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.lineWidth = layout.cell * 0.16;
    ctx.beginPath();
    ctx.moveTo(p1.cx, p1.cy);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (!opts.reducedMotion || !opts.pulseSuppressed) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.6, layout.cell * 0.05);
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  if (!opts.reducedMotion) drawPulses(ctx, result, layout, time);
}

function dashFor(color, colorblind) {
  if (!colorblind || color === 'white') return [];
  if (color === 'r') return [14, 8];
  if (color === 'g') return [22, 7];
  return [4, 7];
}

function drawPulses(ctx, result, layout, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let i = 0;
  for (const seg of result.segments) {
    if (seg.portalJump || seg.spark) continue;
    i++;
    const phase = (time * 1.6 + i * 0.37) % 1;
    if (phase > 0.25) continue;
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
