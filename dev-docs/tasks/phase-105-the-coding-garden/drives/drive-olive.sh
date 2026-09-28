#!/bin/zsh
# Lane C (CG-005) prepared drive, for the orchestrator on the PRIMARY checkout after the cherry-pick. One step at a time;
# check `uptime` first (1-min load ≤ 8). Every step writes <step>.log + <step>.exit beside this script.
#   zsh drive-laneC.sh gates      # the three specs (no browser)
#   zsh drive-laneC.sh route      # the stub server driven over HTTP (no browser)
#   DEPLOY=<deploy-dir of templates/bot-garden> zsh drive-laneC.sh pages   # headless Chrome on CG-003's pages, served by the stub
#   zsh drive-laneC.sh contract   # AC7 + the exam in EN/FR on the REAL model (Metal), then: zsh drive-laneC.sh contract-cpu
REPO=/Users/richardosborne/vscode_projects/OpenNoodl
OUT=${OUT:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/8afd5452-2b0e-4fc2-8285-6599ef39d851/scratchpad/laneC}
SHELLDIR=$REPO/dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell
step=$1
case "$step" in
  gates)
    ( cd $SHELLDIR && pwd && node --test tests/*.test.js ) > $OUT/gates-shell.log 2>&1; echo $? > $OUT/gates-shell.exit
    ( cd $REPO/packages/noodl-mcp && pwd && npx jest tests/cg005Olive.test.ts tests/cg002Engine.test.ts ) > $OUT/gates-jest.log 2>&1; echo $? > $OUT/gates-jest.exit
    ;;
  route)
    ( cd $REPO && node scripts/devtools/drive-cg005-olive.js route --json $OUT/route.json ) > $OUT/route.log 2>&1; echo $? > $OUT/route.exit
    ;;
  pages)
    [[ -f "$DEPLOY/index.html" ]] || { echo "DEPLOY=<deploy dir with index.html> required (CG-003's template through nodegx-deploy.cjs; check index.html's mtime: the deploy exits 0 when it refuses)"; exit 2; }
    ( cd $REPO && node scripts/devtools/drive-cg005-olive.js pages "$DEPLOY" --shots $OUT/shots --json $OUT/pages.json ${WORKSHOP:+--workshop $WORKSHOP} ${SKILLS:+--skills $SKILLS} ) > $OUT/pages.log 2>&1; echo $? > $OUT/pages.exit
    ;;
  contract)
    ( cd $REPO && node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs --out $OUT/contract-metal.json ) > $OUT/contract-metal.log 2>&1; echo $? > $OUT/contract-metal.exit
    ;;
  contract-cpu)
    ( cd $REPO && node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs --cpu --out $OUT/contract-cpu.json ) > $OUT/contract-cpu.log 2>&1; echo $? > $OUT/contract-cpu.exit
    ;;
  *) echo "usage: zsh drive-laneC.sh gates|route|pages|contract|contract-cpu"; exit 2 ;;
esac
