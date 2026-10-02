---
id: P107-C43
title: Filter Records never answers a Filter press when its Sorting meets rows that are not records — no Error, no Failure
status: needs-ruling
severity: low
area: runtime / Filter Records (`FilterDBModels`) — the run (`scheduleFilter`)
found: P107 (the node says what it does) s25, 2026-10-02 — 4–8 of 200 generated sequences per seed
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.14 (row C43); the known row in packages/noodl-runtime/test/node-spec/conformance.test.ts; scenarios/FilterDBModels.json "a Sorting over two rows that are not records …"
---

Filter Records applies its filter inside a `try` that reports `filter-records/filter-failed` (`filterdbmodelsnode.ts`
:461-481), but sorts AFTER it, outside (:486-491). A Sorting over two or more rows that are not records (a plain array of
objects on Items) throws `a.get is not a function` out of the scheduled run. The press's token was drained before the
run (:436-437), so the press gets no outcome at all; Error and Failure stay silent; the scheduler only logs it.

**What the runtime does (measured s25):** Items `[{n:1},{n:2}]`, Sorting `n` descending, Filter pressed: nothing on
Error, no Failure, no Done. The same rows with a Filter instead of a Sorting fail properly ("The filter could not be
applied: model.get is not a function") — the control.

**Plain words:** *"If Filter Records is handed something that isn't a list of records and has a sort set, pressing
Filter does nothing at all — no error, no failure signal."*

**Proposed:** move the sort inside the same `try` (one line), so it fails the way the filter does.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules. The spec states the sensible reading (the
filter's failure); the runtime's is the known row.
