---
id: P107-C121
title: With Use Routes in hash mode, pushing a page with no parameters keeps the previous page's query in the address, and a reload or Back hands it those parameters
status: open
severity: low
area: runtime / Component Stack (navigation-stack.tsx `_updateUrlWithTopPage` :749-763: with no query the URL is only `#/path`, which `pushState` resolves against the current address, keeping its `?query`)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push of Detail with id 1, then of Settings — ?id=1#/detail, then #/settings, which keeps ?id=1 in the address (row C121)"
---

**What a person sees.** Detail is pushed with id 1: the address is `?id=1#/detail`. Then Settings, which has no parameters: the address
becomes `?id=1#/settings`. On a reload, or the browser's Back and Forward to that entry, Settings is built with an input `id` of '1'
that nobody gave it. A push of Settings with no parameters is then Done (a second Settings on top), not Unchanged.

**Where.** Hash mode writes `(query ? '?' + query : '') + '#' + path`. A URL that starts with `#` is a fragment-only change; the
browser keeps the path and the query.

**How to reproduce.** Play the `regression:` scenario on the runtime target. Its history events are `?id=1#/detail` then
`#/settings`. "ROUTES: placed at ?id=1#/settings …" and its control "ROUTES: placed at #/settings — the control …" show the
consequence. The spec copies the behaviour (R3).

**Proposed fix.** Write the path part too in hash mode (`location.pathname + query + '#' + path`), so an empty query clears the old one.
