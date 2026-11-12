#!/bin/zsh
# EXP-021 AC1 drive, the build: a copy of templates/todo-list bound to the drive's backend (:8597), emitted twice —
# export-head by HEAD's export `src` (a `git archive` base under packages/, deleted after), export-fixed by the tree's —
# each built with its own `npm run build` (tsc -b && vite build) against npm's packages, as a person builds it.
# Output in ./work (gitignored). npm's packages are installed once into work/deps.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
W=$X/work
BASE=$R/packages/.s137-base
mkdir -p $W
rm -rf $W/proj && cp -R $R/templates/todo-list $W/proj
python3 - $W/proj/nodegx.project.json <<'PY'
import json, sys
f = sys.argv[1]; p = json.load(open(f))
p.setdefault('metadata', {})['cloudservices'] = {'instanceId': 'backend_todo137', 'endpoint': 'http://127.0.0.1:8597', 'appId': 'backend_todo137', 'type': 'nodegx'}
json.dump(p, open(f, 'w'), indent=2)
PY
rm -rf $BASE && mkdir -p $BASE
(cd $R && git archive HEAD packages/nodegx-export/src packages/nodegx-export/coverage-ledger.json packages/nodegx-export/parameter-ledger.json | tar -x -C $BASE --strip-components=2)
trap "rm -rf $BASE" EXIT
for arm in head fixed; do
  src=$E/src; [[ $arm == head ]] && src=$BASE/src
  rm -rf $W/export-$arm
  (cd $E && EXPORT_SRC=$src npx tsx $X/emit.ts $W/proj $W/export-$arm)
  if [[ ! -d $W/deps/node_modules ]]; then
    mkdir -p $W/deps && cp $W/export-$arm/package.json $W/deps/ && (cd $W/deps && npm install --no-audit --no-fund)
  fi
  ln -sfn $W/deps/node_modules $W/export-$arm/node_modules
  (cd $W/export-$arm && nice -n 19 npm run build)
done
