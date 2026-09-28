#!/bin/zsh
# CG-006 lane B — PREPARED, not run by the lane. Runs on the PRIMARY checkout after the cherry-pick.
# No Electron, no Chrome: plain node + the model (the contract test's path). ONE heavy job: check `uptime` first.
set -u
REPO=/Users/richardosborne/vscode_projects/OpenNoodl
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/8afd5452-2b0e-4fc2-8285-6599ef39d851/scratchpad/laneB}
mkdir -p $S; cd $REPO && pwd || exit 1
# 1. The gates (single specs): CG-006 82/82, CG-002 105/105.
(cd $REPO/packages/noodl-mcp && npx jest tests/cg006Requests.test.ts tests/cg002Engine.test.ts 2>&1 | tail -5) ; echo "step1 exit $?"
# 2. Bundle the probe data for plain node (1 s).
$REPO/node_modules/.bin/esbuild $REPO/packages/noodl-mcp/tests/cg006Probes.ts --bundle --platform=node --format=cjs --outfile=$S/cg006Probes.cjs --log-level=warning; echo "step2 exit $?"
# 3. The probes on the CPU path (the tablet's; CG-004 finding b says choose on CPU readings). ~30 probes × 3 samples.
node $REPO/dev-docs/tasks/phase-105-the-coding-garden/drives/probe-cg006.mjs --repo $REPO --probes $S/cg006Probes.cjs --cpu --out $S/probe-cg006-cpu.json 2>&1 | tee $S/probe-cg006-cpu.log; echo "step3 exit ${pipestatus[1]}"
# 4. The same on Metal, for the comparison the ladder was written from.
node $REPO/dev-docs/tasks/phase-105-the-coding-garden/drives/probe-cg006.mjs --repo $REPO --probes $S/cg006Probes.cjs --out $S/probe-cg006-metal.json 2>&1 | tee $S/probe-cg006-metal.log; echo "step4 exit ${pipestatus[1]}"
