---
id: P123-GH-FNREADONLY
title: A cloud function's steps are read only in Studio ("Ask the agent to change them")
status: fixed
commit: nodegx-studio bd4fff1
severity: high
area: "nodegx-studio / Backend tab, a function (editor/studio.html renderFunction)"
found: STU-091 Greenhouse, Richard's second play test in NodeGX Studio, 2026-10-31
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes, second round (2026-10-31)
phase: P123
---

Richard (2026-10-31): *"I still can't edit backend function steps, it says I have to ask the agent to do it"*. STU-092 made backend workflows editable; a function's view said "Read only: Studio does not change a function's steps yet". A change would also reach nothing: a backend runs what was deployed to it, and Studio never deploys to development (P123-STU-NOFNDEPLOY).

## Fixed (s35, 2026-10-31; landed 2026-11-01)

STU-099: a function's step opens its settings on the right (a script or expression in a code box, other plain settings as fields); each change is saved and the functions put on the development backend (`/api/functions/deploy`). Not edited: its wires, and settings that are lists. Gate: `check:functions` 50/50. Every Studio gate green on 2026-11-01, run one at a time.
