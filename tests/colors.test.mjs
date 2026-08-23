import test from 'node:test';
import assert from 'node:assert/strict';
import { colorOf, setSkinTheme } from '../src/core/colors.js';
import { getSkin } from '../src/core/skins.js';

test('default palette used without skin theme', () => {
  setSkinTheme(null);
  assert.equal(colorOf('white'), '#ffe9b8');
});

test('skin theme remaps beam colors', () => {
  const ocean = getSkin('ocean').palette;
  setSkinTheme(ocean);
  assert.equal(colorOf('white'), ocean.white);
  assert.equal(colorOf('r'), ocean.r);
  setSkinTheme(null);
  assert.equal(colorOf('white'), '#ffe9b8');
});
