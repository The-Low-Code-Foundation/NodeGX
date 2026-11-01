---
id: P123-GH-NOGROUPS
title: Studio cannot make a group or put a person in one: the User table shows a groups column nobody can change
status: fixed
commit: nodegx-studio bd4fff1
severity: high
area: "nodegx-studio / Data → Privacy (renderRoles), App data → User (openPerson)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31): *"there appears to be a new 'groups' concept when you create a user … I can see the groups column in the user table, but when I open a user I can't edit it. it seems in general that privacy is another 'the agent does it' page"*.

Measured on a copy of Greenhouse: Privacy's Groups card lists groups and counts, with no way to make one; a person's drawer has no groups field; so a type's rule can never be "one group only" from Studio. The backend has every route it needs (`/admin/roles`, `/admin/roles/<name>/users`, used by its own admin app's Roles page).

## Fixed (s35, 2026-10-31; landed 2026-11-01)

Privacy makes and deletes groups and lists their people; a person's panel in App data → User ticks their groups. Privacy also draws the backend manager's own Permissions grid, and *Backend manager ↗* opens `/_admin` signed in. Gate: `check:data` 91/91 ("groups, made and given people in Studio"). Every Studio gate green on 2026-11-01, run one at a time.
