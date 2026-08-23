import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function makeCtxStub() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      return (...args) => void args;
    },
    set() { return true; }
  });
}

function makeElement(id) {
  const node = {
    id,
    children: [],
    style: {},
    dataset: {},    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) { force ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    innerHTML: '',
    textContent: '',
    disabled: false,
    checked: false,
    value: '',
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800 }; },
    getContext: undefined,
    click() { (this.listeners.click || []).forEach(fn => fn({})); }
  };
  Object.defineProperty(node, 'children', { value: id === 'win-stars' ? [makeElement('s1'), makeElement('s2'), makeElement('s3')] : [], writable: true });
  return node;
}

function installDom() {
  const elements = {};
  const ids = [
    'game-canvas', 'screen-title', 'screen-levels', 'screen-game',
    'chapter-list', 'total-stars', 'hud-level-name', 'hud-moves',
    'toast', 'win-overlay', 'win-title', 'win-stats', 'win-stars',
    'settings-modal', 'set-sound', 'set-motion', 'set-colorblind',
    'intro-modal', 'btn-play', 'btn-continue', 'btn-back-title',
    'btn-settings', 'btn-settings2', 'btn-close-settings', 'btn-wipe',
    'btn-undo', 'btn-reset', 'btn-hint', 'btn-exit', 'btn-next',
    'btn-replay', 'btn-win-select', 'btn-intro-ok'
  ];
  for (const id of ids) {
    const node = makeElement(id);
    if (id === 'game-canvas') {
      node.width = 0; node.height = 0;
      node.getContext = () => makeCtxStub();
    }
    elements[id] = node;
  }
  globalThis.document = {
    readyState: 'complete',
    body: { dataset: {}, appendChild() {} },
    getElementById: id => elements[id] || null,
    createElement: tag => {
      const el = makeElement('dyn-' + Math.random());
      el.tag = tag;
      if (tag === 'canvas') { el.getContext = () => makeCtxStub(); el.width = 300; el.height = 150; }
      return el;
    },
    addEventListener() {}
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.confirm = () => true;
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
  let rafQueue = [];
  globalThis.requestAnimationFrame = fn => { rafQueue.push(fn); return rafQueue.length; };
  globalThis.__flushFrames = n => {
    for (let i = 0; i < n; i++) {
      const q = rafQueue;
      rafQueue = [];
      const now = performance.now();
      for (const fn of q) fn(now + 16);
      if (rAFhook) rAFhook();
    }
  };
  let rAFhook = null;
  globalThis.__setFrameHook = fn => { rAFhook = fn; };
  globalThis.localStorage = (() => {
    let store = '';
    return {
      getItem: k => (k === '__gg_test' ? null : store || null),
      setItem: (k, v) => { if (k !== '__gg_test') store = v; },
      removeItem: k => { if (k !== '__gg_test') store = ''; }
    };
  })();
  return elements;
}

function loadGameScripts() {
  for (const f of ['js/core.js', 'js/engine.js', 'js/levels.js', 'js/save.js', 'js/particles.js', 'js/audio.js', 'js/renderer.js', 'js/game.js', 'js/ui.js', 'js/main.js']) {
    (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
  }
}

test('game boots and renders frames without throwing', () => {
  installDom();
  loadGameScripts();
  assert.equal(globalThis.window.__bootOk, true);
  assert.equal(document.body.dataset.boot, 'ok');

  const gg = globalThis.window.__gg;
  assert.ok(gg && gg.game && gg.ui);

  globalThis.__flushFrames(30);

  assert.ok(gg.game.level, 'demo level loaded');
  assert.equal(gg.game.demoMode, true);
});

test('play level 1, rotate correct mirror, detect win flow', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  uiPlay(gg, 1);
  globalThis.__flushFrames(5);

  const game = gg.game;
  assert.equal(game.def.id, 1);
  assert.equal(game.state, 'playing');
  assert.equal(game.won, false);

  const mirrorIdx = game.level.rotatables.findIndex(r => r.x === 4 && r.y === 2);
  assert.ok(mirrorIdx >= 0, 'mirror found');
  game.rotateIdx(mirrorIdx);
  assert.equal(game.moves, 1);
  assert.equal(game.won, true);
});

function uiPlay(gg, id) {
  gg.ui.hooks.onPlay(id);
}

test('undo restores previous orientation', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  uiPlay(gg, 3);
  const game = gg.game;
  const before = game.level.rotatables.map(r => r.orient);
  game.rotateIdx(0);
  assert.notDeepEqual(game.level.rotatables.map(r => r.orient), before);
  game.undo();
  assert.deepEqual(game.level.rotatables.map(r => r.orient), before);
  assert.equal(game.moves, 0);
});

test('reset restores initial state', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  uiPlay(gg, 2);
  const game = gg.game;
  game.rotateIdx(0);
  game.resetLevel();
  assert.equal(game.moves, 0);
  assert.equal(game.won, false);
});

test('hint highlights a useful rotatable on every level', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  for (const def of GG.LEVELS) {
    gg.ui.hooks.onPlay(def.id);
    const ok = gg.game.requestHint();
    assert.ok(ok, `L${def.id} hint`);
  }
});

test('level select renders all chapters and nodes', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  gg.ui.renderLevelSelect();
  const list = document.getElementById('chapter-list');
  assert.ok(list.children.length === GG.CHAPTERS.length, 'chapters rendered');
});

test('win overlay shows stars', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  gg.ui.showWin(4, 4, 2);
  const overlay = document.getElementById('win-overlay');
  assert.ok(!overlay.classList.contains('hidden'));
});

test('settings round trip through save', () => {
  installDom();
  loadGameScripts();
  const gg = globalThis.window.__gg;
  document.getElementById('set-sound').checked = false;
  document.getElementById('set-motion').checked = true;
  document.getElementById('set-colorblind').checked = true;
  gg.ui.applySettingsFromForm();
  const data = GG.save.load();
  assert.equal(data.sound, false);
  assert.equal(data.colorblind, true);
});
