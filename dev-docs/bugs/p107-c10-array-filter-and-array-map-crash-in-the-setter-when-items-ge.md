---
id: P107-C10
title: Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object
status: needs-ruling
severity: medium
area: runtime / Array Filter, Array Map
found: P107 (the node says what it does) s9, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C10) — the row names how it is reproduced and pinned
---

Array Filter and Array Map crash in the setter when Items gets a number, boolean or plain object.

**Where:** Array Filter (:343), Array Map (:233)

**What the wire shows:** `Items` handed a number, a boolean or a plain object THROWS in the setter (`collection.on is not a function`) — a wire can carry any of them

**Plain words:** *"A non-array on Items crashes the node instead of refusing."* 21 / 42 counted

**Proposed:** guard `on` (a `Failure` on the next run, or treat as no array)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
