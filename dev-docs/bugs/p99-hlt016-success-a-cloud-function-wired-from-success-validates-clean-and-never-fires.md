---
id: P99-HLT016-SUCCESS
title: A Cloud Function wired from `success` passes validation with 0 errors and never fires
status: open
severity: high
area: editor / validator (Cloud Function)
found: DBT stream TASK-L177 drive, 2026-09-30; recorded in P99 HLT-016 ("not filed as a row")
evidence: dev-docs/tasks/phase-99-the-ones-nobody-owned/HLT-016-A-FUNCTION-CANNOT-WRITE-SAFELY-TWICE.md (the ✅ (a) note, "Found beside it"); commit 30fefc55d; templates/digital-bricks-training/tools/check-write-functions.mjs :86-90
---

A client Cloud Function's outcome ports are `done` and `failure` (ERG-001 renamed `Success` to `Done`). A wire from
`success` — the old name, and the one an agent reaches for — is accepted by `validate_project` / the MCP write gate
with 0 errors, and at run time it never fires: the page sits on "Saving…" for ever and only the browser console says
*"doesn't have a port named success"*.

**Where:** `packages/noodl-editor/src/editor/src/validation/rules/nonexistentPort.ts` :126 — a port the catalog does
not list is skipped, never an error, when `catalog.hasRuntimeDynamicPorts(node.type)`. `CloudFunction2`'s catalog entry
declares `runtime-discovered` + `editor-adapter` (its other ports mirror the called function's Request / Response), so
every unknown port on it — `success` included — is waved through. Read at HEAD 2026-10-01: unchanged.

**How to reproduce:** a `CloudFunction2` node with a connection `fromProperty: "success"` into anything; validate →
0 errors; preview → nothing fires. The DBT template now guards itself with its own check
(`check-write-functions.mjs`); the product does not.

**Proposed:** for `CloudFunction2`, resolve the targeted `__cloud__/<name>` component and check the wire against its
Response ports plus the static ones (the validator holds the project); at the least, error on the renamed outcome names
(`success`) on any node whose static ports carry `done`. Small to medium.
