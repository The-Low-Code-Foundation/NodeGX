#!/bin/zsh
# BMG-014 drive: a LOCKED throwaway backend (devOpen false, NO admin account) + headless Chrome on 9333.
# One heavy job; tear down after. Never the project's live backend.
# usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/cc4927f1-cf3e-4557-8d79-b3c281daad74/scratchpad/bmg014}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg014/ac.mjs}
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
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --readonly-token r0k --backend-id bmg14 --backend-name "first admin drive" > "$S/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir="$S/chrome-$LABEL" --no-first-run --disable-gpu about:blank > "$S/chrome-$LABEL.log" 2>&1 &
CH=$!
echo "chrome pid $CH"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:9333/json/version" && break; sleep 0.25; done
# zsh applies prefix assignments left to right: resolve every path that reads $S BEFORE S is reassigned to the shots dir.
SHOTDIR="$S/shots"
BKLOG="$S/backend-$LABEL.log"
OUTFILE="$S/$LABEL.json"
PORT=$PORT OUT="$OUTFILE" S="$SHOTDIR" SHOTS="$LABEL" DATA="$DATA" BACKEND_LOG="$BKLOG" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null
echo "drive rc=$RC; torn down $BK $CH"
