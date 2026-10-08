---
id: P107-C117
title: After a Navigate, Back or Forward to the same page with other parameters keeps showing the old ones — the Page Router hands the new parameters to a page it already deleted
status: fixed
commit: 47f987ef6
phase: P109
task: ISL-048
severity: medium
area: runtime / Page Router (noodl-viewer-react/src/nodes/navigation/router.tsx `resetAsync` :583 `_updatePageInputs(this._internal.currentPageComponent.nodeScope, …)`; `currentPageComponent` is written only by a reset, :625 — `_buildPage` :951-994 never writes it)
found: P107 NSP-016 s57, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.18; recorded on the runtime target (NSP-016 s57 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Router.json "after a navigate built Product 1, Back to #/product/2: the reset takes it as the page it shows with new parameters, and its Page Inputs are handed id 2 (row C117, fixed in P109 ISL-048)"
---

**What a person sees.** A shop: a Navigate opens product 1, another opens product 2. The person presses the browser's Back. The
address bar says product 1; the page still shows product 2. The router reports the reset as Done. The same happens for a Reset after
anything changed the URL's parameters, and for Forward.

**Where.** A reset that lands on the page already showing with other parameters updates the Page Inputs of
`_internal.currentPageComponent`. Only `resetAsync` sets that (the start page, a page reached by URL); `_buildPage` — every
Navigate — never does. After a Navigate it still names the page the last reset built, which the Navigate deleted, so the parameters go
nowhere. If no reset ever built a page (the start page was refused, then a Navigate built one), it is undefined and the reset throws:
never answered.

**How to reproduce.** Play the `regression:` scenario on the runtime target. Also "navigate Product 7 twice: …" (a Reset reading
'7' from the URL after a Navigate handed 7). The spec copies the behaviour (R3).

**Proposed fix.** Set `_internal.currentPageComponent = content` in `_buildPage`, beside `currentPage` (and clear it where a
page is left). One line plus the clear; the scenario's `page` event then appears.
