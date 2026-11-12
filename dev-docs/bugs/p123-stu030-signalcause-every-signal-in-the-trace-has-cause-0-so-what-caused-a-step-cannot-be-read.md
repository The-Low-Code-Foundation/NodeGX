---
id: P123-STU030-SIGNALCAUSE
title: "Every signal in the runtime trace has cause 0, so what made a step run cannot be read off the trace"
status: fixed
severity: medium
area: runtime / the trace buffer (`NodeContext.traceEdgeSend`, `_currentCause`), read by the in-page preview and nodegx-observe
found: NodeGX Studio STU-030 (phase 123's successor repo, The-Low-Code-Foundation/nodegx-studio), 2026-10-20 — measuring the trace for the run timeline on the todo template
evidence: nodegx-studio docs/look/stu-030-trace.json (`runB_signals`, `runC_add_a_task.signalChain`); nodegx-studio editor/trace-inventory.mjs reproduces it; docs/SCOPE.md "Done (STU-030)"
kit: core
regression: packages/noodl-runtime/test/corpus/p123-signal-cause.test.ts "an action’s Done, reported after an await, names the signal that started the action"
commit: 7f27ccaf9
---

`TraceEvent.cause` is documented as *"the seq of the event that delivered the input being processed when this one was
emitted, or 0 for a root (a timer, a DOM event, boot)"*: the tree OBS-002's backward walk reads. In Studio's in-page
preview of the todo template, **every signal edge is a root**:

- Sign-up → the Todo page opening: 12 of 12 signal events have `cause: 0`, including `SignUp.done → RouterNavigate.navigate`
  (caused by the sign-up's own answer) and `Page.didMount → Condition.eval` → `Condition.ontrue → /Logic/Todo data.refresh`.
- Add a task: 8 of 8 signals have `cause: 0`, along a chain where each step is the previous one's Done
  (`button.onClick → JavaScriptFunction.run`, `…out-go → NewDbModelProperties.store`, `NewDbModelProperties.done →
  /Logic/Write history.do`, …).
- Values: 425 of 956 value events in the same run are roots too.

So the trace says in what order things ran (seq and t are right, and t shares the frame's `performance.now()` clock),
but not why: a step that ran because the step before it finished and one that ran on its own look the same. Phase
123's attribution work met the same wall (a Did Mount event hid which value ran a Condition, so the gate had to use a
Click).

Reproduce: in nodegx-studio, `node editor/trace-inventory.mjs /tmp/t.json` (needs this checkout as `../OpenNoodl`), then
read `report.runC.signalChain`: every line ends `(cause 0)`.

Probably where: a signal is delivered by a deferred update (`scheduleAfterInputsHaveUpdated` / the node's own update
pass), and `_currentCause` is set from the queued input's seq only while `Node.update` drains `_inputValuesQueue`; a
signal sent from inside a scheduled callback runs after that has been reset to 0. Not traced into the code here.

Proposed fix, small-medium: carry the cause into the scheduled callback (capture `_currentCause` when the callback is
scheduled, restore it while it runs). The gate: a two-step chain (Button → A.done → B) records B's input event with
A's delivering event as its cause.

**Fixed (2026-10-25, the Beta sweep), for signals:** the cause is carried across the three places it was lost
(`src/tracecause.ts`, two free functions, one property read when tracing is off). (1) `scheduleAfterInputsHaveUpdated`
runs its callback under the cause in force when it was scheduled, which is where a Function's Run runs. (2) An outcome
token (`beginOutcome`) keeps the cause of the signal that started the invocation, and `reportOutcome` sends Done /
Failure / Unchanged / Completed under it, after an `await` too (the action family: record writes, requests). (3) A
Function's own script signals (`Outputs.go()`) and its Success go out under the cause of what started the run.
Graded: `test/corpus/p123-signal-cause.test.ts` 4/4 (the row's gate: a two-step chain names the first step; red 3/4
with the cause not carried). Not done: VALUES flagged dirty and sent in a later update pass (the 425 of 956 roots)
are not traced here, nor a node that answers later without the outcome contract. Not re-measured in Studio's
`trace-inventory.mjs` (needs a preview build that carries this runtime).
