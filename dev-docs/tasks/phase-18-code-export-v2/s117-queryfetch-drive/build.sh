#!/bin/zsh
# P18-S116-QUERYFETCH (session 117). Bundles the two export arms with esbuild, the endpoint compiled in. Both were emitted by
# `emit.ts`: `out-fixed` from the working tree, `out-control` from a copy (`packages/.nx-ctl-s117`) holding HEAD's (c3a0462d0)
# `src`, removed after the one emit.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
for arm in fixed control; do
  # The repo's react-router-dom is v5 and the export targets v7; the app has one page, so App renders it directly (as s112-s114 did).
  print "import { HomePage } from './pages/Home';\nexport function App() { return <HomePage />; }" > $X/out-$arm/src/App.tsx
  (cd $X/out-$arm && NODE_PATH=$R/node_modules $R/node_modules/.bin/esbuild src/main.tsx --bundle --outdir=dist \
     --loader:.module.css=local-css --jsx=automatic --log-level=warning \
     "--define:import.meta.env.VITE_NODEGX_ENDPOINT=\"http://localhost:8597\"" \
     "--define:import.meta.env.VITE_NODEGX_APP_ID=\"backend_fetchdesk\"")
  print '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/main.css"></head><body><div id="root"></div><script src="/dist/main.js"></script></body></html>' > $X/out-$arm/serve.html
done
