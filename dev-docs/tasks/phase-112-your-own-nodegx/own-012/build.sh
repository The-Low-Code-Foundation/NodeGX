#!/bin/sh
# OWN-012: the drawer (draw.ts) bundled for the page that grades it (prototype/real/drawn.html). Run from anywhere.
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../node_modules/.bin/esbuild
"$ESBUILD" draw.ts --bundle --format=esm --platform=browser --minify --outfile=../prototype/real/drawn.js --log-level=warning --metafile=meta.json
ls -la ../prototype/real/drawn.js
