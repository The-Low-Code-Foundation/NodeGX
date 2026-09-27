#!/bin/zsh
# BMG-010 drive: a LOCKED throwaway backend (devOpen false) with NO email configured and NO providers, an SMTP sink on
# 2526 (bmg005/smtp.mjs — every message lands in $S/mailbox.jsonl as one JSON line) so *Send test email* and *Send me
# this* really send, + headless Chrome on 9333. One heavy job; tear down after. Never the project's live backend.
# usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/cf3fc4d9-5a89-4a45-bd35-09d5eaeabb2f/scratchpad/bmg010}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
SMTP_PORT=2526
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; rm -f "$S/mailbox.jsonl"; fi
SCRIPT=${3:-$DRIVES/bmg010/ac.mjs}
mkdir -p "$DATA" "$S/chrome-$LABEL" "$S/shots"
touch "$S/mailbox.jsonl"
if [ ! -f "$DATA/security.json" ]; then cat > "$DATA/security.json" <<'JSON'
{"version":1,"devOpen":false,
 "defaults":{"permissions":{"find":"authenticated","get":"authenticated","create":"authenticated","update":"authenticated","delete":"nobody"},"creatorOwns":true},
 "collections":{},
 "functions":{},
 "files":{"upload":"authenticated","read":"public","delete":"nobody"},
 "signup":"nobody"}
JSON
fi
SMTP_PORT=$SMTP_PORT MAILBOX="$S/mailbox.jsonl" node "$DRIVES/bmg005/smtp.mjs" > "$S/smtp-$LABEL.log" 2>&1 &
SM=$!
cd "$PKG"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --backend-id bmg10 --backend-name "email drive" > "$S/backend-$LABEL.log" 2>&1 &
BK=$!
echo "backend pid $BK smtp pid $SM"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$PORT/health" && break; sleep 0.25; done
curl -s "http://127.0.0.1:$PORT/health" | head -c 200; echo
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9333 --user-data-dir="$S/chrome-$LABEL" --no-first-run --disable-gpu about:blank > "$S/chrome-$LABEL.log" 2>&1 &
CH=$!
echo "chrome pid $CH"
for i in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:9333/json/version" && break; sleep 0.25; done
MB="$S/mailbox.jsonl"
# zsh applies prefix assignments left to right, so S="$S/shots" would change $S for MAILBOX: resolve it first.
PORT=$PORT SMTP_PORT=$SMTP_PORT OUT="$S/$LABEL.json" S="$S/shots" SHOTS="$LABEL" DATA="$DATA" MAILBOX="$MB" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null; kill $SM 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null; kill -9 $SM 2>/dev/null
echo "drive rc=$RC; torn down $BK $CH $SM"
