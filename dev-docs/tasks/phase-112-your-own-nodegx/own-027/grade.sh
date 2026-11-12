#!/bin/zsh
# OWN-027 §6: serve one arm's project from disk and run own-023/grade-url.mjs against it (console errors, 390 px overflow).
#   ./grade.sh <project-dir> <out-dir> [port]
set -u
REPO=/Users/richardosborne/vscode_projects/OpenNoodl
PORT=${3:-8661}
node $REPO/scripts/devtools/render-from-disk.js "$1" --port $PORT > "$2.serve.log" 2>&1 &
SRV=$!
for i in {1..40}; do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 0.5; done
node $REPO/dev-docs/tasks/phase-112-your-own-nodegx/own-023/grade-url.mjs "http://127.0.0.1:$PORT/" "$2" --max 3 --no-press
CODE=$?
kill $SRV
echo "grade exit $CODE"
