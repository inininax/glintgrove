import test from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../src/state/saveStore.js';

function stubStorage(initial) {
  let raw = initial ?? null;
  globalThis.localStorage = {
    getItem: k => (k === '__gg_test' ? null : raw),
    setItem: (k, v) => {
      if (k !== '__gg_test') raw = v;
    },
    removeItem: k => {
      if (k !== '__gg_test') raw = null;
    }
  };
}

test('defaults shape is v2', () => {
  const d = store.defaults();
  assert.equal(d.v, 2);
  assert.equal(d.unlocked, 1);
  assert.equal(d.lang, 'auto');
  assert.deepEqual([d.stars, d.tipsSeen, d.daily, d.ach].map(o => typeof o), ['object', 'object', 'object', 'object']);
});

test('v1 save migrates to v2 preserving progress', () => {
  stubStorage(JSON.stringify({
    v: 1,
    unlocked: 5,
    stars: { 1: 3, 2: 2 },
    sound: false,
    motion: true,
    colorblind: true,
    seenIntro: true
  }));
  const d = store.load();
  assert.equal(d.v, 2);
  assert.equal(d.unlocked, 5);
  assert.equal(d.stars[1], 3);
  assert.equal(d.sound, false);
  assert.equal(d.colorblind, true);
  assert.equal(d.lang, 'auto');
  assert.deepEqual(d.daily, {});
});

test('corrupted payloads sanitize safely', () => {
  stubStorage(JSON.stringify({
    v: 1,
    unlocked: '7',
    stars: { 1: 9, 2: 'x', 3: 2 },
    sound: 'yes',
    motion: null
  }));
  const d = store.load();
  assert.equal(d.unlocked, 1);
  assert.deepEqual(d.stars, { 3: 2 });
  assert.equal(d.sound, true);
  assert.equal(d.motion, true);
});

test('completeLevel unlocks next and keeps best stars', () => {
  const d = store.defaults();
  store.completeLevel(d, 1, 2);
  assert.equal(d.unlocked, 2);
  assert.equal(d.stars[1], 2);
  store.completeLevel(d, 1, 3);
  assert.equal(d.stars[1], 3);
  store.completeLevel(d, 3, 1);
  assert.equal(d.unlocked, 4);
});

test('recordDaily keeps best stars and fewest moves', () => {
  const d = store.defaults();
  store.recordDaily(d, '2026-08-23', 7, 2);
  store.recordDaily(d, '2026-08-23', 9, 3);
  assert.equal(d.daily['2026-08-23'].moves, 7, 'fewest moves kept');
  assert.equal(d.daily['2026-08-23'].stars, 3, 'best stars kept');
});

test('dailyStreak counts consecutive days ending today', () => {
  const d = store.defaults();
  d.daily['2026-08-21'] = { moves: 5, stars: 2 };
  d.daily['2026-08-22'] = { moves: 5, stars: 2 };
  d.daily['2026-08-23'] = { moves: 5, stars: 2 };
  assert.equal(store.dailyStreak(d, '2026-08-23'), 3);
  d.daily['2026-08-25'] = { moves: 4, stars: 3 };
  delete d.daily['2026-08-24'];
  assert.equal(store.dailyStreak(d, '2026-08-25'), 1);
});

test('totalStars sums', () => {
  const d = store.defaults();
  d.stars = { 1: 3, 2: 1 };
  assert.equal(store.totalStars(d), 4);
});

test('legacy v1 storage key migrates and persists under v2', () => {
  const backing = {};
  globalThis.localStorage = {
    getItem: k => (k === '__gg_test' ? null : (backing[k] ?? null)),
    setItem: (k, v) => { if (k !== '__gg_test') backing[k] = v; },
    removeItem: k => { if (k !== '__gg_test') delete backing[k]; }
  };
  backing['glintgrove_save_v1'] = JSON.stringify({
    v: 1,
    unlocked: 9,
    stars: { 1: 3, 4: 2 },
    sound: false,
    seenIntro: true
  });
  assert.equal(backing['glintgrove_save_v2'], undefined);

  const d = store.load();
  assert.equal(d.v, 2);
  assert.equal(d.unlocked, 9);
  assert.equal(d.stars[4], 2);
  assert.equal(backing['glintgrove_save_v2'] !== undefined, true, 'migrated data persisted to v2 key');
});
