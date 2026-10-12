---
id: P107-C144
title: An Expression's Error keeps the last failure after the expression works again — a wire on Error still shows "The expression threw …" beside a good Result
status: fixed
commit: 99c61cede
phase: P109
task: ISL-051
severity: low
area: runtime / Expression (noodl-runtime/src/nodes/std-library/expression.ts `_calculateExpression` :409-415 — a working evaluation sets `lastError = undefined` and never calls `flagOutputDirty('error')`; only `_reportFailure` :355 flags it)
found: P107 NSP-017 s64, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-017-THE-ESCAPE-HATCHES.md §6; the s64 probe on the runtime target — Expression `a.b.c`, a = 1 (Error "The expression threw: Cannot read properties of undefined (reading 'c')", Failure), then a = {b:{c:5}}: Result 5, On True, and no Error value — the wire keeps the message. Fixing the text by hand (`a +`, then `a`) leaves the compile message the same way
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Expression.json "a throw answers 0, writes Error and pulses Failure; a later evaluation that works sends Error as blank text, once (row C144)"
---

**What a person sees.** An app shows an Expression's Error in a Text so a person can see why a calculation failed. The input that
caused it is corrected and Result comes out right — but the error text stays on screen, describing a failure that is over. An
app that decides "is anything wrong?" from Error being non-empty stays in its error state for good.

**Where.** A working evaluation empties the node's own error (`lastError = undefined`, so the inspector and the getter read
nothing) but does not flag the output, so nothing is sent down the wire. Only a failure flags Error. The same family as D25 (Request
Magic Link's Error after a success), C47 and D26 — one ruling covers "is an emptied output sent as blank, or not at all".

**How to reproduce.** On the runtime target: Expression `a.b.c`; settle; set a = 1; settle (Error is the throw's message); set
a = {b: {c: 5}}; settle — Result 5, and no Error value is recorded.

**Proposed fix.** In `_calculateExpression`'s success path, flag `error` when `lastError` was set before it is cleared — sending an
empty text (or `undefined`, per the D25/C47 ruling) once, not on every evaluation.

**Fixed (P109 ISL-051, s32, 2026-10-09), as ruled for its twin D25 ("Clear it to blank text").** A working evaluation that finds an
error writes Error as blank text and sends it, once; a later one finds it blank and sends nothing. Expression spec v2. Runtime 33 / 33
at seeds 13 and 20732; interpreter mutants 175 / 175 at both; control (HEAD's `expression.ts`) red on exactly the 2 C144 scenarios
(renamed); noodl-runtime's Expression tests 596 / 596. **The export (P18) has its own Expression:** not checked.
