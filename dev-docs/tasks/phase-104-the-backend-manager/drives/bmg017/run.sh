#!/bin/zsh
# BMG-017 drive (the defects before the drive): a LOCKED throwaway backend (devOpen false) + the S3 fake (tests/helpers/s3-fake.js) as its own
# process on 9400 + headless Chrome on 9333; the Storage and Backups pages driven through the browser with the
# server AND the bucket measured beside every step. One heavy job; tear down after. Never the project's live
# backend.  usage: run.sh <label> [seed|keep] [script.mjs]
set -u
S=${S:-/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/11a0d506-90db-4e33-ac3b-1080918aeb3d/scratchpad/bmg017}
PKG=/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend
DRIVES=/Users/richardosborne/vscode_projects/OpenNoodl/dev-docs/tasks/phase-104-the-backend-manager/drives
LABEL=${1:-drive}
PORT=8697
S3PORT=9400
DATA=$S/data
if [ "${2:-}" = "seed" ]; then rm -rf "$DATA"; fi
SCRIPT=${3:-$DRIVES/bmg017/ac.mjs}
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
node tests/helpers/s3-fake.js --port $S3PORT --bucket puppy --key AKIAPUPPY --secret puppy-secret > "$S/s3-$LABEL.log" 2>&1 &
S3=$!
echo "s3 fake pid $S3"
node dist/cli.js serve --data-dir "$DATA" --port $PORT --token t0k --readonly-token r0k --backend-id bmg17 --backend-name "Puppy backend" > "$S/backend-$LABEL.log" 2>&1 &
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
S3LOG="$S/s3-$LABEL.log"
PORT=$PORT S3PORT=$S3PORT S3LOG="$S3LOG" OUT="$OUTFILE" S="$SHOTDIR" UPLOADS="$UPLOADS" SHOTS="$LABEL" DATA="$DATA" node "$DRIVES/cdp.mjs" "$SCRIPT"
RC=$?
kill $CH 2>/dev/null; kill $BK 2>/dev/null; kill $S3 2>/dev/null
sleep 1
kill -9 $CH 2>/dev/null; kill -9 $BK 2>/dev/null; kill -9 $S3 2>/dev/null
echo "drive rc=$RC; torn down $BK $CH $S3"
