#!/bin/sh
# OWN-012: the drawer bundled for the page that grades it (prototype/real/drawn.html). entry.ts is the package's
# drawer-only entry plus the default design tokens (see its header). Run from anywhere.
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../node_modules/.bin/esbuild
"$ESBUILD" entry.ts --bundle --format=esm --platform=browser --minify --outfile=../prototype/real/drawn.js --log-level=warning --metafile=meta.json
ls -la ../prototype/real/drawn.js
