#!/bin/sh
# Every drive, one at a time (the machine is shared), against a throwaway server on 8819. Each drive starts a fresh
# game (?fresh=1: nothing read from or written to the browser's save) with the clock off so damage is exact.
#   sh tools/run-all.sh          (Chrome must be able to start: run it outside any sandbox)
# The round-2 rooms (the Swan Wing and its mini-games) and the after-fight/bright drives run on the Mac's GPU
# (DRIVE_GPU=1): in software GL their frames are so slow a screenshot can stall past the 45 s limit.
cd "$(dirname "$0")/.." || exit 1
mkdir -p shots
nice -n 19 node server.mjs --port 8819 > shots/server.log 2>&1 &
srv=$!
trap 'kill $srv 2>/dev/null' EXIT
sleep 1
B='http://127.0.0.1:8819/?fresh=1&mute=1&timer=off'
fail=0
run() {
  echo "== $1"
  out=$(nice -n 19 node tools/drive.mjs "$2" "tests/$1.json" "shots/$1" 2>&1)
  code=$?
  echo "$out" > "shots/$1.log"
  echo "$out" | grep -E "PASS|FAIL|exception|stuck|TIMED|checks PASS"
  [ "$code" = 0 ] || fail=1
}
run smoke "$B"
run kitchen "$B&won=dressing&at=kitchen"
run library "$B&at=library"
run speed "$B&auto=1"
W='dressing,kitchen,library'
export DRIVE_GPU=1
run after-fight "$B&at=dressing"
run bright "$B&auto=1&won=$W"
run books "$B&at=library&won=$W"
run wing "$B&at=hall&won=$W"
run piano "$B&at=music&won=$W"
run tea "$B&at=tearoom&won=$W,music"
run ball "$B&at=ballroom&won=$W,music,tearoom"
run gown "$B&at=dressing&won=$W,music,tearoom"
exit $fail
