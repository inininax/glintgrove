#!/bin/bash
set -u
cd "$(dirname "$0")/.."
FAIL=0

echo "== 1. syntax check =="
for f in $(find src -name '*.js'); do
  if ! node --check "$f" 2>/tmp/gg-syntax.err; then
    echo "SYNTAX FAIL: $f"; cat /tmp/gg-syntax.err; FAIL=1
  fi
done
echo "syntax ok ($(find src -name '*.js' | wc -l | tr -d ' ') files)"

echo "== 2. level lint + solver =="
if ! node tools/check-levels.mjs > /tmp/gg-levels.log 2>&1; then
  echo "LEVELS FAIL"; cat /tmp/gg-levels.log; FAIL=1
else
  tail -2 /tmp/gg-levels.log
fi

echo "== 3. unit tests =="
if ! node --test tests/*.test.mjs > /tmp/gg-tests.log 2>&1; then
  echo "TESTS FAIL"; grep -B2 -A12 'not ok' /tmp/gg-tests.log | head -60; FAIL=1
else
  grep -E '^# (tests|pass|fail)' /tmp/gg-tests.log
fi

echo "== 4. browser e2e =="
PORT=8765
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV_PID=$!
trap 'kill $SRV_PID 2>/dev/null' EXIT
sleep 1

CHROME=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" google-chrome chromium-browser chromium; do
  if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
done

if [ -n "$CHROME" ]; then
  "$CHROME" --headless=new --disable-gpu --no-sandbox --no-first-run \
    --virtual-time-budget=60000 --dump-dom \
    "http://localhost:$PORT/tools/browser-e2e.html?debug=1&cb=$RANDOM" > /tmp/gg-e2e-dom.html 2>/dev/null
  E2E=$(python3 - <<'PYEOF'
import re, html
dom = open('/tmp/gg-e2e-dom.html').read()
m = re.search(r'<pre id="e2e-results">(.*?)</pre>', dom, re.S)
print(html.unescape(m.group(1)) if m else 'NO-RESULTS')
PYEOF
)
  echo "$E2E" | head -25
  if ! echo "$E2E" | head -1 | grep -q 'E2E PASSED'; then FAIL=1; fi
  if echo "$E2E" | grep -q '^FAIL'; then FAIL=1; fi
else
  echo "chrome not found, e2e skipped"
fi

echo "== RESULT: $([ $FAIL -eq 0 ] && echo 'ALL GREEN - 0 BUGS' || echo 'BUGS FOUND') =="
exit $FAIL
