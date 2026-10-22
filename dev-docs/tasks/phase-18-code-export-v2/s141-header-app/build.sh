#!/bin/zsh
# The Header drive, the build: HEAD's templates/rocket-school (work/proj, `git archive`, a peer edits the tree's) emitted
# per arm — export-head by HEAD's export `src` (a `git archive` base under packages/, deleted after), export-fixed by the
# tree's — each built with its own `npm run build` against npm's packages (s140's work/deps, or installed once here).
# `./build.sh head fixed`. Output in ./work (gitignored).
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
W=$X/work
BASE=$R/packages/.s141-base
DEPS=$R/dev-docs/tasks/phase-18-code-export-v2/s140-lists-drive/work/deps
[[ -d $DEPS/node_modules ]] || DEPS=$W/deps
if [[ ! -d $W/proj ]]; then mkdir -p $W/proj && (cd $R && git archive HEAD templates/rocket-school | tar -x -C $W/proj --strip-components=2); fi
if (( ${@[(Ie)head]} )) && [[ ! -d $BASE/src ]]; then
  mkdir -p $BASE
  (cd $R && git archive HEAD packages/nodegx-export/src packages/nodegx-export/coverage-ledger.json packages/nodegx-export/parameter-ledger.json | tar -x -C $BASE --strip-components=2)
fi
for arm in "$@"; do
  src=$E/src; [[ $arm == head ]] && src=$BASE/src
  rm -rf $W/export-$arm
  (cd $E && EXPORT_SRC=$src npx tsx $X/emit.ts $W/proj $W/export-$arm < /dev/null)
  if [[ ! -d $DEPS/node_modules ]]; then
    mkdir -p $DEPS && cp $W/export-$arm/package.json $DEPS/ && (cd $DEPS && npm install --no-audit --no-fund)
  fi
  cmp -s $W/export-$arm/package.json $DEPS/package.json || echo "⚠️ $arm's package.json differs from the deps' one"
  ln -sfn $DEPS/node_modules $W/export-$arm/node_modules
  (cd $W/export-$arm && nice -n 19 npm run build)
done
