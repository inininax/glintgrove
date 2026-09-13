import { GENERATED_LEVELS, GENERATED_CHAPTERS } from './levels.generated.js';

// The full catalogue, including the authored introduction, has one reproducible
// source in services/generator.js. No retired hand-authored levels are merged in.
export const CHAPTERS = GENERATED_CHAPTERS;
export const LEVELS = GENERATED_LEVELS;

export function difficultyOf(def) {
  if (def.diff) return def.diff;
  const moves = def.par || 1;
  return moves >= 7 ? 'extreme' : moves >= 6 ? 'hard' : moves >= 4 ? 'normal' : 'easy';
}
