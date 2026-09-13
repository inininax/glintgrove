import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, trace, solve } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';
import { beamFrame, buildBeamPlan, gateIsReached, segmentPoints, drawBeamContacts, drawPortalLinks } from '../src/render/beams.js';
import { TargetContactFx } from '../src/render/targetFx.js';
import { installDom } from './helpers/domStub.mjs';
import { artAssets } from '../src/assets/assetStore.js';
import { Game } from '../src/game/game.js';

const layout = { cell: 80, ox: 20, oy: 30 };
const levelOf = (grid, meta) => parseLevel({ id: 9001, grid, meta });
function recordedContext() {
  const events = [], stack = [];
  const ctx = { globalAlpha: 1, globalCompositeOperation: 'source-over',
    save() { stack.push({ globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation }); },
    restore() { Object.assign(this, stack.pop()); },
    createRadialGradient(...args) { events.push(['gradient', ...args]); return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    stroke() { events.push(['stroke', this.globalAlpha, this.globalCompositeOperation]); },
    fill() { events.push(['fill', this.globalAlpha, this.globalCompositeOperation]); },
    drawImage(image) { events.push(['image', image.assetId || 'canvas']); }
  };
  for (const method of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'translate', 'scale', 'rotate', 'rect', 'clip', 'setTransform', 'setLineDash', 'fillRect', 'clearRect']) {
    ctx[method] = (...args) => events.push([method, ...args]);
  }
  return { ctx, events };
}

test('all four target approaches reach the optical center without changing collision semantics', () => {
  for (const grid of [['>T'], ['T<'], ['v', 'T'], ['T', '^']]) {
    const level = levelOf(grid), result = trace(level), before = JSON.stringify(result.segments);
    const entry = beamFrame(result, level).entries.find(item => item.target);
    assert.equal(entry.segment.endFrac, .5);
    assert.equal(entry.length, 1);
    const end = segmentPoints(entry.segment, layout, entry.fraction, entry.length);
    assert.deepEqual(end.slice(2), [layout.ox + (entry.target.x + .5) * layout.cell, layout.oy + (entry.target.y + .5) * layout.cell]);
    assert.equal(JSON.stringify(result.segments), before, 'render planning never mutates trace');
    const { ctx, events } = recordedContext();
    drawBeamContacts(ctx, beamFrame(result, level), layout);
    assert.ok(events.some(event => event[0] === 'lineTo' && event[1] === end[2] && event[2] === end[3]), 'foreground contact reaches the same receiving point');
  }
});

test('blocked gates meet the light membrane; walls retain their separate collision endpoint', () => {
  for (const [grid, expected, traceFraction] of [[['>A'], .82, .32], [['>#'], .72, .72]]) {
    const level = levelOf(grid), result = trace(level), entry = beamFrame(result, level).entries[0];
    assert.equal(entry.length, expected);
    assert.equal(entry.segment.endFrac, traceFraction);
    assert.equal(result.segments.length, 1, 'blocked beams never emerge behind the obstacle');
  }
});

test('initial reveal follows a connected front instead of starting every cell at once', () => {
  const level = levelOf(['>..T']), result = trace(level);
  assert.deepEqual(beamFrame(result, level, .5).entries.map(entry => entry.fraction), [1, .5, 0]);
  assert.deepEqual(beamFrame(result, level, 0).entries.map(entry => entry.fraction), [0, 0, 0]);
  assert.ok(beamFrame(result, level, 0, true).entries.every(entry => entry.fraction === 1), 'reduced motion shows complete paths immediately');
});

test('split branches reveal together from the reached splitter and crossings remain independent', () => {
  const level = levelOf(['..T..', '..s.T', '..^..']), result = trace(level);
  const frame = beamFrame(result, level, .5);
  assert.equal(frame.frontier, 1.5);
  const branches = frame.entries.filter(entry => entry.segment.x1 === 2 && entry.segment.y1 === 1);
  assert.equal(branches.length, 2);
  assert.ok(branches.every(entry => entry.fraction === .5));
  const crossing = levelOf(['..v....', '.......', '.......', '>.....T', '.......', '..T....']);
  const plan = buildBeamPlan(trace(crossing), crossing);
  const downward = plan.entries.find(entry => entry.segment.x1 === 2 && entry.segment.y1 === 3 && entry.dir === 2);
  assert.equal(downward.distance, 3, 'the quicker horizontal ray does not teleport into the vertical ray');
});

