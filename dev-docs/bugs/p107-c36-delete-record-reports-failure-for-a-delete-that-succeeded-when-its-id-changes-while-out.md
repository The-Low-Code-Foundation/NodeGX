---
id: P107-C36
title: Delete Record reports Failure for a delete that succeeded when its Id changes while the delete is out
status: needs-ruling
severity: medium
area: runtime / Record family — Delete Record (`DeleteDbModelProperties`)
found: P107 (the node says what it does) s22, 2026-10-02 — the 10,000-sequence deep run (19 of 10,000 at seed 20728)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.5 (row C36); the known row in packages/noodl-runtime/test/node-spec/conformance.test.ts; scenario `DeleteDbModelProperties.json` "the binding cleared while the delete is out"
---

Delete Record reports Failure for a delete that succeeded when its Id changes while the delete is out.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/deletedbmodelpropertiesnode.ts` (:69-72): the success
callback reads `internal.model` LIVE — `internal.model.notify('delete')` — instead of the record the call was made for.
Its siblings capture it (`const model = internal.model`, Update Record :158; the relation nodes).

**What the trace shows (the deep run, then a scenario):** Class `Lesson`, Id `r1`, Do; while the delete is out, Id is
set to `''` (or Id Source to From repeater outside a Repeater) → the backend deletes `r1`, then the success throws
`Cannot read properties of undefined (reading 'notify')`; the REST adapter's promise chain hands the throw to `error`
(RestDataAdapter.ts :531), so Error shows that TypeError text and every press reports Failure. On NodeGX's own backend
(the legacy `/classes` wire, an `XMLHttpRequest` callback) the throw is uncaught instead and the presses are never
answered. If the Id moved to ANOTHER record instead, THAT record is told it was deleted (any Record / Query Records
watching it hears `delete`) and the one really deleted is not.

**Plain words:** *"If a Delete Record's Id changes while it's still deleting, the delete still happens, but the app says
it failed with a JavaScript error message — or, if the Id moved to another record, the app thinks the wrong record was
deleted."*

**Proposed:** capture the record at the call (`const model = internal.model` before `cloudstore.delete`) and notify that
one, as Update Record does. A behaviour change; ships alone. The spec already states the fixed reading (Done); the
known row goes in the same commit as the fix.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules.
