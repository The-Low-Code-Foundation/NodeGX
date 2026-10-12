---
id: P107-C136
title: With Template Type Explicit and no Template, a Refresh reports Done (and draws nothing) once any Script has compiled — without one it fails `repeater/no-template`
status: fixed
commit: 4b63a1316
phase: P109
task: ISL-049
severity: low
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `refresh` :745 checks `internal.template || internal.templateFunction`, whichever Template Type is; `getTemplateForModel` :501-503 reads only Template on Explicit)
found: P107 NSP-016 s61, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.22; recorded on the runtime target (the s61 probe, cases S8 and S8b — the same Repeater with and without a Script written), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "Template Type Explicit with Template empty: a Refresh fails repeater/no-template, and still does once a Script compiles (row C136)"
---

**What a person sees.** An author tries Dynamic, writes a Script, goes back to Explicit and clears Template. The Repeater draws
nothing — correctly — but a Refresh now fires **Done**, where the same Repeater that never had a Script fires **Failure** with
`repeater/no-template`. The outcome says the rebuild worked when there was nothing to build from.

**Where.** `refresh` asks for "a Template or a compiled Script" before it rebuilds, without asking which one Template Type uses. On
Explicit the Script is never run, so a compiled one should not count.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Check the one Template Type uses: on Explicit (or unset) `internal.template`, otherwise `internal.templateFunction`.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Fail with "no template" whenever Explicit has no Template".** The check reads only what Template Type uses.

**Fixed (P109 ISL-049, s32, 2026-10-09), as ruled.** `refresh` checks only what Template Type uses: a Template on Explicit (or unset),
a compiled Script otherwise — so Dynamic with no Script that compiles fails `repeater/no-template` too (with its own message), and
like every failed rebuild it leaves the rows drawn. For Each spec v6. Three C137 scenarios had used "Dynamic with no Script" as their
rebuild that builds nothing; each now writes a Script that compiles and names no component, and traces as it did. Runtime 296 / 296
at seeds 13 and 20732; interpreter mutants 266 / 266 at both; control (the C129 commit's `foreach.tsx`) red on exactly the 22
scenarios the fix moved.
