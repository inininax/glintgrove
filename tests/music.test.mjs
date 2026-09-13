import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { MUSIC_DURATION, MUSIC_PATH, loadForestMusic } from '../src/fx/music.js';

const root = new URL('../', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const execute = promisify(execFile);

test('published original score matches its editable source and contains a complete PCM loop', async () => {
  const record = JSON.parse(await readFile(new URL('art/recipes/ancient-forest-v2-music.json', root), 'utf8'));
  const wav = await readFile(new URL(MUSIC_PATH, root));
  assert.equal(sha(wav), record.sha256);
  assert.equal(sha(await readFile(new URL(record.score, root))), record.scoreSha256);
  assert.equal(sha(await readFile(new URL(record.generator, root))), record.generatorSha256);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(wav.readUInt16LE(20), 1, 'uncompressed PCM has no codec delay/padding');
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt16LE(34), 16);
  const rate = wav.readUInt32LE(24), frames = wav.readUInt32LE(40) / 4;
  assert.equal(rate, 24000);
  assert.equal(MUSIC_DURATION, 96);
  assert.equal(frames / rate, MUSIC_DURATION);
  assert.equal(wav.readUInt32LE(4) + 8, wav.length);
  assert.equal(wav.readUInt32LE(40) + 44, wav.length);
  assert.equal(wav.length, 9216044);

  let peak = 0, sum = 0, deltaSum = 0, cross = 0;
  const channelSums = [0, 0], channelEnergy = [0, 0];
  const seam = [], secondEnergy = new Array(MUSIC_DURATION).fill(0);
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) {
    const value = wav.readInt16LE(44 + i * 4 + ch * 2) / 32768;
    const next = wav.readInt16LE(44 + ((i + 1) % frames) * 4 + ch * 2) / 32768;
    peak = Math.max(peak, Math.abs(value)); sum += value * value;
    channelSums[ch] += value; channelEnergy[ch] += value * value;
    if (ch === 0) cross += value * wav.readInt16LE(44 + i * 4 + 2) / 32768;
    deltaSum += (next - value) ** 2;
    secondEnergy[Math.floor(i / rate)] += value * value / (rate * 2);
    if (i === frames - 1) seam.push(Math.abs(next - value));
  }
  assert.ok(peak > 0.25 && peak < 0.29, 'master has ample headroom');
  assert.ok(Math.sqrt(sum / (frames * 2)) > 0.04, 'render has an audible score');
  assert.ok(secondEnergy.every(value => Math.sqrt(value) > 0.035), 'no silent seconds or join fade-outs');
  assert.ok(Math.sqrt(deltaSum / (frames * 2)) < 0.01, 'soft score avoids excessive sample-to-sample movement');
  for (let ch = 0; ch < 2; ch++) {
    const sample = frame => wav.readInt16LE(44 + ((frame + frames) % frames) * 4 + ch * 2) / 32768;
    const surroundingSlopes = [-4, -3, -2, 0, 1, 2, 3].map(i => sample(i + 1) - sample(i));
    const wrapSlope = sample(0) - sample(-1);
    const localMax = Math.max(...surroundingSlopes.map(Math.abs));
    assert.ok(seam[ch] <= localMax * 1.25 + 2 / 32768, 'wrap follows its neighbouring waveform slope');
    const surroundingCurvature = [-4, -3, 0, 1, 2].map(i => Math.abs(sample(i + 2) - 2 * sample(i + 1) + sample(i)));
    const localCurvature = Math.max(...surroundingCurvature);
    assert.ok(Math.abs(wrapSlope - surroundingSlopes[2]) <= localCurvature * 1.5 + 2 / 32768, 'no new corner or click is introduced at the seam');
    assert.ok(Math.abs(surroundingSlopes[3] - wrapSlope) <= localCurvature * 1.5 + 2 / 32768, 'the first outgoing sample continues the same curve');
  }
  assert.ok(Math.max(...secondEnergy) / Math.min(...secondEnergy) < 4, 'calm mix avoids large dynamic jolts');
  assert.ok(channelSums.every(value => Math.abs(value / frames) < 1e-5), 'master contains no persistent DC offset');
  const correlation = cross / Math.sqrt(channelEnergy[0] * channelEnergy[1]);
  assert.ok(correlation > 0.35 && correlation < 0.995, 'stereo space retains a coherent centre without collapsing to mono');
});

test('the published v2 music and provenance can be regenerated without writing files', async () => {
  const { stdout } = await execute(process.execPath, ['tools/audio/render-ancient-forest-music-v2.mjs', '--check'], {
    cwd: fileURLToPath(root), timeout: 45000, maxBuffer: 16384
  });
  assert.match(stdout, /Reproduced [a-f0-9]{64} \(9216044 bytes\); no files changed/);
});

test('music loader rejects missing, incomplete and unexpectedly decoded tracks', async t => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  const context = { decodeAudioData: async () => ({ duration: MUSIC_DURATION + 1, numberOfChannels: 2, sampleRate: 48000 }) };
  globalThis.fetch = async () => ({ ok: false });
  await assert.rejects(loadForestMusic(context), /unavailable/);
  globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-length': '9216045' }) });
  await assert.rejects(loadForestMusic(context), /too large/);
  globalThis.fetch = async () => ({ ok: true, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(40) });
  await assert.rejects(loadForestMusic(context), /Incomplete/);
  globalThis.fetch = async () => ({ ok: true, headers: new Headers(), arrayBuffer: async () => new ArrayBuffer(9216044) });
  await assert.rejects(loadForestMusic(context), /Invalid music loop/);
});

test('music accepts a compressed transfer length and checks the decoded PCM duration', async t => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-length': '5000000' }), arrayBuffer: async () => new ArrayBuffer(9216044) });
  const decoded = { duration: MUSIC_DURATION, numberOfChannels: 2, sampleRate: 48000 };
  assert.equal(await loadForestMusic({ decodeAudioData: async () => decoded }), decoded);
});
