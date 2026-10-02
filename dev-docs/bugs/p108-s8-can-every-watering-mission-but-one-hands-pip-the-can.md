---
id: P108-S8-CAN
title: "Water my three tulips" (and three more watering missions) hand Pip the can — there is no can to pick up
status: open
severity: medium
area: template bot-garden / missions (cg002Content.ts REQUESTS)
found: P108 s8, 2026-10-02 (Richard played it)
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8 rulings)
---

Richard: "In 'Water my tulips' there appears to be no can to pick up to water with." Measured in the content: only
`tulip-door` lays the can on the grass (`{ kind: 'can', x: 2, y: 1 }`); `tulips-three`, `rows-trick`, `mamie-note` and
`rock-flower` start the robot with `can: 0, canMax: 3` in its hand (`robotStart`), against Richard's original ask (P108
README §0: "have to pick up a can"). Ruled 2026-10-02: every watering mission starts with the can on the grass; each
reference program gains a `pick` first.
