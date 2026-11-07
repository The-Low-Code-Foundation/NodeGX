---
id: BETA-PUBLISHNEWPKG
title: "publish-npm.sh ends silently right after the FIRST publish of a new package: the registry answers 404 for a package it has never served, `curl -f` fails, and `set -euo pipefail` ends the script in the wait loop, so everything after it in the order is never published"
status: fixed
severity: high
area: scripts/own/publish-npm.sh (`registry_shasum`, the wait loop after `npm publish`)
found: Beta cut publish (Richard's sitting), 2026-11-07 22:45
evidence: "Richard's run: preview 0.2.9 and export 0.2.6 published and live; `@nodegx/backend` 0.1.0 `PUT 202` 'being processed' (~/.npm/_logs/2026-11-07T21_45_02_579Z), then the script ended with no message; mcp 0.2.10 and create-nodegx 0.2.12 never published. Reproduced: `bash -c 'set -euo pipefail; f(){ curl -fsS https://registry.npmjs.org/@nodegx%2fdoes-not-exist-xyz | cat; }; got=$(f); echo survived'` → exit 56, no 'survived'. After the fix: the same read on the fixed `registry_shasum` returns empty and survives; `@nodegx/preview@0.2.9` still returns 52f19cf5…"
commit: see this file's commit (the script and this bug together)
---

Every earlier cut published only packages that already existed, whose registry document answers 200 even before the
new version appears, so the failed read never happened. `@nodegx/backend` was the first new package since the wait
loop was added.

**Fixed.** `registry_shasum` treats a failed read as "not there yet" (`curl … || true`). A second hole closed with it: a
re-run would `npm publish` a version npm had accepted but not yet served, npm refuses (E403/E409), and `set -e` ended
the script again. Now a non-zero `npm publish` prints a line and falls through to the wait, which decides by the
tested shasum whether it is live.
