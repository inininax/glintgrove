export class Bloom {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.w = 0;
    this.h = 0;
    this.enabled = true;
    this.pulse = 0;
    this.baseStrength = 0.5;
  }

  ensure(w, h) {
    const qw = Math.max(1, Math.floor(w / 4));
    const qh = Math.max(1, Math.floor(h / 4));
    if (!this.canvas || this.w !== qw || this.h !== qh) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = qw;
      this.canvas.height = qh;
      this.ctx = this.canvas.getContext('2d');
      this.w = qw;
      this.h = qh;
    }
  }

  trigger(amount = 1) {
    this.pulse = Math.min(1.6, this.pulse + amount);
  }

  update(dt) {
    this.pulse = Math.max(0, this.pulse - dt * 1.4);
  }

  composite(mainCtx, mainCanvas) {
    if (!this.enabled) {
      this.pulse = 0;
      return;
    }
    this.ensure(mainCanvas.width / 4, mainCanvas.height / 4);
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, this.w, this.h);
    g.drawImage(mainCanvas, 0, 0, this.w, this.h);

    g.globalAlpha = 0.35;
    for (let pass = 0; pass < 2; pass++) {
      g.drawImage(this.canvas, 1, 0);
      g.drawImage(this.canvas, -1, 0);
      g.drawImage(this.canvas, 0, 1);
      g.drawImage(this.canvas, 0, -1);
      g.drawImage(this.canvas, 0.5, 0.5);
    }
    g.globalAlpha = 1;

    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.globalAlpha = Math.min(0.85, this.baseStrength + this.pulse * 0.35);
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.drawImage(this.canvas, 0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.restore();
  }
}
