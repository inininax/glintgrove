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

// One coherent ancient forest accompanies the complete puzzle journey.
// Chapter identity remains in the quiet atmospheric tint, not a change of art style.
export function backgroundIdFor() { return 'forest'; }

function atmosphereIdFor(level) {
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
  return { canvas, rng, atmosphere: buildAtmosphere(width, height, atmosphereIdFor(level), displayMode) };
}

// All atmosphere is original Canvas geometry. Small cached light/fog sprites keep
// animation independent of the source artwork and avoid per-frame raster work.
function buildAtmosphere(width, height, chapter, displayMode) {
  const colors = {
    forest: ['235,219,170', '126,195,184'],
    depths: ['159,214,218', '110,169,195'],
    garden: ['235,218,169', '151,204,184'],
    heart: ['240,210,155', '190,205,157']
  }[chapter];
  const shafts = document.createElement('canvas');
  shafts.width = 512;
  shafts.height = Math.max(128, Math.min(768, Math.round(512 * height / Math.max(1, width))));
  const s = shafts.getContext('2d');
  // Feather every edge, including the ends: straight-sided light polygons
  // read as extra objects against a detailed forest rather than atmosphere.
  for (const [x, y, spread, length, lean] of [[.27, .31, .075, .51, -.18], [.69, .36, .09, .55, .15]]) {
    s.save();
    s.translate(shafts.width * x, shafts.height * y);
    s.rotate(lean);
    s.scale(shafts.width * spread, shafts.height * length);
    const wash = s.createRadialGradient(0, 0, 0, 0, 0, 1);
    wash.addColorStop(0, `rgba(${colors[0]},.26)`);
    wash.addColorStop(.35, `rgba(${colors[0]},.16)`);
    wash.addColorStop(.7, `rgba(${colors[0]},.045)`);
    wash.addColorStop(1, `rgba(${colors[0]},0)`);
    s.fillStyle = wash;
    s.fillRect(-1, -1, 2, 2);
    s.restore();
  }

  const mist = document.createElement('canvas');
  mist.width = 384;
  mist.height = 128;
  const m = mist.getContext('2d');
  // Elliptical wisps overlap within one reusable transparent stamp.
  for (const [x, y, radius] of [[.25, .57, .25], [.48, .43, .36], [.73, .58, .24]]) {
    m.save();
    m.scale(1, .27);
    const glow = m.createRadialGradient(384 * x, 128 * y / .27, 0, 384 * x, 128 * y / .27, 384 * radius);
    glow.addColorStop(0, `rgba(${colors[1]},.24)`);
    glow.addColorStop(.48, `rgba(${colors[1]},.12)`);
    glow.addColorStop(1, `rgba(${colors[1]},0)`);
    m.fillStyle = glow;
    m.fillRect(0, 0, 384, 128 / .27);
    m.restore();
  }

  const mote = document.createElement('canvas');
  mote.width = mote.height = 32;
  const f = mote.getContext('2d');
  const halo = f.createRadialGradient(16, 16, 0, 16, 16, 16);
  halo.addColorStop(0, '#fff1ba');
  halo.addColorStop(.09, '#f2ddaac4');
  halo.addColorStop(.3, '#d6e1a938');
  halo.addColorStop(1, '#d6e1a900');
  f.fillStyle = halo;
  f.fillRect(0, 0, 32, 32);

  // A few soft horizontal glints move together as one water-light layer. This
  // stamp is made once, not repainted as gradients on every animation frame.
  const water = document.createElement('canvas');
  water.width = 384;
  water.height = 128;
  const w = water.getContext('2d');
  for (let i = 0; i < 6; i++) {
    w.save();
    w.translate(384 * (.44 + Math.sin(i * 1.73) * .14), 128 * (.12 + i * .145));
    w.scale(384 * (.08 + i * .014), 1.5 + i * .35);
    const light = w.createRadialGradient(0, 0, 0, 0, 0, 1);
    light.addColorStop(0, `rgba(${colors[0]},.42)`);
    light.addColorStop(.25, `rgba(${colors[1]},.25)`);
    light.addColorStop(1, `rgba(${colors[1]},0)`);
    w.fillStyle = light;
    w.fillRect(-1, -1, 2, 2);
    w.restore();
  }
  return { shafts, mist, mote, water, strength: displayMode === 'simple' ? .6 : 1 };
}

