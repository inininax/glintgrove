import { parseLevel } from '../sim/parser.js';
import { trace, hintMove, restoreInitial, applyOrients } from '../sim/index.js';
import { Emitter } from '../core/emitter.js';
import { colorOf, setSkinTheme } from '../core/colors.js';
import { easeOutCubic } from '../core/math.js';
import { getConfig } from '../services/config.js';
import { Renderer } from '../render/renderer.js';
import { invalidateGlowSprites } from '../render/beams.js';
import { clearGradientCache } from '../render/gradientCache.js';
import { radialGradient } from '../render/gradientCache.js';
import { ParticleSystem } from '../fx/particles.js';
import { Sound } from '../fx/sound.js';

const SPIN_DURATION = 0.22;

export class Game {
  constructor(canvas) {
    this.events = new Emitter();
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.particles = new ParticleSystem();
    this.sound = new Sound();
    this.renderer.onSpore = (x, y) => {
      if (this.settings.motion) this.particles.spawnSpore(x, y);
    };

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
    this.winFrames = 0;
    this.winUiDone = false;
    this.hintIdx = -1;
    this.hintTimer = 0;
    this.hintsUsed = 0;
    this.demoMode = false;
    this.demoTimer = 0;
    this.time = 0;
    this.settings = { sound: true, motion: true, colorblind: false };
    this.hitCells = new Set();
    this.activePortalIds = new Set();
    this.spins = new Map();
    this.dailyInfo = null;
    this.lastActionAt = 0;
    this.nudged = false;
    this.beamReveal = 1;
    this.slowmo = 0;
    this.auroraIntensity = 0.5;
  }

  setSettings(s) {
    Object.assign(this.settings, s);
    this.sound.setEnabled(this.settings.sound);
    this.particles.reducedMotion = !this.settings.motion;
    this.events.emit('settingsChange', { ...this.settings });
  }

  applySkin(palette) {
    setSkinTheme(palette);
    clearGradientCache();
    invalidateGlowSprites();
  }

  startLevel(def, opts = {}) {
    this.def = def;
    this.level = parseLevel(def);
    if (opts.orientOverride) applyOrients(this.level, opts.orientOverride);
    this.moves = 0;
    this.undoStack = [];
    this.litAt.clear();
    this.satisfied.clear();
    this.awarded.clear();
    this.spins.clear();
    this.awakenCount = 0;
    this.won = false;
    this.winTimer = 0;
    this.winFrames = 0;
    this.hintIdx = -1;
    this.hintTimer = 0;
    this.hintsUsed = 0;
    this.demoMode = !!opts.demo;
    this.demoTimer = 1.5;
    this.beamReveal = this.demoMode ? 1 : 0;
    this.slowmo = 0;
    this.auroraIntensity = 0.5;
    this.dailyInfo = opts.daily || null;
    this.seed = def.id * 1013 + 7 + hashStr(opts.seedSuffix || '');
    this.particles.reset(this.seed, this.W(), this.H(), { reducedMotion: !this.settings.motion });
    this.retrace();
    this.state = 'playing';
    if (this.settings.sound && !this.demoMode) this.sound.startAmbient();
    this.events.emit('levelStart', { id: def.id, demo: this.demoMode });
  }

  W() { return this.renderer.W; }
  H() { return this.renderer.H; }

