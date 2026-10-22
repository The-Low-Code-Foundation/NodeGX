#!/bin/zsh
# EXP-022 S4, the React arm's build: the same bound copy (./build.sh writes work/proj) emitted by the tree's React
# export (s137's emit.ts), built with its own `npm run build` against the npm packages s137 installed (work/deps there).
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
W=$X/work
S137=$X/../../s137-todo-drive
rm -rf "${W:?}/react"
(cd $E && npx tsx $S137/emit.ts $W/proj $W/react)
cmp -s $W/react/package.json $S137/work/deps/package.json || { echo "package.json differs from s137's deps"; diff $W/react/package.json $S137/work/deps/package.json; }
ln -sfn $S137/work/deps/node_modules $W/react/node_modules
(cd $W/react && nice -n 19 npm run build)