test('crystal colors and portal exits retain causal reveal without a physical jump beam', () => {
  const level = levelOf(['>rP..QT']), result = trace(level);
  const beforePortal = beamFrame(result, level, 1.9 / 3);
  assert.equal(beforePortal.jumps.length, 0);
  assert.equal(beforePortal.entries.at(-1).fraction, 0);
  const arrived = beamFrame(result, level, 2.3 / 3);
  assert.equal(arrived.jumps.length, 1);
  assert.equal(arrived.entries.at(-1).segment.color, 'r');
  assert.ok(Math.abs(arrived.entries.at(-1).fraction - .3) < 1e-12);
  const { ctx, events } = recordedContext();
  drawPortalLinks(ctx, result, layout, 5, { frame: beforePortal });
  assert.ok(!events.some(event => event[0] === 'bezierCurveTo'), 'portal decoration waits for entry light');
  assert.ok(!arrived.entries.some(entry => entry.segment.portalJump), 'there is no solid beam across space');
});

test('closed optical loops and every campaign solution retain every traced segment', () => {
  const loop = levelOf(['/>.\\', '....', '\\../']);
  assert.ok(buildBeamPlan(trace(loop), loop).entries.every(entry => Number.isFinite(entry.distance)));
  for (const def of LEVELS) {
    const level = parseLevel(def);
    for (const solved of [false, true]) {
      if (solved) for (const index of solve(level).flips) level.rotatables[index].orient ^= 1;
      const result = trace(level), frame = beamFrame(result, level);
      assert.equal(frame.entries.length, result.segments.filter(segment => !segment.portalJump).length);
      assert.ok(frame.entries.every(entry => entry.fraction > .999999), `L${def.id} ${solved ? 'solution' : 'initial'} has unreachable visual segments`);
    }
  }
});

test('current target contact gates arrival pulses, wrong-color feedback and reconnection', () => {
  const level = levelOf(['>T']), result = trace(level), key = '1,0', fx = new TargetContactFx();
  fx.update(level, beamFrame(result, level, .9), 0, new Set([key]));
  assert.equal(fx.contacts.size, 0, 'no success halo before the optical front arrives');
  fx.update(level, beamFrame(result, level), 1, new Set([key]));
  assert.equal(fx.contacts.get(key).arrivedAt, 1);
  fx.update(level, beamFrame(result, level), 3, new Set([key]));
  assert.equal(fx.contacts.get(key).arrivedAt, 1, 'steady contact does not respawn pulses');
  fx.update(level, null, 4, new Set());
  assert.equal(fx.contacts.size, 0, 'a disconnected historical awake target has no current halo');
  fx.update(level, beamFrame(result, level), 5, new Set([key]));
  assert.equal(fx.contacts.get(key).arrivedAt, 5, 'reconnection can give a new arrival without changing game rewards');
  fx.update(level, beamFrame(result, level), 6, new Set());
  const wrong = recordedContext(); fx.draw(wrong.ctx, layout, 6.3);
  assert.ok(wrong.events.some(event => event[0] === 'arc'), 'wrong color still reaches a receiving point');
  assert.ok(!wrong.events.some(event => event[0] === 'ellipse' || event[0] === 'gradient'), 'wrong color cannot receive success halo or ring');
});

test('reduced motion makes persistent target contact identical across time', () => {
  const level = levelOf(['>T']), frame = beamFrame(trace(level), level), fx = new TargetContactFx();
  fx.update(level, frame, 0, new Set(['1,0']), true);
  const first = recordedContext(), later = recordedContext();
  fx.draw(first.ctx, layout, .3); fx.draw(later.ctx, layout, 120);
  assert.deepEqual(first.events, later.events);
});

test('visual awakening waits for arrival, survives turns and disconnects, and resets with run history', () => {
  const level = levelOf(['>T']), result = trace(level), fx = new TargetContactFx();
  const key = '1,0', litAt = new Map([[key, 0]]), satisfied = new Set([key]);
  fx.update(level, beamFrame(result, level, 0), 0, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.has(key), false);
  fx.update(level, beamFrame(result, level), .625, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.get(key), .625, 'the artwork pop uses visual arrival time');
  fx.update(level, beamFrame(trace(level), level), 2, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.get(key), .625, 'a new trace alone does not replay the artwork pop');
  fx.update(level, null, 3, new Set(), false, litAt);
  assert.equal(fx.visualAwakened.get(key), .625, 'historically awake artwork survives disconnection');
  fx.update(level, beamFrame(result, level), 4, satisfied, false, litAt);
  assert.equal(fx.contacts.get(key).arrivedAt, 4);
  assert.equal(fx.visualAwakened.get(key), .625, 'only the contact pulse repeats on reconnection');
  litAt.clear();
  fx.update(level, null, 5, new Set(), false, litAt);
  assert.equal(fx.visualAwakened.size, 0, 'reset clearing history clears render memory');
  litAt.set(key, 6);
  fx.update(level, beamFrame(result, level, 0, true), 6, satisfied, true, litAt);
  assert.equal(fx.visualAwakened.get(key), 6, 'reduced motion wakes immediately without reveal');
  litAt.set(key, 7);
  fx.update(level, beamFrame(result, level, 0), 7, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.size, 0, 'a renewed award also resets when reset/retrace share one frame');
});

