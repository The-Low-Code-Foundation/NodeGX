---
id: P107-C120
title: With Use Routes, a Pop pushes the page below as a new history entry, so the browser's Back then shows the page just popped, as the only page, with a Pop that does nothing
status: fixed
commit: 08d62276b
phase: P109
task: ISL-048
severity: medium
area: runtime / Component Stack (navigation-stack.tsx `back` end callback :1068-1078 calls `_updateUrlWithTopPage`, which always calls `history.pushState`; `replaceAsync` :889 the same)
found: P107 NSP-016 s58, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.19; recorded on the runtime target (NSP-016 s58 probe traces, each beside a control), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "ROUTES: a push, then its Pop — the history steps back at the transition's end, over the entry the push made; its popstate resets nothing (row C120)"
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

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as leaned: "A Pop steps the browser's history back".** The app's Back and the browser's Back then agree. The page change that follows must not reset the stack (see C119); a Replace overwrites the current entry.

**Fixed 2026-10-09 (P109 ISL-048 s36, `08d62276b`, Page Stack spec v18), as ruled.** A push records whether it made a history entry; its Pop's end calls `history.back()` over it and counts that Back as the stack's own, so its `popstate` resets nothing. A page whose push made no entry (pushed with Use Routes off) has the address replaced. A Replace writes its URL with `history.replaceState`. On any `popstate`, a stack whose address already names the page and parameters on its top does nothing, so a parent stack does not rebuild when a child pops. Graded on the runtime at seeds 13, 20732, 20735 and 7 (162/162, 0 divergences); HEAD's runtime file is red on exactly 16 scenarios. Edge recorded, not built: a Back of its own that lands on the first entry fires nothing, so its count waits for the next `popstate`; the world can make that (a traverse to the current address alone resets its history), a browser cannot from the stack's own pushes.
