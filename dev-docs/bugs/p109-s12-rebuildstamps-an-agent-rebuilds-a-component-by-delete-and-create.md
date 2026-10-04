---
id: P109-S12-REBUILDSTAMPS
title: Asked to rebuild a component exactly, agents delete and recreate it, and the component reads as new in git
status: wontfix
reason: ruled 2026-10-04 (P109 s13) — "Accept it": the edit route keeps git clean; a delete + create is honestly a new component
severity: low
area: mcp / delete_component + create_component (ISL-019 AC6)
found: P109 ISL-019 AC6 s12, 2026-10-03
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-019-THE-SAME-PLAN-WRITES-THE-SAME-BYTES.md §8 s12
---

Two Claude Code rounds were asked to "rebuild the Home page component … so that it ends up exactly as it is now".
Both deleted it and created it again; neither used `update_component`'s `set`. On a project the door itself wrote,
the id came back identical (ISL-019's derived id) but `created`/`modified` were fresh wall-clock stamps, the
registry's rows too, App's `modified` moved with no change to its content (the router entry removed and re-added),
and `nodes.json` keys followed the agent's input order. The same graph sent through `update_component` `set`
(keys reversed) answers `unchanged: true` and `git status` stays clean. The ruling: whether a create at a path
deleted earlier in the same session should restore the old bytes when nothing differs, or the tools should steer a
rebuild to `set`, or AC6 is met by the update route alone.

**Ruled (P109 s13, 2026-10-04) — Richard: "Accept it"** (the recommendation). Asked with the three choices: accept
(cost nothing), restore the old bytes on a same-session delete + create, or a one-sentence hint on `delete_component`
(measured: 13 of the 19 free resident tokens). ISL-019 AC6 is met by the edit route (`update_component` `set` →
`unchanged: true`, `git status` clean, s12 arm 3).
