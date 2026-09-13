# Art pipeline independent verification

> Historical initial-pipeline snapshot. Later Blender background replacements, folder paths, asset revision and test counts are documented in [current integration verification](remade-verification.md) and [replacement review](../legal/remake-independent-review.md). References below describe the files at the time of this earlier review.

Date: 2026-09-13. Scope: asset loading, publication failure behavior, offline snapshots, editable Blender source, one source-to-sprite reproduction, and an independent review of supplied screenshots. Live browser interaction QA is a separate pass. No production code or art files were changed by this verifier.

## Review status

**Pipeline and supplied-screen review passed after fixes:** all three reproduced P2 issues below are fixed and independently reverified. The corrected desktop screenshot also resolves the HUD/board overlap. No remaining P1/P2 issue was found in this bounded pipeline and screenshot pass. The parent owns final live-browser/offline/mobile checks. This is not a claim that a latest GPT Image model was used. The parent task owns the disclosed image-model requirement.

## Reproduced findings and closure

### P2 — Publisher can replace a valid manifest with metadata rejected by the runtime

Location: `tools/art/publish_art.py:23`, `:41`, `:45`, and `:60`; runtime contract at `src/assets/assetStore.js:36` and `:45`.

The publisher does not enforce the runtime asset-ID grammar and Python accepts booleans as numeric anchor/scale values. An isolated catalog with `anchor: [true, 0.5]` successfully replaced its previous manifest. `validateAssetManifest` then rejected that output with `Invalid anchor: tree`. The ID `tree/awake` also published successfully despite being invalid for the runtime.

Impact: a catalog typo or invalid edit can publish a manifest the game and offline worker cannot accept, violating the promised validation boundary. Invalid IDs are also interpolated into filesystem paths before runtime validation.

Fix: validate the complete catalog and staged runtime manifest against the same contract before writing any runtime files. Reject booleans as numeric metadata, invalid IDs, invalid schema/map shapes, and unsafe generated paths. Add a publisher regression that proves rejected metadata leaves the old manifest and files unchanged.

Related validation gap: a completely transparent RGBA sprite is accepted because only the minimum alpha is checked at `publish_art.py:33`. Reject a zero maximum alpha so an accidentally empty render cannot replace a visible game object.

**Closed:** the revised publisher validates exact metadata types, ID grammar, paths, visible alpha and the shared JavaScript runtime schema before publication. An independent fresh fixture rechecked boolean anchor, slash ID and fully transparent pixels: all three were rejected while every destination file remained byte-for-byte unchanged. The line references above identify the original finding; the fixed validation is in `_read_catalog`, the image preparation phase, and `_validate_runtime_manifest`.

### P2 — An unchanged art refresh deletes the retained previous snapshot

Location: `sw.js:132`–`:134`; retained-snapshot intention described at `:153`–`:154`.

The independent worker harness published v1, then v2, then requested the unchanged v2 again. Snapshot counts were **1 → 2 → 1**. On the third refresh, `previousName` equals `snapshotName`, so cleanup deletes v1. Requesting the old v1 image offline then failed.

Impact: the previous complete snapshot promised for in-flight clients is lost on an ordinary repeated manifest request, not a third distinct publication.

Fix: prune only when transitioning to a distinct snapshot, or persist the previous snapshot identity separately. Add a successful-update test covering v1 → v2 → unchanged v2 → offline access to the v1 image.

**Closed:** `sw.js` now prunes only on a distinct transition. Re-running the independent harness produced counts **1 → 2 → 2**, with both v1 and v2 images successfully served offline. The maintained Node regression also covers this sequence.

### P2 — Unknown selected Blender scenes silently render nothing

Location: `tools/art/render_library.py:19`–`:25`.

Running the documented iteration command with `--only tree.typo --output art/build/verifier-empty-render` exited successfully with zero outputs and no diagnostic.

Impact: a misspelled or renamed scene leaves the previous render in place and a later publication can silently ship stale artwork.

Fix: validate requested IDs against the loaded library before rendering; reject unknown IDs and an empty selection. Report the exact selected/rendered count. For command-line scripts, use Blender's Python-exception exit-code option so exceptions produce a failed process status.

**Closed:** the revised helper rejects unknown/empty selections, invalid quality options and unsafe output names/locations before rendering. The actual Blender invocation with `--only tree.typo` now exits **2**, names the unknown ID and available IDs, and does not create the requested destination. The helper returns the rendered count. Blender's `--python-exit-code` remains useful for other uncaught command-line script exceptions; `argparse` validation already returns the checked nonzero status.

## Passing evidence

