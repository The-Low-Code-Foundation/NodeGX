---
id: P111-S2-DBTNOHOME
title: "The training template (and its demo copy) opens on \"No HOME component selected\": its `rootNodeId` names a node that exists in none of its components"
status: fixed
phase: P111
task: SEE-001
severity: high
area: templates — `templates/digital-bricks-training/nodegx.project.json`, `templates/digital-bricks-training-demo/nodegx.project.json`
found: SEE-001's editor drive, 2026-10-19 (a copy opened in the dev editor on a throwaway profile)
evidence: the drive's screenshot (preview "ERROR — No HOME component selected"; App row "unplaced"); after the open, the copy's project file is version 5 with no `rootNodeId` at all
regression: packages/nodegx-node-spec/tests/templates-open-on-a-home.test.ts
kit: none
---

Opened a copy of `templates/digital-bricks-training` to drive SEE-001's honesty number. The preview said **"No HOME
component selected"** and the components panel showed App as *unplaced*. The template's `rootNodeId`,
`ecbe1abf-f593-4c0d-96ea-1e206566b658`, appears in no `nodes.json` of the template; App's only visual root is
`app_root`. Opening the project in 0.4 migrates the file from version 4 to 5 and drops the dangling id, so after one
open the file says nothing about a home. The demo copy carries the same id.

This is P121-S19-NOHOME's shape. Its regression checked two templates against their own App. A census of all 17
template folders found these two dangling and Nightbook without a home (P109-S13-NIGHTBOOKHOME, scheduled).

**Fixed:** both files now say `"rootNodeId": "app_root"`. The new check reads every template's `rootNodeId` against
every node id in its components. It failed on exactly these two before the fix and passes after (18 rows; Nightbook
is held by name and goes red when its row is fixed). `census.json` / `CENSUS.md` move by the 28 bytes of the two
lines. Not driven again after the fix.
