import { loadForestMusic } from './music.js';

// Ilyndrel's original instrumental score and synthesized game cues.
// Context creation/resume happens exclusively in activate(), from a trusted UI event.
const ACTIVATION_EVENTS = new Set(['pointerdown', 'pointerup', 'click', 'keydown', 'change']);

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.visible = true;
    this.ambientWanted = false;
    this.ambientNodes = null;
    this.musicBuffer = null;
    this.musicStatus = 'idle';
    this._musicLoad = null;
    this._musicRetryAt = 0;
    this._musicOffset = 0;
    this.birdTimer = 14;
    this._activation = null;
    this._pending = [];
    this._transients = new Set();
  }

  ensure() {
    return !!(this.enabled && this.visible && this.ctx?.state === 'running' && this.master);
  }

  activate(event) {
    if (!event?.isTrusted || !ACTIVATION_EVENTS.has(event.type) || !this.enabled || !this.visible) return Promise.resolve(false);
    // Touch pointerdown may precede browser activation; pointerup/click retries.
    if (globalThis.navigator?.userActivation?.isActive === false) return Promise.resolve(false);
    if (this._activation) return this._activation;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        this._stopAmbientNodes(); this._stopTransients();
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return Promise.resolve(false);
        this.ctx = new Context();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this._applyGain();
      }
      if (this.ctx.state === 'running') {
        this._startAmbientNodes();
        return Promise.resolve(true);
      }
      // Call resume synchronously while the activation event is on the stack.
      const resumed = this.ctx.resume();
      this._activation = Promise.resolve(resumed).then(() => {
        if (!this.ensure()) { this._pending.length = 0; return false; }
        this._applyGain();
        this._startAmbientNodes();
        const pending = this._pending.splice(0);
        for (const item of pending) if (Date.now() - item.at < 500) item.play();
        return true;
      }).catch(() => { this._pending.length = 0; return false; })
        .finally(() => { this._activation = null; });
      return this._activation;
    } catch {
      this._pending.length = 0;
      return Promise.resolve(false);
    }
  }

  _applyGain() {
    if (this.master) this.master.gain.value = this.enabled && this.visible ? 0.62 : 0;
  }

  setEnabled(on) {
    this.enabled = !!on;
    this._applyGain();
    if (!this.enabled) { this._pending.length = 0; this._stopAmbientNodes(); this._stopTransients(); }
    else this._startAmbientNodes();
  }

  setPageVisible(visible) {
    this.visible = !!visible;
    this._applyGain();
    if (!this.visible) {
      this._pending.length = 0;
      this._stopAmbientNodes(); this._stopTransients();
      if (this.ctx?.state === 'running') {
        try { Promise.resolve(this.ctx.suspend()).catch(() => {}); } catch { /* optional audio */ }
      }
    } else this._startAmbientNodes();
  }

  _play(callback) {
    if (!this.enabled || !this.visible) return;
    if (this.ensure()) callback();
    else if (this._activation && this._pending.length < 24) this._pending.push({ at: Date.now(), play: callback });
  }

  _track(source, nodes) {
    const item = { source, nodes };
    this._transients.add(item);
    source.onended = () => {
      for (const node of nodes) { try { node.disconnect(); } catch { /* already released */ } }
      this._transients.delete(item);
    };
  }

  _stopTransients() {
    for (const item of this._transients) {
      try { item.source.stop(); } catch { /* already ended */ }
      for (const node of item.nodes) { try { node.disconnect(); } catch { /* already released */ } }
    }
    this._transients.clear();
  }

  tone(freq, duration, type = 'sine', volume = 0.18, delay = 0, glideTo) {
    this._play(() => {
      const ctx = this.ctx, time = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, time);
      if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, time + duration);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      oscillator.connect(gain).connect(this.master);
      this._track(oscillator, [oscillator, gain]);
      oscillator.start(time); oscillator.stop(time + duration + 0.025);
    });
  }

  noise(duration, volume, from, to) {
    this._play(() => {
      const ctx = this.ctx, time = ctx.currentTime;
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      source.buffer = buffer;
      filter.type = 'bandpass'; filter.frequency.setValueAtTime(from, time);
      filter.frequency.exponentialRampToValueAtTime(to, time + duration);
      gain.gain.setValueAtTime(volume, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      source.connect(filter).connect(gain).connect(this.master);
      this._track(source, [source, filter, gain]);
      source.start(time); source.stop(time + duration);
    });
  }

  click() { this.tone(620, 0.09, 'triangle', 0.12, 0, 510); }
  rotate() { this.tone(370, 0.14, 'sine', 0.24, 0, 493); this.noise(0.07, 0.045, 1250, 720); }
  deny() { this.tone(185, 0.18, 'triangle', 0.16, 0, 155); }
  portal() { this.tone(220, 0.4, 'sine', 0.13, 0, 660); this.noise(0.25, 0.035, 420, 1400); }
  light(index) {
    const notes = [294, 392, 440, 587, 660];
    const base = notes[Math.max(0, Math.min(notes.length - 1, Math.floor(index)))];
    this.tone(base, 0.55, 'sine', 0.22);
    this.tone(base * 2, 0.32, 'sine', 0.055, 0.035);
  }
  win() {
    [392, 588, 784].forEach((frequency, i) => this.tone(frequency, 0.8, 'sine', 0.13, i * 0.17));
    this.tone(196, 1.3, 'triangle', 0.055, 0.05);
  }

  startAmbient() { this.ambientWanted = true; this._startAmbientNodes(); }

  _startAmbientNodes() {
    if (!this.ambientWanted || this.ambientNodes || !this.ensure()) return;
    if (!this.musicBuffer) { void this._loadMusic(); return; }
    const ctx = this.ctx, gain = ctx.createGain(), source = ctx.createBufferSource();
    source.buffer = this.musicBuffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = this.musicBuffer.duration;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.6);
    source.connect(gain).connect(this.master);
    const offset = this._musicOffset % this.musicBuffer.duration;
    this.ambientNodes = { source, gain, startedAt: ctx.currentTime, offset, sources: [source], nodes: [source, gain] };
    source.start(ctx.currentTime, offset);
    this.musicStatus = 'playing';
  }

  _loadMusic() {
    if (this._musicLoad || Date.now() < this._musicRetryAt) return this._musicLoad;
    this.musicStatus = 'loading';
    this._musicLoad = loadForestMusic(this.ctx).then(buffer => {
      this.musicBuffer = buffer;
      this.musicStatus = 'ready';
      // A fetch may finish after mute, tab hiding, or leaving a scene. The
      // current scene and activation guards are checked again before starting.
      this._startAmbientNodes();
      return true;
    }).catch(() => {
      this.musicStatus = 'unavailable';
      this._musicRetryAt = Date.now() + 10000;
      return false; // Music is optional; a network error cannot break game cues.
    }).finally(() => { this._musicLoad = null; });
    return this._musicLoad;
  }

  _stopAmbientNodes() {
    if (!this.ambientNodes) return;
    if (this.musicBuffer && this.ctx) {
      const elapsed = Math.max(0, this.ctx.currentTime - this.ambientNodes.startedAt);
      this._musicOffset = (this.ambientNodes.offset + elapsed) % this.musicBuffer.duration;
    }
    for (const node of this.ambientNodes.sources) { try { node.stop(); } catch { /* already stopped */ } }
    for (const node of this.ambientNodes.nodes) { try { node.disconnect(); } catch { /* already released */ } }
    this.ambientNodes = null;
    this.musicStatus = 'paused';
  }

  stopAmbient() { this.ambientWanted = false; this._stopAmbientNodes(); }

  maybeBird(dt, anyLit) {
    if (!anyLit || !this.ensure() || !this.ambientWanted) return;
    this.birdTimer -= dt;
    if (this.birdTimer > 0) return;
    this.birdTimer = 20 + Math.random() * 12;
    const frequency = 1300 + Math.random() * 450;
    this.tone(frequency, 0.13, 'sine', 0.012, 0, frequency * 1.15);
    this.tone(frequency * 1.1, 0.16, 'sine', 0.009, 0.2, frequency * 0.9);
  }
}
