#!/bin/bash
set -u
cd "$(dirname "$0")/.."
FAIL=0

echo "== 1. syntax check =="
for f in js/*.js; do
  if ! node --check "$f" 2>/tmp/gg-syntax.err; then
    echo "SYNTAX FAIL: $f"; cat /tmp/gg-syntax.err; FAIL=1
  fi
done
echo "syntax ok"

echo "== 2. level solver/lint =="
if ! node tools/check-levels.mjs > /tmp/gg-levels.log 2>&1; then
  echo "LEVELS FAIL"; cat /tmp/gg-levels.log; FAIL=1
else
  tail -2 /tmp/gg-levels.log
fi

echo "== 3. unit tests =="
if ! node --test "tests/*.test.mjs" > /tmp/gg-tests.log 2>&1; then
  echo "TESTS FAIL"; grep -B2 -A12 'not ok' /tmp/gg-tests.log | head -60; FAIL=1
else
  grep -E '^# (tests|pass|fail)' /tmp/gg-tests.log
fi

echo "== 4. browser e2e =="
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ -x "$CHROME" ]; then
  E2E_OUT=$("$CHROME" --headless=new --disable-gpu --no-first-run --virtual-time-budget=60000 --dump-dom http://localhost:8765/tools/browser-e2e.html 2>/dev/null | python3 -c "
import sys,re,html
dom=sys.stdin.read()
m=re.search(r'<pre id=\"e2e-results\">(.*?)</pre>', dom, re.S)
print(html.unescape(m.group(1)) if m else 'NO-RESULTS')
")
  echo "$E2E_OUT" | head -20
  if ! echo "$E2E_OUT" | head -1 | grep -q 'E2E PASSED'; then FAIL=1; fi
  FAILS=$(echo "$E2E_OUT" | grep -c "^FAIL")
  if [ "$FAILS" != "0" ]; then FAIL=1; fi
else
  echo "chrome not found, skip"
fi

echo "== RESULT: $([ $FAIL -eq 0 ] && echo 'ALL GREEN - 0 BUGS' || echo 'BUGS FOUND') =="
exit $FAIL
