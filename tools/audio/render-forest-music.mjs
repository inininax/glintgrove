// Reproducible, sample-free music authoring. Node standard library only.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scorePath = 'art/source/audio/forest-reverie-v1.score.json';
const outputPath = 'assets/audio/forest-reverie-v1.wav';
const score = JSON.parse(await readFile(path.join(root, scorePath), 'utf8'));
const rate = score.sampleRate, frames = Math.round(rate * score.duration), tau = Math.PI * 2;
const dry = [new Float64Array(frames), new Float64Array(frames)];
let seed = score.seed >>> 0;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

function voice(at, duration, midi, level, pan, kind) {
  const length = Math.round(duration * rate), start = Math.round(at * rate);
  const frequency = hz(midi), phase = random() * tau;
  const balance = [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
  for (let i = 0; i < length; i++) {
    const t = i / rate, end = duration - t, carrier = tau * frequency * t;
    let sample;
    if (kind === 'pad') {
      // Gentle, slightly detuned harmonics: no fixed continuous drone.
      const envelope = smooth(t / 4.5) * smooth(end / 9);
      const breath = 0.93 + 0.07 * Math.sin(tau * t / 11 + phase);
      sample = (Math.sin(carrier + phase) * 0.68
        + Math.sin(carrier * 1.0017 + phase + 0.6) * 0.19
        + Math.sin(carrier * 2 + phase) * 0.09
        + Math.sin(carrier * 3 + phase) * 0.035) * envelope * breath;
    } else if (kind === 'felt') {
      const attack = smooth(t / 0.045), release = smooth(end / 1.8);
      sample = attack * release * (
        Math.sin(carrier) * Math.exp(-t / 2.5)
        + Math.sin(carrier * 2.001) * 0.17 * Math.exp(-t / 1.4)
        + Math.sin(carrier * 3.002) * 0.045 * Math.exp(-t / 0.55));
    } else {
      const envelope = smooth(t / 0.16) * Math.exp(-t / 3.2) * smooth(end / 2);
      sample = (Math.sin(carrier) + 0.1 * Math.sin(carrier * 2.004)) * envelope;
    }
    const frame = (start + i) % frames;
    dry[0][frame] += sample * level * balance[0];
    dry[1][frame] += sample * level * balance[1];
  }
}

for (const chord of score.pads) chord.notes.forEach((note, i) => {
  const pan = (i / (chord.notes.length - 1) - 0.5) * 0.7;
  voice(chord.at, chord.duration, note, chord.level * (i === 0 ? 0.88 : 0.63), pan, 'pad');
});
for (const note of score.felt) voice(note.at, 12, note.note, note.level, note.pan, 'felt');
for (const note of score.glass) voice(note.at, 14, note.note, note.level, note.pan, 'glass');

// A circular, finite diffuse response folds every reflection (including the
// last note's tail) over the loop boundary, without silence or a crossfade dip.
const wet = [new Float64Array(frames), new Float64Array(frames)];
for (let tap = 0; tap < 64; tap++) {
  const delaySeconds = 0.07 + tap * 0.084 + random() * 0.043;
  const delay = Math.round(delaySeconds * rate);
  const amplitude = Math.exp(-delaySeconds / 1.65) * 0.047 * (tap % 3 === 0 ? -1 : 1);
  for (let channel = 0; channel < 2; channel++) {
    const source = dry[(tap + channel) % 2], target = wet[channel];
    for (let i = 0; i < frames; i++) target[(i + delay) % frames] += source[i] * amplitude;
  }
}
for (let channel = 0; channel < 2; channel++) {
  // Establish the circular lowpass state before writing the output pass.
  let previous = 0;
  for (let i = 0; i < frames; i++) previous += (wet[channel][i] - previous) * 0.24;
  for (let i = 0; i < frames; i++) {
    previous += (wet[channel][i] - previous) * 0.24;
    dry[channel][i] = dry[channel][i] * 0.86 + previous * 0.6;
  }
  let sum = 0;
  for (const value of dry[channel]) sum += value;
  const mean = sum / frames;
  for (let i = 0; i < frames; i++) dry[channel][i] -= mean;
}

let peak = 0;
for (const channel of dry) for (const value of channel) peak = Math.max(peak, Math.abs(value));
const scale = score.peak / peak, bytes = frames * 4;
const wav = Buffer.alloc(44 + bytes);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
for (let i = 0; i < frames; i++) for (let channel = 0; channel < 2; channel++) {
  wav.writeInt16LE(Math.round(dry[channel][i] * scale * 32767), 44 + i * 4 + channel * 2);
}
await mkdir(path.join(root, 'assets/audio'), { recursive: true });
await writeFile(path.join(root, outputPath), wav);
const metrics = analyseWav(wav);
const record = {
  title: score.title,
  score: scorePath,
  scoreSha256: createHash('sha256').update(await readFile(path.join(root, scorePath))).digest('hex'),
  generator: 'tools/audio/render-forest-music.mjs',
  generatorSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  runtime: outputPath,
  sha256: createHash('sha256').update(wav).digest('hex'),
  bytes: wav.length,
  ...metrics,
  provenance: score.origin
};
await writeFile(path.join(root, 'art/recipes/forest-reverie-v1-music.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));

function analyseWav(buffer) {
  let sum = 0, max = 0, diffSq = 0, maxDiff = 0;
  const seam = [], secondRms = [];
  for (let i = 0; i < frames; i++) {
    let secondSum = 0;
    for (let channel = 0; channel < 2; channel++) {
      const value = buffer.readInt16LE(44 + i * 4 + channel * 2) / 32768;
      const next = buffer.readInt16LE(44 + ((i + 1) % frames) * 4 + channel * 2) / 32768;
      sum += value * value; max = Math.max(max, Math.abs(value));
      diffSq += (next - value) ** 2; maxDiff = Math.max(maxDiff, Math.abs(next - value));
      secondSum += value * value;
      if (i === frames - 1) seam.push(Math.abs(next - value));
    }
    const second = Math.floor(i / rate);
    secondRms[second] = (secondRms[second] || 0) + secondSum / (rate * 2);
  }
  return {
    sampleRate: rate, channels: 2, bitsPerSample: 16, frames, duration: frames / rate,
    peak: max, rms: Math.sqrt(sum / (frames * 2)),
    seamDelta: seam, sampleDeltaRms: Math.sqrt(diffSq / (frames * 2)), maxSampleDelta: maxDiff,
    quietestSecondRms: Math.sqrt(Math.min(...secondRms)), loudestSecondRms: Math.sqrt(Math.max(...secondRms))
  };
}
