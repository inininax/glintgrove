const RING_MAX = 200;
const ring = [];

function sink(name, props) {
  const entry = { t: Date.now(), name, ...props };
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[analytics]', name, props);
  }
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
}

export function track(name, props = {}) {
  try {
    sink(name, props);
  } catch {
    /* analytics must never break gameplay */
  }
}

export function recentEvents() {
  return ring.slice();
}
