export const BEAM_COLORS = Object.freeze(['white', 'r', 'g', 'b']);

export const PALETTE = Object.freeze({
  white: '#ffe9b8',
  r: '#ff5d5d',
  g: '#5dff9d',
  b: '#6da8ff'
});

export function colorOf(name) {
  return PALETTE[name] || PALETTE.white;
}
