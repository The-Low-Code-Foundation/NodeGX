---
id: P107-C12
title: Consume on Receive Event has never stopped a Global event
status: needs-ruling
severity: medium
area: runtime / Receive Event
found: P107 (the node says what it does) s10, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C12) — the row names how it is reproduced and pinned
---

Consume on Receive Event has never stopped a Global event.

**Where:** Receive Event `consume` (eventreceiver.ts :51-62, :142-143; nodecontext.ts :1148)

**What the wire shows:** **Consume = Always has never applied to a Global event**: the global path emits to every listener and `onEventReceived` drops `handleEvent`'s return — scenario `t05` "Consume = Always on one receiver stops a global event…" records both receivers firing

**Plain words:** *"Consume says it stops an event reaching other receivers on the channel. For a Global event — the default — it never has. Make it stop, or say it applies to Parent / Children / Siblings only?"*

**Proposed:** behaviour: honour it on the global path (the emitter's listeners in order, stop on the first `true`) — or rewrite the sentence

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
