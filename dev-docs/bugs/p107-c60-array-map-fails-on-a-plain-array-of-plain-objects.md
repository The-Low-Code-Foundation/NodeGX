---
id: P107-C60
title: Array Map cannot map a plain array of plain objects (what a Function outputs) — a property mapping fails with "model.get is not a function"
status: fixed
commit: a6f629a2e
severity: medium
area: runtime / Array Map (`mapcollectionnode.ts` :348 — `m.set(key, model.get(mapping))`)
found: P107 (the node says what it does) s35, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.5; scenario "A script copying a property and computing another, over a PLAIN array …" (packages/nodegx-node-spec/scenarios/Map Collection.json), passing on the interpreter AND the runtime — the spec states the runtime's reading; its records twin maps as described
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Map Collection.json "v2 (C60 fixed): a script copying a property and computing another, over a PLAIN array of plain objects"
---

Array Map runs its script once per row. A string mapping (`map({ title: 'name' })`) copies through `model.get('name')`
(:348), and a plain object has no `get`, so the run fails with `array-map/map-failed`: "The map script failed: model.get
is not a function". A Function node that sets `Outputs.Items = [{…}, …]` hands exactly that. A function mapping is handed
the row as it is, so `o.get('n')` (the default script's own example, :22) fails the same way on a plain object, and `o.n`
works on a plain object but not on a record.

The twin of C59 (Array Filter reads `m.data`). Both nodes assume records and say nothing useful when they get plain objects.

**Plain words:** *"If a Function node outputs a list of plain objects and you wire it into Array Map, any script that
copies a property fails with 'model.get is not a function'. Records work. Should Array Map read a plain object's own
fields too?"*

**Proposed:** read through one helper, as the Array Filter fix would: `isRecord(model) ? model.get(mapping) : model[mapping]`,
and hand a function mapping the record (unchanged). Ship with C59.

**Ruling:** Richard, 2026-10-03: *"Yes, fix both"* (C59 and C60 asked as one). Fixed in s36: a record is read as before, any other row as it is (the sorter's rule). The spec moved with it (Array Filter v3, Array Map v2); control red → treatment green on three seeds and at 10,000 (NSP-012 §6.6).

**Found because:** the only Array Map scenario that copied a property ("A script copying a property and computing another")
handed a plain array, and its trace was this failure from s9 on, on both targets. No scenario or generated run had ever
graded a mapping that worked. A planted "string mapping reads the key instead of the source" would have passed every gate.
