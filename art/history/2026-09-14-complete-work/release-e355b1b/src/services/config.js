export const DEFAULT_CONFIG = Object.freeze({
  hintPenaltyCapStars: 2,
  tipsEnabled: true,
  dailyMinOptimal: 3,
  dailyMaxOptimal: 8,
  parOverrides: {},
  defaultSkin: 'classic'
});

let active = { ...DEFAULT_CONFIG };
let loaded = false;

function mergeConfig(base, patch) {
  const merged = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined) continue;
    if (k === 'parOverrides') {
      merged.parOverrides = { ...merged.parOverrides };
      for (const [id, par] of Object.entries(v)) {
        const levelId = Number(id);
        const n = Number(par);
        if (!Number.isInteger(levelId)) continue;
        if (Number.isInteger(n) && n >= 1 && n <= 30) merged.parOverrides[levelId] = n;
      }
      continue;
    }
    if (typeof base[k] === typeof v) merged[k] = v;
  }
  return merged;
}

export async function loadRemoteConfig(url = 'config.json', timeoutMs = 2500) {
  loaded = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return getConfig();
    const patch = await res.json();
    active = mergeConfig(DEFAULT_CONFIG, patch);
  } catch {
    active = { ...DEFAULT_CONFIG };
  }
  return getConfig();
}

export function getConfig() {
  if (!loaded) active = { ...DEFAULT_CONFIG };
  return active;
}

export function mergeConfigForTest(base, patch) {
  return mergeConfig(base, patch);
}
