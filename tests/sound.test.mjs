import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../src/fx/sound.js';
import { MUSIC_DURATION } from '../src/fx/music.js';

const gesture = type => ({ isTrusted: true, type });
function audioMock(t, { pending = false, failResume = false, pendingMusic = false, failMusic = false } = {}) {
  const contexts = [];
  const prior = globalThis.AudioContext, priorFetch = globalThis.fetch;
  contexts.musicFetches = 0;
  globalThis.fetch = async () => {
    contexts.musicFetches++;
    if (failMusic) throw new Error('offline');
    return { ok: true, headers: new Headers({ 'content-length': '9216044' }), arrayBuffer: async () => new ArrayBuffer(9216044) };
  };
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.nodes = []; this.resumes = 0; contexts.push(this); }
    node(kind) {
      const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
      const n = { kind, gain: param(), frequency: param(), started: false, stopped: false, disconnected: false,
        connect(next) { return next; }, disconnect() { this.disconnected = true; },
        start(when = 0, offset = 0) { this.started = true; this.when = when; this.offset = offset; }, stop() { this.stopped = true; } };
      this.nodes.push(n); return n;
    }
    createGain() { return this.node('gain'); }
    createOscillator() { return this.node('oscillator'); }
    createBiquadFilter() { return this.node('filter'); }
    createBufferSource() { return this.node('buffer'); }
    createBuffer(_channels, len) { return { getChannelData: () => new Float32Array(len) }; }
    decodeAudioData() {
      const buffer = { duration: MUSIC_DURATION, numberOfChannels: 2, sampleRate: this.sampleRate };
      if (pendingMusic) return new Promise(resolve => { this.finishMusic = () => resolve(buffer); });
      return Promise.resolve(buffer);
    }
    resume() {
      this.resumes++;
      if (failResume) return Promise.reject(new Error('blocked'));
      if (pending) return new Promise(resolve => { this.finishResume = () => { this.state = 'running'; resolve(); }; });
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  globalThis.AudioContext = Context;
  t.after(() => {
    if (prior === undefined) delete globalThis.AudioContext; else globalThis.AudioContext = prior;
    if (priorFetch === undefined) delete globalThis.fetch; else globalThis.fetch = priorFetch;
  });
  return contexts;
}

test('audio never creates or resumes a context before a trusted interaction', async t => {
  const contexts = audioMock(t), sound = new Sound();
  sound.startAmbient(); sound.rotate(); sound.setEnabled(true); sound.ensure();
  assert.equal(contexts.length, 0);
  assert.equal(contexts.musicFetches, 0, 'no music download before activation');
  assert.equal(await sound.activate({ type: 'click', isTrusted: false }), false);
  assert.equal(contexts.length, 0);
  assert.equal(await sound.activate(gesture('keydown')), true);
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].resumes, 1);
  await sound._musicLoad;
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

test('muting stops graphs immediately; enabling resumes the same score position', async t => {
  const contexts = audioMock(t), sound = new Sound();
  await sound.activate(gesture('click'));
  sound.startAmbient(); await sound._musicLoad; const ambient = sound.ambientNodes;
  contexts[0].currentTime = 19.25;
  sound.setEnabled(false);
  assert.equal(sound.master.gain.value, 0);
  assert.equal(sound.ambientNodes, null);
  const count = contexts[0].nodes.length;
  sound.light(1); sound.rotate();
  assert.equal(contexts[0].nodes.length, count, 'muted cues allocate no nodes');
  sound.setEnabled(true);
  assert.ok(sound.ambientNodes && sound.ambientNodes !== ambient);
  assert.equal(sound.ambientNodes.source.offset, 19.25);
  assert.equal(contexts.musicFetches, 1, 'decoded score is reused');
  assert.ok(sound.master.gain.value > 0);
});

test('exit cancels pending ambience and repeat level starts do not duplicate it', async t => {
  const contexts = audioMock(t, { pending: true }), sound = new Sound();
  sound.startAmbient();
  const activation = sound.activate(gesture('click'));
  sound.stopAmbient();
  contexts[0].finishResume(); await activation;
  assert.equal(sound.ambientNodes, null, 'no delayed ambience after leaving');
  sound.startAmbient(); await sound._musicLoad; const first = sound.ambientNodes;
  sound.startAmbient(); assert.equal(sound.ambientNodes, first);
  sound.stopAmbient(); assert.equal(sound.ambientNodes, null);
  assert.ok(contexts[0].nodes.filter(n => n.kind === 'buffer').every(n => n.stopped && n.disconnected));
});

