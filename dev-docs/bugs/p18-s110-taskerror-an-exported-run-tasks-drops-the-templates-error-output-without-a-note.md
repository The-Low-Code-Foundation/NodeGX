---
id: P18-S110-TASKERROR
title: An exported Run Tasks drops the template's Error output with no note
status: fixed
commit: 94e80af95
severity: low
area: export / Run Tasks
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: RunTasks.taskErrorOutput
---

Runtime: `runtasks.ts` :891-898 reads the template's named output into the `run-tasks/task-failed` error. Export:
`plan.ts` :13456 computes `contract.error` and nothing emits it; the emitted `src/lib/runTasks.ts` says in a comment that "a
failed task is reported without the template's error output" (`runTasksLib.ts` :24, :54), but no note names the node. On
batch-desk, setting it to `Why` changes nothing. Fix: carry it, or a per-node note when it is authored.

**Fixed (said per node), session 111.** When a Run Tasks registers and its template declares an output under the
node's error name (`Error` unless authored), the component notes say the value is dropped from the task-failed
report. Nothing is said when the template has no such output, because nothing is lost then. The ledger's
`RunTasks.taskErrorOutput` moves from `gap` to `gated`: no fixture's template declares one, and the probe adds no
template ports. Graded in `tests/silent-parameters-closed.test.ts`, which builds that context: the default name,
an authored name, and the name the node does not use. Carrying the value would need a value channel from the
task element to the host.
