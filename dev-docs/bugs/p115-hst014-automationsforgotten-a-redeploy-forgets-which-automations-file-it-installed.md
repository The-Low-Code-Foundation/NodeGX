---
id: P115-HST014-AUTOMATIONSFORGOTTEN
title: "The Cloudflare deploy rebuilt its record without the installed automations' fingerprint, so every redeploy replaced an edit made on the backend"
status: fixed
phase: P115
task: HST-014
severity: medium
area: "nodegx-backend `cloudflare/deployCloudflare.ts` `deploy()` (the record is rebuilt field by field from the previous one)"
regression: "none in jest (the command's record is not unit-graded); the workerd drive in HST-014 §5.6 is the reading"
found: P115 session 14, 2026-11-07, the first drive of automations carried by a redeploy (the unit suite was green)
fixed: "P115 session 14, 2026-11-07 (Opus 5.5)"
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-014-THE-DEPLOY-COMMAND.md §5.6
---

Found minutes after it was written, by the drive and not by the suite. `applyAutomations` decides from the sha256 of
`nodegx.automations.json` the last deploy installed, kept in `deployment.json` as `automations.local` / `.live`.
`deploy()` builds the new record from the old one by naming each field, and the new field was not named, so every run
read "no record of a file" and, finding the backend different, replaced it. Measured on workerd: a trigger switched
off on the backend, the SAME file redeployed, and the command answered *"replaced with the project's … changed
trigger"*: the person's edit gone.

**Fixed:** the record carries `automations` over. Re-driven: the same sequence answers *"nodegx.automations.json is
unchanged since the last deploy, so the backend keeps its own, which were edited there since: trigger … differs"*,
and the trigger stays off.

A rule worth keeping from it: a record rebuilt by naming its fields drops any field added later. The jest suite
graded `applyAutomations` with the fingerprint passed in by hand, which is the one step that cannot see this.
