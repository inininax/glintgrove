# Remade puzzle catalogue: Rainpaths v1

Authored: 2026-09-13. Project name during this remake: Ilyndrel (일린드렐).

The previous 300 layouts, template transformations, level names, chapter names and hints were replaced. The current authoring source starts with an empty grid and constructs new routes; it does not import retired puzzle data, external puzzle collections or visual references. This records how these files were made. It does not guarantee copyright ownership, exclusive originality or non-infringement of every possible existing puzzle.

## Reproduce

Run from the repository root with Node.js:

```sh
node tools/generate-levels.mjs
node tools/generate-levels.mjs --check
node --test tests/levelRemake.test.mjs tests/levels.test.mjs tests/daily.test.mjs
node tools/check-levels.mjs
```

Seed: `ilyndrel-rainpaths-2026-09-13-v1`. Generator: [src/services/generator.js](../../src/services/generator.js). Data: [src/data/levels.generated.js](../../src/data/levels.generated.js). The first level is a newly authored two-bend introduction embedded in this generator; levels 2–300 use deterministic construction. [levels.js](../../src/data/levels.js) now exports this single complete catalogue. No old first-30 catalogue is merged back in. The old debug command path `tools/debug-transform.mjs` now only prints a newly generated level, its solver result and its comparison signature; it performs no template transformation.

The publisher builds and validates all 300 in memory before atomically replacing the generated data file. `--check` compares the exact expected bytes without rewriting it. Names and hints are generated from newly written bilingual vocabulary and feature descriptions in the generator; they are not loaded from the retired name lists.

## Construction and compatibility

A seeded search constructs self-avoiding axis-aligned routes with short variable-length segments on an empty board. Each bend becomes a mirror. A selected bend can become a splitter whose straight continuation grows a second route. Some circuits use a spatially separated portal pair or a second independent emitter. Color circuits put a crystal and matching gate before a target and record that target's required color. Decorative wall islands are added only outside all intended routes. Invalid or crowded constructions are discarded and tried again from the deterministic random stream.

The generator checks the solved circuit with the existing engine, scrambles a bounded selection of rotatable objects, and runs the existing breadth-first solver. A result is accepted only when every target is satisfied and the computed minimum equals the advertised par. Stored solution orientations are checked separately. The game's rules, solver, tracer and input logic were not modified by the level remake. The public PRNG helpers are retained as recorded in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

The rectangular grid tokens, target-need metadata, splitter orientations, chapter IDs and portal pairing schema stay compatible. IDs remain consecutive 1–300. Tutorial milestones remain:

- Level 1: the sole incorrect backslash at (6,5) is the dynamically discovered tutorial target; one click solves the two-bend path.
- Level 6: the required introductory click rotates a splitter and supplies both target branches.
- Level 17: colored target requirements, crystals and matching gates are present.
- Level 23: the solution actually traverses its portal pair.
- Level 300: two emitters, branching routes, all three color families and a portal pair combine in an eight-move finale.

Daily mode still consumes the same level schema. A new regression check solves 45 consecutive date configurations from the replacement catalogue and verifies the reported optimum. Game event tests use independent fixtures rather than coordinates from the released catalogue, so future content replacement does not weaken the win/replay/reset checks.

## Recorded checks and limits

[retired-level-signatures.json](../../art/recipes/retired-level-signatures.json) contains 300 SHA-256 comparison hashes captured from the catalogue immediately before its replacement. The same 300 hashes were also re-derived from the level modules in Git HEAD `48820b6` and matched this record. It contains no retired layout geometry. The comparison removes empty margins and decorative walls, ignores target species, emitter heading and mirror orientation, and chooses the smallest representation across all eight rotations/reflections. All 300 current signatures are distinct, and none matches that retired set. This rejects exact geometry reuse under those transformations, including simple cosmetic substitutions; it is not an exhaustive similarity or originality test, and it does not compare every puzzle ever published.

Catalogue statistics from the current generated file:

```json
{
  "levels": 300,
  "chapters": 20,
  "averageOptimal": 4.28,
  "minOptimal": 1,
  "maxOptimal": 8,
  "maxRotatables": 9,
  "multiEmitter": 27,
  "splitterLevels": 294,
  "colorLevels": 193,
  "portalLevels": 103
}
```

This records solver validity and structural diversity, not a claim that all 300 have received human playtesting or equivalent subjective difficulty. Existing save data still refers to numbered IDs; this remake does not migrate or reset previously earned progress. The surrounding visual art, UI and legal records are maintained separately by the parent task.

Byte records at this authoring pass (changes require regeneration/review):

| File | SHA-256 |
|---|---|
| `src/services/generator.js` | `f526739af86cf209d54db035f71c063aaf404f12510bac2ed5f90c9f9540ec16` |
| `src/data/levels.generated.js` | `611749902934d52a71e5a5b2145ba235a0f9670aa81016fde0fbaac1acd1148f` |
| `art/recipes/retired-level-signatures.json` | `7b73f6c4f8c5d77752c0a9e43547ef74dcd5dc8830d76cc2d8ca24414d35a5d5` |
