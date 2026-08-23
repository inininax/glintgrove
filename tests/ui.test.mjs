import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';

async function makeUI() {
  installDom();
  const { Game } = await import('../src/game/game.js');
  const { UI } = await import('../src/ui/ui.js');
  const { LEVELS } = await import('../src/data/levels.js');
  const game = new Game(document.getElementById('game-canvas'));
  const ui = new UI(game, {
    getSave: () => ({ unlocked: LEVELS.length + 1, stars: { 1: 3 }, daily: {}, tipsSeen: {}, ach: {} }),
    lang: () => 'ko',
    onPlay() {},
    onSettingsForm() {},
    markIntroSeen() {},
    achContext: () => ({ chapterCleared: () => false, noHintClears: 0, streak: 0, maxStars: 78 })
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
