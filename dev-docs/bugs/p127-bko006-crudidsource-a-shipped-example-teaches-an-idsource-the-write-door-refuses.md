---
id: P127-BKO006-CRUDIDSOURCE
title: The record CRUD example teaches `idSource "value"`, which Update and Delete Record do not offer, and its gate excused it as context
status: fixed
severity: medium
area: "docs/node-catalog/examples/cloud-record-crud.json (served from node-catalog-enriched.json); noodl-mcp tests/npmauditExampleInvalid.test.ts CONTEXT skipped the whole example"
found: P127 BKO-006, 2026-10-27, the book club brief
evidence: "MEASURED: the stranger copied the example; create_component refused 'parameter \"idSource\" (enum) \"value\" is not one of this port's options → available: explicit, foreach'. The gate listed cloud-record-crud as refused for context (its collection) and never read why."
kit: mcp
regression: packages/noodl-mcp/tests/npmauditExampleInvalid.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

Fixed: the example says `explicit` (catalog regenerated), and every example the gate excuses for context is now
checked to be refused for no `invalid-parameter-value`. Red before the fix on exactly this example, of 12.
