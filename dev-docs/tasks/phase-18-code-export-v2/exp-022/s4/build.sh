#!/bin/zsh
# EXP-022 S4, the build: a copy of templates/todo-list bound to the drive's backend (:8644), exported by the CLI from the
# tree's `src` (`nodegx export --target swift`), then built for the simulator with xcodebuild at nice 19.
# Output in ./work (gitignored). Heavy: check `pgrep -fl 'vitest|jest|xcodebuild|grade.mjs'` and the lab's log first.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
W=$X/work
PORT=${S4_PORT:-8644}
mkdir -p $W
rm -rf "${W:?}/proj" && cp -R $R/templates/todo-list $W/proj
python3 - $W/proj/nodegx.project.json $PORT <<'PY'
import json, sys
f, port = sys.argv[1], sys.argv[2]; p = json.load(open(f))
p.setdefault('metadata', {})['cloudservices'] = {'instanceId': 'backend_todo_s4', 'endpoint': f'http://127.0.0.1:{port}', 'appId': 'backend_todo_s4', 'type': 'nodegx'}
json.dump(p, open(f, 'w'), indent=2)
PY
rm -rf "${W:?}/swift"
(cd $E && npx tsx src/cli/main.ts export --target swift $W/proj $W/swift)
cp $X/Drive.swift $W/swift/TodoListUITests/TodoListDrive.swift
[[ ${1:-} == --no-build ]] && exit 0
cd $W/swift
nice -n 19 xcodebuild -project TodoList.xcodeproj -scheme TodoList -destination 'generic/platform=iOS Simulator' -derivedDataPath $W/dd build-for-testing -quiet
