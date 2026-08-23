(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};
  const engine = () => root.GG.engine;

  class Game {
    constructor(canvas, hooks) {
      this.canvas = canvas;
      this.hooks = hooks || {};
      this.renderer = new GG.Renderer(canvas);
      this.particles = new GG.ParticleSystem();
      this.sound = new GG.Sound();
      this.state = 'title';
      this.level = null;
      this.def = null;
      this.trace = null;
      this.moves = 0;
      this.undoStack = [];
      this.litAt = new Map();
      this.satisfied = new Set();
      this.awakenCount = 0;
      this.won = false;
      this.winTimer = 0;
      this.hintIdx = -1;
      this.hintTimer = 0;
      this.hintsUsed = 0;
      this.demoMode = false;
      this.demoTimer = 0;
      this.time = 0;
      this.settings = { sound: true, motion: true, colorblind: false };
      this.hitCells = new Set();
    }

    setSettings(s) {
      Object.assign(this.settings, s);
      this.sound.setEnabled(this.settings.sound);
    }

    startLevel(def, opts) {
      this.def = def;
      this.level = engine().parseLevel(def);
      this.moves = 0;
      this.undoStack = [];
      this.litAt.clear();
      this.satisfied.clear();
      this.awakenCount = 0;
      this.won = false;
      this.winTimer = 0;
      this.winFrames = 0;
      this.winUiDone = false;
      this.hintIdx = -1;
      this.hintTimer = 0;
      this.hintsUsed = 0;
      this.demoMode = !!(opts && opts.demo);
      this.demoTimer = 1.5;
      this.seed = def.id * 1013 + 7;
      this.particles.reset(this.seed, this.W(), this.H(), { reducedMotion: !this.settings.motion });
      this.retrace();
      this.state = 'playing';
      if (this.settings.sound && !this.demoMode) this.sound.startAmbient();
    }

    W() { return this.renderer.W; }
    H() { return this.renderer.H; }

    retrace() {
      const res = this.traceFull();
      this.trace = res;

      const hitSet = new Set();
      for (const seg of res.segments) {
        if (!seg.portalJump && seg.endFrac === undefined || seg.endFrac === 1) {
          hitSet.add(seg.x2 + ',' + seg.y2);
          hitSet.add(seg.x1 + ',' + seg.y1);
        } else {
          hitSet.add(seg.x1 + ',' + seg.y1);
        }
        if (seg.spark) hitSet.add(seg.x2 + ',' + seg.y2);
      }
      this.hitCells = hitSet;

      let newAwards = 0;
      for (const t of this.level.targets) {
        const key = t.x + ',' + t.y;
        if (!res.litSet.has(key)) continue;
        if (t.need && res.targetColors[key] !== t.need) continue;
        if (!this.satisfied.has(key)) {
          this.satisfied.add(key);
          if (!this.litAt.has(key)) this.litAt.set(key, this.time);
          newAwards++;
          this.awakenFx(t, res.targetColors[key] || 'white');
        } else if (!this.litAt.has(key)) {
          this.litAt.set(key, this.time);
        }
      }

      if (newAwards > 0 && !this.demoMode) {
        this.awakenCount += newAwards;
      }

      const allSatisfied = this.level.targets.every(t => this.satisfied.has(t.x + ',' + t.y));
      if (allSatisfied && !this.won && this.level.targets.length > 0) {
        this.won = true;
        this.winTimer = 0;
        if (!this.demoMode && this.hooks.onWin) {
          this.hooks.onWin(this);
        }
      }
    }

    traceFull() {
      const save = [];
      for (const r of this.level.rotatables) save.push(r.orient);
      const res = engine().trace(this.level);
      const resColors = this.collectTargetColors();
      res.targetColors = resColors;
      for (let i = 0; i < this.level.rotatables.length; i++) this.level.rotatables[i].orient = save[i];
      return res;
    }

    collectTargetColors() {
      const colors = {};
      const visited = new Set();
      const queue = [];
      const DX = GG.DX, DY = GG.DY;
      for (const e of this.level.emitters) queue.push({ x: e.x, y: e.y, dir: e.dir, color: e.color });
      while (queue.length > 0) {
        const seed = queue.shift();
        const sk = GG.key(seed.x, seed.y, seed.dir, seed.color);
        if (visited.has(sk)) continue;
        visited.add(sk);
        let cx = seed.x, cy = seed.y, dir = seed.dir, color = seed.color;
        let steps = 512;
        while (steps-- > 0) {
          const stKey = GG.key(cx, cy, dir, color);
          if (visited.has(stKey)) break;
          visited.add(stKey);
          const nx = cx + DX[dir], ny = cy + DY[dir];
          if (nx < 0 || ny < 0 || nx >= this.level.w || ny >= this.level.h) break;
          const ch = this.level.cells[ny][nx];
          if (ch === '#' ) break;
          if ('TfMO'.includes(ch)) {
            const k = nx + ',' + ny;
            if (!colors[k]) colors[k] = color;
            break;
          }
          if (engine().isGate(ch)) {
            if (!engine().gatePasses(color, engine().gateColorOf(ch))) break;
            cx = nx; cy = ny; continue;
          }
          if (engine().isCrystal(ch)) { color = ch; cx = nx; cy = ny; continue; }
          if (engine().isPortal(ch)) {
            const partner = this.level.portals[engine().portalPartner(ch)];
            if (partner) { cx = partner.x; cy = partner.y; continue; }
          }
          if (engine().isMirror(ch) || engine().isSplitter(ch)) {
            const ro = engine().findRotatable(this.level, nx, ny);
            const map = ro && ro.orient === 0 ? engine().MIRROR_SLASH_MAP : engine().MIRROR_BACK_MAP;
            const out = map[dir];
            if (engine().isSplitter(ch)) {
              const bKey = GG.key(nx, ny, out, color);
              if (!visited.has(bKey)) queue.push({ x: nx, y: ny, dir: out, color });
              cx = nx; cy = ny; continue;
            }
            dir = out;
          }
          cx = nx; cy = ny;
        }
      }
      return colors;
    }

    awakenFx(t, color) {
      const lay = this.renderer.layout(this.level);
      const p = this.renderer.cc(lay, t.x, t.y);
      const col = this.renderer.colorOf(color);
      if (this.settings.motion) {
        this.particles.spawnRing(p.cx, p.cy, col);
        if (t.type === 'tree' || t.type === 'flower') this.particles.spawnLeaves(p.cx, p.cy, t.type === 'tree' ? 14 : 8);
        else this.particles.spawnBurst(p.cx, p.cy, col, 12);
      }
      if (!this.demoMode) {
        this.sound.light(Math.min(this.awakenCount, 7));
      }
    }

    rotateAt(px, py) {
      if (this.won || this.demoMode || !this.level) return false;
      const lay = this.renderer.layout(this.level);
      const x = Math.floor((px - lay.ox) / lay.cell);
      const y = Math.floor((py - lay.oy) / lay.cell);
      for (let i = 0; i < this.level.rotatables.length; i++) {
        const r = this.level.rotatables[i];
        if (r.x === x && r.y === y) return this.rotateIdx(i);
      }
      return false;
    }

    rotateIdx(i) {
      const r = this.level.rotatables[i];
      if (!r || this.won) return false;
      this.undoStack.push(this.level.rotatables.map(o => o.orient));
      if (this.undoStack.length > 200) this.undoStack.shift();
      r.orient ^= 1;
      r.spinStart = this.time;
      r.spinFrom = 0;
      r.spinTo = Math.PI;
      this.moves++;
      this.hintIdx = -1;
      this.retrace();
      if (this.settings.sound) this.sound.rotate();
      if (this.hooks.onMove) this.hooks.onMove(this);
      return true;
    }

    undo() {
      if (this.won || this.undoStack.length === 0) return false;
      const prev = this.undoStack.pop();
      for (let i = 0; i < this.level.rotatables.length; i++) {
        this.level.rotatables[i].orient = prev[i];
      }
      this.moves = Math.max(0, this.moves - 1);
      this.retrace();
      if (this.settings.sound) this.sound.click();
      return true;
    }

    resetLevel() {
      if (!this.level) return;
      engine().restoreInitial(this.level);
      this.moves = 0;
      this.undoStack = [];
      this.hintIdx = -1;
      this.won = false;
      this.winTimer = 0;
      this.winFrames = 0;
      this.winUiDone = false;
      this.litAt.clear();
      this.satisfied.clear();
      this.retrace();
      if (this.settings.sound) this.sound.click();
    }

    requestHint() {
      if (this.won || !this.level) return false;
      const cur = this.level.rotatables.map(r => r.orient);
      const hint = engine().hintMove(this.level, cur);
      if (hint) {
        this.hintIdx = hint.idx;
        this.hintTimer = 3;
        this.hintsUsed++;
        if (this.settings.sound) this.sound.click();
        return true;
      }
      if (this.settings.sound) this.sound.deny();
      return false;
    }

    starsFor(moves, par, hintsUsed) {
      let stars = moves <= par ? 3 : (moves <= par * 2 ? 2 : 1);
      if (hintsUsed > 0) stars = Math.min(stars, 2);
      return stars;
    }

    update(dt) {
      this.time += dt;
      this.particles.update(dt);
      if (this.hintTimer > 0) {
        this.hintTimer -= dt;
        if (this.hintTimer <= 0) this.hintIdx = -1;
      }
      for (const r of this.level ? this.level.rotatables : []) {
        if (r.spinTo !== undefined && r.spinFrom !== undefined) {
          const elapsed = this.time - (r.spinStart || 0);
          const dur = 0.22;
          if (elapsed >= dur) {
            r.spin = 0;
            delete r.spinTo;
          } else {
            r.spin = GG.easeOutCubic(elapsed / dur) * (r.spinTo - r.spinFrom);
          }
        }
      }
      if (this.demoMode) {
        this.demoTimer -= dt;
        if (this.demoTimer <= 0 && this.level && this.level.rotatables.length > 0) {
          this.demoTimer = 2.2;
          const i = Math.floor(Math.random() * this.level.rotatables.length);
          const r = this.level.rotatables[i];
          r.orient ^= 1;
          r.spinStart = this.time;
          r.spinFrom = 0;
          r.spinTo = Math.PI;
          this.retrace();
        }
      }
      if (this.won) {
        this.winTimer += dt;
        this.winFrames = (this.winFrames || 0) + 1;
        if (!this.demoMode && !this.winUiDone && this.winFrames >= 50 && this.hooks.onWinUi) {
          this.winUiDone = true;
          this.hooks.onWinUi(this);
        }
        if (this.settings.motion && this.winTimer < 1.6) {
          if (Math.random() < 0.12 && this.level) {
            const t = this.level.targets[Math.floor(Math.random() * this.level.targets.length)];
            const lay = this.renderer.layout(this.level);
            const p = this.renderer.cc(lay, t.x, t.y);
            this.particles.spawnLeaves(p.cx, p.cy, 3);
          }
        }
      }
      if (this.settings.sound) {
        this.sound.maybeBird(dt, this.satisfied.size > 0);
      }
    }

    render() {
      const ctx = this.renderer.ctx;
      ctx.clearRect(0, 0, this.W(), this.H());
      if (!this.level) {
        this.drawIdleBackdrop(ctx);
        return;
      }
      const level = this.level;
      this.renderer.buildBackground(level, this.seed);
      ctx.drawImage(this.renderer.bg, 0, 0);
      const lay = this.renderer.layout(level);

      this.renderer.drawBoardBase(ctx, level, lay);
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.ox - lay.cell, lay.oy - lay.cell, lay.cell * (level.w + 2), lay.cell * (level.h + 2));
      ctx.clip();

      if (this.trace) {
        this.renderer.drawPortalJumps(ctx, this.trace, lay, this.time);
      }

      for (let y = 0; y < level.h; y++) {
        for (let x = 0; x < level.w; x++) {
          const ch = level.cells[y][x];
          if (ch === '#') this.renderer.drawWall(ctx, x, y, lay, this.seed);
        }
      }

      if (this.trace) {
        this.renderer.drawBeams(ctx, this.trace, lay, this.time, this.settings);
      }

      const portalIds = new Set();
      if (this.trace) {
        for (const seg of this.trace.segments) {
          if (seg.portalJump) {
            portalIds.add(level.cells[seg.fromY][seg.fromX]);
            portalIds.add(level.cells[seg.toY][seg.toX]);
          }
        }
      }
      for (const id in level.portals) {
        const p = level.portals[id];
        this.renderer.drawPortal(ctx, id, p.x, p.y, lay, this.time, portalIds);
      }

      for (const e of level.emitters) {
        const active = this.hitCells.size > 0;
        this.renderer.drawEmitter(ctx, e, lay, this.time, active);
      }

      for (const ro of level.rotatables) {
        if (ro.kind === 'splitter') this.renderer.drawSplitter(ctx, ro, lay, this.time, this.hitCells);
        else this.renderer.drawMirror(ctx, ro, lay, this.time, this.hitCells);
      }

      for (const t of level.targets) {
        const key = t.x + ',' + t.y;
        const litAt = this.litAt.get(key);
        const lit = litAt !== undefined ? 1 : 0;
        const litT = litAt !== undefined ? this.time - litAt : 0;
        const args = [ctx, t, lit, litT, lay, this.time];
        if (t.type === 'tree') this.renderer.drawTree(...args);
        else if (t.type === 'flower') this.renderer.drawFlower(...args);
        else if (t.type === 'mushroom') this.renderer.drawMushroom(ctx, t, lit, litT, lay, this.time, 1 / 60);
        else this.renderer.drawOwl(...args);
        if (!this.satisfied.has(key)) {
          this.renderer.needBadge(ctx, t, lay);
        }
      }

      for (let y = 0; y < level.h; y++) {
        for (let x = 0; x < level.w; x++) {
          const ch = level.cells[y][x];
          if (engine().isCrystal(ch)) {
            this.renderer.drawCrystal(ctx, ch, x, y, lay, this.time);
          } else if (engine().isGate(ch)) {
            const powered = this.trace && this.trace.segments.some(s => !s.portalJump && ((s.x2 === x && s.y2 === y) || (s.x1 === x && s.y1 === y)));
            this.renderer.drawGate(ctx, ch, x, y, lay, this.time, powered);
          }
        }
      }

      if (this.hintIdx >= 0 && this.level.rotatables[this.hintIdx]) {
        this.renderer.hintPulse(ctx, this.level.rotatables[this.hintIdx], lay, this.time);
      }

      this.particles.draw(ctx);
      ctx.restore();

      if (this.won && !this.demoMode) {
        const a = Math.min(1, this.winTimer / 1.2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25 * (1 - this.winTimer / 2.4);
        const rg = ctx.createRadialGradient(this.W() / 2, this.H() / 2, 10, this.W() / 2, this.H() / 2, this.W() * 0.7);
        rg.addColorStop(0, 'rgba(255,240,190,0.9)');
        rg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, this.W(), this.H());
        ctx.restore();
        void a;
      }
    }

    drawIdleBackdrop(ctx) {
      ctx.fillStyle = '#0a1420';
      ctx.fillRect(0, 0, this.W(), this.H());
    }

    pointerDown(px, py) {
      if (this.state !== 'playing') return;
      const moved = this.rotateAt(px, py);
      if (!moved) {
        const lay = this.renderer.layout(this.level);
        const x = Math.floor((px - lay.ox) / lay.cell);
        const y = Math.floor((py - lay.oy) / lay.cell);
        if (x >= 0 && y >= 0 && x < this.level.w && y < this.level.h) {
          const ch = this.level.cells[y][x];
          if (ch !== '.' && ch !== '#') {
            if (this.settings.sound) this.sound.deny();
          }
        }
      }
    }
  }

  GG.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
