---
id: P107-C15
title: Action Dispatcher reports Done when the one action it was handed was refused
status: fixed
commit: 0dd6bdff5
phase: P109
task: ISL-032
severity: medium
area: runtime / Action Dispatcher
found: P107 (the node says what it does) s10, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/t04-action-dispatcher.json "Action Dispatcher runs an action through the Action Handler …" and "the built-in store actions are off by default …" (recorded traces: the refused-on-the-spot Dispatches record `failure`)
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fire Failure, as described".** An action refused straight away no longer counts as accepted, so Done means something ran or was queued. A small change in one place. An app wired to Done for a refused action would stop moving on, which is the point. The question as asked: *"When every action in a Dispatch is refused straight away, should the node fire Failure instead of Done?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 0dd6bdff5 (P109 ISL-032, 2026-10-06), as ruled.** An action refused inside its own Dispatch call (no handler and no wait, a built-in not allowed, the rate limit) is not admitted, so such a Dispatch fires Failure (`action-dispatcher/nothing-admitted`). Outcomes are not claimable, so the recorded trace is the grade.
