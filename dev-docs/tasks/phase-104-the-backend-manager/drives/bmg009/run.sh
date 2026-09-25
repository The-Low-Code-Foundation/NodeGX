#!/bin/zsh
# BMG-009 drive: a LOCKED throwaway backend (devOpen false) with one deployed cloud function ("hello") and four workflow
# definitions — Greet (answers with body.name), Ping (waits 1 ms), Slow (waits 20 s, for Cancel), Nightly digest (stops
# with an error) — so the pages have runs to find, + headless Chrome on 9333. One heavy job; tear down after.
# Never the project's live backend.
# usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/740c7add-04d2-4629-8337-1ecef7b496db/scratchpad/bmg009}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg009/ac.mjs}
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
if [ ! -f "$DATA/workflows/hello.workflow.json" ]; then cat > "$DATA/workflows/hello.workflow.json" <<'JSON'
{"components":[{"name":"/#__cloud__/hello","nodes":[
 {"id":"req1","type":"noodl.cloud.request","x":0,"y":0,"parameters":{"allowNoAuth":true},"ports":[],"children":[]},
 {"id":"res1","type":"noodl.cloud.response","x":0,"y":200,"parameters":{},"ports":[],"children":[]}],
 "connections":[{"sourceId":"req1","sourcePort":"receive","targetId":"res1","targetPort":"send"}],"roots":[]}],
 "settings":{},"metadata":{}}
JSON
fi
STAMP='"createdAt":"2026-09-25T00:00:00.000Z","updatedAt":"2026-09-25T00:00:00.000Z"'
if [ ! -f "$DATA/workflow-defs/greet.workflow-def.json" ]; then
cat > "$DATA/workflow-defs/greet.workflow-def.json" <<JSON
{"version":1,"id":"greet","name":"Greet","entry":"answer","concurrency":1,
 "steps":[{"id":"answer","kind":"return","params":{"value":{"\$path":"body.name"}}}],$STAMP}
JSON
cat > "$DATA/workflow-defs/ping.workflow-def.json" <<JSON
{"version":1,"id":"ping","name":"Ping","entry":"hold","concurrency":1,
 "steps":[{"id":"hold","kind":"wait","params":{"duration":1}}],$STAMP}
JSON
cat > "$DATA/workflow-defs/slow.workflow-def.json" <<JSON
{"version":1,"id":"slow","name":"Slow","entry":"hold","concurrency":2,
 "steps":[{"id":"hold","kind":"wait","params":{"duration":20,"unit":"seconds"}}],$STAMP}
JSON
cat > "$DATA/workflow-defs/digest.workflow-def.json" <<JSON
{"version":1,"id":"digest","name":"Nightly digest","entry":"fail","concurrency":1,
 "steps":[{"id":"fail","kind":"stop","params":{"message":"No sources answered","isError":true}}],$STAMP}
JSON
fi
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --backend-id bmg9 --backend-name "runs drive" > "$S/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
if [ "${2:-}" = "seed" ]; then BASE=http://127.0.0.1:$PORT TOKEN=t0k node "$DRIVES/bmg009/seed.mjs"; fi
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
