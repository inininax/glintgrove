import { CHAPTERS, LEVELS } from '../data/levels.js';
import { totalStars } from '../state/saveStore.js';
import { t, LEVEL_NAMES_EN } from './strings.js';
import { ACHIEVEMENTS } from '../services/achievements.js';
import { symbolSvg, ratingSvg } from './symbols.js';
import { colorMarkPath } from './colorMarks.js';
import { colorOf } from '../core/colors.js';
import { deviceAt, deviceDiagram, guideKinds } from './deviceGuide.js';

function el(id) {
  return document.getElementById(id);
}

function colorLegend() {
  const legend = document.createElement('div');
  legend.className = 'device-color-legend';
  for (const color of ['r', 'g', 'b']) {
    const item = document.createElement('span');
    item.innerHTML = `<svg viewBox="-1 -1 2 2" aria-hidden="true"><path d="${colorMarkPath(color)}" fill="none" stroke="${colorOf(color)}" stroke-width=".14" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const label = document.createElement('span');
    label.textContent = t(`colorMark${color.toUpperCase()}`);
    item.appendChild(label);
    legend.appendChild(item);
  }
  return legend;
}

export function levelName(def, lang) {
  if (lang === 'en') return def.nameEn || LEVEL_NAMES_EN[def.id] || def.name;
  return def.name;
}

export class UI {
  static lastFocused = null;

  constructor(game, hooks) {
    this.game = game;
    this.hooks = hooks;
    this.currentScreen = 'screen-title';
    document.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const modalId = this.anyModalOpen();
      if (!modalId) return;
      const focusable = [...el(modalId).querySelectorAll('button, input, select, [tabindex="0"]')]
        .filter(node => !node.disabled && node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  showTutorial(step) {
    this.closeTutorial();
    const layer = el('tutorial-layer');
    if (!layer) return;
    if (this.anyModalOpen()) {
      this._pendingTutorial = step;
      return;
    }
    this._tutorialStep = step;
    this.clearToast();

    if (step.type === 'pointer') {
      const lay = this.game.renderer.layout(this.game.level);
      const rect = this.game.canvas.getBoundingClientRect();
      const cx = rect.left + lay.ox + step.x * lay.cell + lay.cell / 2;
      const cy = rect.top + lay.oy + step.y * lay.cell + lay.cell / 2;
      const pointer = document.createElement('div');
      pointer.className = 'tut-pointer';
      pointer.style.left = `${cx}px`;
      pointer.style.top = `${cy}px`;
      pointer.innerHTML = `<div class="tut-ring" aria-hidden="true"></div>${symbolSvg('pointer')}<em>${t('tutPointer')}</em>`;
      layer.appendChild(pointer);
      this._pointerEl = pointer;
      return;
    }

    if (step.type === 'card') {
      const card = document.createElement('div');
      card.className = 'modal panel tut-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-labelledby', 'tutorial-title');
      card.setAttribute('aria-describedby', 'tutorial-body');
      const art = document.createElement('div');
      art.className = 'tut-art';
      art.classList.add('device-tutorial-diagram');
      art.innerHTML = deviceDiagram(step.levelId === 6 ? 'splitter' : step.levelId === 17 ? 'color' : 'portal', this.game.level?.crystals?.[0]?.color || 'r');
      const title = document.createElement('h3');
      title.id = 'tutorial-title';
      title.textContent = t(step.titleKey);
      const body = document.createElement('p');
      body.id = 'tutorial-body';
      body.textContent = t(step.bodyKey);
      const button = document.createElement('button');
      button.id = 'btn-tut-ok';
      button.className = 'btn primary';
      button.textContent = t('tutGotIt');
      for (const node of [art, title, body]) card.appendChild(node);
      if (step.levelId === 17) card.appendChild(colorLegend());
      card.appendChild(button);
      layer.appendChild(card);
      layer.classList.add('has-card');
      button.addEventListener('click', () => this.dismissTutorial());
      this.focusPrimary('btn-tut-ok');
    }
  }

  dismissTutorial() {
    const step = this._tutorialStep;
    this.closeTutorial();
    if (step) this.hooks.onTutorialDone?.(step.levelId);
  }

  dismissPointer() {
    if (this._pointerEl) this.dismissTutorial();
  }

  closeTutorial() {
    const wasCard = this._tutorialStep?.type === 'card';
    const layer = el('tutorial-layer');
    if (layer) {
      layer.innerHTML = '';
      layer.classList.remove('has-card');
    }
    this._pointerEl = null;
    this._tutorialStep = null;
    this._pendingTutorial = null;
    if (wasCard) this.restoreFocus();
  }

  deferTutorial() {
    const step = this._tutorialStep || this._pendingTutorial;
    this.closeTutorial();
    this._pendingTutorial = step;
  }

  resumeTutorial() {
    if (this._pendingTutorial && !this.anyModalOpen() && this.currentScreen === 'screen-game') {
      this.showTutorial(this._pendingTutorial);
    }
  }

  show(name) {
    this.closeTutorial();
    this.clearToast();
    for (const id of ['win-overlay', 'settings-modal', 'intro-modal', 'ach-modal', 'guide-modal']) {
      el(id)?.classList.add('hidden');
    }
    UI.lastFocused = null;
    this.currentScreen = name;
    if (document.body) document.body.dataset.screen = name.replace('screen-', '');
    for (const s of ['screen-title', 'screen-levels', 'screen-game']) {
      el(s).classList.toggle('hidden', s !== name);
    }
  }

  anyModalOpen() {
    // Match the overlays' DOM paint order, with the tutorial below them.
    for (const id of ['guide-modal', 'ach-modal', 'intro-modal', 'settings-modal', 'win-overlay']) {
      const node = el(id);
      if (node && !node.classList.contains('hidden')) return id;
    }
    if (el('tutorial-layer')?.classList.contains('has-card')) return 'tutorial-layer';
    return null;
  }

  canPlay() {
    return this.currentScreen === 'screen-game' && !this.anyModalOpen();
  }

  inspectAt(px, py) {
    if (!this.canPlay() || this.game.won || !this.game.level) return false;
    const device = deviceAt(this.game.level, this.game.renderer.layout(this.game.level), px, py);
    return device ? this.openGuide(device) : false;
  }

  openGuide(device = null) {
    const introduction = this.currentScreen === 'screen-title' && !device;
    if (this.anyModalOpen() || (!introduction && (!this.canPlay() || this.game.won))) return false;
    const modal = el('guide-modal');
    const content = el('guide-content');
    if (!modal || !content) return false;
    this.deferTutorial();
    this.clearToast();
    content.innerHTML = '';
    const titleKey = introduction ? 'helpTitle' : 'guideTitle';
    el('guide-title').textContent = t(titleKey);
    el('guide-title').setAttribute('data-i18n', titleKey);
    if (introduction) {
      const overview = document.createElement('section');
      overview.className = 'guide-introduction';
      const title = document.createElement('h3');
      title.textContent = t('helpGoalTitle');
      overview.appendChild(title);
      for (const key of ['helpGoalBody', 'helpControlsBody', 'helpMenuBody']) {
        const paragraph = document.createElement('p');
        paragraph.textContent = t(key);
        overview.appendChild(paragraph);
      }
      content.appendChild(overview);
    }
    // Title help must not inherit the last played or background-demo level's
    // device list. It always introduces the complete set without loading a level.
    const kinds = introduction ? ['emitter', 'mirror', 'target', 'splitter', 'crystal', 'gate', 'portal']
      : device ? [device.kind] : guideKinds(this.game.level);
    const color = introduction ? 'r' : device?.color || this.game.level?.crystals?.[0]?.color || 'r';
    for (const kind of kinds) {
      const row = document.createElement('section');
      row.className = 'device-guide-row';
      const diagram = document.createElement('div');
      diagram.className = 'device-guide-diagram';
      diagram.innerHTML = deviceDiagram(kind, color);
      const copy = document.createElement('div');
      const title = document.createElement('h3');
      const body = document.createElement('p');
      const name = kind[0].toUpperCase() + kind.slice(1);
      title.textContent = t(`guide${name}Title`);
      body.textContent = t(`guide${name}Body`);
      copy.appendChild(title); copy.appendChild(body);
      row.appendChild(diagram); row.appendChild(copy);
      content.appendChild(row);
    }
    if (kinds.some(kind => ['crystal', 'gate'].includes(kind)) || device?.color || this.game.level?.targets?.some(target => target.need)) content.appendChild(colorLegend());
    modal.classList.remove('hidden');
    // Start long guides at their heading; focusing the bottom close button would
    // scroll mobile dialogs past the rules before the player can read them.
    this.focusPrimary('guide-title');
    if (el('guide-title')?.parentElement) el('guide-title').parentElement.scrollTop = 0;
    modal.scrollTop = 0;
    return true;
  }

  closeGuide() {
    if (el('guide-modal')?.classList.contains('hidden')) return;
    el('guide-modal')?.classList.add('hidden');
    this.restoreFocus();
    this.resumeTutorial();
  }

  renderLevelSelect() {
    const data = this.hooks.getSave();
    const lang = this.hooks.lang();
    const wrap = el('chapter-list');
    wrap.innerHTML = '';
    for (const ch of CHAPTERS) {
      const sec = document.createElement('section');
      sec.className = 'chapter';
      const lvls = LEVELS.filter(l => l.chapter === ch.id);
      const done = lvls.filter(l => (data.stars[l.id] || 0) > 0).length;
      const chName = lang === 'en' ? (ch.nameEn || ch.name) : ch.name;
      const chDesc = lang === 'en' ? (ch.descEn || ch.desc) : ch.desc;
      const head = document.createElement('header');
      head.innerHTML = `<span class="chapter-number" aria-hidden="true">${String(ch.id).padStart(2, '0')}</span><div class="chapter-name"><h3>${chName}</h3><span class="chapter-desc">${chDesc}</span></div><span class="chapter-progress">${String(done).padStart(2, '0')} / ${String(lvls.length).padStart(2, '0')}<span class="chapter-progress-label">${t('chapterClearedLabel')}</span></span>`;
      sec.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'level-grid';
      for (const l of lvls) {
        const unlocked = l.id <= data.unlocked;
        const stars = data.stars[l.id] || 0;
        const node = document.createElement('button');
        const diff = this.hooks.difficultyOf(l);
        node.className = 'level-node' + (unlocked ? '' : ' locked') + (stars > 0 ? ' done' : '') + ` diff-${diff}`;
        if (unlocked && l.id === Math.min(data.unlocked, LEVELS.length)) node.className += ' current';
        node.disabled = !unlocked;
        const DIFF_LABELS = {
          ko: { easy: '쉬움', normal: '보통', hard: '어려움', extreme: '매우 어려움' },
          en: { easy: 'Easy', normal: 'Normal', hard: 'Hard', extreme: 'Very Hard' }
        };
        const diffLabel = (DIFF_LABELS[lang] || DIFF_LABELS.ko)[diff] || '';
        node.innerHTML = unlocked
          ? `<span class="lv-num">${String(l.id).padStart(2, '0')}</span><span class="lv-stars${stars ? '' : ' empty'}" aria-hidden="true">${ratingSvg(stars)}</span><span class="lv-diff d-${diff}">${diffLabel}</span>`
          : `<span class="lv-num">${String(l.id).padStart(2, '0')}</span>${symbolSvg('lock', 'lv-lock')}`;
        node.setAttribute('aria-label', `${t('levelAria', { number: l.id, name: levelName(l, lang) })} · ${unlocked ? `${diffLabel} · ${t('starsAria', { stars })}` : t('lockedLabel')}`);
        if (unlocked) {
          node.addEventListener('click', () => this.hooks.onPlay(l.id));
        }
        grid.appendChild(node);
      }
      sec.appendChild(grid);
      wrap.appendChild(sec);
    }
    el('total-stars').textContent = `${totalStars(data)} / ${LEVELS.length * 3}`;
  }

  setHud(def, moves, par, labelOverride) {
    el('hud-level-name').textContent = labelOverride || `${String(def.id).padStart(2, '0')} · ${levelName(def, this.hooks.lang())}`;
    const chapter = CHAPTERS.find(item => item.id === def.chapter);
    const chapterEl = el('hud-chapter');
    if (chapterEl) {
      chapterEl.textContent = chapter
        ? t('chapterLabel', { number: String(chapter.id).padStart(2, '0'), name: this.hooks.lang() === 'en' ? chapter.nameEn || chapter.name : chapter.name })
        : t('groveLabel');
    }
    const moveEl = el('hud-moves');
    moveEl.textContent = `${t('moves')} ${moves} / ${t('goal')} ${par}`;
    moveEl.classList.toggle('over', moves > par);
  }

  clearToast() {
    clearTimeout(this._toastTimer);
    const toast = el('toast');
    toast.classList.remove('show');
    toast.textContent = '';
  }

  toast(msg, ms, { guidance = false } = {}) {
    if (this._tutorialStep?.type === 'card' || this.anyModalOpen() === 'guide-modal' || (guidance && !this.canPlay())) return false;
    const toast = el('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), ms || 2600);
    return true;
  }

  showHintToast() {
    const level = this.game.level;
    if (!level) return;
    const hint = this.hooks.lang() === 'en'
      ? (level.hintEn || level.hint)
      : (level.hint || level.hintEn);
    if (hint) this.toast(hint, 3600, { guidance: true });
  }

  showWin(moves, par, stars, daily) {
    el('guide-modal')?.classList.add('hidden');
    this.closeTutorial();
    this.clearToast();
    el('win-overlay').classList.remove('hidden');
    el('win-title').textContent = daily ? t('dailyWinTitle') : t('winTitle');
    el('win-stats').textContent = daily
      ? `${daily.date} · ${t('moves')} ${moves} / ${par}`
      : `${t('moves')} ${moves} · ${t('goal')} ${par}`;

    el('win-stars').setAttribute('aria-label', t('starsAria', { stars }));
    const starEls = el('win-stars').children;
    for (let i = 0; i < 3; i++) {
      starEls[i].classList.remove('on', 'pop');
      if (i < stars) {
        setTimeout(() => {
          starEls[i].classList.add('on', 'pop');
          if (this.game.settings.sound) this.game.sound.light(i + 2);
        }, 350 + i * 380);
      }
    }
    const nextBtn = el('btn-next');
    const hasNext = !daily && this.game.def.id < LEVELS.length;
    nextBtn.style.display = hasNext ? '' : 'none';
    if (hasNext) nextBtn.textContent = t('nextLevel');
    el('btn-share').style.display = '';
    if (this.anyModalOpen() === 'win-overlay') this.focusPrimary(hasNext ? 'btn-next' : 'btn-share');
  }

  hideWin() {
    el('win-overlay').classList.add('hidden');
    this.restoreFocus();
  }

  focusPrimary(btnId) {
    UI.lastFocused = document.activeElement;
    const btn = el(btnId);
    btn?.focus();
  }

  restoreFocus() {
    const prev = UI.lastFocused;
    UI.lastFocused = null;
    const modal = this.anyModalOpen();
    if (modal && !el(modal).contains(prev)) {
      const button = el(modal).querySelector('button:not([disabled])');
      button?.focus();
    } else if (prev?.isConnected && prev.getClientRects().length) prev.focus();
    else if (this.currentScreen === 'screen-game') el('btn-hint')?.focus();
  }

  openSettings() {
    if (this.anyModalOpen()) return false;
    this.deferTutorial();
    this.clearToast();
    this.hooks.beforeSettings?.();
    el('settings-modal').classList.remove('hidden');
    this.focusPrimary('btn-close-settings');
    const data = this.hooks.getSave();
    el('set-sound').checked = data.sound;
    el('set-motion').checked = data.motion;
    el('set-colorblind').checked = data.colorblind;
    el('set-lang').value = data.lang || 'ko';
    const skinSelect = el('set-skin');
    if (skinSelect) skinSelect.value = data.skin || 'classic';
    const displaySelect = el('set-display');
    if (displaySelect) displaySelect.value = data.displayMode || 'sculpted';
  }

  closeSettings() {
    if (el('settings-modal').classList.contains('hidden')) return;
    el('settings-modal').classList.add('hidden');
    this.restoreFocus();
    this.resumeTutorial();
  }

  applySettingsFromForm() {
    this.hooks.onSettingsForm({
      sound: el('set-sound').checked,
      motion: el('set-motion').checked,
      colorblind: el('set-colorblind').checked,
      lang: el('set-lang').value,
      skin: (el('set-skin') && el('set-skin').value) || 'classic',
      displayMode: el('set-display')?.value === 'simple' ? 'simple' : 'sculpted'
    });
  }

  showIntro() {
    if (this.hooks.getSave().seenIntro || this.anyModalOpen()) return false;
    this.deferTutorial();
    this.clearToast();
    el('intro-modal').classList.remove('hidden');
    this.focusPrimary('btn-intro-ok');
    return true;
  }

  closeIntro() {
    if (el('intro-modal').classList.contains('hidden')) return;
    el('intro-modal').classList.add('hidden');
    this.hooks.markIntroSeen();
    this.restoreFocus();
    this.resumeTutorial();
  }

  renderAchievements() {
    if (this.anyModalOpen()) return false;
    this.deferTutorial();
    this.clearToast();
    const data = this.hooks.getSave();
    const ctx = this.hooks.achContext();
    const list = el('ach-list');
    list.innerHTML = '';
    let earned = 0;
    for (const a of ACHIEVEMENTS) {
      const has = !!data.ach[a.id];
      if (has) earned++;
      const name = this.hooks.lang() === 'en' ? a.nameEn : a.name;
      const desc = this.hooks.lang() === 'en' ? a.descEn : a.desc;
      const item = document.createElement('div');
      item.className = 'ach-item' + (has ? ' on' : '');
      item.innerHTML = `<span class="ach-icon">${symbolSvg(a.id)}</span><div><b>${name}</b><p>${desc}</p></div><time>${has ? (data.ach[a.id] || '').slice(0, 10) : ''}</time>`;
      list.appendChild(item);
    }
    el('ach-progress').textContent = `${earned}/${ACHIEVEMENTS.length}`;
    el('ach-modal').classList.remove('hidden');
    this.focusPrimary('btn-close-ach');
  }

  closeAchievements() {
    if (el('ach-modal').classList.contains('hidden')) return;
    el('ach-modal').classList.add('hidden');
    this.restoreFocus();
    this.resumeTutorial();
  }
}
