import { bakeBoard, buildBackground, drawAurora } from './background.js';
import { computeLayout } from './layout.js';
import { Bloom } from './bloom.js';
import { drawBeams, drawPortalLinks } from './beams.js';
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
    const { canvas } = buildBackground(this.W, this.H, level, seed, this.displayMode);
    if (boardVisible) bakeBoard(canvas.getContext('2d'), level, this.layout(level));
    this.bgCanvas = canvas;
    this.bgKey = signature;
    this.bg = true;
  }

  drawIdleBackdrop() {
    this.ensureBackground(AMBIENT, 1, false);
    this.ctx.drawImage(this.bgCanvas, 0, 0);
  }

  drawScene(scene) {
    const { level, settings, trace } = scene;
    this.displayMode = settings.displayMode === 'simple' ? 'simple' : 'sculpted';
    const ctx = this.ctx;
    const screen = globalThis.document?.body?.dataset?.screen;
    this.isGameScene = !screen || screen === 'game';
    const time = settings.motion ? scene.time : 0;
    this.ensureBackground(this.isGameScene ? level : AMBIENT, scene.seed, this.isGameScene);
    ctx.drawImage(this.bgCanvas, 0, 0);
    drawAurora(ctx, this.W, this.H, time, scene.auroraIntensity ?? .5);
    if (!this.isGameScene) return;

    const layout = this.layout(level);
    ctx.save();
    try {
      const gutter = layout.cell;
      ctx.beginPath();
      ctx.rect(layout.ox - gutter, layout.oy - gutter, (level.w + 2) * gutter, (level.h + 2) * gutter);
      ctx.clip();
      if (trace) {
        drawPortalLinks(ctx, trace, layout, time);
        drawBeams(ctx, trace, layout, time, { colorblind: settings.colorblind, reducedMotion: !settings.motion, reveal: scene.beamReveal ?? 1 });
      }
      for (const [id, position] of Object.entries(level.portals)) shapes.drawPortal(ctx, id, position, layout, time, scene.activePortalIds);
      for (const emitter of level.emitters) shapes.drawEmitter(ctx, emitter, layout, time, scene.hitCells.size > 0);
      for (const piece of level.rotatables) {
        const draw = piece.kind === 'splitter' ? shapes.drawSplitter : shapes.drawMirror;
        draw(ctx, piece, layout, time, scene.hitCells, settings.motion ? scene.spinAngleOf(piece) : null);
      }
      for (const target of level.targets) {
        const key = `${target.x},${target.y}`;
        const awake = scene.litAt.has(key);
        const waiting = awake && !scene.satisfied.has(key);
        const litAt = awake && !settings.motion ? -1 : scene.litAt.get(key);
        ctx.save();
        if (waiting) ctx.globalAlpha *= .62;
        const draw = TARGET_DRAW[target.type] || TARGET_DRAW.owl;
        draw(ctx, target, litAt, time, layout, settings.motion ? scene.onSpore : null);
        ctx.restore();
        if (waiting) shapes.drawRestingMarker(ctx, target, layout);
        if (!scene.satisfied.has(key)) shapes.drawNeedBadge(ctx, target, layout);
      }
      for (const crystal of level.crystals) shapes.drawCrystal(ctx, crystal.color, crystal.x, crystal.y, layout, time);
      for (const gate of level.gates) {
        const powered = !!trace?.segments.some(segment => !segment.portalJump && segment.color === gate.needColor &&
          ((segment.x1 === gate.x && segment.y1 === gate.y) || (segment.x2 === gate.x && segment.y2 === gate.y)));
        shapes.drawGate(ctx, gate, layout, time, powered);
      }
      if (scene.hintIdx >= 0 && level.rotatables[scene.hintIdx]) shapes.drawHintPulse(ctx, level.rotatables[scene.hintIdx], layout, time);
      if (settings.motion) scene.particles.draw(ctx);
    } finally {
      ctx.restore();
    }
  }

  applyBloom(canvas) {
    if (this.bloomEnabled && this.isGameScene) this.bloom.composite(this.ctx, canvas);
  }
}
