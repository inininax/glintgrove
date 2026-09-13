# Procedural woodland replacement · v2

Created on 2026-09-13 with the locally installed Blender 5.2.1 LTS. This recipe replaces the four prior image-model backgrounds and the prior social preview. It documents construction and reproducibility, not a legal guarantee of exclusive copyright or absence of similarity to every existing work.

## Source and construction

- Editable master: `art/source/procedural/nocturne-environments-v2.blend`.
- Geometry recipe: `tools/art/build_procedural_environments.py`.
- Scenes: `forest`, `depths`, `garden`, `heart`, `share`.
- The new script defines tree curves, bark ridges, custom leaf topology, moss banks, ferns, mushroom caps, stones, crystal meshes, petals, suspended light seeds, lights, cameras and a numeric fog volume.
- Shader textures are Blender procedural Noise nodes. There are no photographs, reference images, downloaded textures, HDRIs, imported models, fonts, text objects or logos in these scenes. No image generation API or image model was called for these replacements.
- Chapter palettes are expressed as numeric sRGB values in the script. Geometry uses Python's local seeded random generator, with seeds `260913` through `260916`; `share` uses `260913` and adds an original open-orbit/seed sculpture.
- The creator of this implementation is the coding assistant operating in this user-authorized workspace. “Script-defined” does not mean human-only authorship or itself settle the contracting party's rights.
- The 21 earlier original sculpture scenes and their source `.blend` file are retained. The contact sheet copies their geometry into a temporary arrangement, renders it, and does not save the source file.

## Exact commands used for final output

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/art/build_procedural_environments.py -- --replace
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v2.blend --python-exit-code 1 --python tools/art/render_procedural_environments.py -- --samples 48
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/blender/grove-library-v1.blend --python-exit-code 1 --python tools/art/render_geometry_contact_sheet.py
```

The initial build requires no `--replace`. That flag is deliberately necessary to discard edits and rebuild an existing master. Ordinary manual editing uses only the second command, which reads the master and never saves it. An optional `--only forest --percent 45 --samples 18 --draft` renders a smaller review image under ignored `art/build/`, without replacing final sources.

Final outputs:

| Output | Dimensions | Content |
| --- | --- | --- |
| `art/source/procedural/forest-v2.png` | 1536 × 1024 | Moss banks, fern framing and jade woodland |
| `art/source/procedural/depths-v2.png` | 1536 × 1024 | Cool woodland and faceted mineral shoots |
| `art/source/procedural/garden-v2.png` | 1536 × 1024 | Muted pale petals and soft silver foliage |
| `art/source/procedural/heart-v2.png` | 1536 × 1024 | Warm pollen and amber petal accents |
| `art/source/procedural/share-v2.png` | 1200 × 630 | Wordless seed and open-orbit sculpture in the woodland |
| `art/previews/sprite-contact-sheet-v1.jpg` | 1600 × 960 | All 21 original sculptures, with no text or label font |

PNG environments use Cycles, AgX, 48 samples, denoising and seed 1709. The wordless geometry contact sheet uses Cycles, AgX Medium High Contrast, 24 samples, denoising and seed 1709; its object order is the sorted original asset IDs, arranged in seven columns and three rows. Cross-version/platform floating-point rendering can differ, so the final file hashes in the adjacent provenance JSON identify the exact delivered outputs.

`art/recipes/catalog.json` maps the same four runtime IDs to the new PNG sources. Publication remains a separate local build step using `tools/art/publish_art.py`; retaining the IDs preserves chapter selection and sprite behavior. This recipe does not publish the site or commit files.

## Verification and licensing boundary

`art/recipes/procedural-environments-v2.json` records file hashes, output dimensions, tools, inputs and inspection counts. An external verifier should independently check the final files and runtime publication.

The scripts use Blender's `bpy` API. The scoped [script license notice](../../tools/art/LICENSES.md) and accompanying complete GPL text govern the listed scripts; rendered PNG/JPEG/WebP output is separate from the Blender program and its scripting license. SPDX/license comments were added after geometry construction without changing executable recipe statements; both the recorded script and its comment-free-at-construction body hash are identified in the provenance record. No license text in this recipe grants third-party rights or claims that ordinary geometric motifs are exclusive property.

## Folder update after rendering

The original share render moved byte-for-byte to `art/source/procedural/share-v2.png`. The environment renderer now writes this raw source there. `publish_art.py` also exports `assets/site/share.png`, retaining compressed pixels/color chunks and removing textual metadata with local workstation paths. Original sprite render inputs moved byte-for-byte to versioned `art/renders/sprites/`; runtime image hashes are unchanged. The JSON records the original generation paths and current locations.
