#!/bin/sh
# Builds dist/orbit.html: the page with the node-spec interpreter, every spec and the graph runner inlined.
# Run from anywhere: ./build.sh   (then open dist/orbit.html; add #demo or #selftest to the URL)
set -e
cd "$(dirname "$0")"
ESBUILD=../../../../node_modules/.bin/esbuild
mkdir -p dist
# the picker list: specced nodes whose world this page can give them (clock, random, timezone)
"$ESBUILD" tools/genpicker.ts --bundle --platform=node --outfile=tools/genpicker.cjs --log-level=warning
node tools/genpicker.cjs
# the spec package for a browser: interpreter + specs + runner; `crypto` (only the Hash node uses it) stubbed
"$ESBUILD" src/entry.ts --bundle --platform=browser --format=iife --global-name=NGX --minify \
  --alias:crypto=./src/crypto-stub.js --define:process.env.TZ=undefined --outfile=dist/ngx.js --log-level=warning
node -e '
const fs=require("fs");const b=fs.readFileSync("dist/ngx.js","utf8");
if(/<\/script/i.test(b)) throw new Error("bundle contains </script");
const p=fs.readFileSync("page.html","utf8").split("/*NGX*/");
if(p.length!==2) throw new Error("placeholder count "+(p.length-1));
fs.writeFileSync("dist/orbit.html",p[0]+b+";window.NGX=NGX;"+p[1]);'
ls -la dist/orbit.html
