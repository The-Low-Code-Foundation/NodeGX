---
id: P107-C122
title: With Use Routes, a page's parameters go into the URL's query unencoded: a value with &, #, + or a space comes back different, and one with % empties the stack at the next reset
status: open
severity: medium
area: runtime / Component Stack (navigation-stack.tsx `_updateUrlWithTopPage` :755 `q.name + '=' + q.value`; `_getSearchParams` :663-680 decodes with `decodeURIComponent`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push with q '50%', then Reset — the URL's query cannot be decoded: the stack empties, the Reset unanswered (row C122)"
---

**What a person sees.** A push to Detail with a parameter `q` of `50%` writes `?q=50%#/detail`. The next reset (a Reset, a Components
edit, a reload, the browser's Back to it) throws decoding `%#`: the stack is left empty, Top Component Name and Stack Depth still name
Detail, and the Reset is never answered. A value `a b&c` comes back as `a b` plus an extra parameter `c`. A value with `#` cuts the
path off in hash mode. A path parameter (`{id}`) is encoded correctly.

**Where.** `getRelativeURL` encodes path parameters with `encodeURIComponent`. The query is joined raw.

**How to reproduce.** Play the `regression:` scenario on the runtime target, and its control "ROUTES: a push with q '50', then Reset —
the control …". Also "ROUTES: path mode — a push with id 'a b&c' …". The spec copies the behaviour (R3).

**Proposed fix.** `encodeURIComponent` the name and the value when the query is built. The Page Router does this already.
