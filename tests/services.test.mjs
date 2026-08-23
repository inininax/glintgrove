import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfigForTest, DEFAULT_CONFIG } from '../src/services/config.js';
import { getTutorial, markTutorialDone } from '../src/services/tutorial.js';
import { SKINS, getSkin, isUnlocked } from '../src/core/skins.js';

test('remote config merge overrides known keys only', () => {
  const merged = mergeConfigForTest(DEFAULT_CONFIG, {
    hintPenaltyCapStars: 1,
    tipsEnabled: false,
    dailyMinOptimal: 4,
    unknownKey: 'ignored',
    parOverrides: { 3: 5, 99: 0, x: 2 }
  });
  assert.equal(merged.hintPenaltyCapStars, 1);
  assert.equal(merged.tipsEnabled, false);
  assert.equal(merged.dailyMinOptimal, 4);
  assert.equal(merged.unknownKey, undefined);
  assert.deepEqual(merged.parOverrides, { 3: 5 }, 'invalid par entries dropped');
});

test('merge with empty patch keeps defaults', () => {
  const merged = mergeConfigForTest(DEFAULT_CONFIG, {});
  assert.deepEqual(merged, DEFAULT_CONFIG);
});

test('tutorial steps for mechanism levels then done', () => {
  const save = { tipsSeen: {} };
  const defs = {
    1: { id: 1, grid: ['....T....', '.........', '..>.\\....'] },
    6: { id: 6 },
    17: { id: 17 },
    23: { id: 23 }
  };

  let step = getTutorial(defs[1], save);
  assert.equal(step.type, 'pointer');
  assert.equal(step.x, 4);
  assert.equal(step.y, 2);

  markTutorialDone(save, 1);
  assert.equal(getTutorial(defs[1], save), null);

  for (const id of [6, 17, 23]) {
    step = getTutorial(defs[id], save);
    assert.equal(step.type, 'card', `L${id}`);
    markTutorialDone(save, id);
    assert.equal(getTutorial(defs[id], save), null);
  }
});

test('skins unlock by star thresholds', () => {
  assert.ok(SKINS.length >= 4);
  assert.equal(isUnlocked(getSkin('classic'), 0), true);
  assert.equal(isUnlocked(getSkin('ocean'), 11), false);
  assert.equal(isUnlocked(getSkin('ocean'), 12), true);
});
