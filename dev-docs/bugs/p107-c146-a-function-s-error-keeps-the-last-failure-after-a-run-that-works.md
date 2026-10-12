---
id: P107-C146
title: A Function's Error keeps the last failure after a run that works — and a new Script empties it without sending it, so a wire on Error still shows the old message
status: fixed
commit: 2d765dac2
phase: P109
task: ISL-051
severity: low
area: runtime / Function (noodl-runtime/src/nodes/std-library/simplejavascript.ts `runScript` :645-652 — the success path never touches `lastError`; `clearRunDiagnostics` :771-775 sets it `undefined` and flags it, which sends nothing — node.ts never sends `undefined`)
found: P107 NSP-017 s65, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6.2; the s65 probe on the runtime target, identical on the spec — Function `await null; Outputs.late = Inputs.a; if (Inputs.b) throw new Error("late")`, b = true (Error "late", Failure), then b = false and Run: Success and Done, and no Error value; a Script edited after a throw: the code runs, Success, and no Error value
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/JavaScriptFunction.json "a run that works after a throw clears Error to blank text, sent once, before Success (v2, row C146)" and "a new Script after a throw clears Error to blank text and sends it (v2, row C146)"
---

**What a person sees.** An app shows a Function's Error in a Text so a person can see why it failed. The input that caused the
failure is corrected, the code runs and Success fires — but the error text stays on screen, describing a failure that is over. An
app that decides "is anything wrong?" from Error being non-empty stays in its error state for good. Editing the Script does not clear
it either: the node empties its own Error (the inspector reads nothing) but nothing is sent down the wire.

**Where.** `runScript`'s success path (:645-652) reports Success and Done and leaves `lastError` as the last failure wrote it. The
only clear is `clearRunDiagnostics` (:771-775), reached from the Script and Uses setters, and it writes `undefined` — which the runtime
never sends (node.ts `sendValue`), so a wire keeps the old message there too. The same family as D25, C47 and C144 (the Expression's
twin, fixed in P109 ISL-051): one ruling covers it — "Clear it to blank text".

**How to reproduce.** On the runtime target: Function `await null; Outputs.late = Inputs.a; if (Inputs.b) throw new Error("late")`;
settle; set in-b = true; settle (Error "late", Failure); set in-b = false and pulse Run; settle — Success, Done, and no Error value.

**Proposed fix (as ruled for D25 / C144).** A run that finishes after a failure writes Error as blank text and sends it, once; a later
one finds it blank and sends nothing. `clearRunDiagnostics` does the same (blank text, sent, only when there was an error). The
Function spec moves to v2 in the same commit (`JavaScriptFunction.json`'s two C146 scenarios change their names and traces).

**Fixed 2026-10-09 (P109 ISL-051 s33, `2d765dac2`), as ruled for D25 / C144.** A run that works after a failure, and a new Script
(`clearRunDiagnostics`), write Error as blank text and send it, once; with Error already blank nothing is sent. Function spec v2;
three scenarios moved and were renamed (the two above and "a Script edited to one that will not compile, then fixed"). Two runtime
tests pinned the `undefined` clear (isl-005-script-files, fun-007-run-diagnostics) and were restated. Control red on exactly the three.
