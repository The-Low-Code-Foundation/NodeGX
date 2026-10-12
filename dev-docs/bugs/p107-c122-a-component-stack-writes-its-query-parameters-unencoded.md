---
id: P107-C122
title: With Use Routes, a page's parameters go into the URL's query unencoded: a value with &, #, + or a space comes back different, and one with % empties the stack at the next reset
status: fixed
commit: 159d0dfaf
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (navigation-stack.tsx `_updateUrlWithTopPage` :755 `q.name + '=' + q.value`; `_getSearchParams` :663-680 decodes with `decodeURIComponent`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C122 — ROUTES: path mode — a push with id 'a b&c' writes /detail?id=a%20b%26c; after a Reset the page has 'a b&c' back, so a push with id 'a b' is a new page — Done"
---

**What a person sees.** A push to Detail with a parameter `q` of `50%` writes `?q=50%#/detail`. The next reset (a Reset, a Components
edit, a reload, the browser's Back to it) throws decoding `%#`: the stack is left empty, Top Component Name and Stack Depth still name
Detail, and the Reset is never answered. A value `a b&c` comes back as `a b` plus an extra parameter `c`. A value with `#` cuts the
path off in hash mode. A path parameter (`{id}`) is encoded correctly.

**Where.** `getRelativeURL` encodes path parameters with `encodeURIComponent`. The query is joined raw.

**How to reproduce.** Play the `regression:` scenario on the runtime target, and its control "ROUTES: a push with q '50', then Reset —
the control …". Also "ROUTES: path mode — a push with id 'a b&c' …". The spec copies the behaviour (R3).

**Proposed fix.** `encodeURIComponent` the name and the value when the query is built. The Page Router does this already.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** `_updateUrlWithTopPage` writes the query's names and values with
`encodeURIComponent`, as the Page Router does. Page Stack spec v10. Runtime 149 / 149 at seeds 13 and 20732; control red on exactly
the 2 C122 scenarios.
