(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};

  const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  const CELL = {
    EMPTY: '.',
    WALL: '#',
    MIRROR_SLASH: '/',
    MIRROR_BACK: '\\',
    SPLITTER: 's',
    EMITTER_R: '>',
    EMITTER_L: '<',
    EMITTER_U: '^',
    EMITTER_D: 'v',
    TREE: 'T',
    FLOWER: 'f',
    MUSHROOM: 'M',
    OWL: 'O',
    CRYSTAL_R: 'r',
    CRYSTAL_G: 'g',
    CRYSTAL_B: 'b',
    GATE_R: 'A',
    GATE_G: 'B',
    GATE_B: 'C',
    PORTAL_A: 'P',
    PORTAL_B: 'Q',
    PORTAL_C: 'R',
    PORTAL_D: 'S'
  };

  const COLORS = {
    white: '#ffe9b8',
    r: '#ff5d5d',
    g: '#5dff9d',
    b: '#6da8ff'
  };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function key(x, y, dir, color) { return x + ',' + y + ',' + dir + ',' + (color || ''); }
  function posKey(x, y) { return x + ',' + y; }

  GG.DIR = DIR;
  GG.DX = DX;
  GG.DY = DY;
  GG.CELL = CELL;
  GG.COLORS = COLORS;
  GG.clamp = clamp;
  GG.lerp = lerp;
  GG.easeOutCubic = easeOutCubic;
  GG.easeOutBack = easeOutBack;
  GG.easeInOutQuad = easeInOutQuad;
  GG.mulberry32 = mulberry32;
  GG.key = key;
  GG.posKey = posKey;

})(typeof window !== 'undefined' ? window : globalThis);
