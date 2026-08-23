export const TILE = {
  EMPTY: '.',
  WALL: '#',
  MIRROR_SLASH: '/',
  MIRROR_BACK: '\\',
  SPLITTER: 's',
  EMITTER_R: '>',
  EMITTER_L: '<',
  EMITTER_U: '^',
  EMITTER_D: 'v',
  TREE: 'T',
  FLOWER: 'f',
  MUSHROOM: 'M',
  OWL: 'O',
  CRYSTAL_R: 'r',
  CRYSTAL_G: 'g',
  CRYSTAL_B: 'b',
  GATE_R: 'A',
  GATE_G: 'B',
  GATE_B: 'C',
  PORTAL_A: 'P',
  PORTAL_B: 'Q',
  PORTAL_C: 'R',
  PORTAL_D: 'S'
};

export const TARGET_CHARS = new Set([TILE.TREE, TILE.FLOWER, TILE.MUSHROOM, TILE.OWL]);

export const TARGET_TYPE_BY_CHAR = {
  [TILE.TREE]: 'tree',
  [TILE.FLOWER]: 'flower',
  [TILE.MUSHROOM]: 'mushroom',
  [TILE.OWL]: 'owl'
};

export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
