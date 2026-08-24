const CLASSIC_PALETTE = Object.freeze({ white: '#ffe9b8', r: '#ff5d5d', g: '#5dff9d', b: '#6da8ff' });

export const SKINS = [
  {
    id: 'classic',
    name: '클래식', nameEn: 'Classic',
    unlockStars: 0,
    palette: CLASSIC_PALETTE
  },
  {
    id: 'ocean',
    name: '오션', nameEn: 'Ocean',
    unlockStars: 0,
    palette: { white: '#bfeaff', r: '#7fd8ff', g: '#5fffd0', b: '#6f9dff' }
  },
  {
    id: 'ember',
    name: '엠버', nameEn: 'Ember',
    unlockStars: 0,
    palette: { white: '#ffd9a0', r: '#ff8a5c', g: '#ffc46b', b: '#ff6b9d' }
  },
  {
    id: 'aurora',
    name: '오로라', nameEn: 'Aurora',
    unlockStars: 0,
    palette: { white: '#e4ffe9', r: '#8affe0', g: '#a0ffb0', b: '#c48aff' }
  }
];

export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

export function isUnlocked(skin, totalStars) {
  return totalStars >= skin.unlockStars;
}
