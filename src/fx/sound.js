export class Sound {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.enabled = true;
      this.ambientNodes = null;
      this.birdTimer = 0;
      this.litCount = 0;
    }

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
      }
      const g = typeof globalThis !== 'undefined' ? globalThis : window;
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.5 : 0;
        this.master.connect(this.ctx.destination);
        return true;
      } catch (e) {
        void e;
        return false;
      }
    }

    setEnabled(on) {
      this.enabled = on;
      if (this.master) this.master.gain.value = on ? 0.5 : 0;
    }

    tone(freq, dur, type, vol, when, glideTo) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime + (when || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol || 0.2, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    noise(dur, vol, freqFrom, freqTo) {
      if (!this.ensure()) return;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(freqFrom, t);
      filt.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filt).connect(gain).connect(this.master);
      src.start(t);
    }

    rotate() { this.tone(340, 0.09, 'triangle', 0.16, 0, 240); this.noise(0.05, 0.08, 1800, 600); }
    deny() { this.tone(140, 0.14, 'square', 0.1); }
    portal() { this.noise(0.3, 0.14, 300, 1600); }
    light(index) {
      const scale = [523.25, 587.33, 659.25, 783.99, 880];
      const base = scale[Math.min(index, scale.length - 1)];
      this.tone(base, 0.5, 'sine', 0.22);
      this.tone(base * 2, 0.35, 'sine', 0.07, 0.02);
      this.tone(base * 1.5, 0.4, 'triangle', 0.05, 0.04);
    }
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => this.tone(n, 0.55, 'sine', 0.2, i * 0.13));
      this.tone(261.63, 1.6, 'triangle', 0.1, 0.1);
      this.tone(392, 1.6, 'triangle', 0.08, 0.15);
      this.noise(0.5, 0.05, 2000, 4000);
    }
    click() { this.tone(520, 0.05, 'square', 0.06); }

    startAmbient() {
      if (!this.ensure() || this.ambientNodes) return;
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      const o1 = ctx.createOscillator();
      o1.type = 'triangle'; o1.frequency.value = 98;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = 98.7;
      o1.connect(filt); o2.connect(filt);
      filt.connect(gain).connect(this.master);
      o1.start(); o2.start();

      const nlen = ctx.sampleRate * 2;
      const nbuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
      const nd = nbuf.getChannelData(0);
      let lastv = 0;
      for (let i = 0; i < nlen; i++) {
        lastv = lastv * 0.97 + Math.random() * 0.06;
        nd[i] = lastv * 2 - 0.5;
      }
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = nbuf; windSrc.loop = true;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.03;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain).connect(windGain.gain);
      windSrc.connect(windGain).connect(this.master);
      windSrc.start(); lfo.start();
      this.ambientNodes = { gain, o1, o2, windSrc, lfo };
    }

    stopAmbient() {
      if (!this.ambientNodes) return;
      try {
        this.ambientNodes.o1.stop();
        this.ambientNodes.o2.stop();
        this.ambientNodes.windSrc.stop();
        this.ambientNodes.lfo.stop();
      } catch (e) { void e; }
      this.ambientNodes = null;
    }

    maybeBird(dt, anyLit) {
      if (!anyLit || !this.enabled || !this.ctx) return;
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.birdTimer = 6 + Math.random() * 9;
        const f = 1400 + Math.random() * 900;
        this.tone(f, 0.12, 'sine', 0.06, 0, f * 1.3);
        this.tone(f * 1.1, 0.1, 'sine', 0.05, 0.18, f * 0.8);
      }
    }
}
