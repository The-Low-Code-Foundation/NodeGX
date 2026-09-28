#!/bin/zsh
# CG-005 (Olive in the game) drives, for the orchestrator on the PRIMARY checkout after the cherry-pick. One step at a
# time; check `uptime` first (1-min load ≤ 8). Every step writes <step>.log + <step>.exit in $OUT.
#   zsh drive-olive.sh gates      # the specs (no browser)
#   zsh drive-olive.sh route      # the stub server driven over HTTP (no browser)
#   DEPLOY=<deploy dir> zsh drive-olive.sh pages   # headless Chrome on the pages, served BY the stub Olive
#   zsh drive-olive.sh contract   # AC7 + the exam in EN/FR on the REAL model (Metal), then: zsh drive-olive.sh contract-cpu
#
# The deploy dir for `pages` is the one drive-pages.sh makes (it regenerates the template, assembles a COPY, deploys it
# and runs the page drive; the deploy lands in $OUT/deploy of THAT run):
#   OUT=<pages-out> zsh dev-docs/tasks/phase-105-the-coding-garden/drives/drive-pages.sh
#   DEPLOY=<pages-out>/deploy zsh dev-docs/tasks/phase-105-the-coding-garden/drives/drive-olive.sh pages
# Session 3 (lane HOOKS): the page part makes a band 10–12 player and drives free play; it needs no --workshop/--skills.
REPO=/Users/richardosborne/vscode_projects/OpenNoodl
OUT=${OUT:-/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/p105-s3-scratch/hooks/drive}
SHELLDIR=$REPO/dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell
mkdir -p $OUT
step=$1
case "$step" in
  gates)
    ( cd $SHELLDIR && pwd && node --test tests/*.test.js ) > $OUT/gates-shell.log 2>&1; echo $? > $OUT/gates-shell.exit
    ( cd $REPO/packages/noodl-mcp && pwd && npx jest tests/cg005Olive.test.ts tests/cg002Engine.test.ts tests/cg006Requests.test.ts ) > $OUT/gates-jest.log 2>&1; echo $? > $OUT/gates-jest.exit
    ;;
  route)
    ( cd $REPO && node scripts/devtools/drive-cg005-olive.js route --json $OUT/route.json ) > $OUT/route.log 2>&1; echo $? > $OUT/route.exit
    ;;
  pages)
    [[ -f "$DEPLOY/index.html" ]] || { echo "DEPLOY=<deploy dir with index.html> required (drive-pages.sh with OUT=<dir> makes <dir>/deploy; check index.html's mtime: the deploy exits 0 when it refuses)"; exit 2; }
    ( cd $REPO && node scripts/devtools/drive-cg005-olive.js pages "$DEPLOY" --shots $OUT/shots --json $OUT/pages.json ) > $OUT/pages.log 2>&1; echo $? > $OUT/pages.exit
    ;;
  contract)
    ( cd $REPO && node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs --out $OUT/contract-metal.json ) > $OUT/contract-metal.log 2>&1; echo $? > $OUT/contract-metal.exit
    ;;
  contract-cpu)
    ( cd $REPO && node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs --cpu --out $OUT/contract-cpu.json ) > $OUT/contract-cpu.log 2>&1; echo $? > $OUT/contract-cpu.exit
    ;;
  *) echo "usage: zsh drive-olive.sh gates|route|pages|contract|contract-cpu"; exit 2 ;;
esac
