---
id: P107-C155
title: The spec format cannot say "this port is wired", so five runtime branches on it are graded on the unwired arm only
status: open
severity: medium
area: node-spec format (`packages/nodegx-node-spec/src/spec.ts`) and the runtime target (`packages/noodl-runtime/test/helpers/node-spec-target.ts`)
found: P107 NSP-018 s73, 2026-10-09 — writing Function's rules in words
kit: node-spec
evidence: the runtime branches on `isInputConnected` at simplejavascript.ts :386, :408, :414 (Function), expression.ts :611 (Expression), runtasks.ts :417 (Run Tasks), page.ts :65 (Page), layout.ts :262 (flex-grow from a wired size); P109 ISL-033 (8f31517cc) measured the wired arm on the runtime — "with Run unwired the script runs at load and on an input; wired, it still runs on the input but not at load"
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