test('hidden page silences and suspends; next interaction restores the active scene', async t => {
  const contexts = audioMock(t), sound = new Sound();
  await sound.activate(gesture('click')); sound.startAmbient();
  await sound._musicLoad;
  contexts[0].currentTime = MUSIC_DURATION + 1.5;
  sound.setPageVisible(false);
  assert.equal(sound.master.gain.value, 0);
  assert.equal(sound.ambientNodes, null);
  assert.equal(contexts[0].state, 'suspended');
  sound.setPageVisible(true); sound.rotate();
  assert.equal(contexts[0].resumes, 1, 'visibility alone never requests autoplay');
  await sound.activate(gesture('pointerup'));
  assert.equal(contexts[0].resumes, 2);
  assert.ok(sound.ambientNodes);
  assert.equal(sound.ambientNodes.source.offset, 1.5, 'hidden music resumes within its loop');
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
  await sound._musicLoad;
  assert.equal(contexts[0].state, 'running');
  assert.ok(sound.ambientNodes);
});

test('score loops with a single source across repeated scene and activation calls', async t => {
  const contexts = audioMock(t), sound = new Sound();
  sound.startAmbient(); await sound.activate(gesture('click')); await sound._musicLoad;
  const first = sound.ambientNodes;
  assert.equal(first.source.loop, true);
  assert.equal(first.source.loopStart, 0);
  assert.equal(first.source.loopEnd, MUSIC_DURATION);
  contexts[0].currentTime = 30;
  sound.startAmbient(); sound.setPageVisible(true); await sound.activate(gesture('keydown'));
  assert.equal(sound.ambientNodes, first, 'title, map and level transitions do not restart playback');
  assert.equal(contexts[0].nodes.filter(n => n.kind === 'buffer' && n.started).length, 1);
});

test('music finishing its download while muted or hidden cannot start late', async t => {
  const contexts = audioMock(t, { pendingMusic: true }), sound = new Sound();
  sound.startAmbient(); await sound.activate(gesture('click'));
  await new Promise(resolve => setImmediate(resolve));
  sound.startAmbient(); await sound.activate(gesture('keydown'));
  assert.equal(contexts.musicFetches, 1);
  sound.setEnabled(false); sound.setPageVisible(false);
  contexts[0].finishMusic(); await sound._musicLoad;
  assert.equal(sound.ambientNodes, null);
  assert.equal(sound.musicStatus, 'ready');
  sound.setEnabled(true); sound.setPageVisible(true);
  assert.equal(sound.ambientNodes, null, 'visibility does not bypass activation');
  await sound.activate(gesture('click'));
  assert.ok(sound.ambientNodes);
});

test('failed music loading leaves cues usable and throttles later retries', async t => {
  const contexts = audioMock(t, { failMusic: true }), sound = new Sound();
  sound.startAmbient(); await sound.activate(gesture('click')); await sound._musicLoad;
  assert.equal(sound.musicStatus, 'unavailable');
  assert.equal(sound.ambientNodes, null);
  sound.rotate();
  assert.ok(contexts[0].nodes.some(n => n.kind === 'oscillator' && n.started));
  await sound.activate(gesture('click')); sound.startAmbient();
  assert.equal(contexts.musicFetches, 1, 'every click does not hammer a missing file');
  sound._musicRetryAt = 0;
  await sound.activate(gesture('click')); await sound._musicLoad;
  assert.equal(contexts.musicFetches, 2, 'later trusted interaction can recover loading');
});

test('closed audio context replacement retains a decoded score without duplicate graphs', async t => {
  const contexts = audioMock(t), sound = new Sound();
  sound.startAmbient(); await sound.activate(gesture('click')); await sound._musicLoad;
  const old = sound.ambientNodes;
  contexts[0].currentTime = 11;
  contexts[0].state = 'closed';
  await sound.activate(gesture('click'));
  assert.equal(contexts.length, 2);
  assert.equal(contexts.musicFetches, 1);
  assert.ok(old.sources.every(node => node.stopped && node.disconnected));
  assert.equal(sound.ambientNodes.source.offset, 11);
});
