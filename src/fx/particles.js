// Original Ilyndrel effects: drifting seed diamonds and opening six-petal traces.
// All marks are Canvas paths; no image, font, or third-party particle library.
import { mulberry32 } from '../core/math.js';
const TAU = Math.PI * 2;
const LEAF_TONES = ['#b1d6bb', '#70aa98', '#d2c28c', '#8eafaa'];

function diamond(ctx, x, y, size, stretch = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y - size * stretch);
  ctx.lineTo(x + size * 0.55, y);
  ctx.lineTo(x, y + size * stretch);
  ctx.lineTo(x - size * 0.55, y);
  ctx.closePath();
}

export class ParticleSystem {
  constructor() {
    this.items = [];
    this.fireflies = [];
    this.time = 0;
    this.w = this.h = 1;
    this.maxItems = 280;
    this.reducedMotion = false;
    this.rng = mulberry32(20260913);
  }

  resize(w, h) { this.w = Math.max(1, w); this.h = Math.max(1, h); }

  reset(seed, w, h, opts = {}) {
    this.resize(w, h);
    this.rng = mulberry32(seed ^ 0x19ac730d);
    this.time = 0;
    this.items = [];
    this.reducedMotion = !!opts.reducedMotion;
    this.fireflies = Array.from({ length: 18 }, () => ({
      u: this.rng(), v: this.rng(), phase: this.rng() * TAU,
      size: 0.7 + this.rng() * 1.1
    }));
  }

  add(type, x, y, color, count = 1) {
    if (this.reducedMotion) return;
    const slots = Math.min(Math.max(0, count), this.maxItems - this.items.length);
    for (let i = 0; i < slots; i++) {
      const angle = TAU * (i + this.rng() * 0.5) / Math.max(1, slots);
      this.items.push({ type, x, y, color, angle,
        age: 0, duration: type === 'leaf' ? 1.8 : 0.85 + this.rng() * 0.5,
        distance: 18 + this.rng() * 42, size: 1 + this.rng() * 2.3,
        turn: this.rng() * TAU
      });
    }
  }

  spawnBurst(x, y, color, n) { this.add('seed', x, y, color, n); }
  spawnRing(x, y, color) { this.add('corolla', x, y, color); }
  spawnRays(x, y, color) { this.add('ribbon', x, y, color, 6); }
  spawnSpore(x, y) { this.add('float', x, y, '#c5e5df', 2); }
  spawnMotes(x, y, n) { this.add('float', x, y, '#e0dbc0', n); }
  spawnConverge(x, y, color) { this.add('inward', x, y, color, 2); }
  spawnLeaves(x, y, n) {
    for (let i = 0; i < n; i++) this.add('leaf', x, y, LEAF_TONES[i % LEAF_TONES.length]);
  }

  update(dt) {
    if (this.reducedMotion) { this.items.length = 0; return; }
    this.time += dt;
    this.items = this.items.filter(p => (p.age += dt) < p.duration);
  }

  draw(ctx) {
    ctx.save();
    for (const seed of this.fireflies) {
      const phase = seed.phase + (this.reducedMotion ? 0 : this.time * 0.22);
      const x = seed.u * this.w + Math.cos(phase) * 8;
      const y = seed.v * this.h + Math.sin(phase * 0.7) * 13;
      ctx.globalAlpha = 0.25 + 0.22 * Math.pow(Math.sin(phase), 2);
      ctx.fillStyle = '#dfd3a9';
      diamond(ctx, x, y, seed.size, 1.5);
      ctx.fill();
    }
    for (const p of this.items) {
      const u = p.age / p.duration;
      const travel = p.distance * (1 - Math.pow(1 - u, 2));
      ctx.save();
      ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.1)) * (1 - u * 0.4);
      ctx.strokeStyle = ctx.fillStyle = p.color;
      ctx.lineWidth = 0.7 + (1 - u) * 0.6;
      ctx.translate(p.x, p.y);
      if (p.type === 'corolla') {
        // Six detached petals open around the target, leaving its sprite legible.
        for (let petal = 0; petal < 6; petal++) {
          const a = petal * TAU / 6;
          ctx.save(); ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(8 + travel * 0.55, -2);
          ctx.quadraticCurveTo(16 + travel, -6 * (1 - u), 20 + travel, 0);
          ctx.quadraticCurveTo(16 + travel, 6 * (1 - u), 8 + travel * 0.55, 2);
          ctx.stroke(); ctx.restore();
        }
      } else if (p.type === 'ribbon') {
        ctx.rotate(p.angle);
        ctx.beginPath(); ctx.moveTo(travel * 0.5, 0);
        ctx.quadraticCurveTo(travel, -5 * (1 - u), travel + 9 * (1 - u), 0);
        ctx.stroke();
      } else {
        let x = Math.cos(p.angle) * travel;
        let y = Math.sin(p.angle) * travel;
        if (p.type === 'float') { x = Math.sin(p.turn + u * 3) * 9; y = -travel; }
        if (p.type === 'inward') { x *= 1 - u; y *= 1 - u; }
        if (p.type === 'leaf') { x = Math.sin(p.turn + u * 2) * travel; y = -Math.sin(u * Math.PI) * 35 + u * 12; }
        ctx.translate(x, y);
        ctx.rotate(p.turn + (p.type === 'leaf' ? u * 2 : 0));
        diamond(ctx, 0, 0, p.size * (1 - u * 0.4), p.type === 'leaf' ? 2.1 : 1.2);
        ctx.fill();
        if (p.type === 'leaf') {
          ctx.globalAlpha *= 0.45; ctx.strokeStyle = '#fff4d8';
          ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size); ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
