# EXP-022 S5 — what the Swift ledger line will read, written before the first run (2026-10-22)

**Measured before predicting** (scratch scripts over the 85 scenarios, no Swift built):

- React's line today: **11 of 85 conform**, 18 played (11 conform, 3 differ as declared, 4 fail on P18-S106-PARSERAISE);
  21 outside on the exporter's verdict, 46 on the harness's. The S4 prompt said 10; s139 moved it to 11.
- Every one of React's 21 exporter-verdict outsides is a refusal in the **plan's own notes**. The React printer adds
  no refusal of its own on this corpus, so Swift inherits exactly those 21, in the same words.
- Of React's 18 played, the Swift printer prints **4 with no loss** (C2, the G1 diamond, C7 lockstep, C8: Counter,
  Switch, Inverter, And, Value Changed). **C10** lost only its Log buttons' action (a `log` action, never pressed by the
  scenario); S5 prints Log, so C10 plays. The other **13** are the `@nodegx/core` families §7 cut out: Global Store,
  State History, State Snapshot, Optimistic Update, Action Dispatcher, On App Error (streams, store sets, app-error
  outputs, util calls). They are outside on the **Swift printer's** verdict.

**The prediction.** "Swift equals React's 10" is wrong before any run, and the reason is the cut, not the plan:

```
P18 ledger (Swift): 2 of 85 graph scenarios conform on the Swift export — 5 played (2 conform, 3 differ as declared,
0 known rows, 0 fail); 34 outside on the exporter's verdict (21 the plan's, 13 the Swift printer's), 46 on this
harness's limits
```

- C2 and C10 pass.
- G1 (the And diamond), C7 (lockstep) and C8 (first-update consolidation) **differ from the runtime as React's export
  differs**, so `divergence.export` is carried to the Swift target in the test. If one of them reads equal to the
  runtime on Swift, that is the finding.
- **On all 5, Swift's trace equals React's trace, event for event.** That is the claim's sharpest form: the same plan
  printed twice behaves the same. Least sure: C7, where two Switches feed one And and the order SwiftUI runs two
  `.onChange` effects in one update could differ from React's effect order.
- The 9 React conforms Swift does not have are all in the 13 (Global Store 1, State History and Snapshot 4,
  Optimistic Update 2, Action Dispatcher 2). React's 4 failing On App Error rows are among Swift's 13 outsides.
