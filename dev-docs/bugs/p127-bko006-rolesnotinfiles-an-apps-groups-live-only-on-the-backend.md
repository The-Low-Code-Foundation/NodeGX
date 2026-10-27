---
id: P127-BKO006-ROLESNOTINFILES
title: The groups an agent makes (create_backend_role) are on the backend only; the project's files do not say the app has a "staff" group
status: open
severity: low
area: "noodl-mcp `create_backend_role` / `delete_backend_role` write the backend only; `nodegx.security.json` has no groups"
found: P127 BKO-006, 2026-10-27, the repair shop brief
evidence: "MEASURED: the stranger's create_backend_role { name: 'staff' }; neither nodegx.security.json nor any project file names the group; the rules and the function graph refer to it by name."
owner: none
launch: beta
---

Low: who belongs to a group is data and belongs on the backend, and a group comes back the first time someone is put
in it. What the files lose is that the app has one, and its description.
