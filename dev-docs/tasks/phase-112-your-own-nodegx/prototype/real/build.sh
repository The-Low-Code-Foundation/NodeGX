#!/bin/sh
# What orbit.html imports, bundled as ES modules. Run from anywhere: ./build.sh
#   look.js    @nodegx/canvas-look (OWN-005): the editor canvas's colours and metrics
#   specs.js   @nodegx/node-spec (OWN-002): each node's ports from its spec, for the connect popup and the property panel
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../../node_modules/.bin/esbuild
"$ESBUILD" ../../../../../packages/nodegx-canvas-look/src/index.ts --bundle --format=esm --platform=browser --outfile=look.js --log-level=warning
"$ESBUILD" specs-entry.ts --bundle --format=esm --platform=browser --minify --outfile=specs.js --log-level=warning
ls -la look.js specs.js
