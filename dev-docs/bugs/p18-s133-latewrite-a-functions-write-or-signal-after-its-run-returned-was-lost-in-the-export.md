---
id: P18-S133-LATEWRITE
title: A Function's write or signal after its run had returned (a timer, a listener) was lost in the export — the kept node recorded only what the body did before it returned
status: fixed
severity: medium
area: export / `runFunction` (`src/emit/functionRunLib.ts`), the kept Function node (EXP-019)
found: P18 session 133, 2026-10-21, reading the emitted code of the nodes EXP-019 slice 2 gained (todo-list's "A minute clock, and a wake when the app comes back into view")
fixed: P18 session 133, 2026-10-21; EXP-011 §103, EXP-019 §7
commit: (this session's EXP-019 slice 2 commit)
evidence: dev-docs/tasks/phase-18-code-export-v2/s133-arrival/EXPECTED.md ("The Bell variant"); tests/the-script-runs-on-arrival.test.ts §E; mutant arms J, K, L
regression: packages/nodegx-export/tests/the-script-runs-on-arrival.test.ts
---

EXP-019 slice 1 (session 132) exported a Function whose body schedules a timer or touches the browser, as one run per
trigger over a kept node (`runFunction`). The runtime's node delivers a write to `Outputs` **whenever** it happens (its
`Outputs` proxy flags the output on every write), including from a `setInterval`, a `setTimeout` or an event listener the
body set up. The export's `runFunction` collected the writes and signals made before the body returned, published them
once, and never looked again: a later `Outputs.now = Date.now()` changed the node's record but no row was set and nothing
re-rendered; a later `Outputs.wake()` was pushed onto a finished run's list and its chain never ran.

Two shipped shapes, each in a template and its demo: todo-list's minute clock (`setInterval` writes `now`; a
`visibilitychange` listener sends `wake`) and planning's "Escape closes what is over the week" (slice 1, Run by Did Mount:
a `keydown` listener sends the signal that closes the sheet). Both were counted exported. In the exported planning app,
Escape closed nothing.

**Fixed:** `FunctionNode.late`. After the body returns, a write (not `undefined`, which is never sent) or a signal is
handed to `node.late` with the node's outputs (and, for a signal, the values its chain reads). A component whose body may
call back (`jsCallsBackOf`: a timer, browser or network trait, and `Outputs` touched inside a function of the body's own;
`JsFunctionPlan.late`) sets `late` at every render to its run's own row write and pulse arms, never Done or Success.
Graded on the Bell variant against the runtime arm (an arrival run and a Run-wired run, each writing from a zero timer).
