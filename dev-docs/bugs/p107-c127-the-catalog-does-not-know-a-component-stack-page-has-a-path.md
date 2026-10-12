---
id: P107-C127
title: The node catalog does not know a Component Stack page has a Path — `pagePath-<pageId>` is missing, so the MCP cannot set one
status: fixed
commit: df238bd79
phase: P109
task: ISL-048
severity: low
area: catalog / node-catalog (scripts/node-catalog/lib/derive-encoding.js seeds the list and text parameters only; navigation-stack.tsx `_updatePorts` :1153-1166 draws `pagePath-<id>` only when `useRoutes === true`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; packages/noodl-types/src/node-catalog.json, `Page Stack` → `parameterEncoding.patterns` lists `pageComp-<pageId>`, `startPage` and `<name>`, no `pagePath-<pageId>`
regression: packages/nodegx-node-spec/tests/catalog-parity.test.ts "Page Stack: dynamic ports — the spec has `derived` exactly when the catalog says the node has them (NSP-004, R6)" (a `when` pattern is drawn with its switch and absent without it)
---

**What an author sees.** An AI author working through the MCP builds a Component Stack with Use Routes on. The catalog tells it each
page has a Component (`pageComp-<pageId>`) and nothing about a Path. Every page gets the label's default URL, and a page with
parameters in its path (`/detail/{id}`) cannot be made. The editor shows the Path input once Use Routes is ticked.

The same entry's `dynamicPorts.description` says "Per-page signal outputs and transition parameters", which describes Push Component
To Stack, not the stack.

**Where.** The encoding probe seeds `pages` and `dataAttributes` (`seededBy`). A port gated on a boolean parameter never appears.

**How to reproduce.** Read the `Page Stack` entry of `node-catalog.json`. The spec (`component-stack.ts` `derived.inputs`) draws
`pagePath-<id>` when `useRoutes` is `true`.

**Proposed fix.** Probe the stack with `useRoutes: true` as well (or add the pattern by hand beside the probe), and correct the
description.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed, and the switch recorded.** The encoding probe drives the Component Stack with
`useRoutes: true` (`ENABLING_PARAMETERS`), so `pagePath-<pageId>` is derived; a new pass (`applyEnablingConditions`) drives seed A
again with the enabling parameters unset and gives each pattern that disappears a `when` (`{ "useRoutes": true }`), typed on
`ParameterPattern`. Without it the catalog would say every page always has a Path. The description now says what the stack draws.
Regenerated: only `Page Stack` changed (States and For Each, the other two with enabling parameters, gain no `when`: their ports do
not depend on them). `catalog-parity.test.ts` probes a `when` pattern with its switch and checks it is absent without. Gates: catalog `--check`, merge
`--check --require-coverage`, encoding selftest 20 / 20, catalog parity 312 / 312, nine MCP catalog and budget suites 132 / 132.
Control: parity at its old version against the new catalog red on exactly `Page Stack: dynamic ports` (`pagePath-probe` not drawn).
