import { mulberry32 } from '../core/math.js';

export function buildBackground(W, H, level, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a1420');
  grad.addColorStop(0.55, '#0c1b2a');
  grad.addColorStop(1, '#102433');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const rng = mulberry32(seed * 7919 + 13);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 90; i++) {
    g.globalAlpha = 0.12 + rng() * 0.5;
    g.beginPath();
    g.arc(rng() * W, rng() * H * 0.55, 0.6 + rng() * 1.1, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  for (const L of [
    { col: '#0e2030', base: 0.72, amp: 60, step: 46 },
    { col: '#12283a', base: 0.82, amp: 44, step: 34 }
  ]) {
    g.fillStyle = L.col;
    g.beginPath();
    g.moveTo(0, H);
    const yBase = H * (1 - L.base);
    for (let x = -20; x <= W + 20; x += L.step * (0.7 + rng() * 0.6)) {
      g.lineTo(x + L.step / 2, yBase + rng() * L.amp);
      g.lineTo(x + L.step, yBase + rng() * 14);
    }
    g.lineTo(W + 20, H);
    g.closePath();
    g.fill();
  }

  g.fillStyle = 'rgba(20,48,66,0.55)';
  for (let i = 0; i < 26; i++) {
    g.beginPath();
    g.ellipse(rng() * W, H * (0.75 + rng() * 0.25), 20 + rng() * 50, 5 + rng() * 10, 0, 0, Math.PI * 2);
    g.fill();
  }

  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,8,14,0.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  return { canvas, rng };
}

export function bakeBoard(bgCtx, level, layout) {
  const ctx = bgCtx;
  ctx.save();
  ctx.fillStyle = 'rgba(8,18,28,0.45)';
  roundRect(ctx, layout.ox - 10, layout.oy - 10, layout.cell * level.w + 20, layout.cell * level.h + 20, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,180,220,0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= level.w; x++) {
    ctx.beginPath();
    ctx.moveTo(layout.ox + x * layout.cell, layout.oy);
    ctx.lineTo(layout.ox + x * layout.cell, layout.oy + level.h * layout.cell);
    ctx.stroke();
  }
  for (let y = 0; y <= level.h; y++) {
    ctx.beginPath();
    ctx.moveTo(layout.ox, layout.oy + y * layout.cell);
    ctx.lineTo(layout.ox + level.w * layout.cell, layout.oy + y * layout.cell);
    ctx.stroke();
  }

  for (const wall of level.walls) {
    drawRock(ctx, wall.x, wall.y, layout, bgSeedFor(wall.x, wall.y));
  }
  ctx.restore();
}

function bgSeedFor(x, y) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawRock(ctx, x, y, layout, seed) {
  const { cx, cy } = center(layout, x, y);
  const s = layout.cell;
  const rng = mulberry32(seed);
  ctx.save();
  ctx.translate(cx, cy);
  for (const [rx, ry, rr] of [[-0.2, 0.08, 0.3], [0.18, -0.1, 0.26], [0.02, 0.2, 0.22]]) {
    const jitter = (rng() - 0.5) * 0.06;
    ctx.fillStyle = '#2a3b4d';
    ctx.beginPath();
    ctx.arc(rx * s + jitter * s, ry * s, rr * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,130,110,0.35)';
    ctx.beginPath();
    ctx.arc(rx * s + jitter * s, ry * s - rr * s * 0.35, rr * s * 0.55, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function center(layout, x, y) {
  return {
    cx: layout.ox + x * layout.cell + layout.cell / 2,
    cy: layout.oy + y * layout.cell + layout.cell / 2
  };
}
