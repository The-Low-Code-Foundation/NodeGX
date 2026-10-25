---
id: P112-OWN026-DOUBLEPRESSFN
title: a double press still records an answer twice when the press calls a cloud function
status: fixed
severity: medium
area: runtime / press guard (pressguard.ts) and Cloud Function calls
kit: core
found: P112 OWN-026 Mistral lab, NodeGX re-run build t1-nodegx-1, 2026-10-25
evidence: /Users/Shared/nodegx-lab/own026-grades/mistral/t1-nodegx-1/grade.json T3, shots/t3-doublepress.png
commit: fix(p112-own026-doublepressfn), 2026-10-25
regression: packages/noodl-viewer-react/tests/cloudfunction2.test.ts "🔴 the press is held while the call is in flight, and after it answers only until the double-press time"
---

P112-OWN026-DOUBLEPRESS (fixed in FIX-03, `cb7e0d6e4`, and in this round's kit) holds a Button's Click while a save
it started is in flight. In Mistral's build the answer is recorded by a cloud function (`RecordAnswer`). The grader
typed the right answer and double-clicked Answer, three times. Each time two `RecordAnswer` requests went out,
`{correct:true}` and then `{correct:false}`. The screen said "Not quite — 2 × 5 = 10" after a right answer, and the
question counted twice in mastery (fuel went up only once).

Not measured yet: which path the press takes to the function (a Cloud Function node wired from the Click, or a
Function node calling `Noodl.CloudFunctions`), and whether the guard's "wired targets" include a Cloud Function call.
The likely reading is that the guard knows record saves, not function calls. Measure on a copy of
`/Users/Shared/nodegx-lab/own026/mistral/t1-nodegx-1/work/apps` first.

Fix: count a cloud function call the press started as a save it waits for, with the same 500 ms tail.

## Measured, then fixed (2026-10-25)

**The guess was right.** The guard is applied in one place, `cloudstore.js`'s six write methods
(`holdOptionsForWrite`); the Cloud Function nodes (`cloudfunction2.ts`, the deprecated `cloudfunction.ts`) and
`Noodl.CloudFunctions.run` (`api/cloudfunctions.ts`) each send their own XHR and never reached it. In the round's app the
press went Button → `ap-submit` (Function) → the AnswerPad's output → `ae-fn` (Function) → `pl-record` (CloudFunction2
`RecordAnswer`), so the Button's keys were never held. `t3b-net.json` shows both POSTs (`{"correct":true,…}` then
`{"correct":false,…}`) sent before either answered: the second press ran after the first update had cleared the field.

**Fixed:** each of the three request helpers wraps its options in `holdOptionsForWrite`, so a call a press's update
starts holds the press until the backend answers (either way) and for at least 500 ms, exactly as a record write does.
A call no press started holds nothing. pressguard.ts's header and the kit's guidance line say "a save or a cloud
function call". Regression: three cases in cloudfunction2.test.ts (held in flight and released after; released on a
failure; control: no press, no hold); with the hold line removed the first fails. Viewer tsc clean; the viewer's FIX-03
suite and cloudfunction2 green.

Not measured: a drive of the lab app (its chain is five hops, well inside `updateDirtyNodes`' ten). Not fixed here,
app-side: `RecordAnswer`'s read-modify-write of `TableStat.results` is still unsafe against two devices at once.
Seen beside it, not this bug: `gam-003-…` and `isl-028-…` in noodl-viewer-react are red (15) with these files at HEAD
too, the same evening a peer's uncommitted `noodl-runtime/src/nodescope.ts` edit sat in the checkout.
