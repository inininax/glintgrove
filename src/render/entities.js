import { colorOf } from '../core/colors.js';
import { centerOf } from './layout.js';
import { drawSprite } from './sprites.js';
import { traceColorMark } from '../ui/colorMarks.js';

// All vector recipes in this file were newly authored on 2026-09-13.
// The saved Blender artwork supplies the normal view; these drawings also keep
// every puzzle object recognizable while an image is unavailable.
const TAU = Math.PI * 2;
function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
}
function line(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}
function disc(ctx, x, y, radius) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
}
function local(ctx, cx, cy, cell, draw) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(cell, cell);
  ctx.lineWidth = .018;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw();
  ctx.restore();
}
function plinth(ctx, tint = '#365750') {
  ctx.fillStyle = '#081f279c';
  ctx.beginPath(); ctx.ellipse(0, .3, .33, .1, 0, 0, TAU); ctx.fill();
  polygon(ctx, [[-.31, -.17], [-.13, -.3], [.2, -.28], [.33, -.08], [.24, .24], [-.19, .29], [-.33, .13]]);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.strokeStyle = '#a9bc917a';
  ctx.stroke();
  ctx.strokeStyle = '#bdc99a40';
  line(ctx, [[-.24, -.12], [-.11, -.23], [.16, -.22]]);
}
function leaf(ctx, x, y, length, width, tilt, tint) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width, -length * .26, -width * .45, -length * .82, 0, -length);
  ctx.bezierCurveTo(width * .55, -length * .65, width, -length * .19, 0, 0);
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.restore();
}

