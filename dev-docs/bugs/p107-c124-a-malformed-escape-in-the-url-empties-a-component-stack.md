---
id: P107-C124
title: With Use Routes, a URL whose query or path parameter has a malformed escape (%zz) empties the Component Stack, and its Reset is never answered
status: fixed
commit: f13a3d88f
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (navigation-stack.tsx `_getSearchParams` :663-680 and `_matchPathParts` :713 call `decodeURIComponent`, which throws; `resetAsync` has deleted every page first, :507-511)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C124 — ROUTES: placed at ?q=%zz#/home — the malformed escape is kept as written: the stack shows Home, and a Reset is Done" (and its two Back twins, a query and a path part)
---

**What a person sees.** A link from outside (an email, a QR code) to `?q=%zz#/home`, or a path parameter like `#/detail/%zz`: the
stack shows nothing. A Reset is never answered. Top Component Name and Stack Depth keep naming the page that went. This is the Page
Router's P107-C115, in the Component Stack. Unlike the Router, the stack's path parameters throw too.

**Where.** Both decodes are unguarded inside `matchPageFromUrl`, which `resetAsync` calls after it has removed every page.

**How to reproduce.** Play the `regression:` scenario on the runtime target. Also "ROUTES: Detail's Path /detail/{id}, the person's
Back to #/detail/%zz …" and "ROUTES: the person's Back to ?q=%zz#/detail …". The spec copies the behaviour (R3).

**Proposed fix.** Decode with a guard that keeps the raw text on a malformed escape, as the Router's `_decodePathSegment` does. Fix both
nodes together (C115).

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** `_getSearchParams` and the path's `{name}` parts decode with `decodeOrKeep`:
a malformed escape is kept as written, as the Page Router's C115. Page Stack spec v9. Runtime 149 / 149 at seeds 13 and 20732;
control red on exactly the 4 scenarios whose trace changed.
