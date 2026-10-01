#!/bin/zsh
# P108: the whole drive set on ONE deploy of a tree — the page drive (drive-pages.sh's steps: template:garden, a COPY
# assembled, deployed, driven with --mockup), the two kit fixtures, then every drive one at a time (1-min load < 6 before
# each; a drive is SKIPPED, and says so, under 2 GB free — the s4 disk filled mid-drive).
#
#   R=<tree> X=<out dir> zsh drive-all.sh [drive …]     (default R = this checkout, X = <R>-drives; no names = all)
#
# Writes <X>/summary.txt (one line per drive: its exit code and its last "N/M" line) and ends it with DONE.
# Run it in the background and wait for DONE: the set takes over an hour (the page drive alone > 10 min).
# History: every session before s4 kept this as a scratch script in ../OpenNoodl-worktrees/*-scratch; the folder was
# deleted to free the disk (2026-10-01) and it was rebuilt from the transcripts. It lives here now.
R=${R:-$(cd "$(dirname "$0")/../../../.." && pwd)}
X=${X:-$R-drives}
P=$X/pages; D=$P/deploy; J=(--project $P/project)
mkdir -p $X; rm -rf $P $X/kit2d $X/kit3d $X/olive; mkdir -p $P; : > $X/summary.txt
waitload() { until [ $(uptime | awk -F'load averages: ' '{print $2}' | cut -d' ' -f1 | cut -d. -f1) -lt 6 ]; do sleep 20; done }
cd $R || exit 2
waitload
# the page drive: drive-pages.sh's steps against THIS tree
npm run template:garden > $P/generate.log 2>&1; echo $? > $P/generate.exit
git -C $R status --short templates/bot-garden | head -5 > $P/drift.txt
node scripts/devtools/drive-cg003-pages.js assemble $P/project > $P/assemble.log 2>&1; echo $? > $P/assemble.exit
touch $P/.before-deploy
node packages/noodl-preview/dist/nodegx-deploy.cjs $P/project $D --allow-development-engine > $P/deploy.log 2>&1; echo $? > $P/deploy.exit
[[ $D/index.html -nt $P/.before-deploy ]] && echo fresh > $P/deploy.fresh || echo STALE > $P/deploy.fresh
node scripts/devtools/drive-cg003-pages.js $D $J --shots $P/shots --json $P/drive.json --mockup > $P/drive.log 2>&1; echo $? > $P/drive.exit
echo "pages generate $(cat $P/generate.exit) drift [$(cat $P/drift.txt | tr '\n' ' ')] assemble $(cat $P/assemble.exit) deploy $(cat $P/deploy.exit) $(cat $P/deploy.fresh) drive $(cat $P/drive.exit) | $(tail -1 $P/drive.log)" >> $X/summary.txt
# the kit fixtures
for k in kit2d kit3d; do
  mkdir -p $X/$k
  [[ $k == kit2d ]] && node scripts/devtools/drive-cg001-kit.js assemble $X/$k/project > $X/$k/assemble.log 2>&1
  [[ $k == kit3d ]] && node scripts/devtools/drive-ig007-3d.js assemble $X/$k/project > $X/$k/assemble.log 2>&1
  touch $X/$k/.before
  node packages/noodl-preview/dist/nodegx-deploy.cjs $X/$k/project $X/$k/deploy --allow-development-engine > $X/$k/deploy.log 2>&1
  [[ $X/$k/deploy/index.html -nt $X/$k/.before ]] && echo "$k deploy fresh" >> $X/summary.txt || echo "$k deploy STALE" >> $X/summary.txt
