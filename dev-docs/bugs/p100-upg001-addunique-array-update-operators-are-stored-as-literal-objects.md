---
id: P100-UPG001-ADDUNIQUE
title: Array update operators (AddUnique, Add, Remove) are stored as the operator object instead of applied
status: open
severity: medium
area: backend / Parse wire (PUT /classes)
found: P100 UPG-001 s3 (§3.6b), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.6b
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
