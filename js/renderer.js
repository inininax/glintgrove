(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};
  const CELL = GG.CELL;
  const engine = () => root.GG.engine;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.bg = null;
      this.bgKey = '';
      this.W = 0;
      this.H = 0;
      this.dpr = 1;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(root.devicePixelRatio || 1, 2);
      this.W = Math.max(320, Math.floor(rect.width));
      this.H = Math.max(240, Math.floor(rect.height));
      this.canvas.width = this.W * this.dpr;
      this.canvas.height = this.H * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.bg = null;
    }

    layout(level) {
      const padX = Math.max(16, this.W * 0.06);
      const padTop = 84;
      const padBot = 40;
      const cw = (this.W - padX * 2) / level.w;
      const chh = (this.H - padTop - padBot) / level.h;
      let cell = Math.floor(Math.min(cw, chh, 96));
      cell = Math.max(14, cell);
      const ox = Math.floor((this.W - cell * level.w) / 2);
      const oy = Math.floor(padTop + (this.H - padTop - padBot - cell * level.h) / 2);
      return { cell, ox, oy };
    }

    buildBackground(level, seed) {
      const key = level.id + '_' + seed + '_' + this.W + 'x' + this.H;
      if (this.bg && this.bgKey === key) return;
      const c = document.createElement('canvas');
      c.width = this.W; c.height = this.H;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 0, this.H);
      grad.addColorStop(0, '#0a1420');
      grad.addColorStop(0.55, '#0c1b2a');
      grad.addColorStop(1, '#102433');
      g.fillStyle = grad;
      g.fillRect(0, 0, this.W, this.H);

      const rng = GG.mulberry32(seed * 7919 + 13);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 90; i++) {
        const x = rng() * this.W;
        const y = rng() * this.H * 0.55;
        const a = 0.12 + rng() * 0.5;
        g.globalAlpha = a;
        g.beginPath();
        g.arc(x, y, 0.6 + rng() * 1.1, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      const layers = [
        { col: '#0e2030', base: 0.72, amp: 60, step: 46 },
        { col: '#12283a', base: 0.82, amp: 44, step: 34 }
      ];
      for (const L of layers) {
        g.fillStyle = L.col;
        g.beginPath();
        g.moveTo(0, this.H);
        let y = this.H * (1 - L.base);
        for (let x = -20; x <= this.W + 20; x += L.step * (0.7 + rng() * 0.6)) {
          const peak = y + rng() * L.amp;
          g.lineTo(x + L.step / 2, peak);
          g.lineTo(x + L.step, y + rng() * 14);
        }
        g.lineTo(this.W + 20, this.H);
        g.closePath();
        g.fill();
      }

      g.fillStyle = 'rgba(20,48,66,0.55)';
      for (let i = 0; i < 26; i++) {
        const x = rng() * this.W;
        const y = this.H * (0.75 + rng() * 0.25);
        g.beginPath();
        g.ellipse(x, y, 20 + rng() * 50, 5 + rng() * 10, 0, 0, Math.PI * 2);
        g.fill();
      }

      const vig = g.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.85);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(2,8,14,0.55)');
      g.fillStyle = vig;
      g.fillRect(0, 0, this.W, this.H);

      this.bg = c;
      this.bgKey = key;
    }

    drawBoardBase(ctx, level, lay) {
      ctx.save();
      ctx.fillStyle = 'rgba(8,18,28,0.45)';
      this.roundRect(ctx, lay.ox - 10, lay.oy - 10, lay.cell * level.w + 20, lay.cell * level.h + 20, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,220,0.10)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= level.w; x++) {
        ctx.beginPath();
        ctx.moveTo(lay.ox + x * lay.cell, lay.oy);
        ctx.lineTo(lay.ox + x * lay.cell, lay.oy + level.h * lay.cell);
        ctx.stroke();
      }
      for (let y = 0; y <= level.h; y++) {
        ctx.beginPath();
        ctx.moveTo(lay.ox, lay.oy + y * lay.cell);
        ctx.lineTo(lay.ox + level.w * lay.cell, lay.oy + y * lay.cell);
        ctx.stroke();
      }
      ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    cc(lay, x, y) {
      return { cx: lay.ox + x * lay.cell + lay.cell / 2, cy: lay.oy + y * lay.cell + lay.cell / 2 };
    }

    colorOf(name) { return GG.COLORS[name] || GG.COLORS.white; }

    dashFor(color, colorblind) {
      if (!colorblind || color === 'white') return [];
      if (color === 'r') return [14, 8];
      if (color === 'g') return [22, 7];
      return [4, 7];
    }

    drawBeams(ctx, result, lay, time, opts) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const trimCache = new Map();
      for (const seg of result.segments) {
        if (seg.portalJump) continue;
        const key = seg.x1 + ',' + seg.y1 + ',' + seg.x2 + ',' + seg.y2;
        let pts = trimCache.get(key);
        if (!pts) {
          const p1 = this.cc(lay, seg.x1, seg.y1);
          const p2 = this.cc(lay, seg.x2, seg.y2);
          const f = seg.endFrac !== undefined ? seg.endFrac : 1;
          pts = [p1.cx, p1.cy, p1.cx + (p2.cx - p1.cx) * f, p1.cy + (p2.cy - p1.cy) * f];
          trimCache.set(key, pts);
        }
        const col = this.colorOf(seg.color);
        const glowW = lay.cell * 0.34;
        ctx.setLineDash(this.dashFor(seg.color, opts.colorblind));

        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.10 + 0.05 * Math.sin(time * 3 + seg.x1);
        ctx.lineWidth = glowW;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.stroke();

        ctx.globalAlpha = 0.32;
        ctx.lineWidth = lay.cell * 0.16;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.stroke();

        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.6, lay.cell * 0.05);
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.setLineDash([]);
      ctx.restore();

      if (!opts.reducedMotion) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        let pi = 0;
        for (const seg of result.segments) {
          if (seg.portalJump || seg.hit) continue;
          pi++;
          const ph = (time * 1.6 + pi * 0.37) % 1;
          if (ph > 0.25) continue;
          const p1 = this.cc(lay, seg.x1, seg.y1);
          const p2 = this.cc(lay, seg.x2, seg.y2);
          const t = ph / 0.25;
          const px = p1.cx + (p2.cx - p1.cx) * t;
          const py = p1.cy + (p2.cy - p1.cy) * t;
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.8 * (1 - t);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.5, lay.cell * 0.06), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawPortalJumps(ctx, result, lay, time) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const seg of result.segments) {
        if (!seg.portalJump) continue;
        const a = this.cc(lay, seg.fromX, seg.fromY);
        const b = this.cc(lay, seg.toX, seg.toY);
        const col = this.colorOf(seg.color);
        ctx.strokeStyle = col;
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

    drawEmitter(ctx, e, lay, time, active) {
      const { cx, cy } = this.cc(lay, e.x, e.y);
      const s = lay.cell;
      const col = this.colorOf(e.color);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#233648';
      this.roundRect(ctx, -s * 0.28, -s * 0.28, s * 0.56, s * 0.56, s * 0.12);
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
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      const DX = [0, 1, 0, -1][e.dir];
      const DY = [-1, 0, 1, 0][e.dir];
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(DX * s * 0.42 - DY * s * 0.12, DY * s * 0.42 + DX * s * 0.12);
      ctx.lineTo(DX * s * 0.42 + DY * s * 0.12, DY * s * 0.42 - DX * s * 0.12);
      ctx.lineTo(DX * s * 0.58, DY * s * 0.58);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawMirror(ctx, ro, lay, time, hitSet) {
      const { cx, cy } = this.cc(lay, ro.x, ro.y);
      const s = lay.cell;
      const spin = ro.spin || 0;
      const ang = (ro.orient === 0 ? -Math.PI / 4 : Math.PI / 4) + spin;
      ctx.save();
      ctx.translate(cx, cy);
      const active = hitSet.has(ro.x + ',' + ro.y);
      if (active) {
        ctx.shadowColor = 'rgba(255,235,170,0.9)';
        ctx.shadowBlur = 14;
      }
      ctx.rotate(ang);
      ctx.fillStyle = '#1c2f40';
      this.roundRect(ctx, -s * 0.36, -s * 0.36, s * 0.72, s * 0.72, s * 0.14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,200,240,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const mg = ctx.createLinearGradient(-s * 0.3, -s * 0.3, s * 0.3, s * 0.3);
      mg.addColorStop(0, '#e8f4ff');
      mg.addColorStop(0.5, '#9db8cc');
      mg.addColorStop(1, '#dcedfa');
      ctx.fillStyle = mg;
      this.roundRect(ctx, -s * 0.27, -s * 0.08, s * 0.54, s * 0.16, s * 0.07);
      ctx.fill();
      const sh = ((time * 0.4 + ro.x * 0.3) % 1) * s * 0.54 - s * 0.27;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      this.roundRect(ctx, sh - s * 0.03, -s * 0.06, s * 0.06, s * 0.12, s * 0.03);
      ctx.fill();
      ctx.restore();
    }

    drawSplitter(ctx, ro, lay, time, hitSet) {
      const { cx, cy } = this.cc(lay, ro.x, ro.y);
      const s = lay.cell;
      const spin = ro.spin || 0;
      const ang = (ro.orient === 0 ? -Math.PI / 4 : Math.PI / 4) + spin;
      ctx.save();
      ctx.translate(cx, cy);
      const active = hitSet.has(ro.x + ',' + ro.y);
      if (active) { ctx.shadowColor = 'rgba(180,255,230,0.9)'; ctx.shadowBlur = 14; }
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
      if (!active) {
        const sh = ((time * 0.5 + ro.x) % 1);
        ctx.globalAlpha = 0.4 * Math.sin(sh * Math.PI);
        ctx.fillStyle = '#dff4ff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    drawWall(ctx, x, y, lay, seed) {
      const { cx, cy } = this.cc(lay, x, y);
      const s = lay.cell;
      const rng = GG.mulberry32(seed * 31 + x * 131 + y * 977);
      ctx.save();
      ctx.translate(cx, cy);
      const rocks = [[-0.2, 0.08, 0.3], [0.18, -0.1, 0.26], [0.02, 0.2, 0.22]];
      for (const [rx, ry, rr] of rocks) {
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

    drawTree(ctx, t, lit, litT, lay, time) {
      const { cx, cy } = this.cc(lay, t.x, t.y);
      const s = lay.cell;
      const awake = lit > 0;
      const pop = awake ? GG.easeOutBack(Math.min(1, litT / 0.5)) : 1;
      const sway = awake ? Math.sin(time * 1.4 + t.x) * 0.04 : Math.sin(time * 0.5 + t.x) * 0.01;
      ctx.save();
      ctx.translate(cx, cy + s * 0.38);
      ctx.scale(pop, pop);
      ctx.rotate(sway);
      if (awake) {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 2 + t.x);
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
      const canopyColors = awake
        ? ['#2f9e5f', '#3fb573', '#63cf92']
        : ['#2b3947', '#33424f', '#3d4d5b'];
      const blobs = [[0, -0.62, 0.3], [-0.22, -0.42, 0.22], [0.22, -0.42, 0.22], [0, -0.4, 0.26]];
      blobs.forEach(([bx, by, br], i) => {
        ctx.fillStyle = canopyColors[i % canopyColors.length];
        ctx.beginPath();
        ctx.arc(bx * s, by * s, br * s, 0, Math.PI * 2);
        ctx.fill();
      });
      if (awake) {
        ctx.fillStyle = 'rgba(220,255,190,0.9)';
        for (let i = 0; i < 4; i++) {
          const a = time * 1.2 + i * 1.7 + t.x;
          const fx = Math.cos(a) * s * 0.34;
          const fy = -s * 0.45 + Math.sin(a * 1.3) * s * 0.22;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3 + i);
          ctx.beginPath();
          ctx.arc(fx, fy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    drawFlower(ctx, t, lit, litT, lay, time) {
      const { cx, cy } = this.cc(lay, t.x, t.y);
      const s = lay.cell;
      const awake = lit > 0;
      const open = awake ? GG.easeOutCubic(Math.min(1, litT / 0.6)) : 0;
      const petalCol = t.need ? this.colorOf(t.need) : '#ff9ad5';
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
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + time * (awake ? 0.3 : 0);
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

    drawMushroom(ctx, t, lit, litT, lay, time, dt) {
      const { cx, cy } = this.cc(lay, t.x, t.y);
      const s = lay.cell;
      const awake = lit > 0;
      const pop = awake ? GG.easeOutBack(Math.min(1, litT / 0.5)) : 1;
      ctx.save();
      ctx.translate(cx, cy + s * 0.36);
      ctx.scale(pop, pop);
      ctx.fillStyle = awake ? '#d8cfc0' : '#4a545c';
      this.roundRect(ctx, -s * 0.09, -s * 0.3, s * 0.18, s * 0.3, s * 0.06);
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
        [[-0.12, -0.36], [0.05, -0.4], [0.14, -0.32]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.arc(sx * s, sy * s, s * 0.03, 0, Math.PI * 2);
          ctx.fill();
        });
        if (!this._sporeAcc) this._sporeAcc = 0;
        this._sporeAcc += dt || 0;
        if (this._sporeAcc > 0.4) { this._sporeAcc = 0; if (this.onSpore) this.onSpore(cx, cy); }
      }
      ctx.restore();
    }

    drawOwl(ctx, t, lit, litT, lay, time) {
      const { cx, cy } = this.cc(lay, t.x, t.y);
      const s = lay.cell;
      const awake = lit > 0;
      const blink = awake && Math.sin(time * 0.7 + t.x * 2) > 0.97;
      ctx.save();
      ctx.translate(cx, cy + s * 0.36);
      ctx.fillStyle = '#33261d';
      this.roundRect(ctx, -s * 0.24, -s * 0.1, s * 0.48, s * 0.12, s * 0.04);
      ctx.fill();
      const bodyCol = awake ? '#7a5c3e' : '#41474e';
      ctx.fillStyle = bodyCol;
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
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 2);
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

    drawCrystal(ctx, ch, x, y, lay, time) {
      const { cx, cy } = this.cc(lay, x, y);
      const s = lay.cell;
      const col = this.colorOf(ch);
      ctx.save();
      ctx.translate(cx, cy);
      const bob = Math.sin(time * 2 + x * 2 + y) * s * 0.03;
      ctx.translate(0, bob);
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

    drawGate(ctx, ch, x, y, lay, time, powered) {
      const { cx, cy } = this.cc(lay, x, y);
      const s = lay.cell;
      const col = this.colorOf(engine().gateColorOf(ch));
      const letter = ch === 'A' ? 'R' : (ch === 'B' ? 'G' : 'B');
      ctx.save();
      ctx.translate(cx, cy);
      if (powered) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
      ctx.globalAlpha = powered ? 0.85 : 0.45;
      ctx.fillStyle = col;
      this.roundRect(ctx, -s * 0.3, -s * 0.34, s * 0.6, s * 0.68, s * 0.08);
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

    drawPortal(ctx, idChar, x, y, lay, time, activeIds) {
      const { cx, cy } = this.cc(lay, x, y);
      const s = lay.cell;
      const hue = (idChar === 'P' || idChar === 'Q') ? 275 : 25;
      const col = `hsl(${hue}, 80%, 65%)`;
      const active = activeIds.has(idChar);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * (active ? 1.4 : 0.5));
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(2, s * 0.06);
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
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

    needBadge(ctx, t, lay) {
      if (!t.need) return;
      const { cx, cy } = this.cc(lay, t.x, t.y);
      const col = this.colorOf(t.need);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(cx + lay.cell * 0.28, cy - lay.cell * 0.34, lay.cell * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    hintPulse(ctx, ro, lay, time) {
      const { cx, cy } = this.cc(lay, ro.x, ro.y);
      const r = lay.cell * (0.4 + 0.08 * Math.sin(time * 6));
      ctx.save();
      ctx.strokeStyle = '#ffe37d';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  GG.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
