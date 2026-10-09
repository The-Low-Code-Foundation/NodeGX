---
id: P107-C131
title: A list whose items repeat an id draws that item's row after the row that follows it, and every later copy of the same list (a Refresh) takes that row down and builds it again
status: fixed
commit: 21107c848
phase: P109
task: ISL-049
severity: low
area: runtime / Repeater and Array (packages/noodl-runtime/src/collection.ts `set` :584-700 — one record per id; the same plain object is the same record (F50) and its fields are written back on every copy, so a second copy finds the record out of place and removes and re-adds it; foreach.tsx copies a placed list twice, its start-up rebuild :771 and `scheduleCopyItems` :895-921)
found: P107 NSP-016 s59, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.20; recorded on the runtime target (the s59 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "two rows with one id are one row, labelled by the last and drawn at the first one's place; a Refresh keeps it there (row C131)"
---

**What a person sees.** Items `[{id:'a', label:'A'}, {id:'a', label:'A2'}, {id:'b', label:'B'}]` show two rows — that one id is one
record is by design — but in the order B, A2, not A2, B. A Refresh keeps B, A2, and the A2 row is a new component each time (anything
it held is gone).

**Where.** `collection.set` converts each plain item to a record by id; the second item with id `a` writes its fields over the
first. The first copy of the list appends `a`, then `b`. The second copy of the SAME array (the placing's rebuild and its copy both
run) writes `a`'s fields back from each item in turn and then walks the list `[a, a, b]` against `[a, b]`: at place 1 it finds `b`
where `a` is expected, removes `a` and re-inserts it at 1 — after `b`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** In `set`, drop repeated records from the new list before the diff (the first place wins), so the order is the
items' order and a second copy of the same list moves nothing. A ruling first: should a repeated id be one row (today) or two?

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "One row per id, at the first item's place, kept across a Refresh".**

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed and ruled.** `collection.ts` `set` drops a record that repeats in the new list
before the diff, by id (the diff's own key), the first place winning; conversion still writes each item's fields in turn, so the last
item labels the record. A list already refused to hold a record twice (`add`, `addAtIndex`), so this only makes the diff agree with
it. The spec world's `registry.ts` `set` does the same. For Each spec v8. Every spec that lives by the registry (32) conforms on the
runtime at seeds 13 and 20732 with its mutants; graph scenarios 91 / 91; noodl-runtime 3,077 / 3,077 (`isl-049-c131-one-row-per-id
.test.js` added: red on the base `collection.ts` on exactly its positive case). For Each control (the base `collection.ts`) red on
exactly the 1 scenario the fix moved. **The export (P18) has its own list diff:** not checked.
