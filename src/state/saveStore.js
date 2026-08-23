const KEY = 'glintgrove_save_v2';

export const SCHEMA_VERSION = 2;

export function defaults() {
  return {
    v: SCHEMA_VERSION,
    unlocked: 1,
    stars: {},
    sound: true,
    motion: true,
    colorblind: false,
    seenIntro: false,
    lang: 'auto',
    tipsSeen: {},
    daily: {},
    ach: {}
  };
}

function memoryStorage() {
  let data = '';
  return {
    getItem: () => data || null,
    setItem: (_k, v) => { data = v; },
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
  } catch {
    /* private mode */
  }
  return memoryStorage();
}

function migrateV1(old) {
  return {
    ...defaults(),
    unlocked: old.unlocked,
    stars: old.stars,
    sound: old.sound,
    motion: old.motion,
    colorblind: old.colorblind,
    seenIntro: old.seenIntro
  };
}

function sanitize(d) {
  d.v = SCHEMA_VERSION;
  d.unlocked = Number.isInteger(d.unlocked) && d.unlocked >= 1 ? d.unlocked : 1;
  if (!d.stars || typeof d.stars !== 'object' || Array.isArray(d.stars)) d.stars = {};
  for (const k of Object.keys(d.stars)) {
    const v = d.stars[k];
    if (!(Number.isInteger(v) && v >= 0 && v <= 3)) delete d.stars[k];
  }
  if (!d.tipsSeen || typeof d.tipsSeen !== 'object') d.tipsSeen = {};
  if (!d.daily || typeof d.daily !== 'object' || Array.isArray(d.daily)) d.daily = {};
  for (const k of Object.keys(d.daily)) {
    const e = d.daily[k];
    if (!e || !Number.isInteger(e.moves) || !(e.stars >= 1 && e.stars <= 3)) delete d.daily[k];
  }
  if (!d.ach || typeof d.ach !== 'object' || Array.isArray(d.ach)) d.ach = {};
  if (!['auto', 'ko', 'en'].includes(d.lang)) d.lang = 'auto';
  const def = defaults();
  for (const k of ['sound', 'motion', 'colorblind', 'seenIntro']) {
    if (typeof d[k] !== 'boolean') d[k] = def[k];
  }
  return d;
}

const LEGACY_KEY = 'glintgrove_save_v1';

export function load() {
  try {
    let raw = getStorage().getItem(KEY);
    let migratedFromLegacy = false;

    if (!raw) {
      raw = getStorage().getItem(LEGACY_KEY);
      migratedFromLegacy = !!raw;
    }
    if (!raw) return defaults();

    const parsed = JSON.parse(raw);
    if (!parsed) return defaults();

    let candidate;
    if (parsed.v === 1) candidate = migrateV1(parsed);
    else if (parsed.v === SCHEMA_VERSION) candidate = parsed;
    else return defaults();

    const result = sanitize(candidate);

    if (migratedFromLegacy || parsed.v === 1) {
      save(result);
      getStorage().removeItem(LEGACY_KEY);
    }
    return result;
  } catch {
    return defaults();
  }
}

export function save(data) {
  try {
    getStorage().setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked */
  }
}

export function completeLevel(data, levelId, stars, meta) {
  data.stars[levelId] = Math.max(data.stars[levelId] || 0, stars);
  if (levelId + 1 > data.unlocked) data.unlocked = levelId + 1;
  save(data);
  return data;
}

export function recordDaily(data, dateStr, moves, stars) {
  const prev = data.daily[dateStr];
  const best = prev ? Math.max(prev.stars, stars) : stars;
  data.daily[dateStr] = { moves: Math.min(prev ? prev.moves : moves, moves), stars: best };
  save(data);
  return data;
}

export function totalStars(data) {
  let sum = 0;
  for (const k in data.stars) sum += data.stars[k];
  return sum;
}

export function dailyStreak(data, todayStr) {
  const dates = new Set(Object.keys(data.daily));
  if (dates.size === 0) return 0;
  let streak = 0;
  const d = new Date(todayStr + 'T00:00:00Z');
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export function wipe() {
  try {
    getStorage().removeItem(KEY);
  } catch {
    /* noop */
  }
}
