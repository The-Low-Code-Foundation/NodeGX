---
id: P107-C14
title: Action Dispatcher's Waiting For keeps the refused type after the wait expires
status: fixed
commit: 0dd6bdff5
phase: P109
task: ISL-032
severity: low
area: runtime / Action Dispatcher
found: P107 (the node says what it does) s10, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/t04-action-dispatcher.json "Waiting For goes blank once the wait for a handler expires and the action is refused"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C14) — the row names how it is reproduced and pinned
---

Action Dispatcher's Waiting For keeps the refused type after the wait expires.

**Where:** Action Dispatcher `waitingFor` (action-dispatcher.ts :601-634 `park`/`unpark`, :894-905 `refuseEntry`)

**What the wire shows:** **Waiting For stays on the refused type after the wait expires**: the expiry path flags no queue change, so the output is never re-sent — a label wired to it reads the refused type until the next queue change; `t04` "Waiting For goes blank once the wait…"

**Plain words:** *"The description says blank when nothing is waiting; after the wait expires it is not blank."*

**Proposed:** `notifyQueue()` in `unpark` (one line), ships alone

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Clear it when the wait ends".** The output goes blank as its description says. A one-line change. Nothing else in the node moves. The question as asked: *"Should Waiting For go blank as soon as the wait runs out?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 0dd6bdff5 (P109 ISL-032, 2026-10-06), as ruled.** `unpark` flags the queue change when a wait ends, so Waiting For is sent blank on expiry.
