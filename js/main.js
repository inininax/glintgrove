(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};

  function boot() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas || !GG.Game) return;

    let currentDef = null;
    const game = new GG.Game(canvas);
    const data0 = GG.save.load();
    game.setSettings({ sound: data0.sound, motion: data0.motion, colorblind: data0.colorblind });

    const hooks = {
      onPlay(id) {
        const def = GG.LEVELS.find(l => l.id === id);
        if (!def) return;
        currentDef = def;
        game.startLevel(def);
        ui.setHud(def, 0, def.par);
        ui.show('screen-game');
        ui.hideWin();
        if (def.id === 1 && !GG.save.load().seenIntro) ui.showIntro();
      },
      onWin(g) {
        const stars = g.starsFor(g.moves, g.def.par, g.hintsUsed);
        const data = GG.save.load();
        GG.save.completeLevel(data, g.def.id, stars);
      },
      onWinUi(g) {
        try {
          ui.showWin(g.moves, g.def.par, g.starsFor(g.moves, g.def.par, g.hintsUsed));
          window.__winShownByLoop = true;
        } catch (e) {
          window.__winUiError = String(e && e.stack || e);
        }
      }
    };
    game.hooks = hooks;
    const ui = new GG.UI(game, hooks);
    window.__gg = { game, ui };

    function resize() {
      game.renderer.resize();
      if (game.level) game.particles.reset(game.seed, game.W(), game.H(), { reducedMotion: !game.settings.motion });
    }
    window.addEventListener('resize', resize);

    canvas.addEventListener('pointerdown', ev => {
      if (game.settings.sound) game.sound.ensure();
      const rect = canvas.getBoundingClientRect();
      game.pointerDown(ev.clientX - rect.left, ev.clientY - rect.top);
    });

    document.addEventListener('keydown', ev => {
      if (ui.currentScreen !== 'screen-game') return;
      const k = ev.key.toLowerCase();
      if (k === 'r') game.resetLevel();
      else if (k === 'u' || k === 'z') game.undo();
      else if (k === 'h') { game.requestHint(); ui.showHintToast(); }
      else if (k === 'escape') { ui.show('screen-levels'); ui.renderLevelSelect(); }
    });

    function bind(id, fn) {
      const node = document.getElementById(id);
      if (node) node.addEventListener('click', () => {
        if (game.settings.sound) { game.sound.ensure(); game.sound.click(); }
        fn();
      });
    }

    bind('btn-play', () => { ui.renderLevelSelect(); ui.show('screen-levels'); });
    bind('btn-continue', () => {
      const d = GG.save.load();
      const target = Math.min(d.unlocked, GG.LEVELS.length);
      ui.hooks.onPlay(target);
    });
    bind('btn-back-title', () => ui.show('screen-title'));
    bind('btn-settings', () => ui.openSettings());
    bind('btn-settings2', () => ui.openSettings());
    bind('btn-close-settings', () => { ui.applySettingsFromForm(); ui.closeSettings(); });
    ['set-sound', 'set-motion', 'set-colorblind'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.addEventListener('change', () => ui.applySettingsFromForm());
    });
    bind('btn-wipe', () => {
      if (root.confirm && !root.confirm('진행 상황을 모두 지웁니다. 계속할까요?')) return;
      GG.save.wipe();
      const fresh = GG.save.defaults();
      game.setSettings({ sound: fresh.sound, motion: fresh.motion, colorblind: fresh.colorblind });
      ui.toast('데이터가 초기화되었습니다.');
      ui.closeSettings();
    });
    bind('btn-undo', () => game.undo());
    bind('btn-reset', () => game.resetLevel());
    bind('btn-hint', () => { game.requestHint(); ui.showHintToast(); });
    bind('btn-exit', () => { ui.renderLevelSelect(); ui.show('screen-levels'); ui.hideWin(); });
    bind('btn-next', () => {
      const nextId = (currentDef ? currentDef.id : 1) + 1;
      const next = GG.LEVELS.find(l => l.id === nextId);
      if (next) ui.hooks.onPlay(next.id);
    });
    bind('btn-replay', () => { if (currentDef) ui.hooks.onPlay(currentDef.id); });
    bind('btn-win-select', () => { ui.renderLevelSelect(); ui.show('screen-levels'); ui.hideWin(); });
    bind('btn-intro-ok', () => ui.closeIntro());

    resize();

    const demoDef = GG.LEVELS.find(l => l.id === 7) || GG.LEVELS[0];
    game.startLevel(demoDef, { demo: true });
    game.state = 'title';

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      game.render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.__bootOk = true;
    document.body.dataset.boot = 'ok';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
