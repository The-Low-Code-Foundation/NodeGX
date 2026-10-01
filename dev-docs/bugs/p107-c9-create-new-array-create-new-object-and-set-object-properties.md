---
id: P107-C9
title: Create New Array, Create New Object and Set Object Properties answer once for two Do presses in a frame
status: needs-ruling
severity: medium
area: runtime / Create New Array, Create New Object, Set Object Properties
found: P107 (the node says what it does) s9, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C9) — the row names how it is reproduced and pinned
---

Create New Array, Create New Object and Set Object Properties answer once for two Do presses in a frame.

**Where:** Create New Array (:73-75), Create New Object (:49-55), Set Object Properties (modelcrudbase.ts :538-543)

**What the wire shows:** two `Do` presses in one frame: ONE outcome; Array's Fetch, Set Variable's Do and Array Filter's Filter report one PER press (:294-300, :137-145, :411-419)

**Plain words:** *"Three Do nodes answer once for two presses in a frame; their siblings answer twice. ERG-001 §4 says once per press. Make the three report per press?"* — the spec follows the contract; 79 / 51 / 59 sequences counted

**Proposed:** fix the three, alone

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
