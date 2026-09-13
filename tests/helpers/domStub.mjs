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
  'toast', 'tutorial-layer', 'win-overlay', 'win-title', 'win-stats', 'win-stars',
  'settings-modal', 'set-sound', 'set-motion', 'set-colorblind',
  'set-lang', 'set-skin', 'set-display', 'btn-settings-game', 'intro-modal', 'ach-modal', 'ach-list', 'ach-progress',
  'btn-play', 'btn-daily', 'btn-continue', 'btn-back-title', 'btn-title-help',
  'btn-settings', 'btn-settings2', 'btn-close-settings', 'btn-wipe',
  'btn-undo', 'btn-reset', 'btn-hint', 'btn-exit', 'btn-next',
  'btn-replay', 'btn-share', 'btn-win-select', 'btn-intro-ok',
  'btn-ach', 'btn-close-ach',
  'guide-modal', 'guide-title', 'guide-content', 'btn-guide', 'btn-close-guide'
];

function makeElement(id) {
  const node = {
    id,
    children: [],
    style: {},
    dataset: {},
    attributes: {},
    textContent: '',
    disabled: false,
    checked: false,
    value: '',
    listeners: {},
    classList: {
      _set: new Set(),
      add(...classes) { classes.forEach(c => this._set.add(c)); },
      remove(...classes) { classes.forEach(c => this._set.delete(c)); },
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
      child.parentElement = node;
      return child;
    },
    querySelectorAll(selector) {
      const selectors = selector.split(',').map(s => s.trim());
      return node.children.flatMap(child => [
        ...(selectors.some(s => s.startsWith('#') ? child.id === s.slice(1)
          : s === '[tabindex="0"]' ? child.attributes.tabindex === '0'
          : child.tagName === s.split(':')[0].toUpperCase() && (!s.includes('[disabled]') || !child.disabled)) ? [child] : []),
        ...child.querySelectorAll(selector)
      ]);
    },
    querySelector(selector) { return node.querySelectorAll(selector)[0] || null; },
    contains(other) { return node === other || node.children.some(child => child.contains(other)); },
    getClientRects() { return node.classList.contains('hidden') ? [] : [node.getBoundingClientRect()]; },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1280, height: 800 };
    },
    setAttribute(name, value) { node.attributes[name] = String(value); },
    getAttribute(name) { return node.attributes[name] ?? null; },
    focus() { globalThis.document.activeElement = node; },
    click() {
      (node.listeners.click || []).forEach(fn => fn({}));
    },
    dispatchEvent(ev) {
      (node.listeners[ev.type] || []).forEach(fn => fn(ev));
    }
  };
  Object.defineProperty(node, 'innerHTML', {
    get() { return node._html || ''; },
    set(value) { node._html = value; node.children.forEach(child => { child.parentElement = null; }); node.children = []; }
  });
  Object.defineProperty(node, 'isConnected', {
    get() { return !!globalThis.document?.body?.contains(node); }
  });
  Object.defineProperty(node, 'children', {
    value: id === 'win-stars' ? [makeElement('s1'), makeElement('s2'), makeElement('s3')] : [],
    writable: true
  });
  return node;
}

export function installDom() {
  const elements = {};
  const body = makeElement('body');
  for (const id of ALL_IDS) {
    const node = makeElement(id);
    if (/overlay|modal$/.test(id)) node.classList.add('hidden');
    if (id === 'game-canvas') {
      node.width = 0;
      node.height = 0;
      node.getContext = () => makeCtxStub();
    }
    elements[id] = node;
    node.tagName = id.startsWith('btn-') ? 'BUTTON' : 'DIV';
    body.appendChild(node);
  }

  for (const [modal, ids] of Object.entries({
    'settings-modal': ['btn-close-settings'],
    'intro-modal': ['btn-intro-ok'],
    'ach-modal': ['btn-close-ach'],
    'guide-modal': ['guide-title', 'guide-content', 'btn-close-guide'],
    'win-overlay': ['btn-next', 'btn-share', 'btn-replay', 'btn-win-select']
  })) {
    for (const id of ids) {
      body.children = body.children.filter(node => node !== elements[id]);
      elements[modal].appendChild(elements[id]);
    }
  }

  const listeners = {};

  globalThis.document = {
    readyState: 'complete',
    body,
    activeElement: body,
    getElementById: id => elements[id] || body.querySelector(`#${id}`),
    createElement: tag => {
      const el = makeElement('dyn');
      el.tagName = tag.toUpperCase();
      if (tag === 'canvas') {
        el.getContext = () => makeCtxStub();
        el.width = 300;
        el.height = 150;
      }
      return el;
    },
    querySelectorAll: () => [],
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    dispatchEvent(event) { for (const fn of listeners[event.type] || []) fn(event); }
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
