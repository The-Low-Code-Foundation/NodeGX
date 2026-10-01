---
id: P107-C15
title: Action Dispatcher reports Done when the one action it was handed was refused
status: needs-ruling
severity: medium
area: runtime / Action Dispatcher
found: P107 (the node says what it does) s10, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C15) — the row names how it is reproduced and pinned
---

Action Dispatcher reports Done when the one action it was handed was refused.

**Where:** Action Dispatcher `done` / `failure` (actiondispatchernode.ts `doDispatch`; action-dispatcher.ts :453-501)

**What the wire shows:** **a Dispatch whose only action is refused reports Done** — `dispatch()` counts an action admitted once QUEUED, and the unknown / not-allowed refusal happens inside the same call's pump (:573-578) — where `failure`'s sentence says "Fires when a Dispatch admitted nothing at all, because every action in it was refused". In the trace (`t04` ad01 frame 3, ad02 frame 2): `done` beside `refused`

**Plain words:** *"Dispatch says Done even when the one action it was handed was refused on the spot."*

**Proposed:** count admitted after the pump (refused-in-call ⇒ not admitted) — or rewrite `done`/`failure` to say queued

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
