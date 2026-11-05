---
id: P115-HST006-NOFILESRULE
title: "MCP: no tool sets who may upload, read or delete files, so an agent cannot make an app where only the owner uploads"
status: open
severity: medium
area: "noodl-mcp backend tools (`packages/noodl-mcp/src/tools/backendTools.ts`): `set_collection_permissions` refuses system collections and takes no `files`; `configure_backend_files` sets size, types, driver, presets and sweep only. The rule lives in `security.json` → `files: { upload, read, delete }` (`packages/nodegx-backend/src/security/model.ts` :759, default `upload: authenticated`)"
found: P115 HST-006 session 7, 2026-11-05, adding the owner's upload to Fixture C through the MCP
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §8.7
---

Fixture C's owner uploads one file for the readers. The app's rule should be "only the owner uploads"
(`files.upload: role:owner`), as its collections are. Through the MCP there is no way to say it: `find_tools` for
"who may upload files permission" reveals `configure_backend_files` (no rule field) and nothing else, and
`set_collection_permissions` refuses `_Files` as a system collection. So an MCP-written app keeps the default:
**any signed-in account may upload**, which in an app with open sign-up means anyone on the internet who signs up.

The only ways in today are the admin dashboard's permissions page or a hand edit of `nodegx.security.json`, and the
project's agent file tells an agent never to hand-edit what the server owns. Fixture C was left on the default and
says so (MUST line 8 is about the owner's upload opening, not about others being refused).

Wanted: `set_collection_permissions`-shaped rules for files (`upload`, `read`, `delete`), written into the project's
`nodegx.security.json` as the collection rules are.
