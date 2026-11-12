---
id: P112-OWN036-PREVIEWINREPO
title: "`npx @nodegx/preview <app> --open` run from inside the OpenNoodl checkout says `sh: preview: command not found`; the same command anywhere else works"
status: open
phase: P112
task: OWN-036
severity: low
area: the checkout's workspace install — `node_modules/@nodegx/preview` links to `packages/noodl-preview`, but `node_modules/.bin` holds only `noodl-preview`, not the package's `preview` bin
found: P112 OWN-036 AC5, 2026-11-03 (Richard, opening the lab's Game 1 from his terminal in the checkout)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-036/RESULTS.md
kit: preview
---

Richard ran the command the kit's folder note prints, from `~/vscode_projects/OpenNoodl`:

```
% npx @nodegx/preview ~/vscode_projects/fp-lab/b/my-apps/deep-glow --open
sh: preview: command not found
```

Measured the same evening: `ls node_modules/.bin | grep preview` in the checkout prints only `noodl-preview`;
`node_modules/@nodegx/preview -> ../../packages/noodl-preview`. Inside a workspace, npx resolves the local package and
runs the bin named after it (`preview`), which the install never linked: the `preview` bin was added to
`packages/noodl-preview/package.json` after the checkout's last `npm install`. From `~/vscode_projects/fp-lab/b/my-apps`
the same command fetches the published package and prints its usage.

A stranger never meets it (they aren't in our checkout); Richard and every session that drives an app from the repo
root does. A version spec does NOT route round it: `npx -y @nodegx/preview@0.2.8 --help` from the checkout fails the
same way (measured). Workaround: run it from outside the checkout (`cd <the app's parent> && npx @nodegx/preview
<app> --open`). Fix candidate: `npm install` in the checkout relinks the bins (re-measure after; a shared checkout, so
not mid-session).
