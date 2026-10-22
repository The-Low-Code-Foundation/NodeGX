---
id: P112-OWN026-SBR009HOME
title: "`noodl-mcp/tests/sbr009ThemeEditorDrive.test.ts` is red at cline-dev 2026-10-22: before any preset chip is clicked, one preview box already reads \"home\" (expected every box empty)"
status: open
severity: low
area: "test or template — SBR-009 theme editor drive (`packages/noodl-mcp/tests/sbr009ThemeEditorDrive.test.ts:263` \"the screen does not pick a preset for you\"); not yet read which"
found: P112 OWN-026 FIX-01, 2026-10-22, running the template suites beside the new Query Records rule
evidence: "1 failed / 12 passed, `before.boxes.filter(v => v !== '')` → [\"home\"]. Control: the same red with FIX-01's `checkQueryFilterShape` unregistered, so it is not that rule. Not run at an older commit; not read whether the box or the spec moved."
---

Found while checking FIX-01 B did not break the template suites. Independent of it by the control arm above. Owner
unknown: whoever last changed the theme editor template or the router's default page should read it first.
