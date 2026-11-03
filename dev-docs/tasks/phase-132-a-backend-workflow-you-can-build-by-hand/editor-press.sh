#!/bin/bash
# editor-press.sh (P132 s11) at "text" [sel] [dbl|rclick]  — find the smallest visible element with text and press it
K=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/editor-drive.cjs
if [ "$1" = at ]; then
  node $K eval "$(node $K find)" >/dev/null
  SEL=${3:-*}
  XY=$(node $K eval "(()=>{const p=window.__f($(printf '%s' "$2" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),'$SEL');return p?p.x+' '+p.y:'none'})()" | tr -d '"')
  [ "$XY" = none ] && { echo "NOT FOUND: $2"; exit 1; }
  set -- "$@"; MODE=${4:-click}
  node $K $MODE $XY; echo "pressed $2 at $XY"
else node $K "$@"; fi
