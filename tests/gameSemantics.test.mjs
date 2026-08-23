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
    dataset: {},
    classList: {
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
    listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 800 }; },
    click() { (this.listeners.click || []).forEach(fn => fn({})); }
  };
  Object.defineProperty(node, 'children', {
    value: id === 'win-stars' ? [makeElement('s1'), makeElement('s2'), makeElement('s3')] : [],
    writable: true
  });
  return node;
}

function installDom() {
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
  const elements = {};
  for (const id of ids) {
    const node = makeElement(id);
    if (id === 'game-canvas') {
      node.getContext = () => makeCtxStub();
      node.width = 0;
      node.height = 0;
    }
    elements[id] = node;
  }
  globalThis.document = {
    readyState: 'complete',
    body: { dataset: {}, appendChild() {} },
    getElementById: id => elements[id] || null,
    createElement: tag => {
      const el = makeElement('dyn');
      if (tag === 'canvas') { el.getContext = () => makeCtxStub(); el.width = 300; el.height = 150; }
      return el;
    },
    addEventListener() {}
  };
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.confirm = () => true;
  globalThis.requestAnimationFrame = () => 1;
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
  for (const f of ['js/core.js', 'js/engine.js', 'js/levels.js', 'js/save.js', 'js/particles.js', 'js/audio.js', 'js/renderer.js', 'js/game.js', 'js/ui.js']) {
    (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'));
  }
}

test('satisfaction is live while awakening persists', () => {
  installDom();
  loadGameScripts();
  const GG = globalThis.GG;
  const game = new GG.Game(document.getElementById('game-canvas'));
  const def = GG.LEVELS.find(l => l.id === 1);
  game.startLevel(def);

  const mirrorIdx = game.level.rotatables.findIndex(r => r.x === 4 && r.y === 2);
  const targetKey = '4,0';
  game.rotateIdx(mirrorIdx);
  assert.equal(game.won, true);
  assert.ok(game.satisfied.has(targetKey));
  assert.ok(game.awarded.has(targetKey));

  game.won = false;
  game.rotateIdx(mirrorIdx);
  assert.equal(game.satisfied.size, 0);
  assert.equal(game.won, false);
  assert.ok(game.litAt.has(targetKey), 'visual wake persists');
  assert.ok(game.awarded.has(targetKey), 'award persists');

  game.rotateIdx(mirrorIdx);
  assert.equal(game.won, true);
});

test('undo and reset notify onMove for HUD updates', () => {
  installDom();
  loadGameScripts();
  const GG = globalThis.GG;
  let moveEvents = 0;
  const game = new GG.Game(document.getElementById('game-canvas'));
  game.hooks = { onMove() { moveEvents++; } };
  game.startLevel(GG.LEVELS.find(l => l.id === 3));
  game.rotateIdx(0);
  game.undo();
  game.resetLevel();
  assert.equal(moveEvents, 3);
});
