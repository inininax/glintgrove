import { bakeBoard, buildBackground, drawAtmosphere } from './background.js';
import { computeLayout } from './layout.js';
import { Bloom } from './bloom.js';
import { beamFrame, gateIsReached, drawBeams, drawBeamContacts, drawPortalLinks } from './beams.js';
import { TargetContactFx } from './targetFx.js';
import * as shapes from './entities.js';
import { artAssets } from '../assets/assetStore.js';

const TARGET_DRAW = { tree: shapes.drawTree, flower: shapes.drawFlower, mushroom: shapes.drawMushroom, owl: shapes.drawOwl };
const AMBIENT = Object.freeze({ id: 'ambient', chapter: 1 });

// Scene composition rewritten for the 2026-09-13 original-geometry edition.
// Physics and pointer coordinates remain in the engine's logical grid.
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = this.H = 0;
    this.bg = null;
    this.bgKey = '';
    this.displayMode = 'sculpted';
    this.bloom = new Bloom();
    this.bloomEnabled = true;
    this.backgroundTime = 0;
    this.lastBackgroundTime = null;
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.targetFx = new TargetContactFx();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.W = Math.max(320, Math.floor(bounds.width));
    this.H = Math.max(240, Math.floor(bounds.height));
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.invalidateBackground();
  }
  layout(level) { return { ...computeLayout(level, this.W, this.H), displayMode: this.displayMode }; }
  clear() { this.ctx.clearRect(0, 0, this.W, this.H); }
  invalidateBackground() { this.bg = null; }
  setQuality(high) { this.bloom.enabled = high; }
  triggerBloom(amount = .8) { if (this.bloomEnabled) this.bloom.trigger(amount); }

  ensureBackground(level, seed, boardVisible = true) {
    const signature = [level.id, level.chapter, seed, this.W, this.H, artAssets.revision, boardVisible, this.displayMode].join('|');
    if (this.bg && signature === this.bgKey) return;
    const { canvas, atmosphere } = buildBackground(this.W, this.H, level, seed, this.displayMode);
    this.boardCanvas = null;
    if (boardVisible) {
      this.boardCanvas = document.createElement('canvas');
      this.boardCanvas.width = this.W;
      this.boardCanvas.height = this.H;
      bakeBoard(this.boardCanvas.getContext('2d'), level, this.layout(level));
    }
    this.bgCanvas = canvas;
    this.atmosphere = atmosphere;
    this.bgKey = signature;
    this.bg = true;
  }

  advanceBackgroundTime(time, settings) {
    // Keep a separate, continuous clock so switching motion off freezes the
    // current atmosphere rather than snapping to the initial composition.
    const delta = this.lastBackgroundTime === null ? 0 : Math.max(0, Math.min(.1, time - this.lastBackgroundTime));
    this.lastBackgroundTime = time;
    if (settings.motion !== false && !this.reducedMotion?.matches) this.backgroundTime += delta;
  }

  drawBackdrop() {
    this.ctx.drawImage(this.bgCanvas, 0, 0);
    drawAtmosphere(this.ctx, this.W, this.H, this.backgroundTime, this.atmosphere, this.isTitleScene);
    if (this.boardCanvas) this.ctx.drawImage(this.boardCanvas, 0, 0);
  }

  drawIdleBackdrop(time = 0, settings = {}) {
    this.displayMode = settings.displayMode === 'simple' ? 'simple' : 'sculpted';
    this.isGameScene = false;
    this.isTitleScene = !globalThis.document?.body?.dataset?.screen || document.body.dataset.screen === 'title';
    this.advanceBackgroundTime(time, settings);
    this.ensureBackground(AMBIENT, 1, false);
    this.drawBackdrop();
  }

  drawScene(scene) {
    const { level, settings, trace } = scene;
    this.displayMode = settings.displayMode === 'simple' ? 'simple' : 'sculpted';
    const ctx = this.ctx;
    const screen = globalThis.document?.body?.dataset?.screen;
    this.isGameScene = !screen || screen === 'game';
    this.isTitleScene = screen === 'title';
    const motion = settings.motion !== false && !this.reducedMotion?.matches;
    const time = motion ? scene.time : 0;
    this.advanceBackgroundTime(scene.time, settings);
    this.ensureBackground(this.isGameScene ? level : AMBIENT, this.isGameScene ? scene.seed : 1, this.isGameScene);
    this.drawBackdrop();
    if (!this.isGameScene) return;

    const layout = this.layout(level);
    const lightFrame = trace ? beamFrame(trace, level, scene.beamReveal ?? 1, !motion) : null;
    this.targetFx.update(level, lightFrame, scene.time, scene.satisfied, !motion, scene.litAt);
    ctx.save();
    try {
      const gutter = layout.cell;
      ctx.beginPath();
      ctx.rect(layout.ox - gutter, layout.oy - gutter, (level.w + 2) * gutter, (level.h + 2) * gutter);
      ctx.clip();
      if (trace) {
        drawPortalLinks(ctx, trace, layout, time, { frame: lightFrame, reducedMotion: !motion });
        drawBeams(ctx, trace, layout, time, { frame: lightFrame, colorblind: settings.colorblind, reducedMotion: !motion });
      }
      for (const [id, position] of Object.entries(level.portals)) shapes.drawPortal(ctx, id, position, layout, time, scene.activePortalIds);
      for (const emitter of level.emitters) shapes.drawEmitter(ctx, emitter, layout, time, scene.hitCells.size > 0);
      for (const piece of level.rotatables) {
        const draw = piece.kind === 'splitter' ? shapes.drawSplitter : shapes.drawMirror;
        draw(ctx, piece, layout, time, scene.hitCells, motion ? scene.spinAngleOf(piece) : null);
      }
      for (const target of level.targets) {
        const key = `${target.x},${target.y}`;
        const awake = this.targetFx.visualAwakened.has(key);
        const connected = this.targetFx.contacts.get(key)?.correct;
        const waiting = awake && !connected;
        const litAt = awake && !motion ? -1 : this.targetFx.visualAwakened.get(key);
        ctx.save();
        if (waiting) ctx.globalAlpha *= .62;
        const draw = TARGET_DRAW[target.type] || TARGET_DRAW.owl;
        draw(ctx, target, litAt, time, layout, motion ? scene.onSpore : null);
        ctx.restore();
        if (waiting) shapes.drawRestingMarker(ctx, target, layout);
        if (!connected) shapes.drawNeedBadge(ctx, target, layout);
      }
      for (const crystal of level.crystals) shapes.drawCrystal(ctx, crystal.color, crystal.x, crystal.y, layout, time);
      for (const gate of level.gates) {
        const powered = gateIsReached(lightFrame, gate);
        shapes.drawGate(ctx, gate, layout, time, powered);
      }
      if (lightFrame) drawBeamContacts(ctx, lightFrame, layout, { colorblind: settings.colorblind });
      this.targetFx.draw(ctx, layout, scene.time);
      if (scene.hintIdx >= 0 && level.rotatables[scene.hintIdx]) shapes.drawHintPulse(ctx, level.rotatables[scene.hintIdx], layout, time);
      if (motion) {
        const visibleParticles = Object.create(scene.particles);
        visibleParticles.items = this.targetFx.visibleParticles(scene.particles.items, layout, scene.time);
        visibleParticles.draw(ctx);
      }
    } finally {
      ctx.restore();
    }
  }

  applyBloom(canvas) {
    if (this.bloomEnabled && this.isGameScene) this.bloom.composite(this.ctx, canvas);
  }
}
