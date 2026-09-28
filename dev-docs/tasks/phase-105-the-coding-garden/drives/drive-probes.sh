#!/bin/zsh
# CG-006 s3 (lane CONTENT) — PREPARED, not run by the lane. Runs on the PRIMARY checkout after the cherry-pick.
# No Electron, no Chrome: plain node + the model. ONE heavy job at a time: the model runs are serial, `uptime` first.
#   zsh dev-docs/tasks/phase-105-the-coding-garden/drives/drive-probes.sh            # gates + probes CPU/Metal + contract CPU/Metal
#   STEPS="1 2" zsh …/drive-probes.sh                                                   # a subset
# Every step writes its log to $S and prints its OWN exit status (never a pipe's). Expected readout: CG-006 §8.
set -u
REPO=${REPO:-/Users/richardosborne/vscode_projects/OpenNoodl}
S=${S:-/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/p105-s3-scratch/content/drive}
STEPS=${STEPS:-"1 2 3 4 5"}
D=$REPO/dev-docs/tasks/phase-105-the-coding-garden
mkdir -p $S; cd $REPO && pwd || exit 1
uptime
want() { [[ " $STEPS " == *" $1 "* ]]; }

if want 1; then
  # 1. The gates (single specs, then the shell). Green: jest 214/214 (cg006Requests 83, cg005Olive 26, cg002Engine 105);
  #    shell 73/73 once config.test.js takes the 15 → 21 rung count (72/73 before: CG-006 §8 merge hazard).
  (cd $REPO/packages/noodl-mcp && npx jest tests/cg006Requests.test.ts tests/cg005Olive.test.ts tests/cg002Engine.test.ts < /dev/null > $S/gates-jest.log 2>&1); echo "step1 jest exit $?"
  grep -a -E '^Tests:' $S/gates-jest.log
  (cd $D/garden-desktop/shell && node --test tests/*.test.js > $S/gates-shell.log 2>&1); echo "step1 shell exit $?"
  grep -a -E '^not ok|^# (tests|pass|fail)' $S/gates-shell.log
  # The probe drive's wiring on the stub Olive (no model, ~1 s). Green: exit 0, "7/7 rungs offered; 11/11 asserted".
  node $D/drives/probe-cg006.mjs --repo $REPO --stub > $S/probe-cg006-stub.log 2>&1; echo "step1 stub exit $?"
  grep -a -E '^probe-cg006: [0-9]' $S/probe-cg006-stub.log
fi
if want 2; then
  # 2. Rung 9 + the six promoted rungs on the CPU path (the tablet's), 18 probes. Green: exit 0, "7/7 rungs offered".
  node $D/drives/probe-cg006.mjs --repo $REPO --cpu --out $S/probe-cg006-cpu.json > $S/probe-cg006-cpu.log 2>&1; echo "step2 exit $?"
  grep -a -E '^\| (no-letter-e|explain-program|narrate-run|name-trick|sort-words|define|letter) \||^probe-cg006:' $S/probe-cg006-cpu.log
fi
if want 3; then
  # 3. The same on Metal.
  node $D/drives/probe-cg006.mjs --repo $REPO --out $S/probe-cg006-metal.json > $S/probe-cg006-metal.log 2>&1; echo "step3 exit $?"
  grep -a -E '^\| (no-letter-e|explain-program|narrate-run|name-trick|sort-words|define|letter) \||^probe-cg006:' $S/probe-cg006-metal.log
fi
if want 4; then
  # 4. Olive's contract test (the whole exam, 51 probes, through the route) on CPU. Green: exit 0, "PASS".
  node $D/garden-desktop/tests/olive-contract.mjs --cpu --out $S/contract-cpu.json > $S/contract-cpu.log 2>&1; echo "step4 exit $?"
  grep -a -E '^olive-contract: (AC7|[0-9]+/|probes per|PASS|FAIL)' $S/contract-cpu.log
fi
if want 5; then
  # 5. The contract test on Metal.
  node $D/garden-desktop/tests/olive-contract.mjs --out $S/contract-metal.json > $S/contract-metal.log 2>&1; echo "step5 exit $?"
  grep -a -E '^olive-contract: (AC7|[0-9]+/|probes per|PASS|FAIL)' $S/contract-metal.log
fi
