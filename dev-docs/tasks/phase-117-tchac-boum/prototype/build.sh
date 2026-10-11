#!/bin/sh
# What tchac-boum.html imports, bundled as ES modules (all gitignored). Run from anywhere: ./build.sh
#   look.js    @nodegx/canvas-look (P112 OWN-005): the editor canvas's colours, for the Circuit face of each part
#   specs.js   @nodegx/node-spec (P112 OWN-002): each node's ports from its spec, for the connect popup and the part panel
#   three.js   three (0.177.0, fetched into .deps/ by npm on the first run): the wall, the costumes, the rails and the marbles
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../node_modules/.bin/esbuild
"$ESBUILD" ../../../../packages/nodegx-canvas-look/src/index.ts --bundle --format=esm --platform=browser --outfile=look.js --log-level=warning
"$ESBUILD" specs-entry.ts --bundle --format=esm --platform=browser --minify --outfile=specs.js --log-level=warning
[ -d .deps/node_modules/three ] || npm install --prefix .deps --no-audit --no-fund --no-save --silent three@0.177.0
NODE_PATH=.deps/node_modules "$ESBUILD" three-entry.mjs --bundle --format=esm --platform=browser --minify --outfile=three.js --log-level=warning
ls -la look.js specs.js three.js
