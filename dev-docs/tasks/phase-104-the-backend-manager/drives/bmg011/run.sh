#!/bin/zsh
# BMG-011 drive: a LOCKED throwaway backend (devOpen false) + headless Chrome on 9333, the six pages driven
# through the browser with the server measured beside every step. One heavy job; tear down after.
# Never the project's live backend.  usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/4a643c18-4885-4455-b61d-a91c0e817fd5/scratchpad/bmg011}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg011/ac.mjs}
mkdir -p "$DATA" "$S/chrome-$LABEL" "$S/shots" "$S/uploads"
if [ ! -f "$DATA/security.json" ]; then cat > "$DATA/security.json" <<'JSON'
{"version":1,"devOpen":false,
 "defaults":{"permissions":{"find":"public","get":"public","create":"authenticated","update":"authenticated","delete":"nobody"},"creatorOwns":false},
 "collections":{},
 "functions":{},
 "files":{"upload":"authenticated","read":"public","delete":"nobody"},
 "signup":"nobody"}
JSON
fi
if [ ! -f "$DATA/ops.json" ]; then echo '{"version":1,"rateLimit":{"enabled":false}}' > "$DATA/ops.json"; fi
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --readonly-token r0k --backend-id bmg11 --backend-name "Puppy backend" > "$S/backend-$LABEL.log" 2>&1 &
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
UPLOADS="$S/uploads"
OUTFILE="$S/$LABEL.json"
PORT=$PORT OUT="$OUTFILE" S="$SHOTDIR" UPLOADS="$UPLOADS" SHOTS="$LABEL" DATA="$DATA" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null
echo "drive rc=$RC; torn down $BK $CH"
