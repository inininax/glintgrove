import { colorOf } from '../core/colors.js';
import { easeOutBack, easeOutCubic } from '../core/math.js';
import { centerOf } from './layout.js';
import { roundRect } from './background.js';

function center(layout, x, y) {
  return centerOf(layout, x, y);
}

export function drawEmitter(ctx, e, layout, time, active) {
  const { cx, cy } = center(layout, e.x, e.y);
  const s = layout.cell;
  const col = colorOf(e.color);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#233648';
  roundRect(ctx, -s * 0.28, -s * 0.28, s * 0.56, s * 0.56, s * 0.12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,210,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const pulse = active ? 0.5 + 0.5 * Math.sin(time * 4 + e.x) : 0.3;
  ctx.globalAlpha = 0.35 + pulse * 0.4;
  const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 0.55);
  rg.addColorStop(0, col);
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const DX = [0, 1, 0, -1][e.dir];
  const DY = [-1, 0, 1, 0][e.dir];
  ctx.beginPath();
  ctx.moveTo(DX * s * 0.42 - DY * s * 0.12, DY * s * 0.42 + DX * s * 0.12);
  ctx.lineTo(DX * s * 0.42 + DY * s * 0.12, DY * s * 0.42 - DX * s * 0.12);
  ctx.lineTo(DX * s * 0.58, DY * s * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawMirror(ctx, ro, layout, time, hitCells, spinAngle) {
  const { cx, cy } = center(layout, ro.x, ro.y);
  const s = layout.cell;
  const ang = (ro.orient === 0 ? -Math.PI / 4 : Math.PI / 4) + (spinAngle || 0);
  ctx.save();
  ctx.translate(cx, cy);
  if (hitCells.has(`${ro.x},${ro.y}`)) {
    ctx.shadowColor = 'rgba(255,235,170,0.9)';
    ctx.shadowBlur = 14;
  }
  ctx.rotate(ang);
  ctx.fillStyle = '#1c2f40';
  roundRect(ctx, -s * 0.36, -s * 0.36, s * 0.72, s * 0.72, s * 0.14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,200,240,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const mg = ctx.createLinearGradient(-s * 0.3, -s * 0.3, s * 0.3, s * 0.3);
  mg.addColorStop(0, '#e8f4ff');
  mg.addColorStop(0.5, '#9db8cc');
  mg.addColorStop(1, '#dcedfa');
  ctx.fillStyle = mg;
  roundRect(ctx, -s * 0.27, -s * 0.08, s * 0.54, s * 0.16, s * 0.07);
  ctx.fill();
  if (!spinAngle) {
    const sh = ((time * 0.4 + ro.x * 0.3) % 1) * s * 0.54 - s * 0.27;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    roundRect(ctx, sh - s * 0.03, -s * 0.06, s * 0.06, s * 0.12, s * 0.03);
    ctx.fill();
  }
  ctx.restore();
}

export function drawSplitter(ctx, ro, layout, time, hitCells, spinAngle) {
  const { cx, cy } = center(layout, ro.x, ro.y);
  const s = layout.cell;
  const ang = (ro.orient === 0 ? -Math.PI / 4 : Math.PI / 4) + (spinAngle || 0);
  ctx.save();
  ctx.translate(cx, cy);
  if (hitCells.has(`${ro.x},${ro.y}`)) {
    ctx.shadowColor = 'rgba(180,255,230,0.9)';
    ctx.shadowBlur = 14;
  }
  ctx.rotate(ang);
  ctx.fillStyle = 'rgba(140,220,255,0.16)';
  ctx.strokeStyle = 'rgba(160,225,255,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.34);
  ctx.lineTo(s * 0.34, 0);
  ctx.lineTo(0, s * 0.34);
  ctx.lineTo(-s * 0.34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,250,255,0.9)';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, 0);
  ctx.lineTo(s * 0.22, 0);
  ctx.stroke();
  if (!hitCells.has(`${ro.x},${ro.y}`) && !spinAngle) {
    const sh = (time * 0.5 + ro.x) % 1;
    ctx.globalAlpha = 0.4 * Math.sin(sh * Math.PI);
    ctx.fillStyle = '#dff4ff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawCrystal(ctx, ch, x, y, layout, time) {
  const { cx, cy } = center(layout, x, y);
  const s = layout.cell;
  const col = colorOf(ch);
  ctx.save();
  ctx.translate(cx, cy + Math.sin(time * 2 + x * 2 + y) * s * 0.03);
  ctx.shadowColor = col;
  ctx.shadowBlur = 10;
  ctx.fillStyle = col;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.28);
  ctx.lineTo(s * 0.18, 0);
  ctx.lineTo(0, s * 0.28);
  ctx.lineTo(-s * 0.18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.28);
  ctx.lineTo(0, s * 0.28);
  ctx.stroke();
  ctx.restore();
}

const GATE_LETTER = { A: 'R', B: 'G', C: 'B' };

export function drawGate(ctx, gate, layout, time, powered) {
  const { cx, cy } = center(layout, gate.x, gate.y);
  const s = layout.cell;
  const col = colorOf(gate.needColor);
  const letter = GATE_LETTER[gate.char] || '?';
  ctx.save();
  ctx.translate(cx, cy);
  if (powered) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
  }
  ctx.globalAlpha = powered ? 0.85 : 0.45;
  ctx.fillStyle = col;
  roundRect(ctx, -s * 0.3, -s * 0.34, s * 0.6, s * 0.68, s * 0.08);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(s * 0.3)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 0, 0);
  if (powered) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(-s * 0.34, -s * 0.38, s * 0.68, s * 0.76);
  }
  ctx.restore();
}

