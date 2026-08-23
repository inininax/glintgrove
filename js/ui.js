(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};

  function el(id) { return document.getElementById(id); }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  class UI {
    constructor(game, hooks) {
      this.game = game;
      this.hooks = hooks || {};
      this.currentScreen = 'title';
    }

    show(name) {
      this.currentScreen = name;
      for (const s of ['screen-title', 'screen-levels', 'screen-game']) {
        const node = el(s);
        if (node) node.classList.toggle('hidden', s !== name);
      }
    }

    renderLevelSelect() {
      const data = GG.save.load();
      const wrap = el('chapter-list');
      wrap.innerHTML = '';
      for (const ch of GG.CHAPTERS) {
        const sec = document.createElement('section');
        sec.className = 'chapter';
        const lvls = GG.LEVELS.filter(l => l.chapter === ch.id);
        const done = lvls.filter(l => data.stars[l.id] > 0).length;
        sec.innerHTML = `<header><h3>${esc(ch.name)}</h3><span class="chapter-desc">${esc(ch.desc)}</span><span class="chapter-progress">${done}/${lvls.length}</span></header>`;
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
            : `<span class="lv-num">🔒</span>`;
          if (unlocked) {
            node.addEventListener('click', () => { if (this.hooks.onPlay) this.hooks.onPlay(l.id); });
          }
          grid.appendChild(node);
        }
        sec.appendChild(grid);
        wrap.appendChild(sec);
      }
      const totalEl = el('total-stars');
      if (totalEl) totalEl.textContent = `${GG.save.totalStars(data)} / ${GG.LEVELS.length * 3}`;
    }

    setHud(def, moves, par) {
      const nameEl = el('hud-level-name');
      if (nameEl) nameEl.textContent = `${def.id}. ${def.name}`;
      const moveEl = el('hud-moves');
      if (moveEl) moveEl.textContent = `이동 ${moves} / 목표 ${par}`;
      moveEl.classList.toggle('over', moves > par);
    }

    toast(msg, ms) {
      const t = el('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2600);
    }

    showHintToast() {
      const def = this.game.def;
      if (def && def.meta && def.meta.hint) this.toast('💡 ' + def.meta.hint, 3600);
    }

    showWin(moves, par, stars) {
      const overlay = el('win-overlay');
      if (!overlay) return;
      overlay.classList.remove('hidden');
      el('win-title').textContent = '숲이 깨어났습니다';
      el('win-stats').textContent = `이동 ${moves} · 목표 ${par}`;
      const starEls = el('win-stars').children;
      for (let i = 0; i < 3; i++) {
        const s = starEls[i];
        s.classList.remove('on', 'pop');
        if (i < stars) {
          setTimeout(() => {
            s.classList.add('on', 'pop');
            if (this.game.settings.sound) this.game.sound.light(i + 2);
          }, 350 + i * 380);
        }
      }
      const nextBtn = el('btn-next');
      const hasNext = this.game.def.id < GG.LEVELS.length;
      if (nextBtn) {
        nextBtn.style.display = hasNext ? '' : 'none';
        if (hasNext) nextBtn.textContent = '다음 레벨 →';
      }
    }

    hideWin() {
      const overlay = el('win-overlay');
      if (overlay) overlay.classList.add('hidden');
    }

    openSettings() {
      const modal = el('settings-modal');
      if (!modal) return;
      modal.classList.remove('hidden');
      const data = GG.save.load();
      el('set-sound').checked = data.sound;
      el('set-motion').checked = data.motion;
      el('set-colorblind').checked = data.colorblind;
    }

    closeSettings() {
      const modal = el('settings-modal');
      if (modal) modal.classList.add('hidden');
    }

    applySettingsFromForm() {
      const sound = el('set-sound').checked;
      const motion = el('set-motion').checked;
      const colorblind = el('set-colorblind').checked;
      const data = GG.save.load();
      data.sound = sound;
      data.motion = motion;
      data.colorblind = colorblind;
      GG.save.save(data);
      this.game.setSettings({ sound, motion, colorblind });
      if (this.hooks.onSettings) this.hooks.onSettings(data);
    }

    showIntro() {
      const intro = el('intro-modal');
      if (!intro) return false;
      const data = GG.save.load();
      if (data.seenIntro) return false;
      intro.classList.remove('hidden');
      return true;
    }

    closeIntro() {
      const intro = el('intro-modal');
      if (intro) intro.classList.add('hidden');
      const data = GG.save.load();
      data.seenIntro = true;
      GG.save.save(data);
    }
  }

  GG.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
