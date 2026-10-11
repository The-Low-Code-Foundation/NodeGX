# TBM-004 — A public copy

**Opened 2026-10-11.** **Status: 📋 (R4: after the kids' sitting).** **Model:** either.

The page already runs from any path (every URL is relative). What is missing is Orbit's `serve.mjs --out <dir>
[--runtime <deploy dir>]` (P112 `real/serve.mjs`): the page as `index.html`, `look.js`, `specs.js`, `preview.js`, the
production runtime (`OUT_PATH=<dir> npx webpack --config webpack-configs/webpack.deploy.prod.js` in
`packages/noodl-viewer-react`, refused if the engine is the 17 MB development build), and `project/tchac.json`.

## Acceptance criteria

1. `node serve.mjs --out <dir>` writes a folder that any static host serves; nodegx.io/tchac-boum/ is that folder.
2. `node check.mjs --site https://nodegx.io/tchac-boum/` is green (the `--site` flag, as Orbit's gate has it).
3. The page loads on the Surface Pro in Chrome on Windows 10 with the production runtime; the number is in TBM-003.