const PORTAL_HUE = { P: 275, Q: 275, R: 25, S: 25 };

export function drawPortal(ctx, idChar, pos, layout, time, activeIds) {
  const { cx, cy } = center(layout, pos.x, pos.y);
  const s = layout.cell;
  const col = `hsl(${PORTAL_HUE[idChar] || 300}, 80%, 65%)`;
  const active = activeIds.has(idChar);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * (active ? 1.4 : 0.5));
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2, s * 0.06);
  if (active) {
    ctx.shadowColor = col;
    ctx.shadowBlur = 12;
  }
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 1.4);
  ctx.stroke();
  ctx.rotate(Math.PI);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.22, 0, Math.PI * 1.2);
  ctx.stroke();
  ctx.rotate(Math.PI / 2);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.12, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

export function drawTree(ctx, t, litAtTime, now, layout) {
  const { cx, cy } = center(layout, t.x, t.y);
  const s = layout.cell;
  const awake = litAtTime !== undefined;
  const age = awake ? now - litAtTime : 0;
  const pop = awake ? easeOutBack(Math.min(1, age / 0.5)) : 1;
  const sway = awake ? Math.sin(now * 1.4 + t.x) * 0.04 : Math.sin(now * 0.5 + t.x) * 0.01;
  ctx.save();
  ctx.translate(cx, cy + s * 0.38);
  ctx.scale(pop, pop);
  ctx.rotate(sway);
  if (awake) {
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(now * 2 + t.x);
    const rg = ctx.createRadialGradient(0, -s * 0.3, 4, 0, -s * 0.3, s * 0.75);
    rg.addColorStop(0, 'rgba(120,230,150,0.5)');
    rg.addColorStop(1, 'rgba(120,230,150,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = awake ? '#5b4232' : '#3a4450';
  ctx.fillRect(-s * 0.06, -s * 0.42, s * 0.12, s * 0.42);
  const canopy = awake
    ? ['#2f9e5f', '#3fb573', '#63cf92']
    : ['#2b3947', '#33424f', '#3d4d5b'];
  [[0, -0.62, 0.3], [-0.22, -0.42, 0.22], [0.22, -0.42, 0.22], [0, -0.4, 0.26]].forEach(([bx, by, br], i) => {
    ctx.fillStyle = canopy[i % canopy.length];
    ctx.beginPath();
    ctx.arc(bx * s, by * s, br * s, 0, Math.PI * 2);
    ctx.fill();
  });
  if (awake) {
    ctx.fillStyle = 'rgba(220,255,190,0.9)';
    for (let i = 0; i < 4; i++) {
      const a = now * 1.2 + i * 1.7 + t.x;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 3 + i);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.34, -s * 0.45 + Math.sin(a * 1.3) * s * 0.22, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawFlower(ctx, t, litAtTime, now, layout) {
  const { cx, cy } = center(layout, t.x, t.y);
  const s = layout.cell;
  const awake = litAtTime !== undefined;
  const open = awake ? easeOutCubic(Math.min(1, (now - litAtTime) / 0.6)) : 0;
  const petalCol = t.need ? colorOf(t.need) : '#ff9ad5';
  ctx.save();
  ctx.translate(cx, cy + s * 0.34);
  if (awake) {
    ctx.globalAlpha = 0.3;
    const rg = ctx.createRadialGradient(0, -s * 0.2, 2, 0, -s * 0.2, s * 0.5);
    rg.addColorStop(0, petalCol);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -s * 0.2, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = awake ? '#3fae6a' : '#3a4a56';
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.08, -s * 0.18, 0, -s * 0.34);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + now * (awake ? 0.3 : 0);
    const pr = open * s * 0.16 + s * 0.03;
    ctx.save();
    ctx.translate(0, -s * 0.34);
    ctx.rotate(a);
    ctx.globalAlpha = awake ? 1 : 0.55;
    ctx.fillStyle = petalCol;
    ctx.beginPath();
    ctx.ellipse(pr, 0, pr * 0.9, pr * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = awake ? '#ffe9a8' : '#57676f';
  ctx.beginPath();
  ctx.arc(0, -s * 0.34, s * 0.05 + open * s * 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMushroom(ctx, t, litAtTime, now, layout, onSpore) {
  const { cx, cy } = center(layout, t.x, t.y);
  const s = layout.cell;
  const awake = litAtTime !== undefined;
  const pop = awake ? easeOutBack(Math.min(1, (now - litAtTime) / 0.5)) : 1;
  ctx.save();
  ctx.translate(cx, cy + s * 0.36);
  ctx.scale(pop, pop);
  ctx.fillStyle = awake ? '#d8cfc0' : '#4a545c';
  roundRect(ctx, -s * 0.09, -s * 0.3, s * 0.18, s * 0.3, s * 0.06);
  ctx.fill();
  if (awake) {
    ctx.shadowColor = 'rgba(120,225,255,0.9)';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = awake ? '#59c8ee' : '#39485a';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.3, s * 0.26, s * 0.18, 0, Math.PI, 0);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (awake) {
    ctx.fillStyle = 'rgba(230,255,255,0.9)';
    for (const [sx, sy] of [[-0.12, -0.36], [0.05, -0.4], [0.14, -0.32]]) {
      ctx.beginPath();
      ctx.arc(sx * s, sy * s, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  if (awake && Math.sin(now * 2.4 + t.x * 3) > 0.985 && onSpore) onSpore(cx, cy);
}

export function drawOwl(ctx, t, litAtTime, now, layout) {
  const { cx, cy } = center(layout, t.x, t.y);
  const s = layout.cell;
  const awake = litAtTime !== undefined;
  const blink = awake && Math.sin(now * 0.7 + t.x * 2) > 0.97;
  ctx.save();
  ctx.translate(cx, cy + s * 0.36);
  ctx.fillStyle = '#33261d';
  roundRect(ctx, -s * 0.24, -s * 0.1, s * 0.48, s * 0.12, s * 0.04);
  ctx.fill();
  ctx.fillStyle = awake ? '#7a5c3e' : '#41474e';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.26, s * 0.19, s * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.5, s * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = awake ? '#3d2c1d' : '#2e3338';
  ctx.beginPath();
  ctx.ellipse(-s * 0.11, -s * 0.24, s * 0.06, s * 0.12, 0.3, 0, Math.PI * 2);
  ctx.ellipse(s * 0.11, -s * 0.24, s * 0.06, s * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fill();
  if (awake && !blink) {
    ctx.shadowColor = '#ffc94d';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd76e';
  } else {
    ctx.fillStyle = awake ? '#ffd76e' : '#20262c';
  }
  ctx.beginPath();
  ctx.arc(-s * 0.055, -s * 0.52, s * 0.035, 0, Math.PI * 2);
  ctx.arc(s * 0.055, -s * 0.52, s * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#c98a3d';
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, -s * 0.47);
  ctx.lineTo(s * 0.03, -s * 0.47);
  ctx.lineTo(0, -s * 0.42);
  ctx.closePath();
  ctx.fill();
  if (awake) {
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(now * 2);
    const rg = ctx.createRadialGradient(0, -s * 0.5, 2, 0, -s * 0.5, s * 0.5);
    rg.addColorStop(0, 'rgba(255,200,80,0.6)');
    rg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -s * 0.5, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawNeedBadge(ctx, t, layout) {
  if (!t.need) return;
  const { cx, cy } = center(layout, t.x, t.y);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = colorOf(t.need);
  ctx.beginPath();
  ctx.arc(cx + layout.cell * 0.28, cy - layout.cell * 0.34, layout.cell * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawHintPulse(ctx, ro, layout, time) {
  const { cx, cy } = center(layout, ro.x, ro.y);
  ctx.save();
  ctx.strokeStyle = '#ffe37d';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 40;
  ctx.beginPath();
  ctx.arc(cx, cy, layout.cell * (0.4 + 0.08 * Math.sin(time * 6)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
