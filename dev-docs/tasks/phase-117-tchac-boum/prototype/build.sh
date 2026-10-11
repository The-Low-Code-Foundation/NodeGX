#!/bin/sh
# What tchac-boum.html imports, bundled as ES modules (both gitignored). Run from anywhere: ./build.sh
#   look.js    @nodegx/canvas-look (P112 OWN-005): the editor canvas's colours, for the Circuit face of each part
#   specs.js   @nodegx/node-spec (P112 OWN-002): each node's ports from its spec, for the connect popup and the part panel
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../node_modules/.bin/esbuild
"$ESBUILD" ../../../../packages/nodegx-canvas-look/src/index.ts --bundle --format=esm --platform=browser --outfile=look.js --log-level=warning
"$ESBUILD" specs-entry.ts --bundle --format=esm --platform=browser --minify --outfile=specs.js --log-level=warning
ls -la look.js specs.js
