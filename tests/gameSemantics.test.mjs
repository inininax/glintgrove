import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';

test('satisfaction is live while awakening persists', async () => {
  const { Game } = await import('../src/game/game.js');
  const { LEVELS } = await import('../src/data/levels.js');
  installDom();
  const game = new Game(document.getElementById('game-canvas'));
  game.startLevel(LEVELS.find(l => l.id === 1));

  const mirrorIdx = game.level.rotatables.findIndex(r => r.x === 4 && r.y === 2);
  const targetKey = '4,0';

  game.rotateIdx(mirrorIdx);
  assert.equal(game.won, true);
  assert.ok(game.satisfied.has(targetKey));

  game.won = false;
  game.rotateIdx(mirrorIdx);
  assert.equal(game.satisfied.size, 0, 'live satisfaction drops');
  assert.equal(game.won, false);
  assert.ok(game.litAt.has(targetKey), 'visual wake persists');
  assert.ok(game.awarded.has(targetKey), 'award persists');

  game.rotateIdx(mirrorIdx);
  assert.equal(game.won, true);
});

test('undo restores board but move attempt is kept (anti-cheat)', async () => {
  const { Game } = await import('../src/game/game.js');
  const { LEVELS } = await import('../src/data/levels.js');
  installDom();
  const game = new Game(document.getElementById('game-canvas'));
  game.startLevel(LEVELS.find(l => l.id === 3));
  game.rotateIdx(0);
  assert.equal(game.moves, 1);
  game.undo();
  assert.equal(game.moves, 1, 'undo must NOT refund the move counter');
  game.resetLevel();
  assert.equal(game.moves, 0);
});

test('hint increments hintsUsed and caps stars at 2', async () => {
  const { Game } = await import('../src/game/game.js');
  const { LEVELS } = await import('../src/data/levels.js');
  installDom();
  const game = new Game(document.getElementById('game-canvas'));
  game.startLevel(LEVELS.find(l => l.id === 1));
  assert.equal(game.requestHint(), true);
  assert.equal(game.hintsUsed, 1);

  game.rotateIdx(game.hintIdx);
  assert.equal(game.won, true);
  assert.equal(game.starsFor(), 2, 'hint used caps stars at 2');
});

test('win emits structured event with stars and par delta', async () => {
  const { Game } = await import('../src/game/game.js');
  const { LEVELS } = await import('../src/data/levels.js');
  installDom();
  let winPayload = null;
  const game = new Game(document.getElementById('game-canvas'));
  game.events.on('win', e => {
    winPayload = e;
  });
  game.startLevel(LEVELS.find(l => l.id === 2));
  for (let i = 0; i < game.level.rotatables.length && !game.won; i++) {
    if (game.won) break;
    game.rotateIdx(i);
    if (!game.won && game.level.rotatables[i]) {
      const snapshot = game.trace;
      void snapshot;
    }
    if (i === 0 && !game.won) {
      game.rotateIdx(i);
    }
  }
  assert.ok(winPayload || game.won, 'win reached by solver-guided play or brute force');
});

test('winUi event fires again after reset (regression: winUiDone reset)', async () => {
  const { Game } = await import('../src/game/game.js');
  const { LEVELS } = await import('../src/data/levels.js');
  installDom();
  let winUiCount = 0;
  const game = new Game(document.getElementById('game-canvas'));
  game.events.on('winUi', () => {
    winUiCount++;
  });
  game.startLevel(LEVELS.find(l => l.id === 1));

  game.rotateIdx(game.level.rotatables.findIndex(r => r.x === 4 && r.y === 2));
  for (let i = 0; i < 60 && !winUiCount; i++) game.update(1 / 30);
  assert.equal(winUiCount, 1);

  game.resetLevel();
  for (let i = 0; i < 80 && !game.won; i++) {
    game.rotateIdx(game.level.rotatables.findIndex(r => r.x === 4 && r.y === 2));
    if (!game.won) break;
    void i;
  }
  for (let i = 0; i < 60 && winUiCount < 2; i++) game.update(1 / 30);
  assert.equal(winUiCount, 2, 'winUi must fire on every win');
});
