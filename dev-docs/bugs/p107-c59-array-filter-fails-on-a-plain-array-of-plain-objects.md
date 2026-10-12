---
id: P107-C59
title: Array Filter cannot filter a plain array of plain objects (what a Function outputs) — every filtered run fails with "Cannot read properties of undefined"
status: fixed
commit: a6f629a2e
severity: medium
area: runtime / Array Filter (`filtercollectionnode.ts` :508 — `applyFilter(m.data, filter)`)
found: P107 (the node says what it does) s35, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.5; scenario "A plain array of plain objects (what a Function outputs) filtered by a = 2 …" (packages/nodegx-node-spec/scenarios/Filter Collection.json), passing on the interpreter AND the runtime — the spec states the runtime's reading. Measured in a real two-node graph (a source node → Array Filter, `kind = fern`): an Array of records → Count 2; the same three rows as a plain JS array → Count 0 and Error "The filter could not be applied: Cannot read properties of undefined (reading 'kind')"
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Filter Collection.json "v3 (C59 fixed): a plain array of plain objects (what a Function outputs) filtered by a = 2"
---

Array Filter tests each row's `data` (`applyFilter(m.data, filter)`, :508). A record has `data`; a plain object does not, so
the first row throws, the run fails with `array-filter/filter-failed`, Count goes to 0 and Error reads "The filter could not
be applied: Cannot read properties of undefined (reading '<field>')". A Function node that sets `Outputs.Items = [{…}, …]`
hands exactly that: a plain array of plain objects (simplejavascript.ts does not wrap it). Sorting without a filter works,
because the comparator reads `data` only from a record (:95-117); the filter never checks.

The message names neither the cause nor the fix, and Filter Records' sort has the same shape on non-records (C43).

**Plain words:** *"If a Function node outputs a list of plain objects and you wire it into Array Filter with a filter set,
the filter fails with 'Cannot read properties of undefined'. Records work. Should Array Filter read a plain object's own
fields too, as the sort already does?"*

**Proposed:** `applyFilter(isRecord(m) ? m.data : m, filter)` — the sort's rule, one line. Then the failure message for a
row that is not an object at all (a number in the array) stays as it is.

**Ruling:** Richard, 2026-10-03: *"Yes, fix both"* (C59 and C60 asked as one). Fixed in s36: a record is read as before, any other row as it is (the sorter's rule). The spec moved with it (Array Filter v3, Array Map v2); control red → treatment green on three seeds and at 10,000 (NSP-012 §6.6).

**Found because:** the original scenario "A plain array filtered by a = 2: one record, Filtered, First Item Id and Count"
never showed one record. Its trace was this failure from s15 on, on both targets, and the name was never read against it.
Seven of the eleven hand scenarios fed plain arrays through a filter, so equals, regex and the uncompilable-pattern path
were graded only on this failure until s35 moved them onto records.
