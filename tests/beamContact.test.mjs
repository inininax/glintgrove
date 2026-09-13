import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, trace, solve } from '../src/sim/index.js';
import { LEVELS } from '../src/data/levels.js';
import { beamFrame, beamHighlightPosition, buildBeamPlan, gateIsReached, segmentPoints, drawBeams, drawBeamContacts, drawPortalLinks } from '../src/render/beams.js';
import { drawEmitter } from '../src/render/entities.js';
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

test('every optical segment is present immediately without a growing front', () => {
  const level = levelOf(['>..T']), result = trace(level);
  assert.deepEqual(beamFrame(result, level).entries.map(entry => entry.fraction), [1, 1, 1]);
  assert.equal(beamFrame(result, level), beamFrame(result, level), 'complete geometry is reused between frames');
  for (const time of [0, .02, .5]) {
    const { ctx, events } = recordedContext();
    drawBeams(ctx, result, layout, time, { level });
    assert.ok(events.some(event => event[0] === 'lineTo' && event[1] === 300 && event[2] === 70), 'the first rendered frame already reaches the target');
  }
});

test('split branches are fully connected and moving highlights keep independent crossing paths', () => {
  const level = levelOf(['..T..', '..s.T', '..^..']), result = trace(level);
  const frame = beamFrame(result, level);
  const branches = frame.entries.filter(entry => entry.segment.x1 === 2 && entry.segment.y1 === 1);
  assert.equal(branches.length, 2);
  assert.ok(branches.every(entry => entry.fraction === 1));
  const crossing = levelOf(['..v....', '.......', '.......', '>.....T', '.......', '..T....']);
  const plan = buildBeamPlan(trace(crossing), crossing);
  const downward = plan.entries.find(entry => entry.segment.x1 === 2 && entry.segment.y1 === 3 && entry.dir === 2);
  assert.equal(downward.distance, 3, 'the quicker horizontal ray does not teleport into the vertical ray');
});