export function drawEmitter(ctx, emitter, layout, time, active, motion = true) {
  const { cx, cy } = centerOf(layout, emitter.x, emitter.y);
  const size = layout.cell;
  const sprite = drawSprite(ctx, 'emitter', cx, cy, size, { displayMode: layout.displayMode });
  local(ctx, cx, cy, size, () => {
    const color = colorOf(emitter.color);
    if (!sprite) {
      plinth(ctx, '#546951');
      ctx.strokeStyle = '#e4c38b';
      ctx.lineWidth = .026;
      polygon(ctx, [[0, -.23], [.17, -.1], [.15, .15], [0, .24], [-.15, .15], [-.17, -.1]]);
      ctx.stroke();
    }
    ctx.rotate(emitter.dir * Math.PI / 2);
    if (active) {
      const breath = motion ? 1 + Math.sin(time * 2.1) * .065 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = color;
      // Concentric low-opacity light keeps the source soft without a per-frame
      // gradient or imported flare. The narrow mouth points along emission.
      for (const [radius, alpha] of [[.235, .035], [.17, .065], [.115, .12]]) {
        ctx.globalAlpha = alpha;
        disc(ctx, 0, -.015, radius * breath);
      }
      ctx.globalAlpha = .17;
      ctx.beginPath(); ctx.ellipse(0, -.22, .064 * breath, .22, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .54;
      ctx.beginPath(); ctx.ellipse(0, -.22, .023 * breath, .18, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff8dc'; ctx.lineWidth = .022;
      ctx.globalAlpha = .9;
      line(ctx, [[0, -.02], [0, -.43]]);
      ctx.restore();
    }
    ctx.fillStyle = color;
    polygon(ctx, [[-.052, -.25], [-.047, -.37], [0, -.43], [.047, -.37], [.052, -.25], [0, -.29]]);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = .018;
    line(ctx, [[0, -.23], [0, -.14]]);
    ctx.fillStyle = '#fff1c9';
    disc(ctx, 0, -.015, active ? .064 : .041);
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(0, -.015, .098, .2, Math.PI * 1.3); ctx.stroke();
  });
}

function drawReflector(ctx, piece, layout, time, hitCells, spinAngle, splitter) {
  const { cx, cy } = centerOf(layout, piece.x, piece.y);
  const size = layout.cell;
  const sprite = drawSprite(ctx, splitter ? 'splitter' : 'mirror', cx, cy, size, { displayMode: layout.displayMode });
  const hit = hitCells.has(`${piece.x},${piece.y}`);
  const destination = piece.orient === 0 ? -Math.PI / 4 : Math.PI / 4;
  // The engine's animation argument runs from zero to PI for a quarter turn.
  const progress = spinAngle == null ? 1 : Math.min(1, Math.max(0, spinAngle / Math.PI));
  const angle = destination + (1 - progress) * (piece.orient === 0 ? Math.PI / 2 : -Math.PI / 2);
  local(ctx, cx, cy, size, () => {
    if (!sprite) {
      plinth(ctx, splitter ? '#345e58' : '#546451');
      ctx.strokeStyle = '#b2c39b6b';
      ctx.beginPath(); ctx.arc(0, 0, .235, .25, 2.2); ctx.stroke();
    }
    ctx.save();
    ctx.rotate(angle);
    polygon(ctx, [[-.35, 0], [-.26, -.073], [.25, -.073], [.35, 0], [.26, .073], [-.25, .073]]);
    ctx.fillStyle = splitter ? '#72afa2' : '#b69e67';
    ctx.fill();
    polygon(ctx, [[-.28, -.005], [-.23, -.041], [.23, -.041], [.28, -.005], [.22, .037], [-.22, .037]]);
    const glass = ctx.createLinearGradient(0, -.041, 0, .037);
    glass.addColorStop(0, '#faf4d7');
    glass.addColorStop(.45, hit ? '#d5f1d4' : '#aecdc0');
    glass.addColorStop(1, '#427b77');
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = '#f6ecca';
    ctx.lineWidth = .012;
    line(ctx, [[-.21, -.039], [.2, -.039]]);
    ctx.restore();
    if (splitter) {
      ctx.fillStyle = '#0b2c31';
      polygon(ctx, [[.12, .22], [.23, .15], [.34, .22], [.34, .33], [.23, .39], [.12, .33]]);
      ctx.fill();
      ctx.strokeStyle = '#d0e6c8';
      ctx.lineWidth = .018;
      line(ctx, [[.16, .32], [.24, .25], [.3, .25]]);
      line(ctx, [[.24, .25], [.24, .19]]);
    }
  });
}
export function drawMirror(ctx, piece, layout, time, hitCells, spinAngle) {
  drawReflector(ctx, piece, layout, time, hitCells, spinAngle, false);
}
export function drawSplitter(ctx, piece, layout, time, hitCells, spinAngle) {
  drawReflector(ctx, piece, layout, time, hitCells, spinAngle, true);
}

function colorMark(ctx, cx, cy, cell, color) {
  const size = Math.max(cell * .22, 12);
  local(ctx, cx, cy, size, () => {
    polygon(ctx, [[-.4, -.31], [.3, -.4], [.43, -.15], [.35, .35], [-.31, .42], [-.43, .14]]);
    ctx.fillStyle = '#0b252c'; ctx.fill();
    ctx.strokeStyle = colorOf(color); ctx.lineWidth = .08; ctx.stroke();
    ctx.strokeStyle = '#fbf1d3'; ctx.lineWidth = .17;
    ctx.scale(.36, .36);
    traceColorMark(ctx, color);
    ctx.stroke();
  });
}

export function drawCrystal(ctx, color, x, y, layout, time) {
  const { cx, cy } = centerOf(layout, x, y);
  const size = layout.cell;
  const shift = Math.sin(time * 1.1 + x + y) * size * .009;
  if (!drawSprite(ctx, `crystal.${color}`, cx, cy, size, { offsetY: shift, displayMode: layout.displayMode })) {
    local(ctx, cx, cy + shift, size, () => {
      ctx.fillStyle = '#9bac8530'; ctx.beginPath(); ctx.ellipse(0, .28, .25, .07, 0, 0, TAU); ctx.fill();
      polygon(ctx, [[-.05, -.34], [.17, -.2], [.22, .08], [.04, .29], [-.2, .14], [-.24, -.09]]);
      ctx.fillStyle = colorOf(color); ctx.fill();
      ctx.strokeStyle = '#e3ecd29e'; ctx.stroke();
      ctx.fillStyle = '#fff1cc55';
      polygon(ctx, [[-.05, -.34], [.01, -.05], [-.2, .14], [-.24, -.09]]); ctx.fill();
      ctx.strokeStyle = '#143a4870';
      line(ctx, [[.17, -.2], [.01, -.05], [.04, .29]]);
    });
  }
  colorMark(ctx, cx, cy + size * .33, size, color);
}

export function drawGate(ctx, gate, layout, time, powered) {
  const { cx, cy } = centerOf(layout, gate.x, gate.y);
  const size = layout.cell;
  const sprite = drawSprite(ctx, `gate.${gate.needColor}`, cx, cy, size, { displayMode: layout.displayMode });
  local(ctx, cx, cy, size, () => {
    if (!sprite) {
      ctx.fillStyle = '#4b6b60';
      polygon(ctx, [[-.32, .29], [-.31, -.17], [-.21, -.31], [-.12, -.26], [-.14, .28]]); ctx.fill();
      polygon(ctx, [[.13, .28], [.11, -.25], [.22, -.31], [.32, -.16], [.32, .29]]); ctx.fill();
      polygon(ctx, [[-.26, -.27], [0, -.4], [.26, -.27], [.2, -.16], [0, -.26], [-.2, -.16]]); ctx.fill();
      ctx.strokeStyle = '#b7c89b7a';
      line(ctx, [[-.22, .24], [-.22, -.19], [0, -.31], [.23, -.2], [.23, .24]]);
    }
    if (!powered) {
      // A clear arch with a translucent seal, rather than baked ladder bars.
      ctx.fillStyle = colorOf(gate.needColor) + '28';
      ctx.strokeStyle = colorOf(gate.needColor) + 'b0';
      ctx.lineWidth = .014;
      polygon(ctx, [[-.18, -.18], [0, -.24], [.18, -.18], [.18, .18], [0, .24], [-.18, .18]]);
      ctx.fill(); ctx.stroke();
      ctx.save(); ctx.scale(.105, .105);
      ctx.strokeStyle = '#edf1d9c0'; ctx.lineWidth = .14;
      traceColorMark(ctx, gate.needColor); ctx.stroke();
      ctx.restore();
    }
    if (powered) {
      ctx.strokeStyle = colorOf(gate.needColor);
      ctx.lineWidth = .027;
      for (const side of [-1, 1]) {
        line(ctx, [[side * .34, .2], [side * .34, -.12], [side * .21, -.27]]);
      }
    }
  });
  colorMark(ctx, cx, cy + size * .33, size, gate.needColor);
}

export function drawPortal(ctx, id, position, layout, time, activeIds) {
  const { cx, cy } = centerOf(layout, position.x, position.y);
  const size = layout.cell;
  const gold = id === 'R' || id === 'S';
  const sprite = drawSprite(ctx, `portal.${gold ? 'gold' : 'violet'}`, cx, cy, size, { displayMode: layout.displayMode });
  local(ctx, cx, cy, size, () => {
    const tone = gold ? '#dfc185' : '#c0b2dc';
    if (!sprite) {
      ctx.strokeStyle = '#617a6b'; ctx.lineWidth = .085;
      polygon(ctx, [[-.1, -.32], [.17, -.27], [.31, -.04], [.23, .21], [0, .3], [-.26, .16], [-.31, -.1]]); ctx.stroke();
      ctx.fillStyle = '#091c27'; ctx.fill();
      ctx.strokeStyle = tone; ctx.lineWidth = .018; ctx.stroke();
    }
    ctx.save();
    ctx.rotate(time * (activeIds.has(id) ? .32 : .07));
    ctx.strokeStyle = tone;
    ctx.globalAlpha *= activeIds.has(id) ? .9 : .55;
    ctx.lineWidth = .021;
    for (let petal = 0; petal < 3; petal++) {
      ctx.rotate(TAU / 3);
      ctx.beginPath();
      ctx.moveTo(.025, -.03);
      ctx.bezierCurveTo(.18, -.08, .17, -.19, .03, -.2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#efdfb8'; ctx.lineWidth = .022;
    // One/two etched notches identify the paired portals independently of hue.
    if (gold) {
      line(ctx, [[-.025, .305], [-.025, .385]]);
      line(ctx, [[.025, .305], [.025, .385]]);
    } else line(ctx, [[0, .305], [0, .385]]);
  });
}

function drawTarget(ctx, target, litAt, now, layout, kind, onSpore) {
  const { cx, cy } = centerOf(layout, target.x, target.y);
  const cell = layout.cell;
  const awake = litAt !== undefined;
  const progress = awake ? Math.min(1, Math.max(0, (now - litAt) / .65)) : 1;
  const scale = awake ? 1 - .09 * (1 - progress) ** 2 : 1;
  const sprite = drawSprite(ctx, `${kind}.${awake ? 'awake' : 'dormant'}`, cx, cy, cell, { scale, displayMode: layout.displayMode });
  local(ctx, cx, cy, cell, () => {
    if (!sprite) {
      ctx.scale(scale, scale);
      const green = awake ? '#98bf8d' : '#617e75';
      const light = awake ? '#e1d197' : '#93a590';
      const dark = awake ? '#3f795f' : '#3b5d57';
      ctx.fillStyle = '#071b2570'; ctx.beginPath(); ctx.ellipse(0, .32, .27, .07, 0, 0, TAU); ctx.fill();
      if (kind === 'tree') {
        ctx.strokeStyle = awake ? '#baa475' : '#84917b'; ctx.lineWidth = .052;
        line(ctx, [[-.04, .3], [.015, .01], [-.035, -.28]]);
        for (const [x, y, tilt, length] of [[-.01, -.19, -.6, .24], [0, -.08, .95, .32], [-.01, .03, -.97, .35], [-.01, .15, 1.02, .28]]) {
          leaf(ctx, x, y, length, length * .28, tilt, green);
          leaf(ctx, x, y, length * .78, length * .17, tilt + .28, dark);
        }
        leaf(ctx, -.025, -.22, .18, .055, .13, light);
      } else if (kind === 'flower') {
        ctx.strokeStyle = green; ctx.lineWidth = .033;
        ctx.beginPath(); ctx.moveTo(-.04, .29); ctx.bezierCurveTo(.05, .2, -.09, .05, 0, -.08); ctx.stroke();
        leaf(ctx, -.03, .23, .22, .07, -1.1, dark);
        leaf(ctx, -.025, .14, .19, .065, 1.1, green);
        for (let petal = 0; petal < 5; petal++) {
          leaf(ctx, 0, -.06, awake ? .25 : .14, awake ? .084 : .05, petal * TAU / 5, awake ? (target.need ? colorOf(target.need) : '#dfbf9b') : '#718b82');
        }
        ctx.fillStyle = light; disc(ctx, 0, -.06, .055);
        ctx.fillStyle = dark; disc(ctx, -.008, -.067, .018);
      } else if (kind === 'mushroom') {
        for (const [x, y, scale] of [[.13, .12, .66], [-.09, -.03, 1]]) {
          ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
          ctx.fillStyle = light;
          polygon(ctx, [[-.07, .27], [-.035, -.02], [.035, -.03], [.082, .26]]); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-.26, .03);
          ctx.bezierCurveTo(-.21, -.25, .12, -.29, .27, -.01);
          ctx.bezierCurveTo(.11, .05, -.12, .08, -.26, .03);
          ctx.fillStyle = awake ? '#7cbdaf' : '#557b74'; ctx.fill();
          ctx.strokeStyle = light; ctx.lineWidth = .014;
          line(ctx, [[-.2, .02], [-.03, .035], [.2, 0]]);
          for (const sx of [-.1, .06]) leaf(ctx, sx, -.025, .095, .025, sx * 3, light);
          ctx.restore();
        }
      } else {
        // A broad feather mask and a tapered body, distinct from the older circles.
        ctx.fillStyle = awake ? '#9f9970' : '#6e8076';
        ctx.beginPath(); ctx.moveTo(-.22, -.31); ctx.lineTo(-.09, -.22);
        ctx.quadraticCurveTo(0, -.29, .11, -.23); ctx.lineTo(.24, -.32);
        ctx.bezierCurveTo(.2, -.08, .27, .17, .12, .3);
        ctx.quadraticCurveTo(0, .35, -.13, .28);
        ctx.bezierCurveTo(-.28, .13, -.2, -.07, -.22, -.31); ctx.fill();
        leaf(ctx, -.12, .24, .31, .063, -.16, dark);
        leaf(ctx, .12, .24, .31, .063, .16, dark);
        ctx.fillStyle = awake ? '#e4d7a4' : '#9aab94';
        ctx.beginPath(); ctx.moveTo(-.18, -.17); ctx.quadraticCurveTo(-.07, -.22, 0, -.09); ctx.quadraticCurveTo(.09, -.22, .18, -.17);
        ctx.quadraticCurveTo(.16, .03, 0, .05); ctx.quadraticCurveTo(-.16, .03, -.18, -.17); ctx.fill();
        ctx.strokeStyle = '#253e3b'; ctx.lineWidth = .025;
        if (awake) { ctx.fillStyle = '#253e3b'; disc(ctx, -.086, -.075, .034); disc(ctx, .086, -.075, .034); }
        else { line(ctx, [[-.13, -.06], [-.08, -.035], [-.04, -.06]]); line(ctx, [[.04, -.06], [.08, -.035], [.13, -.06]]); }
        ctx.fillStyle = '#c2a26a'; polygon(ctx, [[-.026, -.015], [.026, -.015], [0, .06]]); ctx.fill();
      }
    }
    if (awake) {
      ctx.strokeStyle = kind === 'mushroom' ? '#add6c3' : '#dfd4a0';
      ctx.globalAlpha *= .45;
      ctx.lineWidth = .012;
      // A quiet pair of seed husks grounds every awakened object.
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * .2, .34, .084, .018, side * -.24, 0, TAU);
        ctx.stroke();
      }
    }
  });
  if (awake && kind === 'mushroom' && onSpore && Math.sin(now * 1.9 + target.x * 2.7) > .992) onSpore(cx, cy);
}
export function drawTree(ctx, target, litAt, now, layout) { drawTarget(ctx, target, litAt, now, layout, 'tree'); }
export function drawFlower(ctx, target, litAt, now, layout) { drawTarget(ctx, target, litAt, now, layout, 'flower'); }
export function drawMushroom(ctx, target, litAt, now, layout, onSpore) { drawTarget(ctx, target, litAt, now, layout, 'mushroom', onSpore); }
export function drawOwl(ctx, target, litAt, now, layout) { drawTarget(ctx, target, litAt, now, layout, 'owl'); }

export function drawRestingMarker(ctx, target, layout) {
  const { cx, cy } = centerOf(layout, target.x, target.y);
  local(ctx, cx, cy, layout.cell, () => {
    ctx.strokeStyle = '#e3cda28c'; ctx.lineWidth = .017;
    line(ctx, [[-.065, .36], [0, .39], [.065, .36]]);
  });
}
export function drawNeedBadge(ctx, target, layout) {
  if (!target.need) return;
  const { cx, cy } = centerOf(layout, target.x, target.y);
  colorMark(ctx, cx + layout.cell * .29, cy - layout.cell * .29, layout.cell, target.need);
}
export function drawHintPulse(ctx, piece, layout, time) {
  const { cx, cy } = centerOf(layout, piece.x, piece.y);
  local(ctx, cx, cy, layout.cell, () => {
    const radius = .405 + Math.sin(time * 2.4) * .015;
    ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = .025;
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      line(ctx, [[x * radius, y * .2], [x * radius, y * .31], [x * .31, y * radius], [x * .2, y * radius]]);
    }
  });
}
