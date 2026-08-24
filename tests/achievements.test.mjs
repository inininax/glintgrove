import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, evaluateAchievements } from '../src/services/achievements.js';
import { LEVELS } from '../src/data/levels.js';

function ctx({ clearedChapters = [], noHintClears = 0, streak = 0, total = 0 }) {
  return {
    chapterCleared: ch => clearedChapters.includes(ch),
    noHintClears,
    streak,
    maxStars: LEVELS.length * 3
  };
}

test('achievement registry has bilingual metadata and unique ids', () => {
  const ids = new Set();
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.id && a.name && a.nameEn && a.desc && a.descEn && a.icon, a.id);
    ids.add(a.id);
  }
  assert.equal(ids.size, ACHIEVEMENTS.length);
});

test('evaluate unlocks first-light on level 1 clear', () => {
  const save = { tipsSeen: {}, daily: {}, ach: {}, stars: { 1: 2 } };
  const newly = evaluateAchievements(save, ctx({}));
  assert.ok(newly.some(a => a.id === 'first-light'));
  assert.ok(save.ach['first-light'], 'timestamp persisted');
});

test('achievements unlock only once', () => {
  const save = { tipsSeen: {}, daily: {}, ach: {}, stars: { 1: 3 } };
  evaluateAchievements(save, ctx({}));
  const second = evaluateAchievements(save, ctx({}));
  assert.equal(second.length, 0);
});

test('chapter and streak achievements use context', () => {
  const save = { tipsSeen: {}, daily: { '2026-08-21': { moves: 5, stars: 3 }, '2026-08-22': { moves: 5, stars: 3 }, '2026-08-23': { moves: 5, stars: 3 } }, ach: {}, stars: {} };
  const none = evaluateAchievements(save, ctx({ streak: 1 }));
  assert.ok(!none.some(a => a.id === 'daily-streak-3'));

  save.ach = {};
  const withStreak = evaluateAchievements(save, ctx({ streak: 3 }));
  assert.ok(withStreak.some(a => a.id === 'daily-streak-3'));
  assert.ok(withStreak.some(a => a.id === 'daily-first'));
});

test('no-hint-ten requires ten hintless clears', () => {
  const save = { tipsSeen: {}, daily: {}, ach: {}, stars: {} };
  const few = evaluateAchievements(save, ctx({ noHintClears: 9 }));
  assert.ok(!few.some(a => a.id === 'no-hint-ten'));
  const ten = evaluateAchievements(save, ctx({ noHintClears: 10 }));
  assert.ok(ten.some(a => a.id === 'no-hint-ten'));
});