test('matched gates stay sealed and target artwork stays dormant until each incoming front arrives', () => {
  const nodes = installDom(), previousGet = artAssets.get;
  const { ctx, events } = recordedContext();
  nodes['game-canvas'].getContext = () => ctx;
  artAssets.get = id => ({ image: { assetId: id }, width: 384, height: 384, scale: .9, anchor: [.5, .5] });
  try {
    document.body.dataset.screen = 'game';
    const game = new Game(nodes['game-canvas']);
    game.setSettings({ sound: false, motion: true }); game.renderer.resize();
    game.startLevel({ id: 9003, grid: ['>rAT'] });
    const gate = game.level.gates[0];
    assert.equal(game.satisfied.has('3,0'), true, 'game satisfaction remains immediate');
    const awards = [...game.awarded];
    game.render();
    assert.ok(events.some(event => event[0] === 'image' && event[1] === 'tree.dormant'));
    assert.ok(!events.some(event => event[0] === 'image' && event[1] === 'tree.awake'));
    assert.equal(gateIsReached(beamFrame(game.trace, game.level, .6), gate), false);
    assert.equal(gateIsReached(beamFrame(game.trace, game.level, .8), gate), true);
    assert.equal(gateIsReached(beamFrame(game.trace, game.level, 0, true), gate), true);
    events.length = 0; game.beamReveal = .8; game.time = .5; game.render();
    assert.ok(events.some(event => event[0] === 'image' && event[1] === 'tree.dormant'));
    events.length = 0; game.beamReveal = 1; game.time = .625; game.render();
    assert.ok(events.some(event => event[0] === 'image' && event[1] === 'tree.awake'));
    assert.equal(game.renderer.targetFx.visualAwakened.get('3,0'), .625);
    assert.deepEqual([...game.awarded], awards);
    assert.equal(game.litAt.get('3,0'), 0, 'render synchronization does not alter game history');
  } finally { artAssets.get = previousGet; }
});

test('pre-arrival target bursts stay suppressed instead of popping in halfway through their flight', () => {
  const level = levelOf(['>T']), result = trace(level), fx = new TargetContactFx();
  const key = '1,0', litAt = new Map([[key, 0]]), satisfied = new Set([key]);
  const targetBurst = { x: 140, y: 70, age: .3 }, sourceSpark = { x: 60, y: 70, age: .3 };
  const items = [targetBurst, sourceSpark];
  fx.update(level, beamFrame(result, level, .5), .3, satisfied, false, litAt);
  assert.deepEqual(fx.visibleParticles(items, layout, .3), [sourceSpark]);
  fx.update(level, beamFrame(result, level), .625, satisfied, false, litAt);
  const lateBurst = { x: 140, y: 70, age: .8 };
  const newBurst = { x: 140, y: 70, age: .1 };
  assert.deepEqual(fx.visibleParticles([lateBurst, newBurst], layout, .8), [newBurst]);
  assert.equal(items.length, 2, 'particle lifecycle and simulation arrays stay untouched');
});

test('contact strips and target halos render above opaque pieces while primary beams remain behind', () => {
  const nodes = installDom(), previousGet = artAssets.get;
  const { ctx, events } = recordedContext();
  nodes['game-canvas'].getContext = () => ctx;
  artAssets.get = id => ({ image: { assetId: id }, width: 384, height: 384, scale: .9, anchor: [.5, .5] });
  try {
    document.body.dataset.screen = 'game';
    const game = new Game(nodes['game-canvas']);
    game.setSettings({ sound: false, motion: false }); game.renderer.resize();
    game.startLevel({ id: 9002, grid: ['>T'] }); game.render();
    const target = events.findIndex(event => event[0] === 'image' && event[1] === 'tree.awake');
    assert.ok(target >= 0);
    assert.ok(events.slice(0, target).some(event => event[0] === 'stroke' && event[1] === .76));
    assert.ok(events.slice(target + 1).some(event => event[0] === 'stroke' && event[1] === .75 && event[2] === 'screen'));
    assert.ok(events.slice(target + 1).some(event => event[0] === 'gradient'));
  } finally { artAssets.get = previousGet; }
});
