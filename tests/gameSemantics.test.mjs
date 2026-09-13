import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/domStub.mjs';
import { solve } from '../src/sim/solver.js';

// Small engine fixtures stay independent of the published level catalogue.
const WIN_A = { id: 901, par: 1, grid: ['.....', '..T..', '.....', '>.\\..'] };
const WIN_B = { id: 902, par: 1, grid: ['..v...', '......', '../.T.', '......'] };

function finishRun(game) {
  const solution = solve(game.level);
  assert.ok(solution && solution.moves > 0, 'fixture begins unsolved');
  for (const index of solution.flips) game.rotateIdx(index);
  assert.equal(game.won, true);
  for (let i = 0; i < 120; i++) game.update(1 / 60);
}

for (const restart of ['next level', 'replay via startLevel', 'resetLevel']) {
  test(`winUi fires exactly once per run after ${restart}`, async () => {
    const { Game } = await import('../src/game/game.js');
    installDom();
    const game = new Game(document.getElementById('game-canvas'));
    game.setSettings({ sound: false, motion: false });
    const presented = [];
    game.events.on('winUi', current => presented.push(current.def.id));
    game.startLevel(WIN_A);
    finishRun(game);
    assert.deepEqual(presented, [WIN_A.id], 'first clear presents once');

    if (restart === 'resetLevel') game.resetLevel();
    else game.startLevel(restart === 'next level' ? WIN_B : WIN_A);
    assert.deepEqual(presented, [WIN_A.id], 'starting a run does not present a win');
    finishRun(game);
    assert.deepEqual(presented, [WIN_A.id, restart === 'next level' ? WIN_B.id : WIN_A.id],
      'the next first clear must present once, even after a previous win');
  });
}

const TWO_TURNS = { id: 903, par: 2, grid: ['.......', '..\\..T.', '.......', '>.\\....'] };

async function fixtureGame(def) {
  const { Game } = await import('../src/game/game.js');
  installDom();
  const game = new Game(document.getElementById('game-canvas'));
  game.setSettings({ sound: false, motion: false });
  game.startLevel(def);
  return game;
}

test('satisfaction is live while awakening persists', async () => {
  const game = await fixtureGame(WIN_A);
  const mirrorIdx = solve(game.level).flips[0];
  const target = game.level.targets[0];
  const targetKey = `${target.x},${target.y}`;
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
  const game = await fixtureGame(TWO_TURNS);
  const initial = game.level.rotatables.map(r => r.orient);
  const solution = solve(game.level);
  assert.equal(solution.moves, 2);
  game.rotateIdx(solution.flips[0]);
  assert.equal(game.won, false);
  assert.equal(game.moves, 1);
  assert.equal(game.undo(), true);
  assert.deepEqual(game.level.rotatables.map(r => r.orient), initial);
  assert.equal(game.moves, 1, 'undo must NOT refund the move counter');
  game.resetLevel();
  assert.equal(game.moves, 0);
});

test('hint increments hintsUsed and caps stars at 2', async () => {
  const game = await fixtureGame(WIN_A);
  assert.equal(game.requestHint(), true);
  assert.equal(game.hintsUsed, 1);
  game.rotateIdx(game.hintIdx);
  assert.equal(game.won, true);
  assert.equal(game.starsFor(), 2, 'hint used caps stars at 2');
});

test('win emits structured event with stars and par', async () => {
  const game = await fixtureGame(WIN_B);
  const events = [];
  game.events.on('win', payload => events.push(payload));
  finishRun(game);
  assert.deepEqual(events, [{ id: WIN_B.id, moves: 1, par: 1, stars: 3, hints: 0, daily: null }]);
});

test('initial reduced motion disables victory bloom before any UI listener exists', async () => {
  const game = await fixtureGame(WIN_A);
  assert.equal(game.renderer.bloom.enabled, false);
  for (const index of solve(game.level).flips) game.rotateIdx(index);
  game.renderer.resize();
  game.render();
  assert.equal(game.renderer.bloom.pulse, 0, 'disabled bloom does not add a changing full-frame effect');
  game.setSettings({ motion: true });
  assert.equal(game.renderer.bloom.enabled, true);
});
