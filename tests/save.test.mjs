import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
(0, eval)(fs.readFileSync(path.join(root, 'js/save.js'), 'utf8'));
const GG = globalThis.GG;

test('defaults shape', () => {
  const d = GG.save.defaults();
  assert.equal(d.v, 1);
  assert.equal(d.unlocked, 1);
  assert.equal(d.sound, true);
  assert.deepEqual(d.stars, {});
});

test('completeLevel unlocks next and keeps best stars', () => {
  const d = GG.save.defaults();
  GG.save.completeLevel(d, 1, 2);
  assert.equal(d.unlocked, 2);
  assert.equal(d.stars[1], 2);
  GG.save.completeLevel(d, 1, 3);
  assert.equal(d.stars[1], 3);
  GG.save.completeLevel(d, 3, 1);
  assert.equal(d.unlocked, 4);
});

test('totalStars sums', () => {
  const d = GG.save.defaults();
  d.stars = { 1: 3, 2: 1 };
  assert.equal(GG.save.totalStars(d), 4);
});

test('load sanitizes corrupt payloads', () => {
  globalThis.localStorage = {
    store: null,
    getItem(k) { return k === '__gg_test' ? null : this.store; },
    setItem(k, v) { if (k !== '__gg_test') this.store = v; },
    removeItem(k) { if (k !== '__gg_test') this.store = null; }
  };
  globalThis.localStorage.setItem('glintgrove_save_v1', JSON.stringify({
    v: 1,
    unlocked: '7',
    stars: { 1: 9, 2: 'x', 3: 2 },
    sound: 'yes',
    motion: null
  }));
  const d = GG.save.load();
  assert.equal(d.unlocked, 1);
  assert.deepEqual(d.stars, { 3: 2 });
  assert.equal(d.sound, true);
  assert.equal(d.motion, true);
});
