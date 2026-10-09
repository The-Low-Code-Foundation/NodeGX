---
id: P107-C151
title: An Expression with a stray input, or whose text once read more ports, reads `Variables` / `Objects` / `Arrays` as nothing — the Noodl API is handed to the wrong parameter
status: open
phase: P109
severity: low
area: runtime / Expression (noodl-runtime/src/nodes/std-library/expression.ts `_argumentsForEvaluation` :442-453 — the current values are written over `internal.inputValues`, one array never shortened (:89, :169), and the API is appended after ALL of it; the function is compiled with `Object.keys(scope)` (:455-477, :457) and takes `Noodl` as the parameter after those names. When the array's length is not the compiled names' count, `Noodl` gets a stale input value (array longer) or `undefined` (a stray in the compiled names, array shorter), and the preamble (:786-795) then reads `Variables`, `Objects` and `Arrays` off that value, or off `global.Noodl` — `{}` in a browser)
found: P107 NSP-017 s68, 2026-10-09
evidence: the Expression spec v4's generated runs at seed 20735 found it on the runtime target (`Arrays.list.size()` threw "Cannot read properties of undefined (reading 'size')" after a text that had read two names); measured beside a control: an Expression placed with text `Variables.v` and the Variables record holding v = 7 gives Result 7; the same placed with a stray input `a` = 5 (a value on a port the text does not read) sends no Result — `Variables.v` read nothing. The spec now says what the runtime does (R3 (a)): its `values` state is the runtime's argument array.
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Expression.json "the Noodl API lands in the wrong place (row C151): …" — conforms on the runtime at seeds 13, 20735, 7, 20734, 20733, 20729, 20732 and at 10,000
---

**What a person sees.** An Expression that reads an app global — `Variables.count`, `Objects.user.name` — gives nothing (or `NaN`, or
throws "Cannot read properties of undefined") in two situations, while the same text in a fresh Expression works:

1. The node has an input the text does not read. That happens when a wire still goes into a port the text no longer uses (the text was
   edited, the wire kept), and at load the value arrives before the first evaluation.
2. In the editor's live preview, the text is edited from one that read more inputs (`a + b`) to one that reads fewer (`Variables.v + c`):
   the stale value of `b` is handed in where the API belongs.

**Where.** `_argumentsForEvaluation` keeps one argument array for the node's life and appends the API after its full length. The compiled
function expects the API right after the names it was compiled with. The two counts agree only when no input was ever added outside the
text's own names and the text never shrank.

**How to reproduce.** On the runtime target with the app's API installed (node-spec-target.ts `installNoodlApi`): params `{ expression:
'Variables.v', s: 5 }`, the Variables record holding `v: 7`, one settle — On False, no Result. Without `s`: Result 7, On True.

**Proposed fix.** Build the arguments fresh at each call from the names the function was COMPILED with — `compiledWith.map((n) =>
scope[n])` and then the API — so the API is always the parameter after them. The Expression spec's `values` state then goes, and the
scenario above changes to Result 7 in both halves (spec v5). No ruling needed: the text's meaning does not change, only where the API lands.
