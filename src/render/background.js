import { mulberry32 } from '../core/math.js';
import { artAssets } from '../assets/assetStore.js';
import { drawSprite } from './sprites.js';
import { centerOf } from './layout.js';

// Original 2026-09-13 drawing recipe: cut-stone cells and branching reed woods.
function cutStone(ctx, x, y, w, h, cut) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

export function bakeBoard(ctx, level, layout) {
  const { cell, ox, oy } = layout;
  const width = level.w * cell, height = level.h * cell;
  const rim = Math.max(7, cell * .115);
  ctx.save();
  const stone = ctx.createLinearGradient(ox, oy, ox + width, oy + height);
  stone.addColorStop(0, 'rgba(18,48,48,.94)');
  stone.addColorStop(.54, 'rgba(9,32,36,.93)');
  stone.addColorStop(1, 'rgba(22,47,43,.96)');
  ctx.fillStyle = stone;
  ctx.shadowColor = '#020f19a8';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  cutStone(ctx, ox - rim, oy - rim, width + rim * 2, height + rim * 2, rim * 1.45);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#b8bc916b';
  ctx.stroke();

  const gap = Math.max(1.4, cell * .032);
  for (let row = 0; row < level.h; row++) {
    for (let col = 0; col < level.w; col++) {
      const x = ox + col * cell, y = oy + row * cell;
      cutStone(ctx, x + gap, y + gap, cell - 2 * gap, cell - 2 * gap, cell * .09);
      ctx.fillStyle = (row + col) % 3 === 0 ? '#8dae9810' : '#aac9a306';
      ctx.fill();
      ctx.strokeStyle = '#a2b99918';
      ctx.lineWidth = .7;
      ctx.stroke();
      // Four tiny dashes locate a cell even under a crossing beam.
      ctx.strokeStyle = '#b7c9a52b';
      ctx.beginPath();
      for (const direction of [-1, 1]) {
        const cx = x + cell / 2, cy = y + cell / 2;
        ctx.moveTo(cx + direction * cell * .11, cy);
        ctx.lineTo(cx + direction * cell * .16, cy);
        ctx.moveTo(cx, cy + direction * cell * .11);
        ctx.lineTo(cx, cy + direction * cell * .16);
      }
      ctx.stroke();
    }
  }
  // A pair of inlaid leaves marks each short edge of the surrounding slab.
  ctx.fillStyle = '#d5c38f9e';
  for (const side of [-1, 1]) {
    const y = side < 0 ? oy - rim * .56 : oy + height + rim * .56;
    for (const offset of [-5, 5]) {
      ctx.beginPath();
      ctx.ellipse(ox + width / 2 + offset, y, 3.2, 1.15, side * offset * .07, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const wall of level.walls || []) {
    const { cx, cy } = centerOf(layout, wall.x, wall.y);
    if (drawSprite(ctx, (wall.x + wall.y * 2) % 2 ? 'rock.alt' : 'rock', cx, cy, cell, { displayMode: layout.displayMode })) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cell, cell);
    // Interlocking slate pieces, kept well inside the logical cell boundary.
    for (const [x, y, w, h, shade] of [[-.32, -.27, .49, .4, '#557267'], [-.11, -.1, .43, .37, '#395b54'], [-.31, .12, .39, .16, '#6a7b65']]) {
      cutStone(ctx, x, y, w, h, .075);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.strokeStyle = '#9db19470';
      ctx.lineWidth = .012;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

export function backgroundIdFor(level) {
  const chapter = level?.chapter;
  if (chapter >= 2 && chapter <= 4) return ['depths', 'garden', 'heart'][chapter - 2];
  if (chapter > 5) return ['forest', 'depths', 'garden', 'heart'][(chapter - 6) % 4];
  return 'forest';
}

export function buildBackground(width, height, level, seed, displayMode = 'sculpted') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32((seed ^ 0x42a315) >>> 0);
  const image = displayMode === 'simple' ? null : artAssets.get(backgroundIdFor(level)) || artAssets.get('forest');
  if (image) {
    const scale = Math.max(width / image.width, height / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image.image, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    const sky = ctx.createLinearGradient(0, 0, width * .3, height);
    sky.addColorStop(0, '#102b39');
    sky.addColorStop(.52, '#1a4546');
    sky.addColorStop(1, '#0a252c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(width * .54, height * .3, 0, width * .54, height * .3, height * .7);
    glow.addColorStop(0, '#a4c79b36');
    glow.addColorStop(.4, '#7caeaa12');
    glow.addColorStop(1, '#7caeaa00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    // Each tree is a tapered curved trunk with alternating narrow leaf fans.
    for (let layer = 0; layer < 3; layer++) {
      const count = 8 + layer * 2;
      for (let i = 0; i < count; i++) {
        const x = (i + rng() * .45) / count * width;
        const base = height * (.68 + layer * .13 + rng() * .06);
        const tall = height * (.3 + rng() * .48);
        const lean = (rng() - .5) * width * .08;
        const thick = (4 + rng() * 7) * (layer + 1);
        ctx.fillStyle = ['#234d4e', '#183b3e', '#0b2b31'][layer];
        ctx.beginPath();
        ctx.moveTo(x - thick, base);
        ctx.bezierCurveTo(x - thick * .4, base - tall * .5, x + lean - thick * .14, base - tall * .85, x + lean, base - tall);
        ctx.bezierCurveTo(x + lean + thick * .1, base - tall * .76, x + thick * .2, base - tall * .43, x + thick, base);
        ctx.closePath();
        ctx.fill();
        for (let branch = 1; branch < 7; branch++) {
          const side = branch % 2 ? -1 : 1;
          const y = base - tall * (.14 + branch * .11);
          const reach = thick * (3 + rng() * 3) * (1 - branch * .06);
          const start = x + lean * branch / 7;
          ctx.beginPath();
          ctx.moveTo(start, y);
          ctx.quadraticCurveTo(start + side * reach * .5, y - reach * .18, start + side * reach, y - reach * .72);
          ctx.quadraticCurveTo(start + side * reach * .82, y + reach * .06, start, y + thick * .38);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = '#87b3a122';
    ctx.lineWidth = .8;
    for (let i = 0; i < 15; i++) {
      const y = height * (.68 + i * .023);
      ctx.beginPath();
      ctx.ellipse(width * (.4 + rng() * .2), y, width * (.08 + rng() * .23), 2 + i * .3, -.05, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const edge = ctx.createLinearGradient(0, 0, 0, height);
  edge.addColorStop(0, '#061a2240');
  edge.addColorStop(.45, '#061a2200');
  edge.addColorStop(1, '#061a2266');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, width, height);
  return { canvas, rng };
}

export function drawAurora(ctx, width, height, time, intensity = .5) {
  // Slow, paired seed motes. Frozen at time zero when reduced motion is active.
  ctx.save();
  ctx.fillStyle = '#e8d8a4';
  const count = Math.max(8, Math.min(24, Math.floor(width * height / 52000)));
  for (let i = 0; i < count; i++) {
    const phase = i * 1.91;
    const x = ((i + .31) / count * width + Math.sin(time * .16 + phase) * 14 + width) % width;
    const y = height * (.13 + ((i * .271 + 1 - time * .002) % .75 + .75) % .75);
    ctx.globalAlpha = (.13 + .19 * (1 + Math.sin(phase + time * .5)) / 2) * (.8 + intensity * .2);
    ctx.beginPath();
    ctx.ellipse(x, y, 1.2, .6, phase + time * .09, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= .45;
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 2, .65, .4, phase, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
