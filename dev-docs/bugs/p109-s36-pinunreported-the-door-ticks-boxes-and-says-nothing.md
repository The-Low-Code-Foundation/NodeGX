---
id: P109-S36-PINUNREPORTED
title: The door ticks "run on value change" boxes in an old project and its write response says nothing
status: fixed
commit: c5be13465
severity: medium
area: mcp / create_component, update_component, apply_plan
found: P109 ISL-018 AC5 s36, 2026-10-09
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-018-WHAT-THE-DOOR-WRITES-IS-WHAT-THE-EDITOR-SAVES.md §8 s36
---

An agent building in a project saved before format 5 adds a Function with its Run wired. The door writes
`runOnChange-in-…: true` on its unset boxes (s17's pin), and the response says nothing about it. The agent then
told its person "I didn't touch these settings, so they stay at their defaults". That was true in effect, but the
agent was never shown its graph had changed. ISL-018 §5 asked for the count in the write response ("Report it");
s17 built the pin without it.

Seen over stdio: Claude Code (Sonnet 5.5), project-local `--mcp-config`, round 5 of the AC5 drive. The
`update_component` response's keys were `updated, revision, applied, validation, visualRoots, visualRootsDerived,
done, notDone`.

Fixed s36: `pinAuthoredRunOnChange` returns the boxes, `ProjectStore.writeComponent` returns them as `ticked`
(not on an unchanged write), and `create_component`, `update_component` and `apply_plan` answer
`ticked: { boxes: [{ component?, node, parameter }], why }`. Graded by `isl018DoorPins.test.ts` (6 rows). Two
reverted arms: no payload → 3 rows red; the payload on an unchanged write → the ISL-019 row red. The tool surface
is unchanged (response only).
