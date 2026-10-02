---
id: P107-C38
title: Query Records with a Javascript filter and no stored script (or a syntax error) never queries — and never says so
status: needs-ruling
severity: high
area: runtime / Query Records (`DbCollection2`) — the Javascript filter
found: P107 (the node says what it does) s23, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.8 (row C38) — a six-arm probe on the runtime target with a control arm, described there
---

Query Records with a Javascript filter and no stored script, or a script with a syntax error, never queries — and
never reports anything.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts` `getStorageFilter` (:996-1016). With
`storageJSONFilter` absent, `filterCode.replace(…)` (:1003) throws inside its `try`; a syntax error throws in `Function.apply`
there too. Both are caught, logged with `console.log`, and leave `filterFunc` undefined, so the function returns
`undefined` (:1016). `fetch()` then reads `f.where` (:874) on `undefined` — a TypeError inside the frame-end callback,
which the scheduler only logs (nodecontext.ts :466-472).

**What the trace shows (measured s23, runtime target, world answering every query):** control — Class only: a query, the
rows, Success. Javascript + no script: no call, no Success, no Failure, no Error, Count stays 0 — every later write and
every Do the same. Javascript + `where({ title: ` (syntax error): identical silence. Javascript + the editor's default
script written: queries normally.

**Not measured:** whether the editor stores its default script as a parameter when an author switches Filter to
Javascript and never edits it. The default is a PORT default (`_defaultJSONQuery`, :1224), and a declared default is not
a parameter (A-D1) — if the editor does not write it, every such node in a saved project is silent from load. Measure in
the editor before ruling.

**Plain words:** *"Switch a Query Records filter to 'Javascript' and leave the script as it is — or make a typo in it —
and the node just stops: it never fetches, and it never fires Failure or shows an error, so nothing tells you why the
list is empty."*

**Proposed:** treat a missing or unparseable script as a filter failure (`{ failed: <the parse error> }`) so the node
fails with Error and Failure, as the visual filter's refusal does (:982). A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules.
