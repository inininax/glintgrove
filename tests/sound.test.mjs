import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/fx/sound.js';

const gesture = type => ({ isTrusted: true, type });
function audioMock(t, { pending = false, failResume = false } = {}) {
  const contexts = [];
  const prior = globalThis.AudioContext;
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.nodes = []; this.resumes = 0; contexts.push(this); }
    node(kind) {
      const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
      const n = { kind, gain: param(), frequency: param(), started: false, stopped: false, disconnected: false,
        connect(next) { return next; }, disconnect() { this.disconnected = true; },
        start() { this.started = true; }, stop() { this.stopped = true; } };
      this.nodes.push(n); return n;
    }
    createGain() { return this.node('gain'); }
    createOscillator() { return this.node('oscillator'); }
    createBiquadFilter() { return this.node('filter'); }
    createBufferSource() { return this.node('buffer'); }
    createBuffer(_channels, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() {
      this.resumes++;
      if (failResume) return Promise.reject(new Error('blocked'));
      if (pending) return new Promise(resolve => { this.finishResume = () => { this.state = 'running'; resolve(); }; });
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  globalThis.AudioContext = Context;
  t.after(() => { if (prior === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = prior; });
  return contexts;
}

test('audio never creates or resumes a context before a trusted interaction', async t => {
  const contexts = audioMock(t), sound = new Sound();
  sound.startAmbient(); sound.rotate(); sound.setEnabled(true); sound.ensure();
  assert.equal(contexts.length, 0);
  assert.equal(await sound.activate({ type: 'click', isTrusted: false }), false);
  assert.equal(contexts.length, 0);
  assert.equal(await sound.activate(gesture('keydown')), true);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumes, 1);
  assert.ok(sound.ambientNodes, 'pending level ambience starts after activation');
});

test('suspended first interaction resumes once and plays its cue after resume', async t => {
  const contexts = audioMock(t, { pending: true }), sound = new Sound();
  const first = sound.activate(gesture('pointerdown'));
  sound.rotate();
  const second = sound.activate(gesture('click'));
  assert.equal(contexts[0].resumes, 1);
  assert.equal(contexts[0].nodes.filter(n => n.kind === 'oscillator').length, 0);
  contexts[0].finishResume();
  assert.equal(await first, true); assert.equal(await second, true);
  assert.ok(contexts[0].nodes.some(n => n.kind === 'oscillator' && n.started));
});

test('muting stops graphs immediately; enabling restores current level ambience', async t => {
  const contexts = audioMock(t), sound = new Sound();
  await sound.activate(gesture('click'));
  sound.startAmbient(); const ambient = sound.ambientNodes;
  sound.setEnabled(false);
  assert.equal(sound.master.gain.value, 0);
  assert.equal(sound.ambientNodes, null);
  const count = contexts[0].nodes.length;
  sound.light(1); sound.rotate();
  assert.equal(contexts[0].nodes.length, count, 'muted cues allocate no nodes');
  sound.setEnabled(true);
  assert.ok(sound.ambientNodes && sound.ambientNodes !== ambient);
  assert.ok(sound.master.gain.value > 0);
});

test('exit cancels pending ambience and repeat level starts do not duplicate it', async t => {
  const contexts = audioMock(t, { pending: true }), sound = new Sound();
  sound.startAmbient();
  const activation = sound.activate(gesture('click'));
  sound.stopAmbient();
  contexts[0].finishResume(); await activation;
  assert.equal(sound.ambientNodes, null, 'no delayed ambience after leaving');
  sound.startAmbient(); const first = sound.ambientNodes;
  sound.startAmbient(); assert.equal(sound.ambientNodes, first);
  sound.stopAmbient(); assert.equal(sound.ambientNodes, null);
  assert.ok(contexts[0].nodes.filter(n => n.kind === 'oscillator').every(n => n.stopped && n.disconnected));
});

test('hidden page silences and suspends; next interaction restores the active scene', async t => {
  const contexts = audioMock(t), sound = new Sound();
  await sound.activate(gesture('click')); sound.startAmbient();
  sound.setPageVisible(false);
  assert.equal(sound.master.gain.value, 0);
  assert.equal(sound.ambientNodes, null);
  assert.equal(contexts[0].state, 'suspended');
  sound.setPageVisible(true); sound.rotate();
  assert.equal(contexts[0].resumes, 1, 'visibility alone never requests autoplay');
  await sound.activate(gesture('pointerup'));
  assert.equal(contexts[0].resumes, 2);
  assert.ok(sound.ambientNodes);
});

test('rejected audio resume is contained and stale cues are not emitted', async t => {
  const contexts = audioMock(t, { failResume: true }), sound = new Sound();
  const activation = sound.activate(gesture('click')); sound.click();
  assert.equal(await activation, false);
  assert.equal(contexts[0].nodes.filter(n => n.kind === 'oscillator').length, 0);
  assert.equal(sound.ambientNodes, null);
});

test('sound can first activate when switched on inside an already opened level', async t => {
  const contexts = audioMock(t), sound = new Sound();
  sound.setEnabled(false); sound.startAmbient();
  assert.equal(await sound.activate(gesture('pointerdown')), false);
  assert.equal(contexts.length, 0);
  sound.setEnabled(true);
  assert.equal(await sound.activate(gesture('change')), true);
  assert.equal(contexts[0].state, 'running');
  assert.ok(sound.ambientNodes);
});
