import { buildBackground, bakeBoard, drawAurora } from './background.js';
import { Bloom } from './bloom.js';
import { computeLayout } from './layout.js';
import { drawBeams, drawPortalLinks } from './beams.js';
import * as E from './entities.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = null;
    this.bgKey = '';
    this.W = 0;
    this.H = 0;
    this.bloom = new Bloom();
    this.bloomEnabled = true;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.W = Math.max(320, Math.floor(rect.width));
    this.H = Math.max(240, Math.floor(rect.height));
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bg = null;
  }

  layout(level) {
    return computeLayout(level, this.W, this.H);
  }

  invalidateBackground() {
    this.bg = null;
  }

  ensureBackground(level, seed) {
    const key = `${level.id}_${seed}_${this.W}x${this.H}`;
    if (this.bg && this.bgKey === key) return;
    const bg = buildBackground(this.W, this.H, level, seed);
    bakeBoard(bg.canvas.getContext('2d'), level, this.layout(level));
    this.bgCanvas = bg.canvas;
    this.bg = true;
    this.bgKey = key;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.W, this.H);
  }

  setQuality(high) {
    this.bloom.enabled = high;
  }

  triggerBloom(amount = 0.8) {
    if (this.bloomEnabled) this.bloom.trigger(amount);
  }

  drawIdleBackdrop() {
    this.ctx.fillStyle = '#0a1420';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  drawScene(scene) {
    const ctx = this.ctx;
    const { level, trace, time, settings, litAt, hintIdx, spinAngleOf } = scene;

    this.ensureBackground(level, scene.seed);
    ctx.drawImage(this.bgCanvas, 0, 0);
    const lay = this.layout(level);

    ctx.save();
    ctx.beginPath();
    ctx.rect(lay.ox - lay.cell, lay.oy - lay.cell, lay.cell * (level.w + 2), lay.cell * (level.h + 2));
    ctx.clip();

    drawAurora(ctx, this.W, this.H, time, scene.auroraIntensity ?? 0.5);

    if (trace) drawPortalLinks(ctx, trace, lay, time);
    if (trace) drawBeams(ctx, trace, lay, time, {
      colorblind: settings.colorblind,
      reducedMotion: !settings.motion,
      reveal: scene.beamReveal ?? 1
    });

    for (const id in level.portals) {
      E.drawPortal(ctx, id, level.portals[id], lay, time, scene.activePortalIds);
    }

    for (const e of level.emitters) {
      E.drawEmitter(ctx, e, lay, time, scene.hitCells.size > 0);
    }

    for (const ro of level.rotatables) {
      const spin = spinAngleOf(ro);
      if (ro.kind === 'splitter') E.drawSplitter(ctx, ro, lay, time, scene.hitCells, spin);
      else E.drawMirror(ctx, ro, lay, time, scene.hitCells, spin);
    }

    for (const t of level.targets) {
      const key = `${t.x},${t.y}`;
      const litAtTime = litAt.get(key);
      if (t.type === 'tree') E.drawTree(ctx, t, litAtTime, time, lay);
      else if (t.type === 'flower') E.drawFlower(ctx, t, litAtTime, time, lay);
      else if (t.type === 'mushroom') E.drawMushroom(ctx, t, litAtTime, time, lay, scene.onSpore);
      else E.drawOwl(ctx, t, litAtTime, time, lay);
      if (!scene.satisfied.has(key)) E.drawNeedBadge(ctx, t, lay);
    }

    for (const c of level.crystals) {
      E.drawCrystal(ctx, c.color, c.x, c.y, lay, time);
    }

    for (const gate of level.gates) {
      const powered =
        trace &&
        trace.segments.some(
          seg => !seg.portalJump && ((seg.x2 === gate.x && seg.y2 === gate.y) || (seg.x1 === gate.x && seg.y1 === gate.y))
        );
      E.drawGate(ctx, gate, lay, time, powered);
    }

    if (hintIdx >= 0 && level.rotatables[hintIdx]) {
      E.drawHintPulse(ctx, level.rotatables[hintIdx], lay, time);
    }

    scene.particles.draw(ctx);
    ctx.restore();
  }

  applyBloom(mainCanvas) {
    if (!this.bloomEnabled) return;
    this.bloom.composite(this.ctx, mainCanvas);
  }
}
