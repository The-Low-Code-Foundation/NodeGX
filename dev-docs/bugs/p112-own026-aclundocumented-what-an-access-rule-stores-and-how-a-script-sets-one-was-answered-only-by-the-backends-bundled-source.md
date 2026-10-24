---
id: P112-OWN026-ACLUNDOCUMENTED
title: What a record's access rules store (user, role:, *), that rules a page sends replace the creator-only default, and how a cloud function's script sets them were answered only by the backend's bundled source, and Create Record's docs said a record with no rules is public
status: fixed
commit: PENDING
regression: packages/noodl-mcp/tests/own026GroupWrite.test.ts
severity: medium
area: kit / node docs (`docs/node-catalog/enrichment/newdbmodelproperties.json`, `setdbmodelproperties.json`, `javascriptfunction.json`, `noodl.cloud.addusertorole.json`)
found: P112 OWN-026 t2-nodegx-c11 trace (turns 24–109), 2026-10-24; FIX-06 C
evidence: /Users/Shared/nodegx-lab/own026/t2-nodegx-c11/sittings/1/agent.jsonl
---

`list_node_types` for "acl" answered nothing; Create Record's `accessControl` port said "With no rules the record gets
the class default (public) permissions", where the backend's default collections give it to its creator alone. The
model then grepped `cli.js` for `validateAclShape`, `creatorOwns`, the template ACL, `Records.save` and the role keys,
and probed the backend with its admin token.

Fixed: Create Record's and Update Record's summaries name the ACL (so the search finds them); the port doc says rules
replace the creator-only default; the runtime behaviour says what keys the ACL holds and how a role rule is set; the
Function's patterns give the cloud script API (`Noodl.Records.query/create/save/delete` with `acl`, running as the
system); Add User To Role's pattern gives the group-per-owner shape. Each links `cloud-members-can-edit-my-records`.
