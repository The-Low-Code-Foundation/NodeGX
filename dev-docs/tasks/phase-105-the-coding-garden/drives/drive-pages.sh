#!/bin/zsh
# P105 s2 lane A — CG-003 pages + CG-007 look, the drive. Run by the orchestrator on the PRIMARY checkout, after the
# lane's commits are cherry-picked and `npm run template:garden` has run there (exit 0 read first).
set -u
REPO=/Users/richardosborne/vscode_projects/OpenNoodl
OUT=${OUT:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/8afd5452-2b0e-4fc2-8285-6599ef39d851/scratchpad/laneA/drive}
PROJ=$OUT/project
DEPLOY=$OUT/deploy
SHOTS=$OUT/shots
mkdir -p $OUT
cd $REPO || exit 2
# 0. The artefact is what the generator writes today (exit code read BEFORE anything is believed).
npm run template:garden > $OUT/generate.log 2>&1; echo $? > $OUT/generate.exit
[[ $(cat $OUT/generate.exit) == 0 ]] || { echo "generator red: $OUT/generate.log"; exit 1; }
git -C $REPO status --short templates/bot-garden | head -5 > $OUT/drift.txt
# 1. A COPY of the template (opening a project writes into it).
node scripts/devtools/drive-cg003-pages.js assemble $PROJ > $OUT/assemble.log 2>&1; echo $? > $OUT/assemble.exit
# 2. Deploy with the PRODUCT command and gate on its exit code (P109 ISL-025 W2). The internal bundle it spawns exits 0
#    by its own contract, which is why this step once compared index.html's mtime with a marker; `nodegx deploy` maps
#    the refusal to a code (11 a development engine without the flag, 2 not a project, 3 the target) and writes nothing.
rm -rf $DEPLOY
node node_modules/.bin/nodegx deploy $PROJ $DEPLOY --allow-development-engine > $OUT/deploy.log 2>&1; echo $? > $OUT/deploy.exit
[[ $(cat $OUT/deploy.exit) == 0 ]] || { echo "deploy refused (exit $(cat $OUT/deploy.exit)): $OUT/deploy.log"; exit 1; }
# 3. The drive (stub Olive inside Chrome), with the mockup's own screens for CG-007 AC1.
node scripts/devtools/drive-cg003-pages.js $DEPLOY --project $PROJ --shots $SHOTS --json $OUT/drive.json --mockup > $OUT/drive.log 2>&1; echo $? > $OUT/drive.exit
echo "generate $(cat $OUT/generate.exit) · assemble $(cat $OUT/assemble.exit) · deploy $(cat $OUT/deploy.exit) · drive $(cat $OUT/drive.exit)"
tail -3 $OUT/drive.log
