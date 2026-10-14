---
id: P107-C155
title: The spec format cannot say "this port is wired", so five runtime branches on it are graded on the unwired arm only
status: fixed
severity: medium
area: node-spec format (`packages/nodegx-node-spec/src/spec.ts`) and the runtime target (`packages/noodl-runtime/test/helpers/node-spec-target.ts`)
found: P107 NSP-018 s73, 2026-10-09 — writing Function's rules in words
kit: node-spec
evidence: the runtime branches on `isInputConnected` at simplejavascript.ts :386, :408, :414 (Function), expression.ts :611 (Expression), runtasks.ts :417 (Run Tasks), page.ts :65 (Page), layout.ts :262 (flex-grow from a wired size); P109 ISL-033 (8f31517cc) measured the wired arm on the runtime — "with Run unwired the script runs at load and on an input; wired, it still runs on the input but not at load"
fixed: 2026-10-10 — the format says it (`wired`, NSP-002 §6); the Function's :386 and the Expression's :611 are graded on both arms; :408/:414 (Uses, undriven in a lone node), :417 (the Run Tasks node forcing a TASK node's Start to read wired — a graph rule, no spec), :65 (Page, no spec; an SSR event nobody on the wire sees) and layout.ts :262 (the layout model) are out of a lone spec's reach and say so
commit: c9b8a8e0e
regression: packages/nodegx-node-spec/scenarios/Expression.json "with Run wired, a new text is not evaluated at load: Result stays null until Run (P107-C155)" (and two more named C155; JavaScriptFunction.json likewise)
---

The spec format cannot say "this port is wired", so five runtime branches on it are graded on the unwired arm only.

**What, with the line:** Function's Script setter runs the code at load and on every code change only
`if (!this.isInputConnected('run'))` (simplejavascript.ts :386, and :408 / :414 for a code file). The spec's Script
reducer (`function.ts`, `...schedule`) asks for a run whatever is wired. Expression's load evaluation (:611), Run Tasks
(:417), Page's `onPageReady` (:65) and the layout's flex-grow conversion (layout.ts :262) branch the same way.

**Why no test saw it:** the single-node runtime target sends every value with `sendValue` and never calls
`connectInput`, so `isInputConnected` is always false there and both targets take the unwired arm. They agree by
construction. A graph scenario wires real connections on the runtime, but the interpreter has no notion of a wired
port, and no graph scenario wires a Function's or an Expression's Run. NDA-017 §2 removed most of these branches (the
"Was `isInputConnected(…)`" comments in a dozen nodes); these five are what is left.

**Why it matters now:** NSP-018 writes each branch's rule in words for agents (`get_node_type`). "A new Script runs at
the end of the frame" is false for a Function whose Run is wired. Its s73 words name the precondition ("with Run not
wired") rather than claim it for every Function.

**Proposed answer:** a `wired: string[]` in the reducer's inputs-seen (the interpreter takes it from the scenario or
graph; the runtime target wires a stub source for each named port), with scenarios for the wired arm of each of the
five. A stranger's target would then owe the same notion, so this is a format change (spec.ts, world.ts guarded).
Alternatively, rule that the wired branches go, as NDA-017 §2 did for the others, which is a runtime change and a
ruling.

**Fixed (2026-10-10).** The format gained one notion, additive: a scenario's `wired: ["run"]` (scenario.ts, scenarios/README.md)
names the input ports a wire reaches for the whole play; `play` hands it to the adapter's `mount(type, params, wired?)` (adapter.ts),
the interpreter keeps it on the instance and a reducer reads `world.wired(port)` (spec.ts `WorldView.wired`; interpreter.ts
`viewOf`), and the runtime target connects each named port, BEFORE the params, to a stub source that never sends (`wireStub`,
node-spec-target.ts — a loaded project makes its wires before a node's parameters drain, nodescope.ts `setComponentModel`), so
`isInputConnected` reads true there and the wire carries nothing. A scenario without `wired`, every generated sequence and every
stranger trace keep their meaning (nothing wired). The Function's Script reducer and the Expression's text reducer branch on it with
their own `says` ("new code, with Run wired: compiled, and nothing runs until Run or a changed ticked input"; "new text, with Run
wired: … nothing is evaluated until Run or a changed ticked input"); seven scenarios play the wired arm (4 Function, 3 Expression).

Read, not counted: on the interpreter and on the runtime the Function's wired scenario records NOTHING at its two load settles and
`out-count 1`, `success`, `run done` only after Run (its unwired twin sends at load); the Expression's holds `result null` at load
and sends `4` after Run (the twin sends `4` at load). Planted — a runtime target whose `mount` drops the `wired` argument, so no
stub is wired — the same scenarios go red at index 2 on 4 of 4 Function and 1 of 3 Expression scenarios (the run at load appears);
the two that stay green are the input-arrival scenarios, which agree on both arms by design (ISL-033: "wired, still on the input").
Runtime conformance, seed 20736: Expression 46/46 scenarios, 200/200 sequences, 181/181 mutants; JavaScriptFunction 32/32, 200/200,
211/214 (the 3 are the declared "stuck scheduled flag" equivalents, as before). A mutant note: the Function's wired arm sets the same
keys as its "Script set to nothing" arm, so the two share one mutant SHAPE; the wired C146 twin is what kills the `lastError` shape.

Not reached, and why: simplejavascript.ts :408/:414 sit in the Uses setter, `undriven` in a lone node (the script files are a graph
seam, ISL-005); runtasks.ts :417 is the Run Tasks node overriding a TASK node's `isInputConnected(start)` to true — a graph rule
about the template's node, not a branch on the Run Tasks node's own port, and Run Tasks has no spec; page.ts :65 is the Page node
(no spec; its branch emits `SSR_PageLoading`, which no port carries); layout.ts :262 is the layout model (NSP-016 §8), not a node.
A second observation for whoever specs a graph: the runtime graph target (`mountGraph`) applies each node's params at mount and
makes the wires after, so a Function placed in a graph scenario with Run wired would take the UNWIRED arm at its Script setter —
the reverse of a loaded project's order (connections first, then the first update drains the parameters). No graph scenario wires
a Function's or an Expression's Run today, so nothing is graded wrong; it is the order to fix when one does.
