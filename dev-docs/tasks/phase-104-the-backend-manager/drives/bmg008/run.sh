#!/bin/zsh
# BMG-008 drive: a LOCKED throwaway backend (devOpen false) with one deployed cloud function ("hello") and one workflow
# definition ("Ping") so the pickers have something to pick, + headless Chrome on 9333. One heavy job; tear down after.
# Never the project's live backend.
# usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/91eb76ff-55d0-4c16-87cb-89bc872bcc25/scratchpad/bmg008}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg008/ac.mjs}
mkdir -p "$DATA/workflows" "$DATA/workflow-defs" "$S/chrome-$LABEL" "$S/shots"
if [ ! -f "$DATA/security.json" ]; then cat > "$DATA/security.json" <<'JSON'
{"version":1,"devOpen":false,
 "defaults":{"permissions":{"find":"authenticated","get":"authenticated","create":"authenticated","update":"authenticated","delete":"nobody"},"creatorOwns":true},
 "collections":{},
 "functions":{},
 "files":{"upload":"authenticated","read":"public","delete":"nobody"},
 "signup":"nobody"}
JSON
fi
# A deployed cloud function (what tests/triggers-http.test.ts deploys) and a one-step workflow definition.
if [ ! -f "$DATA/workflows/hello.workflow.json" ]; then cat > "$DATA/workflows/hello.workflow.json" <<'JSON'
{"components":[{"name":"/#__cloud__/hello","nodes":[
 {"id":"req1","type":"noodl.cloud.request","x":0,"y":0,"parameters":{"allowNoAuth":true},"ports":[],"children":[]},
 {"id":"res1","type":"noodl.cloud.response","x":0,"y":200,"parameters":{},"ports":[],"children":[]}],
 "connections":[{"sourceId":"req1","sourcePort":"receive","targetId":"res1","targetPort":"send"}],"roots":[]}],
 "settings":{},"metadata":{}}
JSON
fi
if [ ! -f "$DATA/workflow-defs/ping.workflow-def.json" ]; then cat > "$DATA/workflow-defs/ping.workflow-def.json" <<'JSON'
{"version":1,"id":"ping","name":"Ping","entry":"hold","concurrency":1,
 "steps":[{"id":"hold","kind":"wait","params":{"duration":1}}],
 "createdAt":"2026-09-25T00:00:00.000Z","updatedAt":"2026-09-25T00:00:00.000Z"}
JSON
fi
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --backend-id bmg8 --backend-name "triggers drive" > "$S/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
if [ "${2:-}" = "seed" ]; then BASE=http://127.0.0.1:$PORT TOKEN=t0k node "$DRIVES/bmg008/seed.mjs"; fi
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir="$S/chrome-$LABEL" --no-first-run --disable-gpu about:blank > "$S/chrome-$LABEL.log" 2>&1 &
CH=$!
echo "chrome pid $CH"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:9333/json/version" && break; sleep 0.25; done
PORT=$PORT OUT="$S/$LABEL.json" S="$S/shots" SHOTS="$LABEL" DATA="$DATA" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null
echo "drive rc=$RC; torn down $BK $CH"
