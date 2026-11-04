---
id: P112-OWN036-BASEURLSLASH
title: "`nodegx-deploy --base-url /lab/x` (no trailing slash) writes `src=\"/lab/xreact.production.min.js\"` for every file, then fails with \"index.html names no index-*.js — the deploy wrote no export\""
status: open
phase: P112
task: OWN-036
severity: medium
area: "@nodegx/preview 0.2.8 `bin/nodegx-deploy.js` — the `--base-url` join, and the write-stage check whose message names the wrong cause"
found: P112 OWN-036, 2026-11-04 (publishing the AC5 lab's Deep Glow under nodegx.io/lab/first-project/deep-glow)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-036/RESULTS.md
kit: preview
---

Ran the published 0.2.8 from the app's parent folder:

```
nodegx-deploy deep-glow <out> --base-url /lab/first-project/deep-glow
{"ok":false,"stage":"write","message":"<out>/index.html names no index-*.js — the deploy wrote no export."}
```

`<out>/index.html` exists and `index-dba30ecb151e6dbc.js` sits beside it. The page's references are the base URL
concatenated with each file name and no separator: `/lab/first-project/deep-glowreact.production.min.js`,
`…/deep-glowindex-dba30ecb151e6dbc.js`, `…/deep-glownoodl_modules/inter/styles.css`. The same command with
`/lab/first-project/deep-glow/` writes correct paths and succeeds (measured).

A person who types the path the way every host's docs write it ("/my-app") gets an error that says the export is
missing, when the export is there and only the join is wrong. Fix candidate: normalise `--base-url` to one trailing
slash; make the check say "index.html points at /…/deep-glowindex-….js, which is not a file in this folder".
