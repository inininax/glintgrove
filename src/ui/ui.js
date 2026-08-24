import { CHAPTERS, LEVELS } from '../data/levels.js';
import { totalStars } from '../state/saveStore.js';
import { t, LEVEL_NAMES_EN } from './strings.js';
import { ACHIEVEMENTS } from '../services/achievements.js';

function el(id) {
  return document.getElementById(id);
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
    this.currentScreen = 'title';
  }

  showTutorial(step) {
    this.closeTutorial();
    const layer = el('tutorial-layer');
    if (!layer) return;

    if (step.type === 'pointer') {
      const lay = this.game.renderer.layout(this.game.level);
      const rect = this.game.canvas.getBoundingClientRect();
      const cx = rect.left + lay.ox + step.x * lay.cell + lay.cell / 2;
      const cy = rect.top + lay.oy + step.y * lay.cell + lay.cell / 2;
      const pointer = document.createElement('div');
      pointer.className = 'tut-pointer';
      pointer.style.left = `${cx}px`;
      pointer.style.top = `${cy}px`;
      pointer.innerHTML = `<div class="tut-ring"></div><span>👆</span><em>${t('tutPointer')}</em>`;
      layer.appendChild(pointer);
      this._pointerEl = pointer;
      return;
    }

    if (step.type === 'card') {
      const card = document.createElement('div');
      card.className = 'modal panel tut-card';
      card.innerHTML = `
        <div class="tut-art">${step.art}</div>
        <h3>${t(step.titleKey)}</h3>
        <p>${t(step.bodyKey)}</p>
        <button id="btn-tut-ok" class="btn primary">${t('tutGotIt')}</button>`;
      layer.appendChild(card);
      card.querySelector('#btn-tut-ok').addEventListener('click', () => {
        this.closeTutorial();
        this.hooks.onTutorialDone(step.levelId);
      });
    }
  }

  dismissPointer() {
    if (this._pointerEl) {
      this._pointerEl.remove();
      this._pointerEl = null;
      if (this.hooks.onTutorialDone && this.currentStepLevel) {
        this.hooks.onTutorialDone(this.currentStepLevel);
      }
    }
  }

  closeTutorial() {
    const layer = el('tutorial-layer');
    if (layer) layer.innerHTML = '';
    this._pointerEl = null;
  }

  show(name) {
    this.currentScreen = name;
    for (const s of ['screen-title', 'screen-levels', 'screen-game']) {
      el(s).classList.toggle('hidden', s !== name);
    }
  }

  anyModalOpen() {
    for (const id of ['win-overlay', 'settings-modal', 'intro-modal', 'ach-modal']) {
      const node = el(id);
      if (node && !node.classList.contains('hidden')) return id;
    }
    return null;
  }

  renderLevelSelect() {
    const data = this.hooks.getSave();
    const wrap = el('chapter-list');
    wrap.innerHTML = '';
    for (const ch of CHAPTERS) {
      const sec = document.createElement('section');
      sec.className = 'chapter';
      const lvls = LEVELS.filter(l => l.chapter === ch.id);
      const done = lvls.filter(l => (data.stars[l.id] || 0) > 0).length;
      const head = document.createElement('header');
      head.innerHTML = `<h3>${ch.name}</h3><span class="chapter-desc">${ch.desc}</span><span class="chapter-progress">${done}/${lvls.length}</span>`;
      sec.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'level-grid';
      for (const l of lvls) {
        const unlocked = l.id <= data.unlocked;
        const stars = data.stars[l.id] || 0;
        const node = document.createElement('button');
        const diff = this.hooks.difficultyOf(l);
        node.className = 'level-node' + (unlocked ? '' : ' locked') + (stars > 0 ? ' done' : '') + ` diff-${diff}`;
        node.disabled = !unlocked;
        const diffLabel = { easy: '쉬움', normal: '보통', hard: '어려움', extreme: '매우 어려움' }[diff] || '';
        node.innerHTML = unlocked
          ? `<span class="lv-num">${l.id}</span><span class="lv-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span><span class="lv-diff d-${diff}">${diffLabel}</span>`
          : '<span class="lv-num">🔒</span>';
        node.setAttribute('aria-label', `Level ${l.id}`);
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
    el('hud-level-name').textContent = labelOverride || `${def.id}. ${def.name}`;
    const moveEl = el('hud-moves');
    moveEl.textContent = `${t('moves')} ${moves} / ${t('goal')} ${par}`;
    moveEl.classList.toggle('over', moves > par);
  }

  toast(msg, ms) {
    const toast = el('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), ms || 2600);
  }

  showHintToast() {
    const def = this.game.def;
    if (!def) return;
    const hint = this.hooks.lang() === 'en' && def.hintEn ? def.hintEn : def.hint;
    if (hint) this.toast(`💡 ${hint}`, 3600);
  }

  showWin(moves, par, stars, daily) {
    this.focusPrimary('btn-next');
    el('win-overlay').classList.remove('hidden');
    el('win-title').textContent = daily ? t('dailyWinTitle') : t('winTitle');
    el('win-stats').textContent = daily
      ? `${daily.date} · ${t('moves')} ${moves} / ${par}`
      : `${t('moves')} ${moves} · ${t('goal')} ${par}`;

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
  }

  hideWin() {
    el('win-overlay').classList.add('hidden');
    this.restoreFocus();
  }

  focusPrimary(btnId) {
    UI.lastFocused = document.activeElement;
    const btn = el(btnId);
    if (btn && btn.focus) setTimeout(() => btn.focus(), 30);
  }

  restoreFocus() {
    const prev = UI.lastFocused;
    if (prev && prev.focus) prev.focus();
    UI.lastFocused = null;
  }

  openSettings() {
    this.focusPrimary('btn-close-settings');
    this.hooks.beforeSettings?.();
    el('settings-modal').classList.remove('hidden');
    const data = this.hooks.getSave();
    el('set-sound').checked = data.sound;
    el('set-motion').checked = data.motion;
    el('set-colorblind').checked = data.colorblind;
    el('set-lang').value = data.lang || 'auto';
    const skinSelect = el('set-skin');
    if (skinSelect) skinSelect.value = data.skin || 'classic';
  }

  closeSettings() {
    el('settings-modal').classList.add('hidden');
    this.restoreFocus();
  }

  applySettingsFromForm() {
    this.hooks.onSettingsForm({
      sound: el('set-sound').checked,
      motion: el('set-motion').checked,
      colorblind: el('set-colorblind').checked,
      lang: el('set-lang').value,
      skin: (el('set-skin') && el('set-skin').value) || 'classic'
    });
  }

  showIntro() {
    if (this.hooks.getSave().seenIntro) return false;
    el('intro-modal').classList.remove('hidden');
    return true;
  }

  closeIntro() {
    el('intro-modal').classList.add('hidden');
    this.hooks.markIntroSeen();
  }

  renderAchievements() {
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
      item.innerHTML = `<span class="ach-icon">${a.icon}</span><div><b>${name}</b><p>${desc}</p></div><time>${has ? (data.ach[a.id] || '').slice(0, 10) : ''}</time>`;
      list.appendChild(item);
    }
    el('ach-progress').textContent = `${earned}/${ACHIEVEMENTS.length}`;
    el('ach-modal').classList.remove('hidden');
  }

  closeAchievements() {
    el('ach-modal').classList.add('hidden');
  }
}
