import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, t, setLanguage, LEVEL_NAMES_EN } from '../src/ui/strings.js';
import { ACHIEVEMENTS } from '../src/services/achievements.js';
import { LEVELS } from '../src/data/levels.js';

test('ko and en dictionaries have identical key sets', () => {
  const ko = Object.keys(STRINGS.ko).sort();
  const en = Object.keys(STRINGS.en).sort();
  assert.deepEqual(ko, en);
});

test('every key resolves to non-empty string in both languages', () => {
  for (const lang of ['ko', 'en']) {
    for (const key of Object.keys(STRINGS[lang])) {
      const val = STRINGS[lang][key];
      assert.equal(typeof val, 'string', `${lang}:${key}`);
      assert.ok(val.length > 0, `${lang}:${key} empty`);
    }
  }
});

test('t() falls back to ko then key', () => {
  setLanguage('en');
  assert.equal(typeof t('play'), 'string');
  setLanguage('ko');
  assert.notEqual(t('nonexistent-key-xyz'), '');
});

test('all levels have EN display names', () => {
  for (const l of LEVELS) {
    assert.ok(l.nameEn || LEVEL_NAMES_EN[l.id], `L${l.id} missing EN name`);
  }
});

test('achievements have bilingual names and descriptions', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.name && a.nameEn && a.desc && a.descEn, a.id);
  }
});