test('crystal colors and both portal ends connect immediately without a physical jump beam', () => {
  const level = levelOf(['>rP..QT']), result = trace(level);
  const arrived = beamFrame(result, level);
  assert.equal(arrived.jumps.length, 1);
  assert.equal(arrived.entries.at(-1).segment.color, 'r');
  assert.equal(arrived.entries.at(-1).fraction, 1);
  const { ctx, events } = recordedContext();
  drawPortalLinks(ctx, result, layout, 0, { frame: arrived });
  assert.ok(events.some(event => event[0] === 'bezierCurveTo'), 'only the existing decorative portal link crosses space');
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

test('visual awakening is immediate, survives turns and disconnects, and resets with run history', () => {
  const level = levelOf(['>T']), result = trace(level), fx = new TargetContactFx();
  const key = '1,0', litAt = new Map([[key, 0]]), satisfied = new Set([key]);
  fx.update(level, beamFrame(result, level), .016, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.get(key), 0, 'the artwork starts with emission rather than a delayed front');
  fx.update(level, beamFrame(trace(level), level), 2, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.get(key), 0, 'a new trace alone does not replay the artwork pop');
  fx.update(level, null, 3, new Set(), false, litAt);
  assert.equal(fx.visualAwakened.get(key), 0, 'historically awake artwork survives disconnection');
  fx.update(level, beamFrame(result, level), 4, satisfied, false, litAt);
  assert.equal(fx.contacts.get(key).arrivedAt, 4);
  assert.equal(fx.visualAwakened.get(key), 0, 'only the contact pulse repeats on reconnection');
  litAt.clear();
  fx.update(level, null, 5, new Set(), false, litAt);
  assert.equal(fx.visualAwakened.size, 0, 'reset clearing history clears render memory');
  litAt.set(key, 6);
  fx.update(level, beamFrame(result, level), 6, satisfied, true, litAt);
  assert.equal(fx.visualAwakened.get(key), 6, 'reduced motion wakes immediately without reveal');
  litAt.set(key, 7);
  fx.update(level, beamFrame(result, level), 7, satisfied, false, litAt);
  assert.equal(fx.visualAwakened.get(key), 7, 'a renewed run uses its new awakening time');
});

test('the first gameplay frame joins source, open matching gate and awake target without altering rewards', () => {
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
    assert.equal(game.beamReveal, 1);
    game.render();
    assert.ok(!events.some(event => event[0] === 'image' && event[1] === 'tree.dormant'));
    assert.ok(events.some(event => event[0] === 'image' && event[1] === 'tree.awake'));
    assert.equal(gateIsReached(beamFrame(game.trace, game.level), gate), true);
    assert.equal(game.renderer.targetFx.visualAwakened.get('3,0'), 0);
    events.length = 0; game.resetLevel(); game.render();
    assert.ok(events.some(event => event[0] === 'image' && event[1] === 'tree.awake'), 'reset also presents complete light immediately');
    assert.deepEqual([...game.awarded], awards);
    assert.equal(game.litAt.get('3,0'), 0, 'render synchronization does not alter game history');
  } finally { artAssets.get = previousGet; }
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

test('travelling highlights carry their tail across cells rather than restarting at each cell', () => {
  const level = levelOf(['>...T']), result = trace(level);
  const time = 1.05 / 1.45;
  const { ctx, events } = recordedContext();
  drawBeams(ctx, result, layout, time, { level });
  const highlightEnds = events.flatMap((event, index) => event[0] === 'stroke' && event[1] === .85 && event[2] === 'screen'
    ? [events[index - 1]] : []);
  assert.ok(highlightEnds.some(event => event[0] === 'lineTo' && Math.abs(event[1] - 140) < 1e-8));
  assert.ok(highlightEnds.some(event => event[0] === 'lineTo' && Math.abs(event[1] - 144) < 1e-8), 'the next cell continues the same moving band');
  for (const now of [0, 60, 3600, 1e8]) {
    const a = beamHighlightPosition(5, now), b = beamHighlightPosition(5, now + 1 / 60);
    const forward = b >= a ? b - a : b + 2.65 - a;
    assert.ok(Math.abs(forward - 1.45 / 60) < 1e-6, 'cyclic highlights keep constant forward speed during long sessions');
  }
});

test('beam and emitter effects stay static with reduced motion and preserve color patterns', () => {
  const level = levelOf(['>r..T']), result = trace(level);
  const early = recordedContext(), late = recordedContext();
  for (const [record, time] of [[early, 0], [late, 10000]]) {
    drawBeams(record.ctx, result, layout, time, { level, reducedMotion: true, colorblind: true });
    drawEmitter(record.ctx, level.emitters[0], layout, time, true, false);
  }
  assert.deepEqual(early.events, late.events, 'the path remains connected but no light particles or source pulse move');
  assert.ok(early.events.some(event => event[0] === 'setLineDash' && event[1].length > 0), 'color accessibility still distinguishes the carrier light');
  assert.ok(early.events.some(event => event[0] === 'ellipse'), 'the directional source glow remains visible as a still asset');
  const movingEarly = recordedContext(), movingLater = recordedContext();
  drawEmitter(movingEarly.ctx, level.emitters[0], layout, 0, true, true);
  drawEmitter(movingLater.ctx, level.emitters[0], layout, .5, true, true);
  assert.notDeepEqual(movingEarly.events, movingLater.events, 'normal mode gives the source a restrained living glow');
});

test('emitter flare follows each emission direction without requiring a new image asset', () => {
  for (const dir of [0, 1, 2, 3]) {
    const { ctx, events } = recordedContext();
    drawEmitter(ctx, { x: 0, y: 0, color: 'white', dir }, { ...layout, displayMode: 'simple' }, 0, true, false);
    const direction = events.findIndex(event => event[0] === 'rotate' && event[1] === dir * Math.PI / 2);
    const mouth = events.findIndex(event => event[0] === 'lineTo' && event[1] === 0 && event[2] === -.43);
    assert.ok(direction >= 0 && mouth > direction, 'the luminous mouth rotates with the source rather than the viewport');
    assert.ok(!events.some(event => event[0] === 'image' || event[0] === 'gradient'), 'source artwork stays original lightweight Canvas geometry');
  }
});
