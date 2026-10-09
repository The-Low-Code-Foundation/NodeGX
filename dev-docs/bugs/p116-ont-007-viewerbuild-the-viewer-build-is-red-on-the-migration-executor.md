---
id: P116-ONT-007-viewerbuild
title: The viewer build is red — the migration executor iterates a Map, which the viewer's ES5 build refuses, and where it emits anyway the loop runs zero times
status: fixed
commit: 06ec2d4e7
severity: high
area: backend contract / the migration executor (`nodegx-backend-contract/src/migration.ts` :170, :178 `[...seen.values()]`, :462 `for (const [key, now] of columns)`), compiled into the viewer through `noodl-runtime/src/api/cloudstore.js`
found: P109 s37, 2026-10-09, building the viewer at `f1ad13e2e` for ISL-052
evidence: `cd packages/noodl-viewer-react && npx webpack --config webpack-configs/webpack.viewer.prod.js` → "compiled with 3 errors", exit 1 — three TS2802 ("can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher"), all in migration.ts; the PR workflow runs this build (`.github/workflows/pr.yml:251`, `npm run ci:build:viewer`)
kit: core
---

**What a person sees.** Nothing in the app yet: the PR checks fail at "build viewer", on every pull request from `cline-dev`
since `993a3ff1e` / `647f49259`.

**Where.** The viewer compiles the backend contract (its index exports the migration executor) at an ES5 target without
`downlevelIteration`. Spreading `seen.values()` and a `for…of` over the `columns` Map are both refused. Webpack still writes
the bundle, and in it those lines iterate nothing: the spread gives `[]` (the dry run's "more than one" / unique refusals count
0 and are never reported), and the loop at :462 never warns about a rule that narrows a hop. The viewer does not run a migration
today, so the wrong count has no reach in the app; the red build does (memory: an ES5 `for…of` over a Map runs zero times in
viewer-react).

**How to reproduce.** The evidence command, at `f1ad13e2e`.

**Proposed fix (small).** `Array.from(seen.values())` at :170 and :178, and `for (const [key, now] of Array.from(columns))`
(or `columns.forEach`) at :462. Then the viewer build reports 0 errors.

**Fixed (P109 s37, 2026-10-09, because it blocked ISL-052: a production webpack build with errors writes no bundle, so no
viewer fix could be measured).** As proposed: `Array.from` at the three places. The viewer build: exit 1 with 3 errors at
`f1ad13e2e`, exit 0 after. `nodegx-backend-contract` `tests/migration.test.ts` 20 / 20, its `tsc --noEmit` clean.
