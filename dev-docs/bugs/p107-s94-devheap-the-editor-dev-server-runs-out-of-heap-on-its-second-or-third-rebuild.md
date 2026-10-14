---
id: P107-S94-DEVHEAP
title: The editor's dev server runs out of heap on its second or third rebuild, and the whole dev stack exits with it
status: open
severity: medium
area: tooling / dev stack (`packages/noodl-editor/package.json` `start`: `webpack-dev-server --config=webpackconfigs/webpack.renderer.dev.js`, launched by `scripts/start.ts`; no heap ceiling, unlike the production build's `scripts/webpackHeapCeiling.ts`)
found: P107 s94, 2026-10-12 — driving the R33 modal in `npm run dev:debug`
evidence: two launches, two deaths. Launch 1 — first compile 95.8 s, a second edit recompiled in 77.8 s, a third edit died: `Mark-Compact 3978.9 (4131.2) -> 3962.3 (4125.6) MB … allocation failure`, then `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`, `lerna ERR! npm run start exited undefined in 'noodl-editor'`, and the launcher's cleanup stopped the viewer, cloud runtime and Electron. Launch 2 (load 6–7) — first compile, one edit recompiled in 102 s, the next edit died the same way. Both in `.logs/dev.log`.
---

The renderer's `webpack-dev-server` runs on Node's default old-space limit (about 4 GB here). Each rebuild leaves the heap
higher; the second or third rebuild after launch reaches the limit and the process aborts. The launcher then reaps the
whole stack, so the editor window dies with it — the person sees the app vanish while editing a file.

What it costs: the HMR edit that triggered the rebuild never reaches the page (a CSS edit looked "not applied" until
the log was read), and any drive in progress has to relaunch and reopen its project (about two minutes each).

Not measured: whether the growth is per rebuild (a leak in a loader or plugin) or a large baseline that two rebuilds
tip over. P82 measured the production build's peak "above 2048, below 4096" MB and gave it a ceiling; the dev server's
peak was never measured. Two candidate fixes, to choose after measuring: raise the ceiling for `start` the way
`webpackHeapCeiling.ts` does for the build, or find what grows. `@nodegx/node-spec` mapped by source into the editor
(NSP-019 s77, ~890 KB of source in a lazy chunk) is one large input the dev server compiles; not shown to be the cause.
