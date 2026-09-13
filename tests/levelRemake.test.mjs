import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LEVELS, CHAPTERS } from '../src/data/levels.js';
import { GENERATION_INFO } from '../src/data/levels.generated.js';
import { generateAll, generateLevel, canonicalLayoutSignature, LEVEL_REMAKE_SEED } from '../src/services/generator.js';
import { parseLevel, solve, applyOrients, isLevelSolved, trace } from '../src/sim/index.js';
import { getTutorial } from '../src/services/tutorial.js';
import { buildDailyConfig } from '../src/services/daily.js';

const retired = JSON.parse(readFileSync(new URL('../art/recipes/retired-level-signatures.json', import.meta.url), 'utf8'));
const oldHashes = new Set(retired.sha256);
const hash = value => createHash('sha256').update(value).digest('hex');

test('published 300-level catalogue exactly reproduces from the new seed', () => {
  const generated = generateAll(1, 300, { reject: signature => oldHashes.has(hash(signature)) });
  assert.deepEqual(generated.failures, []);
  assert.deepEqual(generated.levels, LEVELS);
  assert.equal(LEVELS.length, 300);
  assert.equal(GENERATION_INFO.seed, LEVEL_REMAKE_SEED);
  assert.equal(new Set(LEVELS.map(l => l.name)).size, 300);
  assert.equal(new Set(LEVELS.map(l => l.nameEn)).size, 300);
  assert.equal(CHAPTERS.length, 20);
});

test('new layouts are distinct after removing decoration and normalizing rotations/reflections', () => {
  const signatures = LEVELS.map(canonicalLayoutSignature);
  assert.equal(new Set(signatures).size, 300);
  assert.equal(retired.count, 300);
  for (const [i, signature] of signatures.entries()) assert.equal(oldHashes.has(hash(signature)), false, `L${i + 1} retired geometry`);
  const a = { grid: ['>./', '..T'] }, b = { grid: ['f.', '/v'] };
  // A separate square case checks a true reflection and decorative-wall change.
  assert.equal(canonicalLayoutSignature({ grid: ['>./', '..T', '...'] }),
    canonicalLayoutSignature({ grid: ['\\.<', 'O..', '#..'] }));
  assert.notEqual(canonicalLayoutSignature(a), canonicalLayoutSignature(b));
});

test('stored solutions illuminate every target; par is exact and search stays bounded', () => {
  for (const def of LEVELS) {
    const level = parseLevel(def);
    assert.ok(level.rotatables.length <= 10, `L${def.id} hint bound`);
    assert.equal(solve(level).moves, def.par, `L${def.id} exact par`);
    applyOrients(level, def.solutionOrients);
    assert.equal(isLevelSolved(level), true, `L${def.id} stored solution`);
  }
});

test('feature introductions preserve live tutorial targets and required mechanisms', () => {
  const first = LEVELS[0], parsed = parseLevel(first);
  const pointer = getTutorial(first, { tipsSeen: {} });
  const index = parsed.rotatables.findIndex(r => r.x === pointer.x && r.y === pointer.y);
  assert.ok(index >= 0);
  assert.equal(parsed.rotatables[index].orient, 1);
  assert.deepEqual(solve(parsed).flips, [index]);
  for (const def of LEVELS.slice(0, 5)) assert.equal(parseLevel(def).rotatables.some(r => r.kind === 'splitter'), false);
  const splitter = parseLevel(LEVELS[5]);
  assert.equal(splitter.rotatables[solve(splitter).flips[0]].kind, 'splitter');
  const color = parseLevel(LEVELS[16]);
  assert.ok(color.crystals.length && color.gates.length && color.targets.every(t => t.need));
  const portal = parseLevel(LEVELS[22]);
  applyOrients(portal, LEVELS[22].solutionOrients);
  assert.equal(trace(portal).segments.some(s => s.portalJump), true);
  const finale = parseLevel(LEVELS[299]);
  assert.equal(finale.emitters.length, 2);
  assert.ok(finale.crystals.length >= 3 && finale.gates.length >= 3 && Object.keys(finale.portals).length === 2);
});

test('daily selection remains solvable with the replacement level catalogue', () => {
  for (let day = 0; day < 45; day++) {
    const date = new Date(Date.UTC(2026, 8, 13 + day)).toISOString().slice(0, 10);
    const config = buildDailyConfig(date), level = parseLevel(LEVELS[config.baseId - 1]);
    level.initialOrients = [...config.orients];
    applyOrients(level, config.orients);
    const solution = solve(level);
    assert.ok(solution && solution.moves >= 3, date);
    assert.equal(solution.moves, config.optimal, date);
  }
});

test('generator refuses invalid IDs and ranges', () => {
  for (const id of [0, 301, -1, 1.5, NaN]) assert.throws(() => generateLevel(id), RangeError);
  assert.throws(() => generateAll(8, 7), RangeError);
});
