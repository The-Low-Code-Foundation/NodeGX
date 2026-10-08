---
id: P107-C120
title: With Use Routes, a Pop pushes the page below as a new history entry, so the browser's Back then shows the page just popped, as the only page, with a Pop that does nothing
status: open
severity: medium
area: runtime / Component Stack (navigation-stack.tsx `back` end callback :1068-1078 calls `_updateUrlWithTopPage`, which always calls `history.pushState`; `replaceAsync` :889 the same)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push and its Pop, then the person's Back to #/detail — Detail alone, Stack Depth 1, and its Pop asks nothing (row C120)"
---

**What a person sees.** A stack with Use Routes: Home, then a push to Detail (address `#/detail`), then the app's own Back button (a Pop).
The address becomes `#/home` and the history has three entries: start, `#/detail`, `#/home`. The person then presses the browser's
Back. They get Detail again, as the stack's only page (Stack Depth 1), and the Pop on it does nothing because the stack did not push
that page. A second browser Back goes to the start entry. The app's Back and the browser's Back walk in opposite directions.

A Replace also pushes a new entry, so the browser's Back returns to the page the replace removed.

**Where.** `_updateUrlWithTopPage` has one mode, `pushState`. A pop would need `history.back()` (or `replaceState`), and a replace
`replaceState`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The Pop answers Done after pushing `#/home`. The traverse
to `#/detail` shows Detail at Stack Depth 1, and the next Pop asks nothing. "ROUTES: a replace with Settings — its URL is pushed, a new
entry (row C120)" shows the replace. The spec copies the behaviour (R3).

**Proposed fix.** A pop steps the history back (`history.back()`), and the `popstate` that follows is the stack's own, so it must not
reset. Or the pop uses `replaceState` with the page below's URL. A replace uses `replaceState`. Ruling needed on which history a pop
should leave.
