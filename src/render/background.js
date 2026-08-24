import { mulberry32 } from '../core/math.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  ctx.restore();
}

export function buildBackground(W, H, level, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#070d18');
  grad.addColorStop(0.45, '#0a1626');
  grad.addColorStop(0.8, '#0d1e30');
  grad.addColorStop(1, '#12283c');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  const rng = mulberry32(seed * 7919 + 13);

  const nebulas = [
    { x: 0.22, y: 0.3, r: 0.55, c1: 'rgba(46,90,140,0.20)', c2: 'rgba(46,90,140,0)' },
    { x: 0.75, y: 0.2, r: 0.45, c1: 'rgba(110,70,160,0.16)', c2: 'rgba(110,70,160,0)' },
    { x: 0.55, y: 0.75, r: 0.6, c1: 'rgba(30,110,120,0.14)', c2: 'rgba(30,110,120,0)' }
  ];
  for (const n of nebulas) {
    const rg = g.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * H);
    rg.addColorStop(0, n.c1);
    rg.addColorStop(1, n.c2);
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
  }

  g.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 150; i++) {
    g.globalAlpha = 0.08 + rng() * 0.45;
    g.beginPath();
    g.arc(rng() * W, rng() * H * 0.7, 0.5 + rng() * 1.1, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = 'rgba(200,230,255,0.9)';
  for (let i = 0; i < 14; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.5;
    const r = 1 + rng() * 1.4;
    g.globalAlpha = 0.5 + rng() * 0.4;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.18;
    g.fillRect(x - r * 3, y - 0.5, r * 6, 1);
    g.fillRect(x - 0.5, y - r * 3, 1, r * 6);
  }
  g.globalAlpha = 1;

  for (const L of [
    { col: '#0c1c2c', base: 0.74, amp: 66, step: 44, a: 1 },
    { col: '#102438', base: 0.84, amp: 50, step: 32, a: 1 },
    { col: '#153048', base: 0.93, amp: 34, step: 22, a: 1 }
  ]) {
    g.fillStyle = L.col;
    g.globalAlpha = L.a;
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
  g.globalAlpha = 1;

  g.fillStyle = 'rgba(26,60,84,0.4)';
  for (let i = 0; i < 30; i++) {
    g.beginPath();
    g.ellipse(rng() * W, H * (0.78 + rng() * 0.22), 18 + rng() * 55, 4 + rng() * 9, 0, 0, Math.PI * 2);
    g.fill();
  }

  const vig = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.88);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,6,12,0.6)');
  g.fillStyle = vig;
  g.fillRect(0, 0, W, H);

  return { canvas, rng };
}

export function drawAurora(ctx, W, H, time, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bands = [
    { hue: 160, yBase: 0.16, amp: 26, speed: 0.11, alpha: 0.075 },
    { hue: 195, yBase: 0.24, amp: 34, speed: 0.07, alpha: 0.06 },
    { hue: 275, yBase: 0.12, amp: 20, speed: 0.15, alpha: 0.05 }
  ];
  for (const b of bands) {
    const a = b.alpha * (0.6 + 0.8 * intensity);
    if (a <= 0.01) continue;
    ctx.strokeStyle = `hsla(${b.hue}, 85%, 65%, ${a})`;
    ctx.lineWidth = 14 + 6 * Math.sin(time * 0.4 + b.yBase * 9);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const segs = 22;
    for (let i = 0; i <= segs; i++) {
      const px = (i / segs) * W;
      const py = H * b.yBase
        + Math.sin(i * 0.55 + time * b.speed * 2.2) * b.amp
        + Math.sin(i * 1.3 - time * b.speed * 1.4) * b.amp * 0.4;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = `hsla(${b.hue}, 95%, 80%, ${a * 1.4})`;
    ctx.stroke();
  }
  ctx.restore();
}
