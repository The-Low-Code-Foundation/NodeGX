---
id: P123-GH-LISTHIDDEN
title: Opening a backend workflow's run (or a function from a step) hides the Backend tab's list of workflows and functions
status: fixed
commit: nodegx-studio bd4fff1
severity: low
area: "nodegx-studio / Backend tab (editor/studio.html renderAuto, renderFunction)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31): *"why when I click one of the backend workflow or function runs, does it hide the left menu with all the functions? Seems unnecessary"*. A workflow opened from a trigger (`selAuto.from`) or a function opened from another (`fnBack`) put `#workflow` in its full-width card mode, `aside` hidden.

Fix: the Backend tab keeps its list beside whatever it opened; Back stays. Gate: `check:automations` drive "the list of workflows and functions stays beside the run it opened".

## Fixed (s35, 2026-10-31; landed 2026-11-01)

The Backend tab keeps its list of workflows and functions beside whatever it opened. Gates: `check:functions`, `check:automations` green. Every Studio gate green on 2026-11-01, run one at a time.