done
ALL=(look earn shop crew crew-perf modes iw001 iw004 iw004-3d island island-3d robots robots-3d ws3d wsnogl olive mamie-ws mamie-isl mamie-isl3d mamie-look3d stones stones-3d post post-3d biscuit kit2d kit3d)
(( $# )) && ALL=("$@")
for n in $ALL; do
  waitload
  free=$(df -k /Users/richardosborne | tail -1 | awk '{print $4}')
  if [ $free -lt 2000000 ]; then echo "$n SKIPPED: disk $free KB" >> $X/summary.txt; continue; fi
  case $n in
    look) node scripts/devtools/drive-iw-look.js $D $J --shots $P/look-shots --json $P/look.json ;;
    earn) node scripts/devtools/drive-iw006-earn.js $D $J --shots $P/earn-shots --json $P/earn.json ;;
    shop) node scripts/devtools/drive-iw006-shop.js $D $J --shots $P/shop-shots --json $P/shop.json ;;
    crew) node scripts/devtools/drive-iw008-crew.js $D $J --shots $P/crew-shots --json $P/crew.json ;;
    crew-perf) node scripts/devtools/drive-iw008-crew.js $D $J --perf --shots $P/crew-perf-shots --json $P/crew-perf.json ;;
    iw001) node scripts/devtools/drive-iw001-workshop.js $D $J --shots $P/iw001-shots --json $P/iw001.json ;;
    iw004) node scripts/devtools/drive-iw004-blocks.js $D $J --shots $P/iw004-shots --json $P/iw004.json ;;
    iw004-3d) node scripts/devtools/drive-iw004-blocks.js $D $J --mode 3d --shots $P/iw004-3d-shots --json $P/iw004-3d.json ;;
    modes) node scripts/devtools/drive-ig003-modes.js $D $J --shots $P/modes-shots --json $P/modes.json ;;
    robots) node scripts/devtools/drive-ig005-robots.js $D $J --shots $P/robots-shots --json $P/robots.json ;;
    robots-3d) node scripts/devtools/drive-ig005-robots.js $D $J --mode 3d --json $P/robots-3d.json ;;
    ws3d) node scripts/devtools/drive-ig007-workshop.js $D --mode 3d --shots $P/ws3d-shots --json $P/ws3d.json ;;
    wsnogl) node scripts/devtools/drive-ig007-workshop.js $D --mode nogl --json $P/wsnogl.json ;;
    island) node scripts/devtools/drive-ig004-island.js $D $J --perf --shots $P/island-shots --json $P/island.json ;;
    island-3d) node scripts/devtools/drive-ig004-island.js $D $J --mode 3d --shots $P/island-3d-shots --json $P/island-3d.json ;;
    olive) REPO=$R OUT=$X/olive DEPLOY=$D zsh $R/dev-docs/tasks/phase-105-the-coding-garden/drives/drive-olive.sh pages; cat $X/olive/pages.log; exit_olive=$(cat $X/olive/pages.exit); (exit $exit_olive) ;;
    mamie-ws) node scripts/devtools/drive-iw003-mamie.js $D $J --part workshop --shots $P/mamie-ws --json $P/mamie-ws.json ;;
    mamie-isl) node scripts/devtools/drive-iw003-mamie.js $D $J --part island --shots $P/mamie-isl --json $P/mamie-isl.json ;;
    mamie-isl3d) node scripts/devtools/drive-iw003-mamie.js $D $J --part island --mode 3d --shots $P/mamie-isl3d --json $P/mamie-isl3d.json ;;
    mamie-look3d) node scripts/devtools/drive-iw003-mamie.js $D $J --part look3d --mode 3d --shots $P/mamie-look3d --json $P/mamie-look3d.json ;;
    stones) node scripts/devtools/drive-iw003-stones.js $D $J --shots $P/stones --json $P/stones.json ;;
    stones-3d) node scripts/devtools/drive-iw003-stones.js $D $J --mode 3d --shots $P/stones-3d --json $P/stones-3d.json ;;
    post) node scripts/devtools/drive-iw003-post.js $D $J --shots $P/post --json $P/post.json ;;
    post-3d) node scripts/devtools/drive-iw003-post.js $D $J --mode 3d --shots $P/post-3d --json $P/post-3d.json ;;
    biscuit) node scripts/devtools/drive-iw003-biscuit.js $D $J --shots $P/biscuit --json $P/biscuit.json ;;
    kit2d) node scripts/devtools/drive-cg001-kit.js $X/kit2d/deploy --shots $X/kit2d/shots --json $X/kit2d/kit2d.json ;;
    kit3d) node scripts/devtools/drive-ig007-3d.js $X/kit3d/deploy --shots $X/kit3d/shots --json $X/kit3d/kit3d.json ;;
    *) echo "unknown drive $n"; (exit 2) ;;
  esac > $P/$n.log 2>&1
  rc=$?
  echo "$n exit $rc | $(grep -E '[0-9]+ ?/ ?[0-9]+' $P/$n.log | tail -1 | cut -c1-160)" >> $X/summary.txt
done
echo DONE >> $X/summary.txt
