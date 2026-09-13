import { colorMarkPath } from './colorMarks.js';
import { colorOf } from '../core/colors.js';

const svg = body => `<svg viewBox="0 0 160 58" fill="none" stroke="#e5d2a7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const mark = (color, x, y, scale = 7) => `<path d="${colorMarkPath(color)}" transform="translate(${x} ${y}) scale(${scale})" stroke="${colorOf(color)}" stroke-width=".2"/>`;
const crystal = (color, x) => `<path d="M${x} 8l12 18-12 15-12-15Z" stroke="${colorOf(color)}"/>${mark(color, x, 49, 5)}`;
const gate = (color, x) => `<path d="M${x - 14} 40V20Q${x} -1 ${x + 14} 20V40M${x - 20} 41h11m18 0h11"/>${mark(color, x, 11, 5)}`;

export function deviceDiagram(kind, color = 'r') {
  if (kind === 'color' || kind === 'crystal' || kind === 'gate') return svg(
    `<path d="M3 27h27" stroke="#fff0c9"/><path d="M44 27h110" stroke="${colorOf(color)}"/>${crystal(color, 37)}${gate(color, 89)}<path d="M145 40V22m0 9q-15-2-12-12 14 1 12 12m0-3q14-3 12-12-13 2-12 12"/>${mark(color, 145, 49, 5)}`);
  if (kind === 'mirror') return svg('<path d="M6 39h66V6" stroke="#f4d69a"/><path d="M56 53l32-32" stroke="#c3e9df" stroke-width="6"/><path d="M100 42q23-4 17-23m0 0-7 9m7-9 9 7"/>');
  if (kind === 'splitter') return svg('<path d="M6 38h145M80 38V4" stroke="#f4d69a"/><path d="M62 54l36-32" stroke="#9bddd0" stroke-width="5"/><path d="m141 32 9 6-9 6m-67-33 6-8 6 8"/>');
  if (kind === 'portal') return svg('<path d="M5 29h33m83 0h33" stroke="#f4d69a"/><ellipse cx="43" cy="27" rx="13" ry="20" stroke="#cbbde2"/><ellipse cx="111" cy="27" rx="13" ry="20" stroke="#cbbde2"/><path d="M43 50v5m68-5v5m-52-28h35" stroke-dasharray="2 5"/>');
  if (kind === 'emitter') return svg('<path d="M18 29l13-17 13 17-13 17Z"/><path d="M32 29h115m-9-6 9 6-9 6" stroke="#fff0c9"/>');
  return svg('<path d="M5 30h103" stroke="#f4d69a"/><path d="M112 44V20m0 11q-19-3-16-17 20 2 16 17m0-2q20-4 17-18-18 2-17 18"/><circle cx="112" cy="30" r="22" stroke="#bce2c0" opacity=".45"/>');
}

export function guideKinds(level) {
  const kinds = ['emitter', 'mirror', 'target'];
  if (level?.rotatables?.some(piece => piece.kind === 'splitter')) kinds.push('splitter');
  if (level?.crystals?.length) kinds.push('crystal');
  if (level?.gates?.length) kinds.push('gate');
  if (Object.keys(level?.portals || {}).length) kinds.push('portal');
  return kinds;
}

// This reads the board only. It never asks the solver for a hint or mutates play.
export function deviceAt(level, layout, px, py) {
  if (!level || !layout.cell) return null;
  const x = Math.floor((px - layout.ox) / layout.cell);
  const y = Math.floor((py - layout.oy) / layout.cell);
  const at = item => item.x === x && item.y === y;
  if (level.rotatables?.some(at)) return null;
  const crystal = level.crystals?.find(at);
  if (crystal) return { kind: 'crystal', color: crystal.color };
  const gate = level.gates?.find(at);
  if (gate) return { kind: 'gate', color: gate.needColor };
  const target = level.targets?.find(at);
  if (target) return { kind: 'target', color: target.need || null };
  if (level.emitters?.some(at)) return { kind: 'emitter' };
  if (Object.values(level.portals || {}).some(at)) return { kind: 'portal' };
  return null;
}
