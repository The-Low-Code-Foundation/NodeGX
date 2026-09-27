#!/bin/zsh
# BMG-012 drive: the editor hand-off lands on a page. A LOCKED throwaway backend seeded like bmg003 (Pet with two records),
# + headless Chrome on 9333. The script opens /_admin with `#token=…&route=…` the way the editor does. One heavy job; tear down after.
# usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/64ba045a-6e26-4185-880b-32d4ad43495e/scratchpad/bmg012}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg012/ac.mjs}
mkdir -p "$DATA" "$S/chrome-$LABEL" "$S/shots"
if [ ! -f "$DATA/security.json" ]; then cat > "$DATA/security.json" <<'JSON'
{"version":1,"devOpen":false,
 "defaults":{"permissions":{"find":"authenticated","get":"authenticated","create":"authenticated","update":"authenticated","delete":"nobody"},"creatorOwns":true},
 "collections":{},
 "functions":{},
 "files":{"upload":"authenticated","read":"public","delete":"nobody"},
 "signup":"nobody"}
JSON
fi
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --backend-id bmg12 --backend-name "handoff drive" > "$S/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
if [ "${2:-}" = "seed" ]; then BASE=http://127.0.0.1:$PORT TOKEN=t0k node "$DRIVES/bmg003/seed.mjs"; fi
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
