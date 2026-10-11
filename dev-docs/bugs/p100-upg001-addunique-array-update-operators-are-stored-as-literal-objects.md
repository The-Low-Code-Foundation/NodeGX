---
id: P100-UPG001-ADDUNIQUE
title: Array update operators (AddUnique, Add, Remove) are stored as the operator object instead of applied
status: fixed
commit: 421cfc5a6
phase: P109
task: ISL-039
severity: medium
area: backend / Parse wire (PUT /classes)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
regression: packages/nodegx-backend/tests/isl039-backup-keeps-every-setting.test.ts "ADDUNIQUE: an array operator is applied on a create, refused by name on an update, and never stored as the object"
---

`PUT /classes/<C>/<id>` with `{tags: {__op: 'AddUnique', objects: ['x']}}` does not add `x` to the array. It
replaces the field with the literal object `{"__op":"AddUnique",…}`, so the array that was there is lost. Any
Parse SDK client that sends the standard array operators corrupts the field.

**Where:** `packages/nodegx-backend/src/server/parse-wire.ts:136-163` `extractOps`. Only `Increment`,
`AddRelation` and `RemoveRelation` are recognised. Every other `__op` falls into `plain` and is saved as data.
NodeGX's own `ParseWireAdapter` sends only those three, so the editor's nodes do not reach this. An outside
Parse client does.

**How it was found:** P100's 0.2.4 backend drive. It behaves the same on HEAD (the code above). Not re-run since
2026-09-23.

**Proposed:** apply `Add`, `AddUnique`, `Remove` and `Delete` (read-modify-write of the JSON column), or refuse
any unknown `__op` with a 400 that names it rather than storing it. Refusing is the smaller fix and stops the
data loss. Small.

**Fixed (P109 s41, 2026-10-11, ISL-039), on the ledger's smaller route.** Re-measured at HEAD first: red on update AND
on create, which also saved every operator literally. `normaliseParseOps` in `parse-wire.ts` runs before anything is
written:
- **Create:** `Add`/`AddUnique` become the array (de-duplicated for `AddUnique`), `Remove` an empty one, `Increment`
  its amount, and `Delete` drops the field. There is nothing to merge with, so each is exact.
- **Update:** `Delete` clears the field (Parse's `unset`). `Add`, `AddUnique` and `Remove` are refused with a 400 that
  names the operator and says to send the whole list. Applying them needs a read and a write-back that two clients
  can race; that is a ruling-sized change if anyone asks for it.
- An unknown `__op` is a 400 naming it, and an upsert takes plain values only. NodeGX's own clients send only
  `Increment`, `AddRelation` and `RemoveRelation` (grep of the runtime, the viewers and the export), and all three keep
  their paths.
- Graded: the arm was red on the old `parse-wire.ts`. The five backend specs that send `__op`, batch or upsert are
  121 / 121.
