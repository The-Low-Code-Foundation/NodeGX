#!/bin/sh
# Runs every drive against a fresh server on a spare port and exits 1 if any check failed.
#   sh tools/run-all.sh
cd "$(dirname "$0")/.." || exit 1
PORT=8793
node server.mjs --port $PORT > shots/server.log 2>&1 &
SERVER=$!
sleep 1
FAILED=0
for t in smoke boarding eva; do
  echo "== $t"
  node tools/drive.mjs "http://127.0.0.1:$PORT/" "tests/$t.json" shots > "shots/$t.log" 2>&1 || FAILED=1
  grep -E "PASS|FAIL|saw:|exception" "shots/$t.log"
done
kill $SERVER
exit $FAILED
