#!/bin/sh
# The look the page draws in: @nodegx/canvas-look (OWN-005), bundled as an ES module. Run from anywhere: ./build.sh
set -e
cd "$(dirname "$0")"
../../../../../node_modules/.bin/esbuild ../../../../../packages/nodegx-canvas-look/src/index.ts --bundle --format=esm --platform=browser --outfile=look.js --log-level=warning
ls -la look.js
