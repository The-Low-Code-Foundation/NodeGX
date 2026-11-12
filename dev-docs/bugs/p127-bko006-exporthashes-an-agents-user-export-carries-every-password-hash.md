---
id: P127-BKO006-EXPORTHASHES
title: An agent's export of the user list carries every person's password hash into its conversation
status: fixed
severity: high
area: "nodegx-backend `GET /admin/export/:collection` (`server/admin-backups.ts` → `backup/dataio.ts exportCollection`), read by noodl-mcp `export_backend_collection`: lossless, so `_hashed_password` and every `_` field went out, against `users/accountColumns.ts` ('never shown at all … hidden by pattern, everywhere')"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 10)
evidence: "MEASURED in the transcript: export_backend_collection { collection: '_User', format: 'csv' } answered a header 'objectId,createdAt,updatedAt,ACL,username,email,_hashed_password,disabled,adminAccess,emailVerified' and every row's hash. The agent wanted one id."
kit: core
regression: packages/nodegx-backend/tests/p127-export-hides-storage.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

Fixed: the HTTP export leaves out every field whose name begins with `_`, in both formats and in the schema it
carries. The CLI's export (a lossless copy for a backup or a move) still carries them. Live once the backend is
released with `@nodegx/mcp`.
