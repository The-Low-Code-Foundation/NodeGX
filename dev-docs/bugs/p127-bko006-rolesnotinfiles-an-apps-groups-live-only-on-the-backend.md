---
id: P127-BKO006-ROLESNOTINFILES
title: The groups an agent makes (create_backend_role) are on the backend only; the project's files do not say the app has a "staff" group
status: fixed
severity: low
area: "noodl-mcp `create_backend_role` / `delete_backend_role` write the backend only; `nodegx.security.json` has no groups"
found: P127 BKO-006, 2026-10-27, the repair shop brief
evidence: "MEASURED: the stranger's create_backend_role { name: 'staff' }; neither nodegx.security.json nor any project file names the group; the rules and the function graph refer to it by name."
owner: Beta sweep s18 (2026-10-27)
regression: packages/nodegx-backend/tests/admin-app/roles-view.test.tsx "a backend with none of them: the page names both, and Make staff makes it"
launch: beta
---

Low: who belongs to a group is data and belongs on the backend, and a group comes back the first time someone is put
in it. What the files lose is that the app has one, and its description.

**Fixed where the walk meets it (Beta sweep s18, 2026-10-27).** Read first: the files already say the app has the
group wherever a rule uses it (`role:staff` in `nodegx.security.json`); what a server started from the files lacks
is the role itself, and its manager's Roles page then said "No roles yet" and nothing about staff, so the owner had
to know to make a role spelled exactly `staff`. Now the Roles page reads the stored rules (`namedRoles`,
`roleUses.ts`) and names each role they use that the backend lacks, with a **Make staff** button (the existing
`POST /admin/roles`). Admin specs 7/7 (4 new; with the notice removed, the page arm is red), neighbours 39/39.

**Not built, on purpose:** a `roles` list in `nodegx.security.json`. `validateSecurityConfig` refuses an unknown
top-level key and provisioning refuses an invalid policy file, so a project written by a newer agent would be refused
by an older backend (session 10's engine-flag trap). Nor a backend that makes every named role at start: a role the
owner deleted would come back at the next restart. **Left:** a role no rule names (used only by a function graph's
Get User Roles check), and a role's description. Reaches a person with the next backend release (the admin app is
bundled in it).
