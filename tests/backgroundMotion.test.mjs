import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom, makeCtxStub } from './helpers/domStub.mjs';
import { Game } from '../src/game/game.js';
import { artAssets } from '../src/assets/assetStore.js';
import { drawAtmosphere } from '../src/render/background.js';

function fixture() {
  const nodes = installDom();
  const draws = new Map();
  let allocations = 0;
  const instrument = canvas => {
    const calls = [];
    draws.set(canvas, calls);
    const context = makeCtxStub();
    canvas.getContext = () => new Proxy(context, {
      get(target, key) {
        if (key === 'drawImage') return (...args) => calls.push(args);
        return target[key];
      }
    });
  };
  instrument(nodes['game-canvas']);
  const create = document.createElement;
  document.createElement = tag => {
    const node = create(tag);
    if (tag === 'canvas') { allocations++; instrument(node); }
    return node;
  };
  const game = new Game(nodes['game-canvas']);
  game.setSettings({ sound: false, motion: true });
  game.renderer.resize();
  return { game, draws, mainDraws: draws.get(nodes['game-canvas']), allocations: () => allocations };
}

test('title animates before any level exists, with cached atmosphere and no new canvases each frame', () => {
  const { game, mainDraws, allocations } = fixture();
  game.render();
  const first = mainDraws.map(args => args.slice(1));
  const initialAllocations = allocations();
  mainDraws.length = 0;
  for (let i = 0; i < 60; i++) { game.update(1 / 60); game.render(); }
  assert.equal(game.level, null);
  assert.ok(game.renderer.backgroundTime > .9, 'the title has its own advancing atmosphere');
  const last = mainDraws.slice(-first.length).map(args => args.slice(1));
  assert.notDeepEqual(last, first, 'the rendered atmosphere actually moves');
  assert.equal(allocations(), initialAllocations, 'light and fog canvases are reused');
  assert.equal(game.renderer.boardCanvas, null, 'the title does not include a puzzle slab');
});

test('saved motion preference freezes and resumes the existing atmosphere without a jump', () => {
  const { game, mainDraws } = fixture();
  game.render();
  for (let i = 0; i < 60; i++) { game.update(1 / 60); game.render(); }
  const atPause = game.renderer.backgroundTime;
  game.setSettings({ motion: false });
  mainDraws.length = 0;
  game.update(1 / 60); game.render();
  const pausedDraws = mainDraws.map(args => [...args]);
  mainDraws.length = 0;
  game.update(3); game.render();
  assert.deepEqual(mainDraws, pausedDraws, 'all atmospheric drawing stays on the paused frame');
  assert.equal(game.renderer.backgroundTime, atPause);
  game.setSettings({ motion: true });
  game.update(1 / 60); game.render();
  assert.ok(Math.abs(game.renderer.backgroundTime - atPause - 1 / 60) < 1e-9);
});

test('OS reduced motion is respected at startup and when it changes while the page is open', () => {
  const previous = globalThis.matchMedia;
  const preference = { matches: true };
  globalThis.matchMedia = query => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return preference;
  };
  try {
    const { game } = fixture();
    game.render(); game.update(1); game.render();
    assert.equal(game.renderer.backgroundTime, 0);
    preference.matches = false;
    game.update(1 / 60); game.render();
    assert.ok(game.renderer.backgroundTime > 0);
    const atPause = game.renderer.backgroundTime;
    preference.matches = true;
    game.update(1); game.render();
    assert.equal(game.renderer.backgroundTime, atPause);
  } finally {
    if (previous === undefined) delete globalThis.matchMedia;
    else globalThis.matchMedia = previous;
  }
});

test('animated atmosphere is below the separately cached board and all puzzle pieces', () => {
  const previousGet = artAssets.get;
  artAssets.get = id => ({ image: { assetId: id }, width: 384, height: 384, scale: .9, anchor: [.5, .5] });
  try {
    const { game, draws, mainDraws } = fixture();
    document.body.dataset.screen = 'game';
    game.setSettings({ motion: false });
    game.startLevel({ id: 909, par: 1, grid: ['>./..T#', '.......', '.......'] });
    game.render();
    const renderer = game.renderer;
    const boardIndex = mainDraws.findIndex(([image]) => image === renderer.boardCanvas);
    assert.equal(mainDraws[0][0], renderer.bgCanvas);
    for (const image of [renderer.atmosphere.shafts, renderer.atmosphere.mist, renderer.atmosphere.mote]) {
      const indices = mainDraws.flatMap(([drawn], index) => drawn === image ? [index] : []);
      assert.ok(indices.length > 0);
      assert.ok(indices.every(index => index > 0 && index < boardIndex), 'atmosphere is never drawn over the slab');
    }
    const pieces = mainDraws.flatMap(([image], index) => image?.assetId ? [index] : []);
    assert.ok(pieces.length >= 3);
    assert.ok(pieces.every(index => index > boardIndex), 'interactive pieces stay in front');
    assert.ok(draws.get(renderer.boardCanvas).some(([image]) => image?.assetId?.startsWith('rock')));
    assert.ok(!draws.get(renderer.bgCanvas).some(([image]) => image?.assetId?.startsWith('rock')), 'walls belong to the board layer');

    document.body.dataset.screen = 'levels';
    game.setSettings({ motion: true });
    game.render();
    const mapTime = renderer.backgroundTime;
    game.update(1 / 60); game.render();
    assert.ok(renderer.backgroundTime > mapTime, 'the map continues animating after gameplay');
    assert.equal(renderer.boardCanvas, null, 'the map removes the puzzle slab');
  } finally {
    artAssets.get = previousGet;
  }
});

