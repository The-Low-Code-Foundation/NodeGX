---
id: P107-C9
title: Create New Array, Create New Object and Set Object Properties answer once for two Do presses in a frame
status: fixed
commit: 86139ddbf
phase: P109
task: ISL-032
severity: medium
area: runtime / Create New Array, Create New Object, Set Object Properties
found: P107 (the node says what it does) s9, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/CollectionNew.json "Two Do pulses in one frame: one array, and an outcome per press" (and NewModel.json, SetModelProperties.json "Two Do in one frame: …")
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "One Done per press".** The work is still done once per frame, but Done fires for every press, as in the similar nodes. A small change in three places. Create New Object still makes one record for two presses, and both Dones name it. The question as asked: *"Should these three nodes fire Done once for each press?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 86139ddbf (P109 ISL-032, 2026-10-06), as ruled.** Each Do mints its token before the coalescing guard, and the frame's callback answers them all: one array / object / write, a Done (or, with nothing bound, a Failure, raised once) per press. The KNOWN_ROWS entries went in 63b7c4e91 (swept into a peer's commit), the runtime half here.
