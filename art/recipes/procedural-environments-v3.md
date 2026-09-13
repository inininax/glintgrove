# Moonlit water and woodland · v3

This update improves the four chapter backgrounds using the locally installed Blender 5.2.1 LTS. It opens the existing original v2 master and saves a separate editable v3 master. The v2 master, v2 renders, sprite source library and current social preview are preserved.

## Editable files and runtime separation

```text
art/
  source/procedural/
    nocturne-environments-v2.blend   preserved geometry and share scene
    nocturne-environments-v3.blend   current editable background master
    forest-v3.png                   full-size source render
    depths-v3.png
    garden-v3.png
    heart-v3.png
  recipes/
    catalog.json                    runtime IDs → source renders
    procedural-environments-v3.md   construction and update instructions
    procedural-environments-v3.json exact generation evidence
  build/environment-drafts-v3/      ignored low-resolution review images
assets/game/backgrounds/            published, hashed WebP files
src/render/background.js            independent Canvas atmospheric motion
```

Blender edits are made in the v3 master, then rendered and published. The Canvas animation is separate from the static image, so replacing a render preserves the game's motion controls. The four semantic IDs remain `forest`, `depths`, `garden` and `heart`; sprite IDs and dimensions are unchanged.

## Construction and inputs

- Parent geometry: `art/source/procedural/nocturne-environments-v2.blend`, whose source hashes and original numerical construction are recorded in the v2 recipe.
- Upgrade script: `tools/art/upgrade_procedural_environments_v3.py`, using local helpers from `build_procedural_environments.py`.
- New work: a winding pool surface, stretched procedural water normals, broken reflective filaments, a distant luminous sphere, suspended moss fronds, small bank blossoms and a different warm/cool lighting composition for each chapter.
- The foreground trunks, hand-defined leaf topology, banks, existing plants and distant tree layers remain editable. The old flat distant canopy disks are hidden for these four renders, revealing more sky and depth.
- Actual Cycles area/spot lights pass through a numeric volume; no painted light-ray image is imported. Geometry additions use Python's local random generator with seeds `26091330` through `26091333`.
- Forest combines teal water with pale gold light; depths uses blue and lavender; garden uses silver green and blush; heart uses amber and moss green.
- No images, models, HDRIs, textures, photographs, fonts or logos were downloaded or imported. No image-generation API was used. Materials are numeric values and Blender shader nodes.
- The v3 `.blend` also retains an unchanged `share` scene inherited from v2; it is not a newly generated v3 output. Site publication continues to use `share-v2.png` and its v2 evidence.

## Exact production commands

From the repository root:

```bash
# Create a new v3 master from v2. This refuses to replace an existing v3 file.
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v2.blend --python-exit-code 1 --python tools/art/upgrade_procedural_environments_v3.py

# Review without replacing final images or saving the editable master.
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v3.blend --python-exit-code 1 --python tools/art/render_procedural_environments_v3.py -- --only forest --percent 50 --samples 18 --draft

# Render the current editable master. This never reconstructs or saves it.
/Applications/Blender.app/Contents/MacOS/Blender --background art/source/procedural/nocturne-environments-v3.blend --python-exit-code 1 --python tools/art/render_procedural_environments_v3.py -- --samples 48

.venv-art-build/bin/python tools/art/publish_art.py
npm run check:assets
node tools/record-visual-provenance.mjs
npm run build
```

During initial visual iteration, the upgrade command was repeated with explicit `--replace` to rebuild only the new v3 master. Do not use that flag for normal manual editing: it discards v3 edits and reconstructs the upgrade from v2. The source v2 file is never overwritten by this script. The renderer also rejects reduced-resolution final output unless `--draft` is provided.

All four final PNGs are RGB, 1536 × 1024, Cycles 48 samples with denoising, seed 1709, AgX and exposure −0.15. Cross-version/platform rendering may change pixels; the adjacent JSON identifies the delivered bytes rather than promising cross-platform bit-identical rendering. Publication strips source metadata and creates quality-88 WebP exports at the same dimensions, with immutable hash filenames. Older runtime files are retained for offline clients; the release builder includes only the current manifest's files.

## Authorship record and future edits

The coding assistant created the scripted additions in this user-authorized workspace. This is not a claim of human-only authorship, exclusive ownership of common geometric motifs, or an unconditional legal clearance. The new Blender API scripts are covered by the scoped [GPL source-script notice](../../tools/art/LICENSES.md); that notice does not impose a blanket license on the output artwork or the whole game.

`procedural-environments-v3.json` records the original parent master, saved v3 master, scripts, output hashes, scene inspection and render configuration. Future manual edits should be accompanied by a new generation record identifying the edited master and outputs. Running the generic provenance recorder alone records current bytes; it does not certify new authorship or turn changed sources into verified generation evidence.
