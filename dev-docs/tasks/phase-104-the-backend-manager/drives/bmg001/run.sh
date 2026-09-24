#!/bin/zsh
# One heavy job: throwaway backend + headless Chrome, capture, tear down. Never the project's live backend.
# usage: run.sh <label> [seed|fresh|keep] [script.mjs]  — "seed" seeds a fresh data dir; "fresh" wipes it and seeds nothing.
set -u
S=${S:-/tmp/bmg001-capture}   # a scratch dir (the session scratchpad when it ran); holds capture/{data,shots,*.json}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-before}
PORT=8697
DATA=$S/capture/data
if [ "${2:-}" = "fresh" ]; then DATA=$S/capture/data-fresh; fi
if [ "${2:-}" = "seed" ] || [ "${2:-}" = "fresh" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$S/capture/capture.mjs}
mkdir -p "$DATA" "$S/capture/chrome-$LABEL" "$S/capture/shots"
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --backend-id cap1 --backend-name "capture backend" > "$S/capture/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
if [ "${2:-}" = "seed" ]; then BASE=http://127.0.0.1:$PORT TOKEN=t0k node "$S/capture/seed.mjs"; fi
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir="$S/capture/chrome-$LABEL" --no-first-run --disable-gpu about:blank > "$S/capture/chrome-$LABEL.log" 2>&1 &
CH=$!
echo "chrome pid $CH"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:9333/json/version" && break; sleep 0.25; done
PORT=$PORT OUT="$S/capture/$LABEL.json" S="$S/capture/shots" SHOTS="$LABEL" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null
echo "capture rc=$RC; torn down $BK $CH"
