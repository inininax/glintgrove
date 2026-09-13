# First-clear progression repair · 2026-09-13

A completed run sets `winUiDone`. `startLevel()` previously retained that flag when opening another level or replaying via the completion screen. The puzzle could be solved and saved, but no new `winUi` event was delivered. `resetLevel()` already cleared the flag, explaining why the restart button appeared to cure the problem.

The fix resets the flag with the other per-run state in `startLevel()`. Independent fixture tests first failed for next-level and replay flows, then passed after this change; each run must emit exactly one completion UI event. The reset path is also covered.

An actual browser session reproduced: level 1 clear showed the overlay; level 2 clear hid it despite `won=true`; restarting level 2 restored it. After the fix and a service-worker update, the sequence 1 → 2 → replay 2 → 3 showed the overlay on every first clear.

Browser verification exposed a second issue: changing the service-worker cache name alone could repopulate the new cache with stale HTTP-cached JavaScript. Installation now requests the application shell with `cache: 'reload'`, and the core cache version is bumped. A regression test models stale HTTP entries and checks that the installed worker serves current application code. Existing offline art-snapshot tests still pass.

The initial combined regression run passed 20 tests. Later content changes receive a full final run. These observations used the local development server; no public deployment was performed.

API reference: [MDN Request.cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) and [Cache.addAll](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll).
