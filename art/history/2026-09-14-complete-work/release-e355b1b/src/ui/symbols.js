// Original etched-light symbols, authored for this project on 2026-09-13.
// These paths were drawn from geometric constructions, without an icon library.
const seed = '<path d="M16 3C22 8 25 13 23 19C21 25 16 29 16 29S9 25 8 19C7 13 11 7 16 3Z"/><path d="M16 9V24M11 15L16 19L21 13"/>';
const shard = '<path d="M16 3L22 12L29 16L21 21L16 29L11 21L3 16L12 11Z"/><path d="M16 9V23M9 16H23"/>';
const SYMBOLS = Object.freeze({
  seed,
  shard,
  settings: '<path d="M6 5V12M6 20V27M16 5V19M16 27V29M26 3V8M26 16V27"/><path d="M6 11L10 16L6 21L2 16Z M16 18L20 23L16 28L12 23Z M26 7L30 12L26 17L22 12Z"/>',
  play: '<path d="M5 23V9L17 16L5 23ZM20 9L27 16L20 23"/><path d="M10 16H22"/>',
  hint: '<path d="M16 4L22 12L20 21H12L10 12L16 4ZM13 25H19M16 10V17"/><path d="M5 8L7 10M27 8L25 10M3 17H6M26 17H29"/>',
  undo: '<path d="M12 7L4 12L12 17V7ZM13 12H21L27 18L22 25H14"/><path d="M14 22L17 25L14 28"/>',
  reset: '<path d="M22 5L28 11L22 17V5ZM21 10H12L5 17L11 24H20L24 20"/><path d="M12 15L17 20M17 15L12 20"/>',
  map: '<path d="M5 25V11L11 5H24L28 9V24L23 28H9L5 25Z"/><path d="M10 23L13 17L21 15L23 9M13 17L9 12"/><circle cx="10" cy="23" r="2"/><circle cx="21" cy="15" r="2"/>',
  lock: '<path d="M7 15L12 11H20L25 15V25L20 29H12L7 25V15ZM11 12V8L16 3L21 8V12M16 18V23"/>',
  pointer: '<path d="M16 28L11 21L13 18V9C13 5 19 5 19 9V17L23 15L27 19L23 26L16 28Z"/><path d="M6 14H9M8 4L11 6M24 5L22 8"/>',
  splitter: '<path d="M6 25L26 5M4 16H16L26 26M16 16L26 16"/><path d="M5 9V5H9M23 27H27V23"/>',
  color: '<path d="M9 4L15 11L9 20L3 11L9 4ZM23 10L29 17L23 28L17 17L23 10Z"/><path d="M9 8V16M23 14V23"/>',
  portal: '<path d="M13 4L6 8L3 17L8 25L14 28M19 4L26 8L29 17L24 25L18 28M10 12L16 8L22 12L21 21L16 25L11 21Z"/><path d="M13 16H19"/>',
  'first-light': seed,
  'dawn-woods': '<path d="M4 26L12 8L17 20L22 13L29 26H4Z"/><path d="M18 7V3M23 9L26 6M11 4L13 6M16 26V21"/><circle cx="20" cy="9" r="3"/>',
  'misty-deeps': '<path d="M4 10H12L17 5L24 10H28M3 16H18L23 20H29M5 25H12L16 22H22M9 10L12 16M18 16V22"/>',
  'starlit-garden': '<path d="M16 28V18M16 21L9 17L5 18L9 24H16M16 24L23 19L27 20L23 26H16"/><path d="M16 3L20 9L25 12L20 15L16 20L12 15L7 12L12 9Z"/>',
  'ancient-heart': '<path d="M16 3L26 10L24 23L16 29L7 22L5 10L16 3ZM16 3V29M5 10L16 14L26 10M7 22L16 14L24 23"/>',
  'no-hint-ten': '<path d="M5 25V9L11 5L16 8L21 5L27 9V25L21 22L16 26L11 22L5 25ZM16 8V21M9 11L12 10M20 11L23 10M9 16L12 15M20 16L23 15"/>',
  'daily-first': '<path d="M5 9H27V25L23 29H5V9ZM10 4V12M22 4V12M5 16H27"/><path d="M16 19L19 23L16 27L13 23Z"/>',
  'daily-streak-3': '<path d="M16 2L20 10L17 17L21 22L16 30L11 22L15 15L12 10L16 2ZM7 9L4 17L8 24M25 9L28 17L24 24"/>',
  perfectionist: '<path d="M16 2L21 10L30 16L21 22L16 30L11 22L2 16L11 10Z"/><path d="M16 10L20 16L16 22L12 16Z"/>',
  daily: '<path d="M3 24H29M8 24V19L16 11L24 19V24M16 3V7M5 10L8 13M27 10L24 13"/>'
});

export function symbolSvg(name = 'seed', className = '') {
  // Both values come from product code. Still restrict attributes to a safe token set.
  const classes = String(className).replace(/[^\w\s-]/g, '');
  return `<svg class="own-symbol ${classes}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SYMBOLS[name] || seed}</svg>`;
}

export function ratingSvg(earned, count = 3) {
  return Array.from({ length: count }, (_, index) => symbolSvg('shard', index < earned ? 'rating-earned' : 'rating-empty')).join('');
}
