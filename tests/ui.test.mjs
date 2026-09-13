import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';

async function makeUI(extraHooks = {}) {
  installDom();
  const { Game } = await import('../src/game/game.js');
  const { UI } = await import('../src/ui/ui.js');
  const { LEVELS } = await import('../src/data/levels.js');
  const game = new Game(document.getElementById('game-canvas'));
  const ui = new UI(game, {
    getSave: () => ({ unlocked: LEVELS.length + 1, stars: { 1: 3 }, daily: {}, tipsSeen: {}, ach: {} }),
    lang: () => 'ko',
    difficultyOf: def => def.diff || 'easy',
    onPlay() {},
    onSettingsForm() {},
    markIntroSeen() {},
    achContext: () => ({ chapterCleared: () => false, noHintClears: 0, streak: 0, maxStars: 78 }),
    ...extraHooks
  });
  return { ui, game };
}

test('show toggles exactly one screen', async () => {
  const { ui } = await makeUI();
  ui.show('screen-levels');
  assert.ok(!document.getElementById('screen-levels').classList.contains('hidden'));
  assert.ok(document.getElementById('screen-title').classList.contains('hidden'));
  assert.ok(document.getElementById('screen-game').classList.contains('hidden'));
});

test('anyModalOpen reports visible modal id', async () => {
  const { ui } = await makeUI();
  assert.equal(ui.anyModalOpen(), null);
  document.getElementById('win-overlay').classList.remove('hidden');
  assert.equal(ui.anyModalOpen(), 'win-overlay');
  document.getElementById('settings-modal').classList.remove('hidden');
  document.getElementById('win-overlay').classList.add('hidden');
  assert.equal(ui.anyModalOpen(), 'settings-modal');
});

test('level select renders one node per level', async () => {
  const { ui } = await makeUI();
  const { LEVELS } = await import('../src/data/levels.js');
  ui.renderLevelSelect();
  const list = document.getElementById('chapter-list');
  let nodes = 0;
  for (const section of list.children) {
    nodes += section.children[1].children.length;
  }
  assert.equal(nodes, LEVELS.length);
});

test('setHud writes moves and over state', async () => {
  const { ui } = await makeUI();
  const def = { id: 1, name: 'x', par: 3 };
  ui.setHud(def, 2, 3);
  assert.ok(document.getElementById('hud-moves').textContent.includes('2'));
  assert.ok(!document.getElementById('hud-moves').classList.contains('over'));
  ui.setHud(def, 7, 3);
  assert.ok(document.getElementById('hud-moves').classList.contains('over'));
});

const colorTutorial = { type: 'card', levelId: 17, titleKey: 'tutCardColorTitle', bodyKey: 'tutCardColorBody' };

test('tutorial card clears competing guidance, traps focus and restores it on dismissal', async () => {
  const completed = [];
  const { ui, game } = await makeUI({ onTutorialDone: id => completed.push(id) });
  ui.show('screen-game');
  const previous = document.getElementById('btn-hint');
  previous.focus();
  ui.toast('Old level tip');
  ui.showTutorial(colorTutorial);
  const layer = document.getElementById('tutorial-layer');
  const card = layer.children[0];
  const button = document.getElementById('btn-tut-ok');
  assert.equal(ui.anyModalOpen(), 'tutorial-layer');
  assert.equal(ui.canPlay(), false);
  assert.equal(card.getAttribute('role'), 'dialog');
  assert.equal(card.getAttribute('aria-modal'), 'true');
  assert.equal(card.getAttribute('aria-labelledby'), 'tutorial-title');
  assert.equal(card.getAttribute('aria-describedby'), 'tutorial-body');
  assert.equal(document.activeElement, button);
  for (const shiftKey of [false, true]) {
    let prevented = false;
    document.dispatchEvent({ type: 'keydown', key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(document.activeElement, button);
  }
  assert.equal(document.getElementById('toast').classList.contains('show'), false);
  assert.equal(ui.toast('Idle reminder', 50, { guidance: true }), false);
  assert.equal(ui.toast('Other notification'), false);
  assert.equal(ui.openSettings(), false);
  assert.equal(document.getElementById('settings-modal').classList.contains('hidden'), true);
  button.click();
  assert.deepEqual(completed, [17]);
  assert.equal(ui.anyModalOpen(), null);
  assert.equal(document.activeElement, previous);
  assert.equal(ui.canPlay(), true);
  game.level = { hint: 'Current level hint' };
  ui.showHintToast();
  assert.equal(document.getElementById('toast').textContent, 'Current level hint');
  ui.clearToast();
});

test('intro defers the interactive pointer and screen changes discard pending or visible guidance', async () => {
  let introDismissed = 0;
  const { ui, game } = await makeUI({ markIntroSeen: () => introDismissed++ });
  const { LEVELS } = await import('../src/data/levels.js');
  game.setSettings({ sound: false });
  game.startLevel(LEVELS[0]);
  const { getTutorial } = await import('../src/services/tutorial.js');
  const pointer = getTutorial(LEVELS[0], { tipsSeen: {} });
  ui.show('screen-game');
  ui.showIntro();
  ui.showTutorial(pointer);
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  assert.equal(ui.anyModalOpen(), 'intro-modal');
  ui.closeIntro();
  assert.equal(introDismissed, 1);
  assert.equal(document.getElementById('tutorial-layer').children.length, 1);
  assert.equal(ui.canPlay(), true, 'the pointer permits the first mirror interaction');
  ui.openSettings();
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  ui.closeSettings();
  assert.equal(document.getElementById('tutorial-layer').children.length, 1);
  ui.openSettings();
  ui.show('screen-levels');
  ui.closeSettings();
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  assert.equal(ui._pendingTutorial, null);
  ui.show('screen-game');
  ui.toast('Stale guidance');
  ui.showTutorial(colorTutorial);
  ui.show('screen-title');
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  assert.equal(document.getElementById('toast').classList.contains('show'), false);
  assert.equal(ui.anyModalOpen(), null);
});

test('closing a tutorial returns focus to gameplay when its launcher is hidden', async () => {
  const { ui } = await makeUI();
  ui.show('screen-game');
  const launcher = document.getElementById('btn-continue');
  launcher.classList.add('hidden');
  launcher.focus();
  ui.showTutorial(colorTutorial);
  ui.dismissTutorial();
  assert.equal(document.activeElement, document.getElementById('btn-hint'));
});

test('win UI respects settings focus and modal guidance suppression', async () => {
  const { ui, game } = await makeUI();
  game.def = { id: 17 };
  game.setSettings({ sound: false });
  ui.show('screen-game');
  ui.openSettings();
  assert.equal(document.getElementById('set-lang').value, 'ko');
  ui.showWin(3, 3, 0, null);
  assert.equal(ui.anyModalOpen(), 'settings-modal');
  assert.equal(document.activeElement, document.getElementById('btn-close-settings'));
  assert.equal(ui.toast('Idle reminder', 50, { guidance: true }), false);
  assert.equal(ui.toast('Settings exported', 50), true, 'explicit action feedback remains available');
  ui.closeSettings();
  assert.equal(ui.anyModalOpen(), 'win-overlay');
  assert.equal(document.getElementById('win-overlay').contains(document.activeElement), true);
  ui.clearToast();
});
