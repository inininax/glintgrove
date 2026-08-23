export function makeCtxStub() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => undefined;
    },
    set() {
      return true;
    }
  });
}

const ALL_IDS = [
  'game-canvas', 'screen-title', 'screen-levels', 'screen-game',
  'chapter-list', 'total-stars', 'hud-level-name', 'hud-moves',
  'toast', 'win-overlay', 'win-title', 'win-stats', 'win-stars',
  'settings-modal', 'set-sound', 'set-motion', 'set-colorblind',
  'set-lang', 'intro-modal', 'ach-modal', 'ach-list', 'ach-progress',
  'btn-play', 'btn-daily', 'btn-continue', 'btn-back-title',
  'btn-settings', 'btn-settings2', 'btn-close-settings', 'btn-wipe',
  'btn-undo', 'btn-reset', 'btn-hint', 'btn-exit', 'btn-next',
  'btn-replay', 'btn-share', 'btn-win-select', 'btn-intro-ok',
  'btn-ach', 'btn-close-ach'
];

function makeElement(id) {
  const node = {
    id,
    children: [],
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    disabled: false,
    checked: false,
    value: '',
    listeners: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) { force ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    addEventListener(type, fn) {
      (node.listeners[type] = node.listeners[type] || []).push(fn);
    },
    removeEventListener() {},
    appendChild(child) {
      if (!Array.isArray(node.children)) node.children = [];
      node.children.push(child);
      return child;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1280, height: 800 };
    },
    setAttribute() {},
    click() {
      (node.listeners.click || []).forEach(fn => fn({}));
    },
    dispatchEvent(ev) {
      (node.listeners[ev.type] || []).forEach(fn => fn(ev));
    }
  };
  Object.defineProperty(node, 'children', {
    value: id === 'win-stars' ? [makeElement('s1'), makeElement('s2'), makeElement('s3')] : [],
    writable: true
  });
  return node;
}

export function installDom() {
  const elements = {};
  for (const id of ALL_IDS) {
    const node = makeElement(id);
    if (/overlay|modal$/.test(id)) node.classList.add('hidden');
    if (id === 'game-canvas') {
      node.width = 0;
      node.height = 0;
      node.getContext = () => makeCtxStub();
    }
    elements[id] = node;
  }

  globalThis.document = {
    readyState: 'complete',
    body: { dataset: {}, appendChild() {} },
    getElementById: id => elements[id] || null,
    createElement: tag => {
      const el = makeElement('dyn');
      if (tag === 'canvas') {
        el.getContext = () => makeCtxStub();
        el.width = 300;
        el.height = 150;
      }
      return el;
    },
    querySelectorAll: () => [],
    addEventListener() {}
  };

  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  globalThis.confirm = () => true;
  globalThis.requestAnimationFrame = () => 1;

  let store = '';
  globalThis.localStorage = {
    getItem: k => (k === '__gg_test' ? null : store || null),
    setItem: (k, v) => {
      if (k !== '__gg_test') store = v;
    },
    removeItem: k => {
      if (k !== '__gg_test') store = '';
    }
  };

  return elements;
}
