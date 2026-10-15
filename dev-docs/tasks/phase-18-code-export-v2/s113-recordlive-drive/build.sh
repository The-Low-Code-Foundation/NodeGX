#!/bin/zsh
# Emits record-desk twice (fixed = the committed export; control = the same with the store and the subscription switched
# off, which is what HEAD emitted for this app) and bundles each with esbuild, the endpoint compiled in. From the repo root.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
for arm in fixed control; do
  rm -rf $X/out-$arm
  (cd $E && npx tsx $X/emit.ts $E/tests/fixtures/record-desk $X/out-$arm $arm)
  # The repo's react-router-dom is v5 and the export targets v7; the app has one page, so App renders it directly (as s112 did).
  print "import { HomePage } from './pages/Home';\nexport function App() { return <HomePage />; }" > $X/out-$arm/src/App.tsx
  (cd $X/out-$arm && NODE_PATH=$R/node_modules $R/node_modules/.bin/esbuild src/main.tsx --bundle --outdir=dist \
     --loader:.module.css=local-css --jsx=automatic --log-level=warning \
     "--define:import.meta.env.VITE_NODEGX_ENDPOINT=\"http://localhost:8594\"" \
     "--define:import.meta.env.VITE_NODEGX_APP_ID=\"backend_recorddesk\"")
  print '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/main.css"></head><body><div id="root"></div><script src="/dist/main.js"></script></body></html>' > $X/out-$arm/serve.html
done
