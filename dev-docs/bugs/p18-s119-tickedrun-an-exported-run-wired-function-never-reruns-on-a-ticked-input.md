---
id: P18-S119-TICKEDRUN
title: An exported Function whose Run is wired never runs again when a ticked input changes; the running app's does
status: open
severity: medium
area: export / Function (invoked mode, run-on-value-change, NDA-017)
found: P18 session 119, 2026-10-16, building EXP-011 §86 (a Function's own signals as chains)
evidence: packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts (NDA-017 §2, "every value input is governed by its own checkbox now, so wiring Run no longer changes what they do"); dev-docs/tasks/phase-18-code-export-v2/s119-fnchain-measure/tokenprobe.out (box ticked: the Function runs on each new value and on Run); packages/nodegx-export/src/analyze/plan.ts `jsFunDefOf` (the box is read only in reactive mode) and `pulseChainsOf` (§86 refuses the signals by name for this)
---

Since NDA-017, a Function with `Run` wired still runs when a value input whose Run On Value Change box is ticked (or
unset, which means ticked) receives a new value. The export translates a Run-wired Function as "invoked": its body runs
in the chain of whatever sends Run, and nowhere else. `jsFunDefOf` reads the boxes only for a Function with no Run.

Where the Function's outputs are read in render (§4f's materialized state), the running app shows the result of the
latest value and the export shows the result of the last Run. Where its own signals drive actions, the running app
sends them again on each new value; §86 refuses those signals by name ("its "x" input is ticked under Run On Value
Change…") rather than reproduce half of it, so that half is reported and not silent.

**Reach:** 13 such Functions that also send a signal of their own in the shipped templates (`tickedrun.ts`). Ten re-read
an id from the route (the runtime re-runs when the route changes, the export does not), one is the Site Builder's Setup
token (P18-S119-TOKENCLAIM, where the re-run is itself the defect), two may run twice per event (members-area
`Standing`, marketplace `RateRow`). The materialized-read half is not counted yet.

**What a fix needs:** the run as an effect on the ticked inputs' values beside the Run chain, with the runtime's
coalescing (one run per frame however many inputs change) and its first-delivery rule (a wire's value at creation runs
it once).
