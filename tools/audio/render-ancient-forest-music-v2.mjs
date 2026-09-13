// Original, reproducible instrumental music. Node standard library only.
// v1 is retained separately; this score uses slower attacks, sparse accents,
// restrained low notes and an eight-second circular stereo reverberation.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const scorePath = 'art/source/audio/ancient-forest-v2.score.json';
const outputPath = 'assets/audio/ancient-forest-v2.wav';
const recipePath = 'art/recipes/ancient-forest-v2-music.json';
const generatorPath = 'tools/audio/render-ancient-forest-music-v2.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const scoreBytes = await readFile(path.join(root, scorePath));
const score = JSON.parse(scoreBytes);
const rate = score.sampleRate, frames = Math.round(rate * score.duration), tau = Math.PI * 2;
const dry = [new Float64Array(frames), new Float64Array(frames)];
let seed = score.seed >>> 0;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

function voice(at, duration, midi, level, pan, kind) {
  const length = Math.round(duration * rate), start = Math.round(at * rate);
  const frequency = hz(midi), phase = random() * tau, shimmerPhase = random() * tau;
  const balance = [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
  for (let i = 0; i < length; i++) {
    const t = i / rate, end = duration - t, carrier = tau * frequency * t;
    let sample;
    if (kind === 'pad') {
      const envelope = smooth(t / score.padAttack) * smooth(end / score.padRelease);
      const drift = 0.055 * Math.sin(tau * t / 17 + shimmerPhase);
      const breath = 0.94 + 0.06 * Math.sin(tau * t / 23 + phase);
      // Soft, slowly changing oscillator colour; no speech/formant or choir synthesis.
      sample = (Math.sin(carrier + phase + drift) * 0.58
        + Math.sin(carrier * 1.0009 + phase + 0.9 - drift) * 0.22
        + Math.sin(carrier * 2 + phase) * (0.064 + 0.013 * Math.sin(tau * t / 19 + shimmerPhase))
        + Math.sin(carrier * 3.0004 + shimmerPhase) * 0.014) * envelope * breath;
    } else if (kind === 'felt') {
      const envelope = smooth(t / 0.32) * smooth(end / 3.5);
      sample = envelope * (
        Math.sin(carrier) * Math.exp(-t / 3.7)
        + Math.sin(carrier * 2.001) * 0.11 * Math.exp(-t / 2)
        + Math.sin(carrier * 3.002) * 0.022 * Math.exp(-t / 0.9));
    } else {
      const envelope = smooth(t / 1.2) * Math.exp(-t / 5.2) * smooth(end / 4);
      sample = (Math.sin(carrier + 0.018 * Math.sin(tau * t / 8))
        + Math.sin(carrier * 2.004) * 0.065) * envelope;
    }
    const frame = (start + i) % frames;
    dry[0][frame] += sample * level * balance[0];
    dry[1][frame] += sample * level * balance[1];
  }
}

for (const chord of score.pads) chord.notes.forEach((note, i) => {
  const pan = (i / (chord.notes.length - 1) - 0.5) * 0.84;
  voice(chord.at, chord.duration, note, chord.level * (i === 0 ? 0.42 : 0.68), pan, 'pad');
});
for (const note of score.felt) voice(note.at, 16, note.note, note.level, note.pan, 'felt');
for (const note of score.glass) voice(note.at, 20, note.note, note.level, note.pan, 'glass');

// Every tail is folded over the exact 96-second period. Diffuse reflections
// cross channels and taper to zero over the final portion of the eight-second
// response, so the boundary never loses a tail or waits for a new file.
const wet = [new Float64Array(frames), new Float64Array(frames)];
for (let tap = 0; tap < score.space.taps; tap++) {
  const delaySeconds = 0.055 + (tap + random() * 0.72) / score.space.taps * (score.space.duration - 0.1);
  const delay = Math.round(delaySeconds * rate);
  const amplitude = Math.exp(-delaySeconds / score.space.decay)
    * smooth((score.space.duration - delaySeconds) / 1.3)
    * score.space.tapGain * (tap % 3 === 0 ? -1 : 1);
  for (let channel = 0; channel < 2; channel++) {
    const source = dry[(tap + channel) % 2], target = wet[channel];
    // Split at the wrap to avoid an expensive remainder in the inner loop.
    const split = frames - delay;
    for (let i = 0; i < split; i++) target[i + delay] += source[i] * amplitude;
    for (let i = split; i < frames; i++) target[i - split] += source[i] * amplitude;
  }
}

for (let channel = 0; channel < 2; channel++) {
  // Warm the filters with a complete period before output, establishing their
  // circular state instead of beginning with silence on every iteration.
  let reflection = 0;
  for (let i = 0; i < frames; i++) reflection += (wet[channel][i] - reflection) * 0.18;
  for (let i = 0; i < frames; i++) {
    reflection += (wet[channel][i] - reflection) * 0.18;
    dry[channel][i] = dry[channel][i] * score.space.dry + reflection * score.space.wet;
  }
  const lowCoefficient = 1 - Math.exp(-tau * 38 / rate);
  let low = 0;
  for (let i = 0; i < frames; i++) low += (dry[channel][i] - low) * lowCoefficient;
  for (let i = 0; i < frames; i++) {
    low += (dry[channel][i] - low) * lowCoefficient;
    dry[channel][i] -= low;
  }
  let sum = 0;
  for (const value of dry[channel]) sum += value;
  const mean = sum / frames;
  for (let i = 0; i < frames; i++) dry[channel][i] -= mean;
}

// A wide circular energy window eases slow chord-to-chord loudness differences.
// This is gentle volume automation, not a transient limiter or a seam fade.
const energy = new Float64Array(frames);
let totalEnergy = 0;
for (let i = 0; i < frames; i++) {
  energy[i] = (dry[0][i] ** 2 + dry[1][i] ** 2) / 2;
  totalEnergy += energy[i];
}
const halfWindow = Math.round(score.leveling.windowSeconds * rate / 2);
const windowFrames = halfWindow * 2 + 1, targetEnergy = totalEnergy / frames;
let rollingEnergy = 0;
for (let i = -halfWindow; i <= halfWindow; i++) rollingEnergy += energy[(i + frames) % frames];
for (let i = 0; i < frames; i++) {
  const gain = Math.max(score.leveling.minimumGain, Math.min(score.leveling.maximumGain,
    (targetEnergy / Math.max(1e-12, rollingEnergy / windowFrames)) ** score.leveling.strength));
  dry[0][i] *= gain; dry[1][i] *= gain;
  rollingEnergy -= energy[(i - halfWindow + frames) % frames];
  rollingEnergy += energy[(i + halfWindow + 1) % frames];
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

const record = {
  title: score.title, version: score.version,
  score: scorePath, scoreSha256: hash(scoreBytes),
  generator: generatorPath, generatorSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  runtime: outputPath, sha256: hash(wav), bytes: wav.length,
  ...analyseWav(wav),
  synthesis: { padAttack: score.padAttack, padRelease: score.padRelease, reverbSeconds: score.space.duration,
    chordChanges: score.pads.length, feltNotes: score.felt.length, glassNotes: score.glass.length },
  mastering: score.leveling,
  provenance: score.origin
};
if (process.argv.includes('--check')) {
  const existing = await readFile(path.join(root, outputPath));
  const existingRecord = await readFile(path.join(root, recipePath), 'utf8');
  if (!wav.equals(existing) || existingRecord !== JSON.stringify(record, null, 2) + '\n') {
    throw new Error('Published music or provenance differs from its deterministic render');
  }
  console.log(`Reproduced ${record.sha256} (${wav.length} bytes); no files changed.`);
} else {
  await mkdir(path.join(root, 'assets/audio'), { recursive: true });
  await writeFile(path.join(root, outputPath), wav);
  await writeFile(path.join(root, recipePath), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record, null, 2));
}

function analyseWav(buffer) {
  let sum = 0, max = 0, diffSq = 0, maxDiff = 0, cross = 0;
  const channelSum = [0, 0], channelEnergy = [0, 0], seam = [], secondEnergy = new Array(score.duration).fill(0);
  for (let i = 0; i < frames; i++) {
    const pair = [];
    for (let channel = 0; channel < 2; channel++) {
      const value = buffer.readInt16LE(44 + i * 4 + channel * 2) / 32768;
      const next = buffer.readInt16LE(44 + ((i + 1) % frames) * 4 + channel * 2) / 32768;
      pair.push(value);
      sum += value * value; max = Math.max(max, Math.abs(value));
      channelSum[channel] += value; channelEnergy[channel] += value * value;
      diffSq += (next - value) ** 2; maxDiff = Math.max(maxDiff, Math.abs(next - value));
      secondEnergy[Math.floor(i / rate)] += value * value / (rate * 2);
      if (i === frames - 1) seam.push(Math.abs(next - value));
    }
    cross += pair[0] * pair[1];
  }
  return {
    sampleRate: rate, channels: 2, bitsPerSample: 16, frames, duration: frames / rate,
    peak: max, rms: Math.sqrt(sum / (frames * 2)),
    seamDelta: seam, sampleDeltaRms: Math.sqrt(diffSq / (frames * 2)), maxSampleDelta: maxDiff,
    quietestSecondRms: Math.sqrt(Math.min(...secondEnergy)), loudestSecondRms: Math.sqrt(Math.max(...secondEnergy)),
    channelDc: channelSum.map(value => value / frames),
    stereoCorrelation: cross / Math.sqrt(channelEnergy[0] * channelEnergy[1]),
    sectionRms: score.pads.map(chord => Math.sqrt(secondEnergy.slice(chord.at, chord.at + 16).reduce((a, b) => a + b, 0) / 16))
  };
}
