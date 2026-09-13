import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';
import { defaults, load, save } from '../src/state/saveStore.js';
import { Game } from '../src/game/game.js';
import { UI } from '../src/ui/ui.js';
import { artAssets } from '../src/assets/assetStore.js';

function storage(initial) {
  let raw = initial ? JSON.stringify(initial) : null;
  globalThis.localStorage = {
    getItem: key => key === '__gg_test' ? null : raw,
    setItem: (key, value) => { if (key !== '__gg_test') raw = value; },
    removeItem: key => { if (key !== '__gg_test') raw = null; }
  };
}

test('older saves default to sculpted; a valid display choice persists without losing progress', () => {
  for (const mode of [undefined, 'unknown', null]) {
    storage({ v: 2, unlocked: 17, stars: { 1: 3, 16: 2 }, displayMode: mode });
    const restored = load();
    assert.equal(restored.displayMode, 'sculpted');
    assert.equal(restored.unlocked, 17);
    assert.deepEqual(restored.stars, { 1: 3, 16: 2 });
  }
  const data = { ...defaults(), unlocked: 17, stars: { 16: 2 }, displayMode: 'simple' };
  save(data);
  assert.equal(load().displayMode, 'simple');
  assert.deepEqual(load().stars, { 16: 2 });
});

test('changing display from the open settings form updates the current board without a restart', () => {
  const nodes = installDom();
  document.body.dataset.screen = 'game';
  const imagesDrawn = [], artLookups = [];
  const context = () => new Proxy({ globalAlpha: 1 }, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'drawImage') return image => { if (image?.assetId) imagesDrawn.push(image.assetId); };
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    }
  });
  nodes['game-canvas'].getContext = context;
  const create = document.createElement;
  document.createElement = tag => {
    const node = create(tag);
    if (tag === 'canvas') node.getContext = context;
    return node;
  };
  const previousGet = artAssets.get;
  artAssets.get = id => {
    artLookups.push(id);
    return { image: { assetId: id }, width: 384, height: 384, scale: .9, anchor: [.5, .5] };
  };
  try {
    const game = new Game(nodes['game-canvas']);
    const data = { ...defaults(), sound: false, motion: false };
    const ui = new UI(game, {
      getSave: () => data,
      onSettingsForm(form) { Object.assign(data, form); game.setSettings(form); }
    });
    game.setSettings(data);
    game.startLevel({ id: 908, par: 2, grid: ['>./..T#', '..\\fMOs', 'rgbABC.', 'PQRS...'] });
    game.rotateIdx(0);
    game.render();
    assert.ok(imagesDrawn.includes('forest'), 'sculpted mode draws the loaded background');
    for (const prefix of ['rock', 'emitter', 'mirror', 'splitter', 'crystal', 'gate', 'portal', 'tree', 'flower', 'mushroom', 'owl']) {
      assert.ok(imagesDrawn.some(id => id === prefix || id.startsWith(prefix + '.')), `${prefix} uses its loaded artwork`);
    }
    const before = { level: game.level, trace: game.trace, moves: game.moves, orients: game.level.rotatables.map(r => r.orient), undoLength: game.undoStack.length };
    const sculptedBackground = game.renderer.bgCanvas;
    ui.openSettings();
    assert.equal(nodes['set-display'].value, 'sculpted');
    nodes['set-display'].value = 'simple';
    ui.applySettingsFromForm();
    imagesDrawn.length = artLookups.length = 0;
    game.render();
    assert.equal(game.settings.displayMode, 'simple');
    assert.equal(data.displayMode, 'simple');
    assert.equal(imagesDrawn.length, 0, 'simple mode draws no loaded background or sprite');
    assert.equal(artLookups.length, 0, 'simple mode does not access image assets');
    assert.notEqual(game.renderer.bgCanvas, sculptedBackground, 'mode change rebakes the background immediately');
    assert.equal(game.level, before.level);
    assert.equal(game.trace, before.trace);
    assert.equal(game.moves, before.moves);
    assert.deepEqual(game.level.rotatables.map(r => r.orient), before.orients);
    assert.equal(game.undoStack.length, before.undoLength);
    assert.equal(nodes['settings-modal'].classList.contains('hidden'), false);

    nodes['set-display'].value = 'sculpted';
    ui.applySettingsFromForm();
    game.render();
    assert.ok(imagesDrawn.includes('forest'), 'switching back restores loaded artwork');
    assert.equal(game.moves, before.moves);
    assert.deepEqual(game.level.rotatables.map(r => r.orient), before.orients);
  } finally {
    artAssets.get = previousGet;
  }
});
