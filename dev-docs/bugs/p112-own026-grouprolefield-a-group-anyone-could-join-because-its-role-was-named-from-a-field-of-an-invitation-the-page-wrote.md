---
id: P112-OWN026-GROUPROLEFIELD
title: The kit had no shape for "several people may all change these records", so the shortest graph named a group's role from a field of an invitation the page wrote, and any account could join any group
status: fixed
commit: 34ce426c1
regression: packages/noodl-editor/tests-unit/validation/ownerFieldGroups.test.ts
severity: high
area: kit / examples + validation (`docs/node-catalog/examples/cloud-members-can-edit-my-records.json`; `packages/noodl-editor/src/editor/src/validation/ownerField.ts`)
found: P112 OWN-026 t2-nodegx-c11 (LEARNINGS #16, #17), 2026-10-24; FIX-06
evidence: /Users/Shared/nodegx-lab/own026-grades/t2-nodegx-c11/grade.json T7, C5.2; -c12/grade.json C11.2
---

DeepSeek built "a second person who can change everything the first can" as a role per group (`<group>-<id>`): a
cloud function took the first invitation naming the caller's address and joined the caller to the role named by the
invitation's own group field, then stamped that group's records with the role. Any signed-in account could create
that invitation with any group's id, so a new account got full access to another group, and a removed member got back
in by posting a new one. Its comment: "No value arrives from the caller, so there is nothing to forge." FIX-05's
`function-trusts-a-field-the-caller-wrote` stayed silent, because the script read `owner` (for another collection).
It found the role primitive by unpacking the kit's tarball and reading `dist/backend/cli.js` for 15 minutes.

Fixed: a new example, `cloud-members-can-edit-my-records`. The group is one person's, its role named from their id;
Join Group puts the caller in the role of the invitation's `owner` (the backend's word), never a group field; Add To
Group creates the group's records as the system, refusing a caller neither the owner nor in the role, with `owner` =
the group's owner and the owner + role in the ACL; Remove Member takes back the caller's own invitation and the
caller's own group's role. Proven on an enforced backend from the Base kit, with a control arm of the measured shape
(which leaks): a forged invitation joins only the forger's own group, members change the records from the page, the
removed member is out and a forged re-invitation does not bring them back.

Said at the write (info, never blocking): `role-named-by-a-field-the-caller-wrote`, a cloud function that grants a
role (Add User To Role with `role` wired, or a `role:` ACL in a script), reads records a caller may create, and builds
the role's name on no line that reads `owner`. Fires on t2-nodegx-c11…c14's function; silent on the 7 template
functions that grant a role (fixed names, collections only a function writes) and on the example.
