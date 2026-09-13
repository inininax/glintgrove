# Independent review of replacement records and audio repair

Review date: 2026-09-13. Reviewer: the separate `remake_art` agent reviewing root-authored documentation/distribution records and the `asset_system` agent's audio repair.

Status: **PASS for the reviewed audio, provenance-recording behavior, documentation and final file correspondence. No unresolved blocking finding within this scope.** Final register timestamp: `2026-09-13T10:09:10.754Z`.

## Independence and scope

This review covers the audio implementation and regression checks, the root agent's description of replacement scope, scoped Blender-script licensing, and correspondence between the final register and actual local files. It does not self-approve the Blender environment implementation created by this reviewer; that implementation received a separate source/scene/hash inspection from the root agent. It is not legal clearance, trademark clearance, proof of exclusive copyright, or a guarantee of zero infringement risk.

## Audio repair

Independently executed `node --test tests/sound.test.mjs tests/gameSemantics.test.mjs` after the audio author's final restoration: **15 tests passed, 0 failed** (7 audio tests and 8 game behavior tests).

The audio tests cover no context creation before trusted input, a queued first cue while the context resumes, muting and re-enabling current-level ambience, cancelling pending ambience when leaving a level, hidden-page suspension and interaction-based restoration, rejected resume handling, and first enabling sound inside an already opened level. Code review also checked the capture listeners and settings/visibility wiring in `src/main.js`, one ambient graph per level, and transient-node cleanup.

Reviewed audio hashes:

| File | SHA-256 |
| --- | --- |
| `src/fx/sound.js` | `4c613edbef9cde959a16558ee81edd25c7d23ac2e0adabd57b1356debb72669d` |
| `tests/sound.test.mjs` | `65dd9b33c9d3e6a7d79dc3dc9044992b7999bbd16dfcee6adc9ba72862ae0dff` |

