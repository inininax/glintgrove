import { mulberry32 } from '../core/math.js';

export class ParticleSystem {
    constructor() {
      this.items = [];
      this.fireflies = [];
      this.time = 0;
      this.reducedMotion = false;
      this.maxItems = 400;
    }

    resize(w, h) {
      this.w = w;
      this.h = h;
    }

    reset(seed, w, h, opts) {
      const rng = mulberry32(seed);
      this.items.length = 0;
      this.fireflies.length = 0;
      this.w = w;
      this.h = h;
      this.reducedMotion = !!(opts && opts.reducedMotion);
      const count = this.reducedMotion ? 10 : 26;
      for (let i = 0; i < count; i++) {
        this.fireflies.push({
          x: rng() * w,
          y: rng() * h,
          vx: (rng() - 0.5) * 12,
          vy: (rng() - 0.5) * 8,
          phase: rng() * Math.PI * 2,
          speed: 0.6 + rng() * 1.2,
          size: 1 + rng() * 2
        });
      }
      this.rng = rng;
    }

    spawnBurst(x, y, color, n) {
      if (this.items.length >= this.maxItems) return;
      for (let i = 0; i < n; i++) {
        const a = this.rng ? this.rng() * Math.PI * 2 : Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 120;
        this.items.push({
          type: 'spark',
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.5,
          size: 1.5 + Math.random() * 2.5,
          color
        });
      }
    }

    spawnRing(x, y, color) {
      if (this.items.length >= this.maxItems) return;
      this.items.push({ type: 'ring', x, y, life: 0, maxLife: 0.9, size: 8, color });
    }

    spawnLeaves(x, y, n) {
      if (this.items.length >= this.maxItems) return;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const sp = 60 + Math.random() * 100;
        this.items.push({
          type: 'leaf',
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 6,
          life: 0,
          maxLife: 1.2 + Math.random() * 0.6,
          size: 3 + Math.random() * 3,
          color: ['#57c97a', '#7ddc9a', '#3fae6a', '#cfe8a9'][Math.floor(Math.random() * 4)]
        });
      }
    }

    spawnSpore(x, y) {
      if (this.items.length >= this.maxItems) return;
      this.items.push({
        type: 'spore',
        x: x + (Math.random() - 0.5) * 14,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -18 - Math.random() * 20,
        life: 0,
        maxLife: 1.6 + Math.random(),
        size: 1.5 + Math.random() * 1.5,
        color: '#8fe3ff'
      });
    }

    spawnRays(x, y, color) {
      if (this.items.length >= this.maxItems) return;
      for (let i = 0; i < 10; i++) {
        this.items.push({
          type: 'ray',
          x, y,
          angle: (i / 10) * Math.PI * 2 + Math.random() * 0.4,
          life: 0,
          maxLife: 0.7 + Math.random() * 0.3,
          len: 14 + Math.random() * 22,
          color
        });
      }
    }

    spawnMotes(x, y, n) {
      for (let i = 0; i < n; i++) {
        if (this.items.length >= this.maxItems) return;
        this.items.push({
          type: 'mote',
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 6,
          vy: -12 - Math.random() * 18,
          life: 0,
          maxLife: 1.4 + Math.random() * 1.2,
          size: 1 + Math.random() * 1.6,
          color: '#d8ffe8',
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    spawnConverge(x, y, color) {
      if (this.items.length >= this.maxItems) return;
      const a = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * 50;
      this.items.push({
        type: 'converge',
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        tx: x,
        ty: y,
        life: 0,
        maxLife: 0.5,
        size: 1.6,
        color
      });
    }

    update(dt) {
      this.time += dt;
      for (const f of this.fireflies) {
        f.phase += dt * f.speed;
        f.x += (f.vx + Math.sin(f.phase * 0.8) * 10) * dt;
        f.y += (f.vy + Math.cos(f.phase * 0.6) * 8) * dt;
        if (f.x < -20) f.x = this.w + 20;
        if (f.x > this.w + 20) f.x = -20;
        if (f.y < -20) f.y = this.h + 20;
        if (f.y > this.h + 20) f.y = -20;
      }
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.life += dt;
        if (p.type !== 'ring' && p.type !== 'converge') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.type === 'spark') p.vy += 160 * dt;
          if (p.type === 'leaf') { p.vy += 60 * dt; p.rot += p.vrot * dt; }
        }
        if (p.life >= p.maxLife) this.items.splice(i, 1);
      }
    }

    draw(ctx) {
      ctx.save();
      for (const f of this.fireflies) {
        const tw = this.reducedMotion ? 1 : (0.35 + 0.65 * Math.max(0, Math.sin(f.phase * 2)));
        ctx.globalAlpha = tw * 0.7;
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const p of this.items) {
        const t = p.life / p.maxLife;
        ctx.globalAlpha = 1 - t;
        if (p.type === 'ray') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2 * (1 - t);
          ctx.beginPath();
          const r1 = 6 + t * p.len;
          const r2 = r1 + p.len * 0.5 * (1 - t);
          ctx.moveTo(p.x + Math.cos(p.angle) * r1, p.y + Math.sin(p.angle) * r1);
          ctx.lineTo(p.x + Math.cos(p.angle) * r2, p.y + Math.sin(p.angle) * r2);
          ctx.stroke();
        } else if (p.type === 'mote') {
          ctx.globalAlpha = (1 - t) * (0.4 + 0.6 * Math.abs(Math.sin(p.phase + p.life * 6)));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'converge') {
          const tt = 1 - t;
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.tx + (p.x - p.tx) * tt, p.ty + (p.y - p.ty) * tt, p.size * (0.5 + t), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5 * (1 - t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + t * 46, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.type === 'leaf') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
}
