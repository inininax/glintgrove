import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';
import { defaults, save } from '../src/state/saveStore.js';
import { UI } from '../src/ui/ui.js';
import { artAssets } from '../src/assets/assetStore.js';
import { t } from '../src/ui/strings.js';

let bootId = 0;
async function bootGame(context, saved = {}) {
  const nodes = installDom();
  save({ ...defaults(), sound: false, motion: false, ...saved });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['en-US'] } });
  globalThis.location = { search: '?debug', hostname: 'localhost', protocol: 'http:', origin: 'http://localhost', pathname: '/' };
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({}) }));
  context.mock.method(artAssets, 'load', async () => ({}));
  context.mock.method(console, 'debug', () => {});
  delete globalThis.__gg;
  await import(`../src/main.js?test=${++bootId}`);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(globalThis.__gg, 'main boot completes');
  context.after(() => globalThis.__gg.ui.clearToast());
  return { ...globalThis.__gg, nodes };
}

for (const levelId of [6, 17, 23]) {
  test(`level ${levelId} offers a single tutorial and keeps hints available after dismissal`, async context => {
    const notifications = [];
    const originalToast = UI.prototype.toast;
    context.mock.method(UI.prototype, 'toast', function (message, ...args) {
      notifications.push(message);
      return originalToast.call(this, message, ...args);
    });
    const { ui, game, nodes, saveData } = await bootGame(context);
    ui.hooks.onPlay(levelId);
    assert.equal(ui.anyModalOpen(), 'tutorial-layer');
    assert.equal(nodes['tutorial-layer'].children.length, 1);
    assert.equal(nodes.toast.classList.contains('show'), false);
    assert.equal(notifications.includes(t(`tip${levelId}`)), false, 'the duplicate contextual toast is never emitted');
    game.events.emit('idleNudge', { id: levelId });
    assert.equal(nodes.toast.classList.contains('show'), false);
    document.getElementById('btn-tut-ok').click();
    assert.equal(saveData.tipsSeen[`tut-${levelId}`], true);
    nodes['btn-hint'].click();
    assert.equal(game.hintsUsed, 1);
    assert.equal(nodes.toast.classList.contains('show'), true);
    assert.equal(nodes.toast.textContent, game.level.hint);
    ui.hooks.onPlay(levelId);
    assert.equal(ui.anyModalOpen(), null, 'completed cards stay dismissed');
    assert.equal(nodes.toast.classList.contains('show'), false, 'prior hint is cleared on restart');
    assert.equal(notifications.includes(t(`tip${levelId}`)), false, 'replaying does not reintroduce the same explanation');
  });
}

test('card and settings block canvas, shortcut and HUD actions; Escape closes only the active dialog', async context => {
  const { ui, game, nodes, saveData } = await bootGame(context);
  const actions = [];
  for (const method of ['pointerDown', 'requestHint', 'undo', 'resetLevel']) {
    context.mock.method(game, method, () => actions.push(method));
  }
  const key = value => document.dispatchEvent({ type: 'keydown', key: value, preventDefault() {} });
  const tryGameplay = () => {
    nodes['game-canvas'].dispatchEvent({ type: 'pointerdown', clientX: 100, clientY: 100 });
    for (const value of ['h', 'u', 'r']) key(value);
    for (const id of ['btn-hint', 'btn-undo', 'btn-reset', 'btn-exit']) nodes[id].click();
  };
  ui.hooks.onPlay(17);
  tryGameplay();
  nodes['btn-settings-game'].click();
  assert.deepEqual(actions, []);
  assert.equal(ui.currentScreen, 'screen-game');
  assert.equal(ui.anyModalOpen(), 'tutorial-layer');
  key('Escape');
  assert.equal(ui.anyModalOpen(), null);
  assert.equal(saveData.tipsSeen['tut-17'], true);
  nodes['btn-settings-game'].click();
  assert.equal(ui.anyModalOpen(), 'settings-modal');
  tryGameplay();
  assert.deepEqual(actions, []);
  key('Escape');
  assert.equal(ui.anyModalOpen(), null);
  assert.equal(saveData.seenIntro, false, 'closing settings must not mark an unseen introduction complete');
  key('h');
  nodes['game-canvas'].dispatchEvent({ type: 'pointerdown', clientX: 100, clientY: 100 });
  assert.deepEqual(actions, ['requestHint', 'pointerDown']);
});

