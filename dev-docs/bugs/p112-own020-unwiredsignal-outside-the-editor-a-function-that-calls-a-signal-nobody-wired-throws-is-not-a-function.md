---
id: P112-OWN020-UNWIREDSIGNAL
title: "Outside the editor a Function whose code calls a signal output nobody wired (`Outputs.done()`, no `out-done` wire, no saved port) throws \"Outputs.done is not a function\" on every run, while the Function spec says that run succeeds and sends nothing"
status: fixed
commit: 3026899d4
phase: P112
task: OWN-020
severity: medium
area: runtime / Function from disk (`packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts` :600-618 prepares a callable only for a signal in `this.model.outputPorts`; the code-derived ports (`addFunctionScriptPorts`, :955-971, via `functionScriptPortNames`) are added in the editor's port setup, and outside the editor a Function output reaches `outputPorts` only through a wire (`registerOutputIfNeeded`) or the node's saved `ports`)
found: P112 OWN-020, 2026-10-20 (CDQ2: Cline 3.0.71 + DeepSeek V4.1 Flash, the quiz, the 0.2.4 candidate with the Cline kit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (the CDQ2 entry); the round's project `scratchpad/rounds/CDQ2/work/apps/capital-quiz/components/Pages/Home/nodes.json` (session e824a1ee) — Functions `current_question`, `load_best`, `save_best`, each ending `Outputs.done();`, `ports` absent, wires leave only from their value outputs (`out-best`, `out-prompt`, …); the model's `render_report` (the MCP's from-disk render) returned `consoleErrors`: "[noodl] JavaScriptFunction (/Pages/Home): The script threw: Outputs.done is not a function [function/script-threw]" ×3
regression: packages/noodl-runtime/test/p112-own020-an-unwired-signal-a-function-calls.test.ts
kit: preview
---

An agent writes a Function that sets its value outputs and then calls `Outputs.done()`, as the kit's own notes teach
(`Outputs.y()` is the call for a signal), and wires only the values. Rendered from disk (the MCP's `render_report`,
and so the packed preview and a deployed app, which load the same way), every run throws "Outputs.done is not a
function": the Function reports Error and Failure instead of Success, and any line after the call never runs.

**The spec says otherwise.** `packages/nodegx-node-spec/scenarios/JavaScriptFunction.json`, "a signal the code calls
with no wire on it sends nothing; the run still succeeds" (`Outputs.count = Inputs.a;\nOutputs.ping()`, no
`wiredOutputs`). Its target registers the Function's derived outputs at mount (spec.ts :970-985: "a target calls it
with the PLAY's context … and registers the list — at mount"), so `ping` is in `outputPorts`, the callable exists, and
only the send is gated by `hasOutput`. The from-disk runtime does not do that registration, so the spec passes and the
product throws: a hole shaped like the defect.

**In the editor (read from the code, not driven):** the module's `setup` (`_managePortsForNode`) pushes every signal the
code and the written list declare into `model.outputPorts` ("it's needed by the initial run of the script function"), and
an editor deploy saves them as the node's `ports`, so the same project runs clean there.

## Fixed (`3026899d4`, 2026-10-20)

**Measured first** (the runtime harness that registers node definitions without module `setup` and loads the component
as the file holds it, i.e. the from-disk path): with `Outputs.best = 1; Outputs.done(); Outputs.after = true;`,

- `out-best` wired, `out-done` not: `function/script-threw`, Failure.
- **`out-done` wired too: the same throw.** A wire registers the node's output, not a port on the model, so the
  workaround this file first gave ("wire the signal to something") does not work from disk. Only a saved port did.
- `ports: [out-done signal]` saved on the node (what an editor deploy writes): clean. That's the control.
- A `scriptOutputs` entry typed Signal, called as `Outputs["finished"].send()`: the same throw.

**The fix:** `placingSignalPorts` (simplejavascript.ts) gives the run the saved signals plus the ones the placing's own
parameters declare (its `scriptOutputs` typed Signal, then its code's `Outputs.x()`), in the editor list's precedence (a
saved port keeps its type, a name in the written list is a signal only if typed Signal). It reads `model.parameters`, the
placing's, so the spec's "a Script set while the app runs calls only the signals the placing saved" holds unchanged. The
code's names are parsed once per script text.

**Graded:** the regression's five cases (three fixed, two controls); sabotage (return only the saved signals) turns
exactly the three fixed cases red. The Function spec (`NSP_ONLY=JavaScriptFunction` conformance + the contract's plants)
green before and after; 1,534 runtime tests that touch the Function green; the runtime typechecks.

**Not measured:** a render through the product after the fix. The MCP's render and the preview's deploy engine are built
bundles (`noodl.deploy.js`, `dist/`), so the fix reaches them in the 0.2.4 cut's rebuild. That cut's smoke should render
one Function that calls an unwired signal and read `consoleErrors` empty.

**A hole left in the spec:** its runtime target seeds `model.outputPorts` from the derived ports ("as a loaded project's
saved `dynamicports` give the model"), so it plays the editor's project only. A play with no saved ports (an agent's
project) is the shape this bug lived in; the regression above covers it for the Function.
