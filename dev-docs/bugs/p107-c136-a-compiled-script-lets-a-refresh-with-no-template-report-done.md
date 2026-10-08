---
id: P107-C136
title: With Template Type Explicit and no Template, a Refresh reports Done (and draws nothing) once any Script has compiled — without one it fails `repeater/no-template`
status: open
severity: low
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `refresh` :745 checks `internal.template || internal.templateFunction`, whichever Template Type is; `getTemplateForModel` :501-503 reads only Template on Explicit)
found: P107 NSP-016 s61, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.22; recorded on the runtime target (the s61 probe, cases S8 and S8b — the same Repeater with and without a Script written), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "the Script matrix — a Script written while Template Type is Explicit and Template is empty: a rebuild passes, and draws nothing; its frame ends at a settle"
---

**What a person sees.** An author tries Dynamic, writes a Script, goes back to Explicit and clears Template. The Repeater draws
nothing — correctly — but a Refresh now fires **Done**, where the same Repeater that never had a Script fires **Failure** with
`repeater/no-template`. The outcome says the rebuild worked when there was nothing to build from.

**Where.** `refresh` asks for "a Template or a compiled Script" before it rebuilds, without asking which one Template Type uses. On
Explicit the Script is never run, so a compiled one should not count.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Check the one Template Type uses: on Explicit (or unset) `internal.template`, otherwise `internal.templateFunction`.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Fail with "no template" whenever Explicit has no Template".** The check reads only what Template Type uses.
