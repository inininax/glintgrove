# Nocturne live-browser checks

> Historical browser snapshot before the later Blender replacements and gameplay fixes. Current asset revision, 20 browser checks, audio/settings observations and test counts are in [current integration verification](remade-verification.md).

2026-09-13 · Local application, Ego Lite task space 3. Runtime manifest: `nocturne-c4cf96b06729`.

## Checked behavior

- The actual application CSP permits decoding all **25 images**: 21 transparent PNG sprites and 4 WebP backgrounds. The runtime reports `ready`, no failed IDs. The development gallery independently displays `25 / 25 loaded`.
- The existing browser E2E page reports **17 passing checks**: boot, real pointer event rotation, win detection/overlay, reset, hints and traces across all levels, final handcrafted level, daily challenge, tutorials and settings options. It ran on the separate `localhost:8000` origin so its progress does not replace the `127.0.0.1` preview's progress.
- A separate actual mouse click on the mirror at **390 × 844** solved level 1 in one move. The Korean win modal appeared without horizontal overflow.
- Reviewed Korean title, map, settings, gameplay and win layouts at 390 × 844; desktop title and gameplay at 1440 × 960. Final screenshots live in `art/previews/`. Device emulation was set in the same browser round as each capture.
- The corrected desktop level-17 board begins below the HUD, independently confirmed by the reviewer. The final capture waits for beam reveal to finish.
- Settings language selection updates Korean labels. Tab from the final modal control wraps to the first control, and closing with the visible Close button restores focus to Settings. Escape dismissal is not implemented by the existing application and is not claimed as passing.
- With level 23, motion disabled and colorblind patterns enabled, rendered canvas pixels remain identical after another second of simulated game updates. Light tracing remains present. The previous settings were restored after this bounded render check.

## Offline boundary

Installed the real module service worker on `localhost:8000`, then reloaded the application with CDP page networking blocked. An uncached probe failed while the controlled application booted and decoded all 25 assets. The worker held 68 cache entries and no editable source or authoring-tool URLs. CDP did not change `navigator.onLine`; this records the network-blocked page test, not a physical network-disconnection test. The independent worker harness separately verifies failed updates and retention of old and current artwork offline.

## Other evidence

- `npm test`: **65 passed**, no failures.
- `node tools/check-levels.mjs`: **300 / 300 solvable**, all level checks passed.
- Independent Python authoring suite: **18 passed**.
- `npm run check:assets`: **25 valid assets**, 3,455,428 bytes total image payload.
- The existing `tools/verify-all.sh` includes the new asset check. Its external Chrome launcher was not run; the existing E2E page ran in the same Ego Lite task space instead.

The separate [pipeline review](verification.md) records validation failures, fixes and independent re-verification. Raw local QA logs are in ignored `art/build/`. These checks establish the listed scenarios, not an absence of every possible game defect. Latest GPT Image model selection remains the limitation recorded in [the art guide](../../art/README.md).
