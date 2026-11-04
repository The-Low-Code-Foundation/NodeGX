#!/bin/zsh
# HTX-004, the build (EXP-022 S6's build.sh and build-web.sh, copied, with the HTML arm): a copy of templates/todo-list
# bound to the drive's backend (:8644); its React export (s137's emit.ts, the tree's `src`) built with `npm run build`
# against s137's installed npm packages; its HTML export (`nodegx export --target html`, the tree's `src`), nothing built,
# its `env.js` written by the export from the project's binding. Output in ./work (gitignored). Heavy: the box first.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
W=$X/work
S137=$R/dev-docs/tasks/phase-18-code-export-v2/s137-todo-drive
PORT=${S4_PORT:-8644}
mkdir -p $W
rm -rf "${W:?}/proj" && cp -R $R/templates/todo-list $W/proj
python3 - $W/proj/nodegx.project.json $PORT <<'PY'
import json, sys
f, port = sys.argv[1], sys.argv[2]; p = json.load(open(f))
p.setdefault('metadata', {})['cloudservices'] = {'instanceId': 'backend_todo_s4', 'endpoint': f'http://127.0.0.1:{port}', 'appId': 'backend_todo_s4', 'type': 'nodegx'}
json.dump(p, open(f, 'w'), indent=2)
PY
rm -rf "${W:?}/html"
(cd $E && npx tsx src/cli/main.ts export --target html $W/proj $W/html)
[[ ${1:-} == --html-only ]] && exit 0
rm -rf "${W:?}/react"
(cd $E && npx tsx $S137/emit.ts $W/proj $W/react)
cmp -s $W/react/package.json $S137/work/deps/package.json || { echo "package.json differs from s137's deps"; diff $W/react/package.json $S137/work/deps/package.json; }
ln -sfn $S137/work/deps/node_modules $W/react/node_modules
(cd $W/react && nice -n 19 npm run build)