A suspected rapid hide/return race was investigated and withdrawn. The Web Audio specification sets the control-thread state to suspended before returning from `suspend()`; a hypothetical mock that delayed this public state until promise resolution did not model the specified behavior. No unnecessary suspension wrapper was retained. [Web Audio specification, `AudioContext.suspend()`](https://webaudio.github.io/web-audio-api/#dom-audiocontext-suspend)

The root agent separately reported actual trusted-browser measurements: the first click produced a running context with RMS approximately 0.0398 and peak approximately 0.0812; mute produced zero output and enabling sound restored ambience. Those browser observations were not personally performed by this reviewer, and unit mocks alone do not prove audible output on every device.

## Licensing and documentation

All five listed `bpy` scripts carry `GPL-3.0-or-later` SPDX comments linking to `tools/art/LICENSES.md` and the full GPL text. The scoped notice explicitly distinguishes the scripts from rendered images, `.blend` scene data, the web application and other scripts. The runtime release builder excludes authoring tools. The local GPL text has 35,149 bytes and SHA-256 `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986`, including sections 0–17 and the application instructions. Two independent attempts to re-download the official GNU text timed out; byte identity to that remote source is therefore supported by the root agent's download record rather than an independent successful download in this review.

Reviewed the final `README.md`, `art/README.md`, `FOLDERS.md`, `THIRD_PARTY_NOTICES.md`, `docs/legal/remake-audit.md`, `docs/art/remade-verification.md` and current recipe/register. Their folder paths, 21 retained sprites plus four new backgrounds, two site images, six excluded review images and local-build scope agree with the checked files. The art guide includes initial Python environment/dependency setup. Update instructions explain that changed source/master hashes require renewed provenance evidence.

The documents preserve the distinction between recorded local construction and a legal guarantee. They explain system-font text, retained nonvisual code, contractual ownership questions and the limited name search. They do not claim every line was rewritten, exclusive rights were established, the archive or Git history was erased, or the local build was publicly deployed. The five browser screenshots are review materials containing platform-rendered text; the wordless contact sheet is separately recorded. Neither category is included in the release.

## Provenance recorder

Independently read the final `tools/record-visual-provenance.mjs` and executed five isolated scenarios in a temporary directory, copying required inputs and never regenerating the real workspace register:

- Current 25 source/master pairs match explicit prior generation evidence. The timestamp is current; copyright clearance remains `not-established`. Site SVG authorship, screenshot capture origin and runtime-export validation are expressly outside automatic approval.
- Changing a sprite's source bytes flags that entry for renewed review.
- Removing the environment master flags all four backgrounds and the share source without preventing recording.
- Moving unchanged sprite bytes to a path absent from the evidence still requires review.
- Missing ignored archive data preserves the previous historical inventory with an unverified-local-archive note; removing the previous register as well succeeds with an empty historical inventory.

All scenarios passed. The actual workspace register was byte-identical before and after these tests. The `asset_system` author separately reported ten isolated scenarios, including changed background/share sources and both changed master files; those broader fixture results are attributed to that agent. A matching source/master hash is a match to existing evidence, not fresh verification of authorship or runtime transformation.

## Resolved finding and source integrity

The review found that a folder-reconciliation helper had accidentally replaced `render_geometry_contact_sheet.py` with JSON. This was a blocking reproducibility defect. With root coordination, this reviewer restored the exact previously executed 3,769-byte Python script; the root agent corrected the recipe history and register and independently rechecked the restoration. The contact-sheet image itself was unchanged. All five Blender scripts now parse as Python, retain module descriptions, import `bpy` and carry the scoped GPL header.

The environment-renderer relocation was also checked against recorded historical hashes: restoring its former share-output destination branch reconstructs the original source hash. Its scene geometry and render parameters were not changed by the path edit. This is a source/history correspondence check, not this reviewer's self-approval of the artwork.

## Final snapshot correspondence

The final independent pass rehashed every current `path`/SHA-256 reference: **130 references to 103 distinct files** in the replacement register and **76 references to 55 distinct files** in the procedural recipe, with no mismatch. Repeated master references account for the larger reference count. It additionally verified:

- All 88 archived files match their recorded archive-path hashes and are Git-ignored.
- All 25 catalog inputs are present, regular files, nonignored and decodable; all 25 runtime images decode at their manifest dimensions.
- All six review images decode and are excluded from the release.
- All 70 release payloads match both the workspace and `dist/` by hash and byte count. The directory contains exactly those files plus `release-files.json`; authoring, tests, legal-history documents and retired assets are absent. Current site paths are present and old `assets/icon.svg`/`assets/og.png` are absent.
- The exported share PNG preserves the source's decoded RGB pixels. The earlier independent PNG chunk/CRC inspection also confirmed identical compressed image data, no trailing bytes and removal of textual/private-path metadata.

The runtime revision is `nocturne-15c0715bc5ac`. Final snapshot anchors:

| File | SHA-256 |
| --- | --- |
| `docs/legal/replacement-register.json` | `916fbabd748de3fc70e9634d0d34844029ceedfbc9ca049861d233d61e5e1d65` |
| `art/recipes/procedural-environments-v2.json` | `7ec6ea3437b4fe60aa5ad8d199e45ebb47bbbec65f88cf3b525f7609b4f0cef0` |
| `tools/record-visual-provenance.mjs` | `a0f6ae7ee25c5172328e3645852ea468e5f423be8930eab40df6ccb00c0580ce` |
| `tools/art/render_geometry_contact_sheet.py` | `fa683902e7db52891d76702df41ff669fe9c405e7776c6a9c7d3250a0c46436c` |
| `assets/game/manifest.json` | `8eea318f87ebe406b8e0a25ecf56a5eb96a947bb8c60a096cd311db2a5e223a0` |
| `assets/site/share.png` | `a6b9f7b434cfb512c561fa6103cf2e219bdae5469b792f39a3cf6bd364be5a1f` |

The separate `asset_system` reviewer also reported isolated release-builder rejection/preservation checks: extra or modified existing distribution files, malformed images, a symlinked asset directory, an incorrect content-hash filename, manifest replacement after initial capture and failed-stage cleanup. Those tests used temporary fixtures and did not modify the real distribution. This reviewer independently inspected the builder and verified the 70 actual payloads, but did not personally rerun that injected failure suite.

The root agent's broader 83 Node tests, 20 Python tests, 20 browser checks and actual browser observations are recorded in [the integration verification](../art/remade-verification.md). They are separate evidence from this reviewer's 15 audio/game tests and final file checks. This report establishes no additional legal clearance and does not assert that physical speakers were listened to.
