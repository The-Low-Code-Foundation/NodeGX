#!/bin/zsh
S=${S:-/tmp/bmg001-capture}   # a scratch dir (the session scratchpad when it ran); holds capture/{data,shots,*.json}
cd /Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend || exit 1
echo "== build"; npm run build 2>&1 | tail -4; stat -f '%Sm %N' dist/cli.js
echo "== after capture (seeded data dir, no re-seed)"; $S/capture/run.sh after keep 2>&1 | tail -5
echo "== diff"; node $S/capture/diff.mjs $S/capture/before.json $S/capture/after.json $S/capture/diff.json
echo "== ac3/ac4"; $S/capture/run.sh ac34 keep $S/capture/ac34.mjs 2>&1 | tail -60
echo "== ac5 (fresh)"; $S/capture/run.sh ac5 fresh $S/capture/ac5.mjs 2>&1 | tail -20
echo "== done"
