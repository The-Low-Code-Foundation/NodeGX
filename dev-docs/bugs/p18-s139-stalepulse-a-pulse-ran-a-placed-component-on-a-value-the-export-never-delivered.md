---
id: P18-S139-STALEPULSE
title: A placed component's pulse into another ran there although the value it hands that component with the pulse was dropped, so the chain ran on whatever the input last held (115 template wires; over a persisted store, the player's data)
status: fixed
severity: high
area: export / the lift pass and the trigger pass (`src/analyze/plan.ts`, `liftInto` and `PlanExclusions.pulses`)
found: P18 session 139, 2026-10-22, reading rocket-school's emitted Lists page once App store was emitted
fixed: P18 session 139, 2026-10-22; EXP-011 §109
commit: 63ed1a9bf
evidence: dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/README.md, wires.json
regression: packages/nodegx-export/tests/a-persisted-store-travels.test.ts
---

The runtime's write idiom hands a placed component a value and then pulses it: rocket-school's Header sends App store
its `app`, then `write`; the Editor sends Save question set its `items`, then `save`. The export decides whether a
placed component's value output is lifted in a second phase (`liftInto`), after the trigger pass has compiled the
pulse. When the value was not lifted, the value wire was dropped by name and the pulse was kept. So the target's chain
ran on what its input last held: `undefined` on a fresh mount, or another sender's value.

The templates had **115** such pulses on HEAD (`wires.cts`): todo-list's Next renamed an action with no title, and
rocket-school's games graded and saved without the model. Once App store was emitted (session 139), the Header's
`write` would have written `undefined` over the persisted app object (the Store Desk's A9: unrefused, the stored copy
becomes `{}`).

Fixed: when `liftInto` drops a value wire between two placed components, and the target reads that input inside its
own graph, the sender's pulses into that target are refused by name in the next plan ("the placed component that sends
it also hands this one its "…", which the export does not deliver (…) — the pulse would run on what that input last
held"), through the DEADROW rounds' exclusions. A pulse sent from deeper in a chain (not straight from the sender's
output) is not covered.
