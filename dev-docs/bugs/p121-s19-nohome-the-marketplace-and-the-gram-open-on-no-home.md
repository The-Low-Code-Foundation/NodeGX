---
id: P121-S19-NOHOME
title: The marketplace and the gram open in the editor on "No HOME component selected"
status: fixed
commit: 9168a171d
severity: high
area: template / templates/marketplace, templates/gram (generators packages/noodl-mcp/tests/two003Template.ts, two005Template.ts)
found: P121 s19, 2026-10-16, driving R12 in the editor
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/shots/two007-r12-1-no-home-before.png, two007-r12-2-home-after.png
regression: packages/noodl-mcp/tests/two003Template.test.ts
---

Opened a copy of `templates/marketplace` in the dev editor (a throwaway profile, `NOODL_USER_DATA_DIR`): the preview
showed **"ERROR — No HOME component selected. Click Make home as shown below."** That is a builder's first sight of
the template.

The editor finds the home only from the project file's `rootNodeId` (`projectmodel.ts:275`). Census of the 17
`templates/*/nodegx.project.json` on 2026-10-16: 14 carry one; **`marketplace`, `gram`** (this phase's) and
`nightbook` (P109-S13-NIGHTBOOKHOME, not ours) don't. Both generators wrote the skeleton and never named the home;
the template specs compared the files byte for byte with a fresh build, so a missing field was matched by a missing
field. The render harness every drive uses picks the page itself, so 13 drives never saw it.

**Fixed (working tree, s19):** both generators call the door's `set_project_settings { home: 'App' }` after the
plan (as `tpl001`/`tpl003`/`tpl005`/`tpl006`/`cg003` do); both regenerated (only `nodegx.project.json` moved, gained
`rootNodeId: "appRoot"`; every other file's hash unchanged). New check in `two003Template.test.ts` and
`two005Template.test.ts`: the project's `rootNodeId` is one of App's `visualRoots`, red before the regeneration
(2 of 2), green after (13/13). Driven again: the editor opened the fixed copy on the shop's home page.

Seen on the way, not filed: opening either template shows "This project was updated for NodeGX 0.4" and writes a
`<project>.before-0.4` folder beside it. Every template's project file says `version: "4"`, so this is every
template's, not this phase's.
