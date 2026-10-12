---
id: P108-S7-UPGRADEDRIVE
title: The packaged upgrade drive's robot rename no longer saved (a stale drive step, not the game)
status: fixed
commit: 106953c10
severity: low
area: dev-docs garden-desktop / drive-upgrade.js (the packaged-app drive)
found: P108 s7, 2026-10-01 (the Mac app built for IW-009: verdict FAIL — family1, family2, islandBackup)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-009-THE-KIDS-VERDICT.md §5
---

`drive-upgrade.js` renames the robot on My robot by script (focus, the native value setter, input + change, blur) and
then reads the store. On the session-7 build the store kept the old name, so three clauses failed and the verdict was
FAIL — on 2026-10-01 in session 5 the same drive passed 10/10. Measured on the deployed web build: the scripted way left
the store unchanged in BOTH of My robot's name boxes, after a full page load and after a tab tap; a real tap, select,
typed text and Enter (CDP Input events) saved the name in both. A child's rename works; the drive's typing did not.

**Fix:** the rename is typed with real input (`typeKeys`); the packaged app then PASSES 10/10. Why the scripted blur
stopped reaching the save between s5 and s7 was not traced (a window the OS has not focused never turns a scripted
blur into a focus change — a guess, not measured).