export function drawAtmosphere(ctx, width, height, time, atmosphere, title = false) {
  const { shafts, mist, mote, water, strength } = atmosphere;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = (title ? .23 + Math.sin(time * .12) * .045 : .2 + Math.sin(time * .065) * .025) * strength;
  ctx.drawImage(shafts, Math.sin(time * (title ? .045 : .025)) * width * .009 - width * .025, -height * .03, width * 1.05, height * 1.08);
  // The quiet, narrow distant veil and the wider foreground drift establish
  // depth without moving or obscuring the artwork or the puzzle board.
  for (let i = 0; i < 3; i++) {
    const phase = i * 1.7;
    const w = width * (.78 + i * .22), h = height * (.12 + i * .045);
    const rate = title ? .055 + i * .018 : .024 + i * .009;
    const x = (width - w) / 2 + Math.sin(time * rate + phase) * width * (.025 + i * .028);
    const y = height * ((title ? .52 : .49) + i * .145) + Math.sin(time * (title ? .085 : .045) + phase) * height * (.002 + i * .0015);
    // The nearest veil has a wider, slower opacity swell. Its movement remains
    // below the title copy and reveals depth instead of washing the center out.
    ctx.globalAlpha = (title ? .32 + i * .075 + Math.sin(time * .11 + phase) * .035 : .21 + i * .06) * strength;
    ctx.drawImage(mist, x, y, w, h);
  }

  if (title && water) {
    ctx.globalAlpha = (.16 + Math.sin(time * .24) * .055) * strength;
    ctx.drawImage(water,
      width * (.31 + Math.sin(time * .095) * .012),
      height * (.745 + Math.sin(time * .16 + 1.2) * .003),
      width * .43, height * .21);
  }

  // Reflections breathe in place; no wrapping lines or abrupt particle resets.
  ctx.strokeStyle = '#a9d9cb';
  ctx.lineWidth = .75;
  for (let i = 0; i < 7; i++) {
    const phase = i * 2.17;
    const x = width * (.28 + (i * .173) % .45) + Math.sin(time * (title ? .14 : .08) + phase) * width * (title ? .018 : .012);
    const y = height * (.75 + i * .029) + Math.sin(time * (title ? .18 : .09) + phase) * height * (title ? .002 : .0013);
    ctx.globalAlpha = (title
      ? .032 + .082 * (1 + Math.sin(time * .36 + phase)) / 2
      : .018 + .047 * (1 + Math.sin(time * .15 + phase)) / 2) * strength;
    ctx.beginPath();
    ctx.ellipse(x, y, width * (.008 + (i % 4) * .006) * (title ? 1.3 : 1), Math.max(.3, height * .001), 0, Math.PI * .08, Math.PI * .89);
    ctx.stroke();
  }

  // A sparse field fades and bobs in place. No wraparound resets, flashing,
  // or extra particle density on large monitors.
  const count = Math.max(6, Math.min(12, Math.floor(width * height / 125000)));
  for (let i = 0; i < count; i++) {
    const phase = i * 1.91;
    const depth = .45 + (i % 3) * .275;
    const baseX = title
      ? (i % 2 ? .78 : .22) + (i % 2 ? 1 : -1) * ((Math.floor(i / 2) * .173) % .14)
      : .06 + (i + .31) / count * .88;
    const x = width * baseX + Math.sin(time * (title ? .13 : .075) + phase) * Math.min(19, width * .025) * depth;
    const y = height * (.4 + (i * .241) % .49) + Math.cos(time * .06 + phase) * Math.min(13, height * .02) * depth;
    const size = (title ? 8 : 5) + depth * 10;
    ctx.globalAlpha = (title
      ? .065 + .4 * (1 + Math.sin(phase + time * .28)) / 2
      : .035 + .36 * (1 + Math.sin(phase + time * .21)) / 2) * strength * depth;
    ctx.drawImage(mote, x - size / 2, y - size / 2, size, size);
  }
  ctx.restore();
}
