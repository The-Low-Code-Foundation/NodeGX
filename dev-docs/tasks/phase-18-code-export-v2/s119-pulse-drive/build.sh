#!/bin/zsh
# EXP-011 §86 (session 119; s118's harness, no backend). Bundles the two export arms with esbuild. Both were emitted by `emit.ts`:
# `out-fixed` from the working tree, `out-control` from a copy (`packages/.nx-ctl-s119`) holding HEAD's (8baf5a3fd) `src`.
set -e
X=${0:A:h}
R=/Users/richardosborne/vscode_projects/OpenNoodl
for arm in fixed control; do
  # The repo's react-router-dom is v5 and the export targets v7; the app has one page, so App renders it directly (as s112-s118 did).
  print "import { HomePage } from './pages/Home';\nexport function App() { return <HomePage />; }" > $X/out-$arm/src/App.tsx
  (cd $X/out-$arm && NODE_PATH=$R/node_modules $R/node_modules/.bin/esbuild src/main.tsx --bundle --outdir=dist \
     --loader:.module.css=local-css --jsx=automatic --log-level=warning)
  print '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/dist/main.css"></head><body><div id="root"></div><script src="/dist/main.js"></script></body></html>' > $X/out-$arm/serve.html
done
