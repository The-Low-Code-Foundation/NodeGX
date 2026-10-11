---
id: P107-S83-SENDFORM
title: Function — code that fires a signal only as `Outputs.done.send()` gets a VALUE port `done`, so the call throws "Cannot read properties of undefined (reading 'send')" at every run
status: open
severity: medium
area: project-contract / Function port reader (`packages/nodegx-project-contract/function-ports.ts` `functionScriptPortNames` — no `.send()` signal pattern; the runtime's `simplejavascript.ts` :611-616 prepares `.send` only on a SIGNAL port the model saved)
found: P107 NSP-020 s83, 2026-10-11 — moving the Function spec onto the decided port format (§6.7); first measured by P66 FIX-016 (its "what they wrote" table, the `Outputs.Done.send()` row), never logged here
evidence: `packages/nodegx-node-spec/scenarios/JavaScriptFunction.json` "Outputs.ping.send() alone names a VALUE port, so the call throws: the write before it lands, then Error and Failure — a Run answered failure" (the golden trace, conforming on the runtime at seed 20737); `functionScriptPortNames('Outputs.count = 1;\nOutputs.ping.send()')` → `{ signals: [], outputs: ['count', 'ping'] }`
kit: project-contract
---

A person writes `Outputs.done.send()` in a Function. The runtime says this is allowed: it attaches `.send` to every
signal output so "user code may write either `Outputs.done()` or `Outputs.done.send()`" (simplejavascript.ts :611-616).
But the editor never makes `done` a signal: the one port reader (`function-ports.ts`, shared by the editor, the door
and the exporter) has a signal pattern for `Outputs.x()` and `Outputs["x"]()` only, so `Outputs.done.send()` is read as
the VALUE output `done`. At run time the node prepares callables only for saved signal ports (:600-618), so
`Outputs.done` is `undefined` and `.send()` throws. The person sees Error "Cannot read properties of undefined (reading
'send')" and Failure on every run, and a wire from Done never fires.

**Workaround:** write `Outputs.done()`, or add `done` under Script Outputs with Type Signal.

**Until s83 the spec hid half of it.** The scenario that grades this was named "a signal fired by its .send". Its
golden trace had always recorded the throw, because the padding listed `ping` as a value first. s83 renamed it to say
what it grades.

**Fix (small):** add `/Outputs\.([A-Za-z0-9_]+)\.send\s*\(\s*\)/g` (and the bracket form) to the reader's signal
patterns, in `@nodegx/project-contract/function-ports.ts` and its byte-identical copy in the spec package (held by
`tests/function-ports-parity.test.ts`). Then the scenario's trace changes (Success instead of Error and Failure), so
the Function spec's `version` goes up with a `changes` entry naming this id (NSP-010), and the renamed scenario becomes
the regression.
