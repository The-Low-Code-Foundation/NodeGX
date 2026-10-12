---
id: P107-C115
title: A link whose query has a malformed escape (`?q=%zz`, `?off=50%`) blanks every Page Router — nothing is shown, and its Reset is never answered
status: fixed
commit: 6096fadae
phase: P109
task: ISL-048
severity: medium
area: runtime / Page Router (noodl-viewer-react/src/nodes/navigation/router.tsx `_getSearchParams` :753-768 — `decodeURIComponent` on each name and value; `matchPageFromUrl` :795 calls it before anything else)
found: P107 NSP-016 s57, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.18; recorded on the runtime target (NSP-016 s57 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Router.json "a malformed query is kept as written: the router shows its start page (row C115, fixed in P109 ISL-048)"
---

**What a person sees.** Someone opens a shared link whose query carries a raw `%` — `https://app.example/?off=50%#/product/3`,
a hand-typed or mangled link, a tracking parameter. The page stays empty: the Page Router shows neither the linked page nor its
start page. A Reset wired to it never reports Done, Unchanged or Failure. A Back to a clean URL brings it back.

**Where.** `_getSearchParams` decodes every name and value with `decodeURIComponent`, which throws `URIError` on a malformed
escape. `matchPageFromUrl` calls it on every reset, before it looks at the pages, so every reset of a top-level router throws inside
the async request and the rejection goes nowhere. NDA-012 D1 made the PATH's decode never throw (`_decodePathSegment`); the query's
decode was left as it was.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Decode the query the way `_decodePathSegment` decodes a segment: try, and keep the text as written when it does
not decode. Small (one helper, two call sites).
