import { getSkin } from './skins.js';

export const BEAM_COLORS = Object.freeze(['white', 'r', 'g', 'b']);

export const PALETTE = Object.freeze({
  white: '#ffe9b8',
  r: '#ff5d5d',
  g: '#5dff9d',
  b: '#6da8ff'
});

let skinPalette = null;

export function setSkinTheme(palette) {
  skinPalette = palette || null;
}

export function colorOf(name) {
  if (skinPalette && skinPalette[name]) return skinPalette[name];
  return PALETTE[name] || PALETTE.white;
}

export const _activeSkinFallback = () => getSkin('classic');