test('quiet atmosphere stays sparse on large screens and never resets its drifting layers', () => {
  const atmosphere = { shafts: {}, mist: {}, mote: {}, strength: 1 };
  const frame = time => {
    const draws = [];
    const ctx = {
      save() {}, restore() {}, beginPath() {}, ellipse() {}, stroke() {},
      drawImage(image, x, y, width, height) {
        draws.push({ image, x, y, width, height, alpha: this.globalAlpha });
      }
    };
    drawAtmosphere(ctx, 3840, 2160, time, atmosphere);
    return draws;
  };
  for (const time of [0, 60, 300, 3600]) {
    const current = frame(time), next = frame(time + 1 / 60);
    const motes = current.filter(draw => draw.image === atmosphere.mote);
    assert.ok(motes.length <= 12, 'a larger screen does not become a dense particle field');
    assert.ok(motes.every(draw => draw.alpha >= 0 && draw.alpha < .4), 'fireflies remain dim background accents');
    assert.equal(current.length, next.length);
    for (let i = 0; i < current.length; i++) {
      assert.ok(Math.abs(next[i].x - current[i].x) < .5, 'horizontal drift never wraps or jumps');
      assert.ok(Math.abs(next[i].y - current[i].y) < .5, 'vertical drift never wraps or jumps');
      assert.ok(Math.abs(next[i].alpha - current[i].alpha) < .002, 'light changes without flashing');
    }
  }
});

test('title mist has visible depth over a few seconds while leaving game motion restrained', () => {
  const atmosphere = { shafts: {}, mist: {}, mote: {}, water: {}, strength: 1 };
  const frame = (time, title) => {
    const draws = [], reflections = [];
    const ctx = {
      save() {}, restore() {}, beginPath() {}, stroke() {},
      ellipse(...geometry) { reflections.push({ geometry, alpha: this.globalAlpha }); },
      drawImage(image, x, y, width, height) { draws.push({ image, x, y, width, height, alpha: this.globalAlpha }); }
    };
    drawAtmosphere(ctx, 390, 844, time, atmosphere, title);
    return { draws, reflections };
  };
  const title = frame(0, true), later = frame(5, true), game = frame(0, false);
  const fog = title.draws.filter(item => item.image === atmosphere.mist);
  const laterFog = later.draws.filter(item => item.image === atmosphere.mist);
  const farTravel = Math.abs(laterFog[0].x - fog[0].x), nearTravel = Math.abs(laterFog[2].x - fog[2].x);
  assert.ok(nearTravel >= 8, 'foreground mist visibly crosses several mobile pixels within five seconds');
  assert.ok(nearTravel > farTravel * 2, 'near and distant fog do not slide as one flat layer');
  assert.ok(fog[0].alpha < fog[2].alpha, 'distant fog remains fainter than the near layer');
  assert.equal(title.draws.filter(item => item.image === atmosphere.water).length, 1);
  assert.equal(game.draws.filter(item => item.image === atmosphere.water).length, 0, 'the title water layer is absent during play');
  const motes = title.draws.filter(item => item.image === atmosphere.mote);
  assert.equal(motes.length, game.draws.filter(item => item.image === atmosphere.mote).length, 'readability does not come from adding particles');
  assert.ok(motes.every(item => item.x + item.width / 2 < 390 * .3 || item.x + item.width / 2 > 390 * .7), 'title copy retains a quiet central lane');
  assert.equal(title.reflections.length, game.reflections.length, 'water detail density remains fixed');
  assert.ok(title.reflections.some((item, index) => Math.abs(item.alpha - later.reflections[index].alpha) > .02), 'water light changes perceptibly rather than remaining static');
});

test('enhanced title motion remains continuous and bounded at long running times', () => {
  const atmosphere = { shafts: {}, mist: {}, mote: {}, water: {}, strength: 1 };
  const frame = time => {
    const draws = [];
    const ctx = {
      save() {}, restore() {}, beginPath() {}, ellipse() {}, stroke() {},
      drawImage(image, x, y, width, height) { draws.push({ image, x, y, width, height, alpha: this.globalAlpha }); }
    };
    drawAtmosphere(ctx, 3840, 2160, time, atmosphere, true);
    return draws;
  };
  for (const time of [0, 60, 3600, 1e8]) {
    const before = frame(time), after = frame(time + 1 / 60);
    assert.equal(before.length, after.length);
    assert.ok(before.filter(item => item.image === atmosphere.mote).length <= 12);
    for (let i = 0; i < before.length; i++) {
      assert.ok(Math.abs(after[i].x - before[i].x) < .5, 'no looping position reset or fast horizontal jump');
      assert.ok(Math.abs(after[i].y - before[i].y) < .5, 'vertical drift stays gentle');
      assert.ok(Math.abs(after[i].alpha - before[i].alpha) < .002, 'no step in light opacity');
      assert.ok(before[i].alpha >= 0 && before[i].alpha < .51, 'every layer remains bounded');
    }
  }
});

test('enhanced layer belongs to the title and reuses its stamp after screen changes', () => {
  const { game, mainDraws, allocations } = fixture();
  document.body.dataset.screen = 'title';
  game.startLevel({ id: 910, par: 1, grid: ['>./..T'] }, { demo: true });
  game.render();
  const titleWater = game.renderer.atmosphere.water;
  assert.ok(mainDraws.some(([image]) => image === titleWater));
  const afterBuild = allocations();
  mainDraws.length = 0;
  document.body.dataset.screen = 'levels';
  game.update(1 / 60); game.render();
  assert.ok(!mainDraws.some(([image]) => image === titleWater));
  mainDraws.length = 0;
  document.body.dataset.screen = 'title';
  game.update(1 / 60); game.render();
  assert.ok(mainDraws.some(([image]) => image === titleWater));
  assert.equal(allocations(), afterBuild, 'title and map reuse the same cached art and atmospheric stamps');
});
