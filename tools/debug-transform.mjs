// Legacy command path retained as a read-only diagnostic for the new generator.
// Retired template transformations are no longer part of level authoring.
import { generateLevel, LEVEL_REMAKE_SEED, canonicalLayoutSignature } from '../src/services/generator.js';
import { solve, parseLevel } from '../src/sim/index.js';
const id = Number(process.argv[2] || 1);
const level = generateLevel(id);
console.log(JSON.stringify({ seed: LEVEL_REMAKE_SEED, level, solution: solve(parseLevel(level)),
  signature: canonicalLayoutSignature(level) }, null, 2));
