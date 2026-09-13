# Source and tool notices

Ilyndrel's current visual assets include one forest background and one jeweled title wordmark generated with the built-in OpenAI image-generation tool, three local Blender backgrounds, 21 Blender sprites (including three newly modeled open-aperture v2 gates), and locally authored SVG/Canvas constructions. Forest v6 edits the project's GPT forest v4, whose reference was the local Blender forest v3. In sculpted mode, the title and all gameplay chapters display the common v6 forest; the three earlier Blender backgrounds remain in the compatible image library but are not selected by default. Wordmark v2 uses the project's own v1 wordmark and v6 forest as references, followed by a built-in edit of its own intermediate design. The former separate symbol and v1 wordmark are preserved locally but excluded from the current runtime build. The final v2 bitmap is RGB with a black matte, composited with CSS screen blending; it is not an alpha-transparent image. Exact prompts, inputs, original PNGs and runtime export records are linked in `art/recipes/jeweled-title-v2.md` and `art/recipes/ancient-forest-v6.md`. The tool did not return an exact model version. The replacement register checks the saved file hashes and generation-reference chain; it does not guarantee contractual ownership, exclusive copyright or non-infringement.

## Original music and sound

`assets/audio/ancient-forest-v2.wav` is a 96-second instrumental loop rendered from the project's score (`art/source/audio/ancient-forest-v2.score.json`) and mathematical instrument synthesizer (`tools/audio/render-ancient-forest-music-v2.mjs`). It uses no imported recordings, sample libraries, lyrics, vocals or speech, and is not an output of an AI music service. Game effects are synthesized by `src/fx/sound.js`. The music recipe and source/output hashes are in `art/recipes/ancient-forest-v2-music.*`; the runtime distribution includes the WAV and playback code, while excluding the score and authoring tools.

## Runtime algorithms

`mulberry32` and `xmur3` in `src/core/math.js` correspond to bryc's published implementations. The author's source document marks these algorithms **Public domain**:
https://github.com/bryc/code/blob/master/jshash/PRNGs.md

## Installed text fonts

The application asks the user's platform to display ordinary text using installed system fonts. The title wordmark is a generated bitmap image, not a bundled font. The application does not distribute font binaries or an extracted emoji image set. Decorative pictographs have been replaced by the project's geometric SVG symbols. Ordinary characters, letters and numbers remain platform-rendered text.

- Microsoft font usage FAQ: https://learn.microsoft.com/en-us/typography/fonts/font-faq
- Apple macOS font display terms, §2E: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf

## Local authoring tools

Blender and Pillow are local production tools, not bundled browser dependencies. Art outputs and the Blender Python API scripts have different licensing treatment. The scoped notice in `tools/art/LICENSES.md` applies to the listed Blender scripts; it does not license the game's PNG/WebP files or the entire game under the GPL.

Blender: https://www.blender.org/about/license/
Pillow: https://github.com/python-pillow/Pillow/blob/main/LICENSE

The runtime-only distribution excludes those tools, authoring sources, prompts, retired image sources and research materials. No third-party 3D model, texture pack, icon library or music sample pack was added to the current set. The GPT forest and title images are AI-generated bitmaps, not Blender renders; the scoped Blender-script license does not describe those images' usage rights.
