import fs from 'node:fs';
import { generateAll, CHAPTER_INFO } from '../src/services/generator.js';
import { LEVELS as ALL, difficultyOf } from '../src/data/levels.js';
const HAND = ALL.filter(l => l.id <= 30);

const START = 31;
const END = 300;

console.log(`generating levels ${START}..${END} ...`);
const t0 = Date.now();
const { levels: generated, failures } = generateAll(START, END, HAND);
if (failures.length) {
  console.error('generation failed for ids:', failures.join(','));
  process.exit(1);
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`generated ${generated.length} levels in ${secs}s`);

const bands = { easy: 0, normal: 0, hard: 0, extreme: 0 };
for (const l of generated) bands[l.diff]++;
console.log('difficulty mix:', JSON.stringify(bands));

const header = `export const GENERATED_LEVELS = ${JSON.stringify(generated, null, 1)};\n`;
fs.writeFileSync('src/data/levels.generated.js', header);

const chaptersJs = `export const GENERATED_CHAPTERS = ${JSON.stringify(CHAPTER_INFO, null, 1)};\n`;
fs.appendFileSync('src/data/levels.generated.js', chaptersJs);
console.log('written src/data/levels.generated.js');
