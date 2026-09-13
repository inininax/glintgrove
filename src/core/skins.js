// Ilyndrel palettes selected locally; legacy IDs preserve saved preferences.
const CLASSIC_PALETTE = Object.freeze({ white: '#ffe9b8', r: '#ed887f', g: '#82d4ae', b: '#84b9e8' });

export const SKINS = [
  {
    id: 'classic',
    name: '상아빛', nameEn: 'Ivory',
    unlockStars: 0,
    palette: CLASSIC_PALETTE
  },
  {
    id: 'ocean',
    name: '물안개', nameEn: 'Waterglass',
    unlockStars: 0,
    palette: { white: '#d3e9ed', r: '#df9b98', g: '#8bc6b3', b: '#6eabd4' }
  },
  {
    id: 'ember',
    name: '구리빛', nameEn: 'Copper',
    unlockStars: 0,
    palette: { white: '#f5dcaa', r: '#e88162', g: '#acbd7a', b: '#a59bcc' }
  },
  {
    id: 'aurora',
    name: '자개빛', nameEn: 'Nacre',
    unlockStars: 0,
    palette: { white: '#e5edcc', r: '#e6a1c4', g: '#9fcfb4', b: '#a8b9e6' }
  }
];

export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

export function isUnlocked(skin, totalStars) {
  return totalStars >= skin.unlockStars;
}
