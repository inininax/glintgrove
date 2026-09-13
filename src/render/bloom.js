// Event-only light diffusion, authored 2026-09-13 with native Canvas operations.
export class Bloom {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
    this.enabled = true;
    this.pulse = 0;
    this.baseStrength = 0;
  }

  ensure(width, height) {
    const w = Math.max(1, Math.ceil(width / 6));
    const h = Math.max(1, Math.ceil(height / 6));
    if (this.canvas && this.w === w && this.h === h) return;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w = w;
    this.canvas.height = this.h = h;
    this.ctx = this.canvas.getContext('2d');
  }

  trigger(amount = 1) { this.pulse = Math.min(1.5, this.pulse + Math.max(0, amount)); }
  update(dt) { this.pulse = Math.max(0, this.pulse - Math.max(0, dt) * 1.8); }

  composite(ctx, source) {
    if (!this.enabled) { this.pulse = 0; return; }
    if (this.pulse < .002) return;
    this.ensure(source.width, source.height);
    const soft = this.ctx;
    soft.clearRect(0, 0, this.w, this.h);
    soft.globalAlpha = 1;
    soft.imageSmoothingEnabled = true;
    soft.drawImage(source, 0, 0, this.w, this.h);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(.022, this.pulse * .018);
    ctx.imageSmoothingEnabled = true;
    // Two slightly displaced soft copies widen only the short event afterglow.
    ctx.drawImage(this.canvas, -3, -2, source.width + 6, source.height + 4);
    ctx.drawImage(this.canvas, 2, 1, source.width - 4, source.height - 2);
    ctx.restore();
  }
}
