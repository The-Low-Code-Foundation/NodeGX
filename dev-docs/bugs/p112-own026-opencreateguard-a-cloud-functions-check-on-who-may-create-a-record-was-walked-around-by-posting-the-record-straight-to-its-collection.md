---
id: P112-OWN026-OPENCREATEGUARD
title: A cloud function that refused uninvited callers created its records in a collection any signed-in caller could create into directly, and nothing said the check guarded only the function's own door
status: fixed
commit: PENDING
regression: packages/noodl-editor/tests-unit/validation/ownerFieldGroups.test.ts
severity: high
area: validation + doctrine (`packages/noodl-editor/src/editor/src/validation/ownerField.ts`; `packages/noodl-mcp/src/backend/enforcedRulesNote.ts`)
found: P112 OWN-026 t2-nodegx-c15 (C15.2), 2026-10-24; FIX-06 (added by the lab)
evidence: /Users/Shared/nodegx-lab/own026-grades/t2-nodegx-c15/grade.json C15.2
---

The function refused an uninvited caller ("Only a … this family has invited can …"), but its collection kept the
default create rule, so a direct `POST /classes/<collection>` with the same fields from any session was stored.

Fixed: `function-guards-an-open-collection` (info, never blocking): a cloud function that answers per caller, has a
failure Response, and creates records (Create Record, or `Noodl.Records.create("X", …)`) in a collection whose create
rule lets any signed-in caller create. It names `set_collection_permissions` with `create: "nobody"`; a cloud function
runs as the system and still creates (measured on the kit's backend: a direct POST then answers 403, the function 200).
Fires on c15's function; silent on all 78 template functions. The example `cloud-members-can-edit-my-records` asks for
the rule, and the enforced-rules note and the backend doctrine say it.