- Ran `node --test tests/assetStore.test.mjs` after the fixes: **12 tests passed**. These cover loader replacement/fallback, unsafe metadata, bounded reads, timeout, failed worker update, successful worker update and unchanged-refresh retention.
- Ran `.venv-art-build/bin/python -m unittest discover -s tools/art -p 'test_*.py'` independently after the fixes: **18 tests passed**. They cover real Pillow publication fixtures and request validation at the Blender boundary. The separate actual Blender typo invocation above confirms that this validation also fails correctly in the real command-line host.
- Empirically published a valid fixture, then attempted a changed first sprite followed by either a missing or corrupt second source. Both failures preserved **the complete destination file set and old manifest byte-for-byte**. The fixtures live under ignored `art/build/verifier-publish-3bunwnwy`; the publisher root was isolated to that fixture so normal provenance was untouched.
- Fully decoded every final manifest image with Pillow, rather than relying only on header checks: **25 files, 21 PNG sprites and 4 WebP backgrounds, 3,455,428 bytes**, revision `nocturne-c4cf96b06729`. This includes the fourth `heart` background. Every dimension matched. All 21 current sprites contain transparent and visible pixels.
- Opened `art/source/blender/grove-library-v1.blend` using installed **Blender 5.2.1 LTS**. It contains **21 asset scenes**, actual meshes/curves and cameras, 384 × 384 render settings with 40 Cycles samples, and no unpacked external image dependencies. This confirms that the library is editable source, not a flat-image wrapper.
- Re-rendered only `mirror` from the saved library into ignored `art/build/verifier-rerender`. Its decoded RGBA pixels exactly match `art/build/sprites/mirror-v1.png`. Both pixel hashes are `5d863fd99503fb5e33458541d9cbfed85feca3ba79d5a7d8e5d27be960a9e05f`.
- Inspected the source protection in `build_blender.py:18`: an existing library requires explicit `--replace`; ordinary `render_library.py` rendering does not regenerate geometry or save over manual edits.

## Independent screenshot review

Viewed the supplied title, desktop levels 1 and 17, mobile level 17, map, win overlay, and `art/previews/sprite-contact-sheet-v1.jpg`. The title image reviewed was `/tmp/glintgrove-nocturne-title-current.png`, which contains the intended forest composition.

- The framed forest opening, ivory title and restrained gold CTA establish a coherent visual hierarchy. The map and win overlay share its typography, palette and fine border treatment.
- The dark game board keeps the detailed background subordinate to the puzzle. Narrow beams and the moving mirror faces remain readable. Sprites share their brass/stone/moss materials and read consistently as crafted miniature game pieces.
- In the supplied mobile level-17 image, mirror slashes, crystal/gate letter seals, tree target and blockers remain distinguishable. The screenshot alone does not justify a mandatory zoom feature or a new renderer. Actual tap behavior belongs to the live interaction check.
- Rechecked the corrected desktop level-17 capture at `art/previews/game-desktop-v1.png` (1440 × 960). The HUD ends at approximately y=91 and the board begins at y=110, leaving a clear gap. The overlap is closed. This capture is during beam reveal, so its temporarily separated beam segments are not treated as a persistent defect.
- The win screenshot is during star animation; its transient star colors are not treated as a defect.

Final small polish was checked in code: mobile move text is now 10px, difficulty text 9px, and the achievement toast uses `✧` rather than a sprout emoji. No new issue was found from those changes. The remaining optional suggestion is to make rock blockers occupy slightly more of their tile. The miniature sprites and detailed environmental illustration are visibly different rendering treatments, but the shared palette and explicit board make that distinction coherent.

## Operational limits to retain in handoff

- `tools/check-assets.mjs` checks headers and dimensions; it is not a full compressed-stream decoder. Browser decode and the publisher's Pillow decode are separate boundaries. The existing Node tests deliberately inject a decoder, so they cannot establish CSP compatibility or real browser image decoding.
- The core worker cache uses an explicit version and cache-first JS/CSS. Editing a core render/UI module alone does not inherently invalidate that cache; a core release must change the worker's core cache version and verify the upgrade path. Network-first navigation can temporarily pair new HTML with an older active worker's cached modules. Art-only content-hashed manifest updates are the independent supported path.
- Confirmed `tools/verify-all.sh` now runs `tools/check-assets.mjs` as stage 3 and propagates its failure through the final result. The normal verification procedure therefore includes runtime file presence, dimensions, path and export-budget validation.
- Only one sprite was re-rendered for pixel reproducibility. This does not establish bit-identical output on different Blender versions, operating systems, render devices, or changed image-generation services.
- The parent reported 17 real-browser E2E checks and 300/300 level-solver checks passing; this final bounded pass did not rerun those suites. The parent's live-browser pass owns actual interactions, reduced motion, final mobile behavior and service-worker behavior under the application's CSP. Supplied still screenshots cannot establish those behaviors by themselves.
