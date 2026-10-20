---
id: P112-OWN020-UNWIREDSIGNAL
title: "Outside the editor a Function whose code calls a signal output nobody wired (`Outputs.done()`, no `out-done` wire, no saved port) throws \"Outputs.done is not a function\" on every run, while the Function spec says that run succeeds and sends nothing"
status: open
phase: P112
task: OWN-020
severity: medium
area: runtime / Function from disk (`packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts` :600-618 prepares a callable only for a signal in `this.model.outputPorts`; the code-derived ports (`addFunctionScriptPorts`, :955-971, via `functionScriptPortNames`) are added in the editor's port setup, and outside the editor a Function output reaches `outputPorts` only through a wire (`registerOutputIfNeeded`) or the node's saved `ports`)
found: P112 OWN-020, 2026-10-20 (CDQ2: Cline 3.0.71 + DeepSeek V4.1 Flash, the quiz, the 0.2.4 candidate with the Cline kit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (the CDQ2 entry); the round's project `scratchpad/rounds/CDQ2/work/apps/capital-quiz/components/Pages/Home/nodes.json` (session e824a1ee) — Functions `current_question`, `load_best`, `save_best`, each ending `Outputs.done();`, `ports` absent, wires leave only from their value outputs (`out-best`, `out-prompt`, …); the model's `render_report` (the MCP's from-disk render) returned `consoleErrors`: "[noodl] JavaScriptFunction (/Pages/Home): The script threw: Outputs.done is not a function [function/script-threw]" ×3
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

**In the editor (inferred, not measured):** the editor's port setup adds `out-done` as a signal from the code, so the
same project would run clean there, a difference between what a person sees in the editor and what they ship.

**Not measured yet:** a minimal repro outside the round (one Function, `Outputs.best = 1; Outputs.done();`, `out-best`
wired, `out-done` not) in the packed preview and in the editor; whether the MCP door should save the derived `ports` on
write (the other place this could be fixed). Next: that repro first, then either the runtime registers
`functionScriptPortNames` signals at load (as the spec's target does) or the door saves them, with the repro as the
regression.

**Workaround:** wire the signal to something, or drop the call when nothing listens.