test('intro precedes the live pointer, and level changes cannot complete a stale pointer tutorial', async context => {
  const { ui, game, nodes, saveData } = await bootGame(context);
  ui.hooks.onPlay(1);
  assert.equal(ui.anyModalOpen(), 'intro-modal');
  assert.equal(nodes['tutorial-layer'].children.length, 0);
  nodes['btn-intro-ok'].click();
  assert.equal(ui.canPlay(), true);
  assert.equal(nodes['tutorial-layer'].children.length, 1);
  ui.hooks.onPlay(2);
  assert.equal(nodes['tutorial-layer'].children.length, 0);
  game.rotateIdx(0);
  assert.equal(saveData.tipsSeen['tut-1'], undefined, 'a different level move cannot finish the pointer tutorial');
  ui.hooks.onPlay(1);
  const mirror = game.level.rotatables[0];
  const layout = game.renderer.layout(game.level);
  nodes['game-canvas'].dispatchEvent({
    type: 'pointerdown',
    clientX: layout.ox + (mirror.x + .5) * layout.cell,
    clientY: layout.oy + (mirror.y + .5) * layout.cell
  });
  assert.equal(game.moves, 1, 'the live pointer allows canvas interaction');
  assert.equal(saveData.tipsSeen['tut-1'], true);
  assert.equal(nodes['tutorial-layer'].children.length, 0);
});

test('title help is a free introduction, blocks menu actions, and leaves first-play teaching intact', async context => {
  const { ui, game, nodes, saveData } = await bootGame(context);
  const savedBefore = JSON.stringify(saveData);
  const boardBefore = JSON.stringify({ moves: game.moves, hints: game.hintsUsed, level: game.def.id,
    orientations: game.level.rotatables.map(piece => piece.orient) });
  nodes['btn-title-help'].focus();
  nodes['btn-title-help'].click();
  assert.equal(ui.anyModalOpen(), 'guide-modal');
  assert.equal(nodes['guide-title'].textContent, t('helpTitle'));
  assert.equal(nodes['guide-content'].children[0].className, 'guide-introduction');
  assert.equal(nodes['guide-content'].children.filter(row => row.className === 'device-guide-row').length, 7);
  assert.equal(document.activeElement, nodes['guide-title']);
  for (const id of ['btn-play', 'btn-continue', 'btn-daily', 'btn-settings']) nodes[id].click();
  for (const key of ['r', 'h', 'u']) document.dispatchEvent({ type: 'keydown', key, preventDefault() {} });
  assert.equal(ui.currentScreen, 'screen-title');
  assert.equal(ui.anyModalOpen(), 'guide-modal');
  assert.equal(JSON.stringify(saveData), savedBefore);
  assert.equal(JSON.stringify({ moves: game.moves, hints: game.hintsUsed, level: game.def.id,
    orientations: game.level.rotatables.map(piece => piece.orient) }), boardBefore);
  let prevented = false;
  document.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(ui.anyModalOpen(), null);
  assert.equal(document.activeElement, nodes['btn-title-help']);
  assert.equal(saveData.seenIntro, false);
  nodes['btn-continue'].click();
  assert.equal(ui.currentScreen, 'screen-game');
  assert.equal(ui.anyModalOpen(), 'intro-modal', 'reading help never consumes first-play onboarding');
  assert.equal(saveData.tipsSeen['tut-1'], undefined);
});

test('title options close with Escape and restore their icon button without writing progress', async context => {
  const { ui, nodes, saveData } = await bootGame(context);
  const before = JSON.stringify(saveData);
  nodes['btn-settings'].focus();
  nodes['btn-settings'].click();
  assert.equal(ui.anyModalOpen(), 'settings-modal');
  nodes['btn-title-help'].click();
  assert.equal(ui.anyModalOpen(), 'settings-modal', 'help cannot stack over options');
  document.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault() {} });
  assert.equal(ui.anyModalOpen(), null);
  assert.equal(document.activeElement, nodes['btn-settings']);
  assert.equal(ui.currentScreen, 'screen-title');
  assert.equal(JSON.stringify(saveData), before);
});
