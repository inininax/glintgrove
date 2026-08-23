(function (root) {
  'use strict';
  const GG = root.GG = root.GG || {};
  const KEY = 'glintgrove_save_v1';

  function memoryStorage() {
    let data = '';
    return {
      getItem: () => data,
      setItem: (k, v) => { data = v; },
      removeItem: () => { data = ''; }
    };
  }

  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__gg_test', '1');
        localStorage.removeItem('__gg_test');
        return localStorage;
      }
    } catch (e) { void e; }
    return memoryStorage();
  }

  function defaults() {
    return {
      v: 1,
      unlocked: 1,
      stars: {},
      sound: true,
      motion: true,
      colorblind: false,
      seenIntro: false
    };
  }

  function load() {
    const storage = getStorage();
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) return defaults();
      return Object.assign(defaults(), data);
    } catch (e) {
      void e;
      return defaults();
    }
  }

  function save(data) {
    try {
      getStorage().setItem(KEY, JSON.stringify(data));
    } catch (e) {
      void e;
    }
  }

  function completeLevel(data, levelId, stars) {
    data.stars[levelId] = Math.max(data.stars[levelId] || 0, stars);
    if (levelId + 1 > data.unlocked) data.unlocked = levelId + 1;
    save(data);
    return data;
  }

  function totalStars(data) {
    let sum = 0;
    for (const k in data.stars) sum += data.stars[k];
    return sum;
  }

  function wipe() {
    try {
      getStorage().removeItem(KEY);
    } catch (e) {
      void e;
    }
  }

  GG.save = { load, save, completeLevel, totalStars, wipe, KEY, defaults };
})(typeof window !== 'undefined' ? window : globalThis);
