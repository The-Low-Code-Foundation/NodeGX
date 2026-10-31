#!/bin/sh
# The drives, one at a time (the machine is shared). Starts its own server on 8798 with a throwaway data folder,
# so nothing a test carves reaches the real data/.
#   sh tools/run-all.sh
cd "$(dirname "$0")/.." || exit 1
rm -rf shots/test-data && mkdir -p shots/test-data
DIG_DATA=shots/test-data nice -n 19 node server.mjs --port 8798 > shots/server.log 2>&1 &
srv=$!
trap 'kill $srv 2>/dev/null' EXIT
sleep 1
URL='http://127.0.0.1:8798/?auto=1&mute=1&lite=1&fresh=1&peaceful=1&seed=12345&dtmax=0.1&date=2026-10-31'
fail=0
for t in smoke phone; do
  echo "== $t"
  [ "$t" = phone ] && export PHONE=1 || unset PHONE
  out=$(nice -n 19 node tools/drive.mjs "$URL" "tests/$t.json" "shots/$t" 2>&1)
  code=$?
  echo "$out" > "shots/$t.log"
  echo "$out" | grep -E "PASS|FAIL|exception|stuck|TIMED"
  [ "$code" = 0 ] || fail=1
done
exit $fail
