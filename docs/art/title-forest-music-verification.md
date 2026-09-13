# Title, forest and music verification · 2026-09-13

The refresh uses built-in image generation for a new symbol, an ILYNDREL wordmark and an edit of the previous forest. Music is an original score rendered by the repository's mathematical synthesizer. Exact prompts and update instructions are linked from [the production recipe](../../art/recipes/title-forest-music.md).

## Runtime evidence

- `npm test`: 107 tests passed, zero failures. Independent reviewer also ran 35 focused UI, audio and background tests and found no blocking defect.
- `npm run check`: all 300 levels remain solvable.
- `npm run check:assets`: all 25 game images pass; revision `nocturne-056bfefb4ddd`, 2.35 MiB. Browser reports all 25 decoded with no failures.
- `npm run build`: 74 runtime files include both new title images, the music module and WAV. Authoring files, tests and tools are excluded.
- Ego Lite review used a separate localhost:8016 origin, preserving the user's localhost:8000 progress. Desktop 1440×900, mobile 390×844 and short 614×427 views were visually inspected. The symbol and wordmark have transparent backgrounds, load at their recorded dimensions, and the title controls remain visible without horizontal overflow. Settings follows the play button; description is retained; corner title copy is absent.
- Real pointer input activated Web Audio. The decoded stereo buffer was 71.999977 seconds at the browser's resampled rate; its single source had `loop=true`. The same source stayed active through title → map → first puzzle → map → title, including past the first complete loop. At context time 81.421 seconds the original source remained active and the output analyser RMS was 0.02154.
- Muting removed the source and set master gain to zero. Re-enabling created one source at the saved 56.296077-second offset. Unit tests separately cover asynchronous load/resume races, hidden tabs, retries and closed-context replacement.
- Pixel comparisons across eight animation frames showed an unchanged backdrop with motion disabled and a changing backdrop after re-enabling. Reduced-motion preference and long-duration continuity are covered by dedicated tests.
- The service worker was explicitly registered only on the isolated localhost test origin (normal application registration requires HTTPS). The music was absent from cache after installation, then present with all 6,912,044 bytes after the first controlled request. It is not part of the installation download.
- The existing localhost:8000 legacy worker was stuck in `starting` with no controlled clients and delayed the installed replacement. Stopping that worker and requesting activation of the waiting worker through scoped browser debugging resolved the local state without changing application code or clearing progress. An ordinary reload with network cache and service-worker bypass disabled then loaded the v7 core cache, the new wordmark and the current forest revision with no image failures.

## Music evidence and limits

The score, generator and WAV hashes match their saved production record. The PCM signal has peak 0.300, RMS 0.069, no silent second, and wrap differences smaller than ordinary sample-to-sample variation. Rendering the same score reproduces identical bytes. No external recordings, samples, lyrics or voices are used by the synthesis recipe.

Output signal, lifecycle and loop continuity were checked; a physical-speaker listening assessment was not performed. First playback needs a real click, touch or key press. Hidden tabs pause and retain their position; after returning, the next real input resumes audio under the existing activation policy. Source/hash checks are evidence of file consistency, not legal clearance or exclusive-rights certification.
