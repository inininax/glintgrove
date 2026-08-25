import { GG_VERSION } from './core/version.js';
import { LEVELS, difficultyOf } from './data/levels.js';
import { load as loadSave, save as persistSave, wipe, recordDaily, dailyStreak, defaults } from './state/saveStore.js';
import { Game } from './game/game.js';
import { UI, levelName } from './ui/ui.js';
import { setLanguage, t, applyDomStrings } from './ui/strings.js';
import { buildDailyConfig, todayStr } from './services/daily.js';
import { evaluateAchievements } from './services/achievements.js';
import { track } from './infra/analytics.js';
import { installErrorHandler } from './infra/errorHandler.js';
import { loadRemoteConfig, getConfig } from './services/config.js';
import { getTutorial, markTutorialDone } from './services/tutorial.js';
import { SKINS, getSkin } from './core/skins.js';
import { recentEvents } from './infra/analytics.js';

installErrorHandler();

async function boot() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  const params = new URLSearchParams(location.search);
  let saveData = loadSave();
  saveData.v = 2;
  setLanguage(saveData.lang === 'auto' ? null : saveData.lang);
  applyDomStrings(document);

  const sessionStart = Date.now();
  track('session_start', { v: GG_VERSION });

  const game = new Game(canvas);
  game.setSettings({ sound: saveData.sound, motion: saveData.motion, colorblind: saveData.colorblind });

  function applySkin(id) {
    game.applySkin(getSkin(id).palette);
  }

  await loadRemoteConfig();
  applySkin(saveData.skin || getConfig().defaultSkin);

  let currentDef = null;
  let dailyInfo = null;

  function persist() {
    persistSave(saveData);
  }

  function lang() {
    return saveData.lang === 'en' || (saveData.lang === 'auto' && !navigator.languages?.some?.(l => String(l).toLowerCase().startsWith('ko'))) ? 'en' : 'ko';
  }

  function refreshLang() {
    if (saveData.lang === 'auto') setLanguage(null);
    else setLanguage(saveData.lang);
    applyDomStrings(document);
  }

  function chapterCleared(chapterId) {
    return LEVELS.filter(l => l.chapter === chapterId).every(l => (saveData.stars[l.id] || 0) > 0);
  }

  function noHintClears() {
    return LEVELS.filter(l => saveData.tipsSeen[`nohint-${l.id}`] === true).length;
  }

  function achContext() {
    return {
      chapterCleared,
      noHintClears: noHintClears(),
      streak: dailyStreak(saveData, todayStr()),
      maxStars: LEVELS.length * 3
    };
  }

  function checkAchievements() {
    const newly = evaluateAchievements(saveData, achContext());
    persist();
    for (const a of newly) {
      const name = lang() === 'en' ? a.nameEn : a.name;
      ui.toast(`${a.icon} ${t('achievements')}: ${name}`, 4200);
      track('achievement_unlocked', { id: a.id });
    }
  }


  function startLevelById(id, opts = {}) {
    const def = LEVELS.find(l => l.id === id);
    if (!def) return;
    const po = getConfig().parOverrides[String(def.id)];
    const effectiveDef = Number.isInteger(po) ? { ...def, par: po } : def;
    currentDef = effectiveDef;
    dailyInfo = opts.daily ? { ...opts.daily, label: opts.labelOverride || null } : null;
    game.startLevel(effectiveDef, opts);
    ui.setHud(effectiveDef, 0, effectiveDef.par, opts.labelOverride);
    ui.show('screen-game');
    ui.hideWin();
    track('level_start', {
      level_id: id,
      attempt: 1,
      daily: !!opts.daily,
      override_orient: !!opts.orientOverride
    });
    showContextualTip(def);
    if (def.id === 1 && !saveData.seenIntro && !opts.daily) ui.showIntro();

    const step = getConfig().tipsEnabled ? getTutorial(effectiveDef, saveData) : null;
    if (step) {
      ui.currentStepLevel = step.levelId;
      requestAnimationFrame(() => ui.showTutorial(step));
      if (step.type === 'pointer') {
        const off = game.events.on('move', () => {
          off();
          ui.dismissPointer();
          markTutorialDone(saveData, step.levelId);
          persist();
        });
      }
      track('tutorial_shown', { level_id: step.levelId, type: step.type });
    }
  }

  function showContextualTip(def) {
    if (def.id !== 6 && def.id !== 17 && def.id !== 23) return;
    const key = `tip-${def.id}`;
    if (saveData.tipsSeen[key]) return;
    saveData.tipsSeen[key] = true;
    persist();
    ui.toast(`💡 ${t(`tip${def.id}`)}`, 5000);
  }

  function exitToLevels() {
    game.sound.stopAmbient();
    ui.renderLevelSelect();
    ui.show('screen-levels');
    ui.hideWin();
  }

  const hooks = {
    getSave: () => saveData,
    lang,
    markIntroSeen: () => {
      saveData.seenIntro = true;
      persist();
      track('ftue_intro_dismissed');
    },
    onPlay: id => startLevelById(id),
    onSettingsForm(form) {
      saveData.sound = form.sound;
      saveData.motion = form.motion;
      saveData.colorblind = form.colorblind;
      const prevLang = saveData.lang;
      saveData.lang = form.lang;
      if (form.skin && form.skin !== saveData.skin) {
        saveData.skin = form.skin;
        applySkin(form.skin);
        track('skin_changed', { skin: form.skin });
      }
      persist();
      game.setSettings({ sound: form.sound, motion: form.motion, colorblind: form.colorblind });
      if (prevLang !== form.lang) {
        refreshLang();
        if (currentDef) ui.setHud(currentDef, game.moves, currentDef.par, dailyInfo?.label);
        ui.renderLevelSelect();
      }
      track('settings_change', { colorblind: form.colorblind, motion: form.motion, sound: form.sound, lang: form.lang, skin: form.skin });
    },
    onTutorialDone(levelId) {
      markTutorialDone(saveData, levelId);
      persist();
    },
    beforeSettings: () => populateSkinSelect(),
    difficultyOf: def => difficultyOf(def),
    achContext
  };

  const ui = new UI(game, hooks);

  game.events.on('move', e => {
    ui.setHud(currentDef, e.moves, currentDef.par, dailyInfo?.label);
    track('move_made', { level_id: e.id, move_n: e.moves });
  });

  game.events.on('undo', () => track('undo_used', { level_id: currentDef?.id }));

  game.events.on('reset', () => {
    track('reset_used', { level_id: currentDef?.id });
    ui.setHud(currentDef, 0, currentDef.par, dailyInfo?.label);
  });

  game.events.on('hint', e => track('hint_used', { level_id: e.id, count: e.count }));

  game.events.on('idleNudge', e => {
    ui.toast(t('idleNudge'), 4000);
    track('idle_nudge_shown', { level_id: e.id });
  });

  game.events.on('win', e => {
    if (e.daily) {
      recordDaily(saveData, e.daily.date, e.moves, e.stars);
    } else {
      saveData.stars[e.id] = Math.max(saveData.stars[e.id] || 0, e.stars);
      if (e.id + 1 > saveData.unlocked) saveData.unlocked = e.id + 1;
      if (e.hints === 0) saveData.tipsSeen[`nohint-${e.id}`] = true;
    }
    persist();
    checkAchievements();
    track('level_win', {
      level_id: e.id,
      moves: e.moves,
      par: e.par,
      par_delta: e.moves - e.par,
      stars: e.stars,
      hints: e.hints,
      duration_sec: Math.round((Date.now() - sessionStart) / 1000)
    });
  });

  game.events.on('winUi', g => {
    ui.showWin(g.moves, g.def.par, g.starsFor(), g.dailyInfo);
  });

  game.events.on('settingsChange', s => {
    game.renderer.setQuality(s.motion !== false);
  });

  window.addEventListener('resize', resize);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.sound.stopAmbient();
      track('session_hidden');
    } else if (game.state === 'playing' && !game.demoMode && game.settings.sound && !ui.anyModalOpen()) {
      game.sound.startAmbient();
      track('session_visible');
    }
  });

  canvas.addEventListener('pointerdown', ev => {
    if (game.settings.sound) game.sound.ensure();
    const rect = canvas.getBoundingClientRect();
    game.pointerDown(ev.clientX - rect.left, ev.clientY - rect.top);
  });
  canvas.addEventListener('contextmenu', ev => ev.preventDefault());

  document.addEventListener('keydown', ev => {
    if (ui.currentScreen !== 'screen-game') return;
    const k = ev.key.toLowerCase();
    const modal = ui.anyModalOpen();
    if (modal === 'settings-modal' || modal === 'intro-modal' || modal === 'ach-modal') {
      if (k === 'escape') {
        ui.closeSettings();
        ui.closeIntro();
        ui.closeAchievements();
      }
      return;
    }
    if (modal === 'win-overlay') {
      if (k === 'escape') exitToLevels();
      return;
    }
    if (modal) return;
    if (k === 'r') game.resetLevel();
    else if (k === 'u' || k === 'z') game.undo();
    else if (k === 'h') {
      game.requestHint();
      ui.showHintToast();
    } else if (k === 'escape') exitToLevels();
  });

  function bind(id, fn) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener('click', () => {
      if (game.settings.sound) {
        game.sound.ensure();
        game.sound.click();
      }
      fn();
    });
  }

  bind('btn-play', () => {
    ui.renderLevelSelect();
    ui.show('screen-levels');
  });
  bind('btn-daily', () => {
    const dateStr = todayStr();
    const cfg = buildDailyConfig(dateStr, {
      min: getConfig().dailyMinOptimal,
      max: getConfig().dailyMaxOptimal
    });
    const def = LEVELS.find(l => l.id === cfg.baseId);
    if (!def) return;
    const label = `☀️ ${dateStr} · ${lang() === 'en' ? 'Daily' : '일일'} (${cfg.optimal})`;
    startLevelById(cfg.baseId, {
      orientOverride: cfg.orients,
      daily: { date: dateStr, optimal: cfg.optimal },
      labelOverride: label
    });
    track('daily_start', { date: dateStr, base_id: cfg.baseId, optimal: cfg.optimal });
  });
  bind('btn-continue', () => {
    const target = Math.min(saveData.unlocked, LEVELS.length);
    hooks.onPlay(target);
  });
  bind('btn-back-title', () => ui.show('screen-title'));
  bind('btn-settings', () => ui.openSettings());
  bind('btn-settings2', () => ui.openSettings());
  bind('btn-ach', () => ui.renderAchievements());
  bind('btn-close-ach', () => ui.closeAchievements());
  function populateSkinSelect() {
    const select = document.getElementById('set-skin');
    if (!select) return;
    select.innerHTML = '';
    for (const skin of SKINS) {
      const opt = document.createElement('option');
      opt.value = skin.id;
      const name = lang() === 'en' ? skin.nameEn : skin.name;
      opt.textContent = name;
      if ((saveData.skin || getConfig().defaultSkin) === skin.id) opt.selected = true;
      select.appendChild(opt);
    }
  }

  bind('btn-close-settings', () => {
    ui.applySettingsFromForm();
    ui.closeSettings();
  });
  ['set-sound', 'set-motion', 'set-colorblind', 'set-lang'].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.addEventListener('change', () => ui.applySettingsFromForm());
  });
  bind('btn-wipe', () => {
    if (globalThis.confirm && !globalThis.confirm(t('wipe') + '?')) return;
    wipe();
    saveData = defaults();
    persist();
    game.setSettings({ sound: saveData.sound, motion: saveData.motion, colorblind: saveData.colorblind });
    ui.toast(t('wipeDone'));
    ui.closeSettings();
  });
  bind('btn-undo', () => game.undo());
  bind('btn-reset', () => game.resetLevel());
  bind('btn-hint', () => {
    game.requestHint();
    ui.showHintToast();
  });
  bind('btn-exit', () => exitToLevels());
  bind('btn-next', () => {
    const nextId = (currentDef ? currentDef.id : 1) + 1;
    hooks.onPlay(nextId);
  });
  bind('btn-replay', () => {
    if (!currentDef) return;
    if (dailyInfo) bind_daily_replay();
    else hooks.onPlay(currentDef.id);
  });
  function bind_daily_replay() {
    const cfg = buildDailyConfig(dailyInfo.date, {
      min: getConfig().dailyMinOptimal,
      max: getConfig().dailyMaxOptimal
    });
    startLevelById(cfg.baseId, {
      orientOverride: cfg.orients,
      daily: { date: cfg.date, optimal: cfg.optimal },
      labelOverride: `☀️ ${cfg.date}`
    });
  }
  bind('btn-win-select', () => exitToLevels());
  bind('btn-intro-ok', () => ui.closeIntro());
  bind('btn-export-data', async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: GG_VERSION,
        progress: { unlocked: saveData.unlocked, stars: saveData.stars, daily: saveData.daily, ach: Object.keys(saveData.ach) },
        events: recentEvents()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glintgrove-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      ui.toast(t('exported'), 2000);
    } catch (e) {
      ui.toast(String((e && e.message) || e), 3000);
    }
  });

  bind('btn-share', async () => {
    if (!currentDef) return;
    const stars = game.won ? game.starsFor() : saveData.stars[currentDef.id] || 0;
    const url = `${location.origin}${location.pathname}?level=${currentDef.id}`;
    const text = t('shareText', { name: levelName(currentDef, lang()), stars });
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Glintgrove', text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        ui.toast(t('copied'), 2000);
      }
      track('share_clicked', { level_id: currentDef.id });
    } catch {
      /* user cancelled */
    }
  });

  function resize() {
    game.renderer.resize();
    game.renderer.invalidateBackground();
    if (game.level) game.particles.resize(game.W(), game.H());
  }

  resize();
  ui.renderLevelSelect();

  const demoDef = LEVELS.find(l => l.id === 7) || LEVELS[0];
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

  document.body.dataset.boot = 'ok';

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (params.has('debug')) {
    window.__gg = { game, ui, saveData };
  }

  const deeplinkLevel = Number(params.get('level'));
  if (Number.isInteger(deeplinkLevel) && deeplinkLevel >= 1 && deeplinkInRange(deeplinkLevel)) {
    setTimeout(() => hooks.onPlay(deeplinkLevel), 60);
  } else if (params.get('daily') === '1') {
    setTimeout(() => document.getElementById('btn-daily').click(), 60);
  }

  function deeplinkInRange(n) {
    return n <= LEVELS.length;
  }

  track('boot_done', {});
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot().catch(e => console.error(e)));
  } else {
    boot().catch(e => console.error(e));
  }
} catch (e) {
  console.error(e);
}