  retrace() {
    const hadPortal = this.trace && this.trace.segments.some(s => s.portalJump);
    const res = trace(this.level);
    this.trace = res;

    const hasPortal = res.segments.some(s => s.portalJump);
    if (hasPortal && !hadPortal && !this.demoMode && this.settings.sound) this.sound.portal();

    const hitSet = new Set();
    const portalIds = new Set();
    for (const seg of res.segments) {
      if (seg.portalJump) {
        hitSet.add(`${seg.fromX},${seg.fromY}`);
        hitSet.add(`${seg.toX},${seg.toY}`);
        portalIds.add(this.level.cells[seg.fromY][seg.fromX]);
        portalIds.add(this.level.cells[seg.toY][seg.toX]);
        continue;
      }
      hitSet.add(`${seg.x1},${seg.y1}`);
      if (seg.endFrac === undefined || seg.endFrac === 1 || seg.spark) {
        hitSet.add(`${seg.x2},${seg.y2}`);
      }
    }
    this.hitCells = hitSet;
    this.activePortalIds = portalIds;

    this.satisfied = new Set();
    let awardOffset = 0;
    for (const t of this.level.targets) {
      const key = `${t.x},${t.y}`;
      const col = res.targetColors[key];
      if (!res.litSet.has(key)) continue;
      if (t.need && col !== t.need) continue;
      this.satisfied.add(key);
      if (!this.awarded.has(key)) {
        this.awarded.add(key);
        this.litAt.set(key, this.time);
        this.awakenCount++;
        this.awakenFx(t, col || 'white', awardOffset);
        awardOffset++;
        this.events.emit('awaken', { levelId: this.def.id, type: t.type });
      }
    }

    const allSatisfied =
      this.level.targets.length > 0 &&
      this.level.targets.every(t => this.satisfied.has(`${t.x},${t.y}`));

    if (allSatisfied && !this.won) {
      this.won = true;
      this.winTimer = 0;
      this.winFrames = 0;
      this.slowmo = 0.55;
      this.renderer.triggerBloom(1.4);
      this.auroraIntensity = 1.8;
      if (this.settings.motion && !this.demoMode) {
        const layNow = this.renderer.layout(this.level);
        const pts = this.level.targets.map(t => center(layNow, t.x, t.y));
        pts.forEach((p2, i) => {
          setTimeout(() => {
            this.particles.spawnRing(p2.cx, p2.cy, colorOf('white'));
            this.particles.spawnBurst(p2.cx, p2.cy, '#ffe9b8', 8);
          }, i * 120);
        });
      }
      if (!this.demoMode) {
        this.events.emit('win', {
          id: this.def.id,
          moves: this.moves,
          par: this.def.par,
          stars: this.starsFor(),
          hints: this.hintsUsed,
          daily: this.dailyInfo
        });
      }
    }
  }

  awakenFx(t, color, awardOffset) {
    const lay = this.renderer.layout(this.level);
    const p = center(lay, t.x, t.y);
    const col = colorOf(color);
    if (this.settings.motion) {
      this.particles.spawnRing(p.cx, p.cy, col);
      this.particles.spawnRays(p.cx, p.cy, col);
      this.particles.spawnMotes(p.cx, p.cy, 5);
      if (t.type === 'tree' || t.type === 'flower') {
        this.particles.spawnLeaves(p.cx, p.cy, t.type === 'tree' ? 14 : 8);
      } else {
        this.particles.spawnBurst(p.cx, p.cy, col, 12);
      }
      this.renderer.triggerBloom(0.7);
      this.auroraIntensity = Math.min(1.6, this.auroraIntensity + 0.18);
    }
    if (!this.demoMode) {
      this.sound.light(Math.max(0, Math.min(this.awakenCount - 1 + awardOffset, 7)));
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
    this.spins.set(`${r.x},${r.y}`, { from: 0, to: Math.PI, start: this.time });
    this.moves++;
    this.hintIdx = -1;
    this.retrace();
    if (this.settings.sound) this.sound.rotate();
    this.events.emit('move', { id: this.def.id, moves: this.moves });
    this.lastActionAt = this.time;
    this.nudged = false;
    return true;
  }

  undo() {
    if (this.won || this.undoStack.length === 0) return false;
    const prev = this.undoStack.pop();
    applyOrients(this.level, prev);
    this.retrace();
    if (this.settings.sound) this.sound.click();
    this.events.emit('undo', { id: this.def.id });
    return true;
  }

  resetLevel() {
    if (!this.level) return;
    restoreInitial(this.level);
    this.moves = 0;
    this.undoStack = [];
    this.hintIdx = -1;
    this.won = false;
    this.winTimer = 0;
    this.winFrames = 0;
    this.winUiDone = false;
    this.awakenCount = 0;
    this.spins.clear();
    this.litAt.clear();
    this.satisfied.clear();
    this.awarded.clear();
    this.retrace();
    if (this.settings.sound) this.sound.click();
    this.events.emit('reset', { id: this.def.id });
  }

  requestHint() {
    if (this.won || !this.level) return false;
    const cur = this.level.rotatables.map(r => r.orient);
    const hint = hintMove(this.level, cur);
    if (hint) {
      this.hintIdx = hint.idx;
      this.hintTimer = 3;
      this.hintsUsed++;
      if (this.settings.sound) this.sound.click();
      this.events.emit('hint', { id: this.def.id, count: this.hintsUsed });
      return true;
    }
    if (this.settings.sound) this.sound.deny();
    return false;
  }

  starsFor() {
    let stars = this.moves <= this.def.par ? 3 : this.moves <= this.def.par * 2 ? 2 : 1;
    if (this.hintsUsed > 0) stars = Math.min(stars, getConfig().hintPenaltyCapStars ?? 2);
    return stars;
  }

  update(dt) {
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      dt *= 0.35;
    }
    this.time += dt;
    if (this.beamReveal < 1) {
      this.beamReveal = Math.min(1, this.beamReveal + dt * 1.6);
      if (this.level && this.settings.motion && this.level.emitters[0] && Math.random() < 0.5) {
        const lay = this.renderer.layout(this.level);
        const ec = center(lay, this.level.emitters[0].x, this.level.emitters[0].y);
        this.particles.spawnConverge(ec.cx, ec.cy, '#ffe9b8');
      }
    }
    this.auroraIntensity = Math.max(0.5, this.auroraIntensity - dt * 0.08);
    this.particles.update(dt);
    this.renderer.bloom.update(dt);

    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hintIdx = -1;
    }

