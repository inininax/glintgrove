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
      this.awarded = new Set();
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
      this.renderer.onSpore = (x, y) => {
        if (this.settings.motion) this.particles.spawnSpore(x, y);
      };
    }

    setSettings(s) {
      Object.assign(this.settings, s);
      this.sound.setEnabled(this.settings.sound);
      if (this.particles) this.particles.reducedMotion = !this.settings.motion;
    }

    startLevel(def, opts) {
      this.def = def;
      this.level = engine().parseLevel(def);
      this.moves = 0;
      this.undoStack = [];
      this.litAt.clear();
      this.satisfied.clear();
      this.awarded.clear();
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
      const hadPortal = this.trace && this.trace.segments.some(s => s.portalJump);
      const res = engine().trace(this.level);
      this.trace = res;

      const hasPortal = res.segments.some(s => s.portalJump);
      if (hasPortal && !hadPortal && !this.demoMode && this.settings.sound) {
        this.sound.portal();
      }

      const hitSet = new Set();
      for (const seg of res.segments) {
        if (seg.portalJump) {
          hitSet.add(seg.fromX + ',' + seg.fromY);
          hitSet.add(seg.toX + ',' + seg.toY);
          continue;
        }
        hitSet.add(seg.x1 + ',' + seg.y1);
        if (seg.endFrac === undefined || seg.endFrac === 1 || seg.spark) {
          hitSet.add(seg.x2 + ',' + seg.y2);
        }
      }
      this.hitCells = hitSet;

      this.satisfied = new Set();
      let awardIndex = 0;
      for (const t of this.level.targets) {
        const key = t.x + ',' + t.y;
        const col = res.targetColors[key];
        if (!res.litSet.has(key)) continue;
        if (t.need && col !== t.need) continue;
        this.satisfied.add(key);
        if (!this.awarded.has(key)) {
          this.awarded.add(key);
          this.litAt.set(key, this.time);
          this.awakenCount++;
          this.awakenFx(t, col || 'white', awardIndex);
          awardIndex++;
        } else if (!this.litAt.has(key)) {
          this.litAt.set(key, this.time);
        }
      }

      const allSatisfied = this.level.targets.length > 0 &&
        this.level.targets.every(t => this.satisfied.has(t.x + ',' + t.y));
      if (allSatisfied && !this.won) {
        this.won = true;
        this.winTimer = 0;
        this.winFrames = 0;
        if (!this.demoMode && this.hooks.onWin) {
          this.hooks.onWin(this);
        }
      }
    }

    awakenFx(t, color, awardIndex) {
      const lay = this.renderer.layout(this.level);
      const p = this.renderer.cc(lay, t.x, t.y);
      const col = this.renderer.colorOf(color);
      if (this.settings.motion) {
        this.particles.spawnRing(p.cx, p.cy, col);
        if (t.type === 'tree' || t.type === 'flower') this.particles.spawnLeaves(p.cx, p.cy, t.type === 'tree' ? 14 : 8);
        else this.particles.spawnBurst(p.cx, p.cy, col, 12);
      }
      if (!this.demoMode) {
        this.sound.light(Math.max(0, Math.min((this.awakenCount - 1) + (awardIndex || 0), 7)));
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
      if (this.hooks.onMove) this.hooks.onMove(this);
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
      this.awakenCount = 0;
      this.litAt.clear();
      this.satisfied.clear();
      this.awarded.clear();
      this.retrace();
      if (this.settings.sound) this.sound.click();
      if (this.hooks.onMove) this.hooks.onMove(this);
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
        this.renderer.drawBeams(ctx, this.trace, lay, this.time, {
          colorblind: this.settings.colorblind,
          reducedMotion: !this.settings.motion
        });
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
