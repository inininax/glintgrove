import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';
import { Game } from '../src/game/game.js';
import { UI } from '../src/ui/ui.js';
import { LEVELS } from '../src/data/levels.js';
import { defaults } from '../src/state/saveStore.js';
import { colorMarkPath, traceColorMark } from '../src/ui/colorMarks.js';
import { deviceAt, deviceDiagram, guideKinds } from '../src/ui/deviceGuide.js';
import { STRINGS, setLanguage } from '../src/ui/strings.js';

function fixture() {
  installDom(); setLanguage('ko');
  const save = defaults();
  const game = new Game(document.getElementById('game-canvas'));
  game.setSettings({ sound: false, motion: false });
  game.startLevel(LEVELS[16]);
  const ui = new UI(game, {
    getSave: () => save, lang: () => 'ko',
    onTutorialDone() { throw new Error('Reading a guide must not mark tutorials as completed'); },
    onSettingsForm() { throw new Error('Guide must not write settings'); }
  });
  ui.show('screen-game');
  return { ui, game, save };
}

const gameplay = game => JSON.stringify({
  moves: game.moves, hints: game.hintsUsed, orients: game.level.rotatables.map(piece => piece.orient),
  stars: game.starsFor(), satisfied: [...game.satisfied], awarded: [...game.awarded],
  undo: game.undoStack, won: game.won
});

test('free guide reads relevant rules without affecting hints, progress or board state', () => {
  const { ui, game, save } = fixture();
  const beforeGame = gameplay(game), beforeSave = JSON.stringify(save);
  document.getElementById('btn-guide').focus();
  document.getElementById('guide-modal').scrollTop = 600;
  assert.equal(ui.openGuide(), true);
  assert.equal(document.activeElement, document.getElementById('guide-title'));
  assert.equal(document.getElementById('guide-modal').scrollTop, 0, 'a previously scrolled guide reopens at its title');
  const rows = document.getElementById('guide-content').children;
  assert.equal(rows.filter(row => row.className === 'device-guide-row').length, guideKinds(game.level).length);
  assert.ok(rows.some(row => row.className === 'device-color-legend'));
  assert.equal(ui.anyModalOpen(), 'guide-modal');
  assert.equal(ui.canPlay(), false);
  ui.closeGuide();
  assert.equal(ui.canPlay(), true);
  assert.equal(document.activeElement, document.getElementById('btn-guide'));
  assert.equal(gameplay(game), beforeGame);
  assert.equal(JSON.stringify(save), beforeSave);
});

test('device inspection teaches the selected object and leaves mirror taps for play', () => {
  const { ui, game } = fixture();
  const layout = game.renderer.layout(game.level);
  const point = item => [layout.ox + (item.x + .5) * layout.cell, layout.oy + (item.y + .5) * layout.cell];
  const before = gameplay(game);
  for (const [kind, item] of [['crystal', game.level.crystals[0]], ['gate', game.level.gates[0]], ['target', game.level.targets[0]]]) {
    assert.equal(deviceAt(game.level, layout, ...point(item)).kind, kind);
    assert.equal(ui.inspectAt(...point(item)), true);
    assert.equal(document.getElementById('guide-content').children.filter(row => row.className === 'device-guide-row').length, 1);
    ui.closeGuide();
  }
  assert.equal(ui.inspectAt(...point(game.level.rotatables[0])), false);
  assert.equal(ui.inspectAt(-100, -100), false);
  assert.equal(gameplay(game), before);
});

test('guide traps focus, suppresses competing guidance and does not stack dialogs', () => {
  const { ui, game } = fixture();
  ui.toast('A stale message');
  ui.openGuide();
  const close = document.getElementById('btn-close-guide');
  assert.equal(document.activeElement, document.getElementById('guide-title'));
  for (const shiftKey of [false, true]) {
    let prevented = false;
    document.dispatchEvent({ type: 'keydown', key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(document.activeElement, close);
  }
  assert.equal(document.getElementById('toast').classList.contains('show'), false);
  assert.equal(ui.toast('No overlap'), false);
  assert.equal(ui.openSettings(), false);
  assert.equal(ui.openGuide(), false);
  assert.equal(ui.showIntro(), false);
  ui.showWin(game.moves, game.def.par, 0, null);
  assert.equal(document.getElementById('guide-modal').classList.contains('hidden'), true);
  assert.equal(ui.anyModalOpen(), 'win-overlay');
  assert.equal(ui.canPlay(), false);
});

test('guide defers a live teaching pointer and screen changes discard it', () => {
  const { ui } = fixture();
  ui.showTutorial({ type: 'pointer', levelId: 1, x: 2, y: 2 });
  assert.ok(document.getElementById('tutorial-layer').children.length);
  ui.openGuide();
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  ui.closeGuide();
  assert.ok(document.getElementById('tutorial-layer').children.length);
  ui.openGuide();
  ui.show('screen-levels');
  ui.closeGuide();
  assert.equal(document.getElementById('tutorial-layer').children.length, 0);
  assert.equal(ui.anyModalOpen(), null);
});

test('title help does not depend on the last level and game guidance restores its own heading', () => {
  const { ui, game, save } = fixture();
  const beforeSave = JSON.stringify(save);
  const originalLevel = game.level;
  ui.show('screen-title');
  game.won = true;
  game.level = null;
  document.getElementById('btn-title-help').focus();
  assert.equal(ui.openGuide(), true, 'completed or absent game state must not hide title help');
  const rows = document.getElementById('guide-content').children;
  assert.equal(rows.filter(row => row.className === 'device-guide-row').length, 7);
  assert.equal(rows[0].className, 'guide-introduction');
  assert.equal(document.getElementById('guide-title').getAttribute('data-i18n'), 'helpTitle');
  let prevented = false;
  document.dispatchEvent({ type: 'keydown', key: 'Tab', shiftKey: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, document.getElementById('btn-close-guide'));
  ui.closeGuide();
  assert.equal(document.activeElement, document.getElementById('btn-title-help'));
  assert.equal(JSON.stringify(save), beforeSave);
  game.level = originalLevel;
  game.won = false;
  ui.show('screen-game');
  assert.equal(ui.openGuide(), true);
  assert.equal(document.getElementById('guide-title').getAttribute('data-i18n'), 'guideTitle');
  assert.ok(document.getElementById('guide-content').children.every(row => row.className !== 'guide-introduction'));
  ui.closeGuide();
});

test('color identity remains distinct without hue and the diagrams use the board geometry', () => {
  assert.equal(new Set(['r', 'g', 'b'].map(colorMarkPath)).size, 3);
  const command = { moveTo: 'M', lineTo: 'L', bezierCurveTo: 'C', closePath: 'Z' };
  for (const color of ['r', 'g', 'b']) {
    const drawn = [];
    const ctx = { beginPath() {} };
    for (const [method, letter] of Object.entries(command)) ctx[method] = (...values) => drawn.push(letter + values.join(' '));
    traceColorMark(ctx, color);
    const path = colorMarkPath(color);
    assert.equal(drawn.join(' '), path, `${color}: the legend and rendered badge must show the same shape`);
    assert.ok(path.includes('Z'), 'color mark has a recognizable closed outline');
    assert.ok(deviceDiagram('color', color).includes(`d="${path}"`));
    for (const lang of ['ko', 'en']) assert.ok(STRINGS[lang][`colorMark${color.toUpperCase()}`]);
  }
  for (const lang of ['ko', 'en']) {
    for (const key of ['introBody3', 'tutCardColorBody', 'tip17']) {
      assert.doesNotMatch(STRINGS[lang][key], /r[\/·]g|A[\/·]B/);
    }
  }
});
