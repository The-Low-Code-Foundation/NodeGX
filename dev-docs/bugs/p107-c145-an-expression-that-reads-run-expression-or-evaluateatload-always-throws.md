---
id: P107-C145
title: An Expression that reads a name called run, expression or evaluateAtLoad never gets an input for it and always throws "run is not defined"
status: fixed
commit: 5ee9edda4
phase: P109
task: ISL-051
severity: low
area: runtime / Expression (noodl-runtime/src/nodes/std-library/expression.ts the `expression` setter :520-524 — `if (self.hasInput(name)) return;` skips a name that is one of the node's own inputs, so it never joins the scope or the compiled function's parameters; `updatePorts` :795-815 still asks the editor to draw a port by that name; expression-ports.ts does not reserve the three)
found: P107 NSP-017 s64, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6; the s64 probe on the runtime target — Expression `run + 1`, Run: Error "The expression threw: run is not defined", Run answered failure (expression/threw), Result 0; `evaluateAtLoad` the same
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Expression.json "a text reading run gets no port for it and fails as a reserved name, at load and on Run (v3, row C145)"
---

**What a person sees.** A person writes an Expression over a value they called `run` (a run count, a run-time) — `run * 2`. The
editor draws an input port called run, they wire a number into it, and the Expression fails every time with "run is not defined".
Nothing they can wire fixes it; only renaming the variable does, and nothing says so.

**Where.** The Expression's own inputs are Expression, Run and Evaluate At Load. When the text names one of them, the setter finds
a port by that name already there and adds nothing — the value never reaches the compiled function, which then reads a global
that does not exist. A wire into "run" lands on the Run signal, not on a variable.

**How to reproduce.** On the runtime target: Expression `run + 1`; settle; Run; settle — Failure with "run is not defined".

**Proposed fix.** Reserve the three names in `expression-ports.ts` (all three copies — runtime, export, spec) so the editor draws
no port and the description can say so, or migrate them to a port name that cannot clash. Either way the text reading `run` should
say why it cannot, at the port, rather than throw at run time.

**Ruled 2026-10-09 (P107 s65), as recommended: "Block the three names".** The editor draws no port for `run`, `expression` or
`evaluateAtLoad`, and the Expression says plainly that the name is reserved and must be renamed, instead of failing at run time. No
saved project changes. The question as asked: *"In an Expression, if someone names a variable run, expression or evaluateAtLoad (for
example `run * 2`), the editor draws a 'run' port, they wire a number in, and it fails every time with 'run is not defined'. The wire
actually lands on the node's own Run button. What should happen?"* — options: block the three names (recommended) / make them work
(rename the node's own ports, a migration of every saved Expression) / leave it. The fix reserves the names in all three copies of
the lexer (runtime, export, spec) and moves the Expression spec to v3 in the same commit — P109's under R16.

**Fixed 2026-10-09 (P109 ISL-051 s33, `5ee9edda4`), as ruled.** The three names joined the reserved set in all three copies of
`expression-ports.ts`, so no port is drawn or registered; the Expression fails `expression/reserved-name` before compiling, with a
message that names the variable and says to rename it, and the editor shows the same message as the node's warning while the text
reads one. With no port left, `run + 1` evaluates at load and says so at once. The node's Expression description names the three.
Expression spec v3. Control: the runtime's two files from before red on exactly the three C145 scenarios; the editor half
(`isl051-c145-a-reserved-name-in-the-editor.test.ts`) red on 3 of 5.
