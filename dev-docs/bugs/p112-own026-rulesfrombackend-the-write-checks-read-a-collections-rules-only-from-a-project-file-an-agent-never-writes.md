---
id: P112-OWN026-RULESFROMBACKEND
title: The write checks read who may write a collection only from the project's nodegx.security.json, which set_collection_permissions never writes, so an agent's locked collection still read as "not known"
status: fixed
commit: PENDING
regression: packages/noodl-mcp/tests/own026GroupWrite.test.ts
severity: low
area: noodl-mcp (`packages/noodl-mcp/src/validate.ts` `projectCollectionRules`)
found: P112 OWN-026 FIX-06, 2026-10-24 (measuring the new infos)
evidence: t2-nodegx-c11…c15 have no project rules file; their rules are in `home/.noodl/backends/*/security.json`
---

FIX-05's `function-trusts-a-field-the-caller-wrote` is silent when the rules say no caller writes a collection, and
FIX-06's infos read the same rules. In every test-2 build the rules lived only in the bound backend's `security.json`
(written by `set_collection_permissions`), so the checks read "not known" even after the agent had locked a collection.

Fixed: with no project file, `projectCollectionRules` reads the bound backend's `security.json`
(`metadata.cloudservices.instanceId` under the backends folder; an id with a path in it is refused). The project's own
file still wins.
