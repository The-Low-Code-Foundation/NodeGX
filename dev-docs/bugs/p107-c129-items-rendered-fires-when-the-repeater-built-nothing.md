---
id: P107-C129
title: A Repeater's Items Rendered fires after every run of its queue, including one that built nothing — at load with no Items bound, after a Refresh that failed, after a Dynamic rebuild with no Script
status: open
severity: low
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `_runQueueOperations` :823-860 counts any operation as work; `_signalItemsRendered` :868-871; the placing's rebuild from `updateTarget` :436-439)
found: P107 NSP-016 s59, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.20; recorded on the runtime target (the s59 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "placed with nothing: Items Rendered all the same (row C129)"
---

**What a person sees.** An author waits for Items Rendered to scroll to the end of a list or measure it, as its description tells
them to ("the only honest moment to measure or scroll the list"). It fires when the page loads, before the Items have arrived — the
Repeater's own start-up rebuild ran, found no Items and built nothing — so the scroll happens on an empty list. It fires again after
a Refresh that failed (no Items, no Template), next to the Failure.

**Where.** `_runQueueOperations` sets `didWork` for any operation it runs. A rebuild that returns at its first check (no Template,
no Items) is an operation, so the queue's run counts as work and `_signalItemsRendered(true)` fires.

**How to reproduce.** Play the `regression:` scenario on the runtime target (and "a Refresh with no Items fails repeater/no-items,
and Items Rendered fires (row C129)"). The spec copies the behaviour (R3).

**Proposed fix.** Count as work only an operation that added or removed a row (or a rebuild that got past its checks), so Items
Rendered follows a list that changed. A ruling first: whether a list cleared to empty should still fire it (it does today, and that
case is arguably right).
