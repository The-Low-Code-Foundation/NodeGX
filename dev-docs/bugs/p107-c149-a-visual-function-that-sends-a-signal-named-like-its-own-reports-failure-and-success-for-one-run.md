---
id: P107-C149
title: A Visual Function whose blocks send a signal named like one of its own (done, failure…) pulses Failure, then Success and Done, for the same Run — and Error is emptied in the same instant
status: fixed
commit: dde400937
task: ISL-051
phase: P109
severity: low
area: runtime / Visual Function (noodl-runtime/src/nodes/std-library/logic-builder.ts — the `sendSignalOnOutput` the code is handed, :566-573, calls `_fail` with NO token, so `_fail` pulses Failure on its own (:307-311) and returns to the code; the run then reaches the success path, which empties `executionError` and sends Error (:492-493), fires Success (:500) and answers the Run Done (:502). The value-side twin, a reserved name WRITTEN, fails the run instead (:483-490))
found: P107 NSP-017 s67, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6.5; the Visual Function spec's scenario "a signal sent to a name the node owns", which conforms on the runtime at seeds 20735, 13, 7, 20734 and the day's — one Run: `!failure`, `!success`, outcome `done`, and Error recorded as nothing (the message and the blank land in one frame). Control, the same shape with `sendSignalOnOutput("ping")` (scenario "a signal sent fires at once"): `!ping`, `!success`, `done`, no Failure
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Logic Builder.json "a signal sent to a name the node owns: the values land, then Error says so, a failure — no Success, no Done (v2, row C149)"
---

**What a person sees.** A person puts a `send signal` block in a Visual Function and types `done` (or `failure`, `success`, `error`,
`unchanged`, `completed`) as its name — the field is free text. When the node runs, Failure fires, and then Success and Done fire for
the same Run. Anything wired to Failure and anything wired to Done both go. Error, the one output that says why, is blank by the end
of the frame: it was set to the reason and cleared in the same run. By the code (`_clearFailureWarnings` :340-376 keeps what this run
raised — read, not driven) the canvas keeps the warning, so the editor says one thing and the wire says the opposite.

**Where.** The `sendSignalOnOutput` the code is handed refuses a name the node owns by calling `_fail` without the run's token. With no
token, `_fail` pulses Failure as a plain signal and returns; the code carries on, and the run reaches the success path, which treats the
run as clean: Error emptied and sent, Success, Done. A reserved name WRITTEN as a value (`Outputs["done"] = …`) is handled the other
way — the run fails, the reason stays on Error, no Success, no Done — so the same mistake gives opposite answers depending on which block
made it.

**How to reproduce.** On the runtime target: a Visual Function whose Generated Code is `sendSignalOnOutput("done");
Outputs["sum"] = Inputs["a"];`, `a` set to 4, Run: Failure, Success, `sum` 4, Run answered Done; Error recorded as nothing. With
`"ping"` in place of `"done"` (and `ping` among its outputs): ping, Success, Done, no Failure.

**Proposed fix.** Make the signal side match the value side: remember the refusal during the run (as `reservedName` is remembered for a
value) and, after the code returns, fail the run through its token — Error keeps the reason, the Run is answered `failure`
(`logic-builder/reserved-port-name`), no Success, no Done. The Visual Function spec says what the runtime does today (R3 (a)); the fix
moves it to v2 in the same commit, with the scenario above changed to the new answer. No ruling needed: the value side already decided
what a reserved name does to a run.

**Fixed 2026-10-09 (P109 ISL-051 s34, `dde400937`), as proposed.** While the code runs, the first reserved name sent is
remembered; after the code the values land and the run fails through its token — Error keeps the reason, the Run is answered
failure (`logic-builder/reserved-port-name`), no Success, no Done. A send outside a run (a block's own timer) still fails at
once. Visual Function spec v2.