    for (const [key, sp] of this.spins) {
      const elapsed = this.time - sp.start;
      if (elapsed >= SPIN_DURATION) {
        this.spins.delete(key);
      }
    }

    if (this.demoMode && this.level) {
      this.demoTimer -= dt;
      if (this.demoTimer <= 0 && this.level.rotatables.length > 0) {
        this.demoTimer = 2.2;
        const r = this.level.rotatables[Math.floor(Math.random() * this.level.rotatables.length)];
        r.orient ^= 1;
        this.spins.set(`${r.x},${r.y}`, { from: 0, to: Math.PI, start: this.time });
        this.retrace();
      }
    }

    if (this.won) {
      this.winTimer += dt;
      this.winFrames++;
      if (!this.demoMode && !this.winUiDone && this.winFrames >= 50) {
        this.winUiDone = true;
        this.events.emit('winUi', this);
      }
      if (this.settings.motion && this.winTimer < 1.6 && Math.random() < 0.12) {
        const t = this.level.targets[Math.floor(Math.random() * this.level.targets.length)];
        const lay = this.renderer.layout(this.level);
        const c = center(lay, t.x, t.y);
        this.particles.spawnLeaves(c.cx, c.cy, 3);
      }
    }

    if (
      !this.demoMode && this.level && !this.won &&
      getConfig().tipsEnabled &&
      this.time - this.lastActionAt > 25 && !this.nudged
    ) {
      this.nudged = true;
      this.events.emit('idleNudge', { id: this.def.id });
    }

    if (this.settings.sound) {
      this.sound.maybeBird(dt, this.satisfied.size > 0);
    }
  }

  spinAngleOf(ro) {
    const sp = this.spins.get(`${ro.x},${ro.y}`);
    if (!sp) return null;
    return easeOutCubic(Math.min(1, (this.time - sp.start) / SPIN_DURATION)) * (sp.to - sp.from);
  }

  render() {
    if (!this.level) {
      this.renderer.clear();
      this.renderer.drawIdleBackdrop();
      return;
    }
    this.renderer.drawScene({
      level: this.level,
      trace: this.trace,
      time: this.time,
      seed: this.seed,
      settings: this.settings,
      litAt: this.litAt,
      satisfied: this.satisfied,
      hitCells: this.hitCells,
      activePortalIds: this.activePortalIds,
      hintIdx: this.hintIdx,
      beamReveal: this.beamReveal,
      auroraIntensity: this.auroraIntensity,
      particles: this.particles,
      onSpore: (x, y) => {
        if (this.settings.motion) this.particles.spawnSpore(x, y);
      },
      spinAngleOf: ro => this.spinAngleOf(ro)
    });

    if (this.won && !this.demoMode) {
      const ctx = this.renderer.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 * Math.max(0, 1 - this.winTimer / 2.4);
      ctx.translate(this.renderer.W / 2, this.renderer.H / 2);
      ctx.fillStyle = radialGradient(ctx, this.renderer.W * 0.7, 'rgba(255,240,190,0.9)', 'rgba(255,240,190,0)');
      ctx.fillRect(-this.renderer.W / 2, -this.renderer.H / 2, this.renderer.W, this.renderer.H);
      ctx.restore();
    }

    this.renderer.applyBloom(this.canvas);
  }

  pointerDown(px, py) {
    if (this.state !== 'playing') return;
    const moved = this.rotateAt(px, py);
    if (!moved && this.level) {
      const lay = this.renderer.layout(this.level);
      const x = Math.floor((px - lay.ox) / lay.cell);
      const y = Math.floor((py - lay.oy) / lay.cell);
      if (x >= 0 && y >= 0 && x < this.level.w && y < this.level.h) {
        const ch = this.level.cells[y][x];
        if (ch !== '.' && ch !== '#' && this.settings.sound) this.sound.deny();
      }
    }
  }
}

function center(lay, x, y) {
  return {
    cx: lay.ox + x * lay.cell + lay.cell / 2,
    cy: lay.oy + y * lay.cell + lay.cell / 2
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
