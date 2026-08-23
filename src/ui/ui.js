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
  constructor(game, hooks) {
    this.game = game;
    this.hooks = hooks;
    this.currentScreen = 'title';
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
        node.className = 'level-node' + (unlocked ? '' : ' locked') + (stars > 0 ? ' done' : '');
        node.disabled = !unlocked;
        node.innerHTML = unlocked
          ? `<span class="lv-num">${l.id}</span><span class="lv-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>`
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
  }

  openSettings() {
    el('settings-modal').classList.remove('hidden');
    const data = this.hooks.getSave();
    el('set-sound').checked = data.sound;
    el('set-motion').checked = data.motion;
    el('set-colorblind').checked = data.colorblind;
    el('set-lang').value = data.lang || 'auto';
  }

  closeSettings() {
    el('settings-modal').classList.add('hidden');
  }

  applySettingsFromForm() {
    this.hooks.onSettingsForm({
      sound: el('set-sound').checked,
      motion: el('set-motion').checked,
      colorblind: el('set-colorblind').checked,
      lang: el('set-lang').value
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
