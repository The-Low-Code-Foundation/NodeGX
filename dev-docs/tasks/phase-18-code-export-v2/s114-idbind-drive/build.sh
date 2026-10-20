#!/bin/zsh
# Bundles the two export arms with esbuild, the endpoint compiled in. `out-fixed` is emitted from the working tree by
# `emit.ts`; `out-control` was emitted once by the same script with HEAD's (2f9b16402) plan.ts, component.ts and
# emitApp.ts put back for the one emit and then restored (cmp-checked), which is what HEAD emits for this app.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
E=$R/packages/nodegx-export
if [[ "$1" == "--emit-fixed" ]]; then
  rm -rf $X/out-fixed
  (cd $E && $R/node_modules/.bin/ts-node -P tsconfig.json --transpile-only $X/emit.ts $X/bind-desk $X/out-fixed)
fi
for arm in fixed control; do
  # The repo's react-router-dom is v5 and the export targets v7; the app has one page, so App renders it directly (as s112/s113 did).
  print "import { HomePage } from './pages/Home';\nexport function App() { return <HomePage />; }" > $X/out-$arm/src/App.tsx
  (cd $X/out-$arm && NODE_PATH=$R/node_modules $R/node_modules/.bin/esbuild src/main.tsx --bundle --outdir=dist \
     --loader:.module.css=local-css --jsx=automatic --log-level=warning \
     "--define:import.meta.env.VITE_NODEGX_ENDPOINT=\"http://localhost:8594\"" \
     "--define:import.meta.env.VITE_NODEGX_APP_ID=\"backend_recorddesk\"")
  print '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/main.css"></head><body><div id="root"></div><script src="/dist/main.js"></script></body></html>' > $X/out-$arm/serve.html
done
