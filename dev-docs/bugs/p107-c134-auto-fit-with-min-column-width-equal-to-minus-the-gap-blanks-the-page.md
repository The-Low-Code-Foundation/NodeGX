---
id: P107-C134
title: A Columns on Auto Fit whose Min Column Width plus Horizontal Gap is 0 (Min 16, Gap −16) blanks the page — the column count divides by zero
status: fixed
commit: 73d7696ec
phase: P109
task: ISL-050
severity: medium
area: viewer / Columns (packages/noodl-viewer-react/src/components/visual/Columns/Columns.tsx `calcAutoFit` :302-311 — `Math.floor((width + gap) / (min + gap))` is Infinity at `min + gap = 0`, and `new Array(Infinity)` throws inside the render; no error boundary holds a built-in node)
found: P107 NSP-016 s60, 2026-10-08 — the runtime deep run (10,000 at seed 20734; sequence seed 3455271128, shrunk to one step)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.21; measured on the runtime target ("Invalid array length")
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.visual.columns.json "row C134 — Auto Fit with Min Column Width 16 and Horizontal Gap −16: Default, and a resize sends nothing"
---

**What a person sees.** A Columns set to Column Sizing **Auto Fit**, with a negative Horizontal Gap equal to minus its Min Column
Width (for instance a gap driven to `-16` by an Expression beside a 16 px minimum): the page goes blank as soon as the container is
measured. A gap a little above that (`min + gap` a tiny positive number) does not throw but asks for an enormous column count — the
array is built and filled, so a large enough count runs the page out of memory.

**Where.** `calcAutoFit` divides by `minWidth + marginX` with only `minWidth > 0` guarded. At 0 the count is `Infinity`;
`Math.max(1, Infinity)` keeps it; `new Array(Infinity)` throws `RangeError: Invalid array length` in render, and React unmounts the
root.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says what a person should get (R11: Auto Fit
reports Default, nothing else on the wire); the runtime target counts the divergence as a known row.

**Proposed fix.** Clamp the count: treat a `min + gap` at or below 0 as one column (as a negative one already is, through
`Math.max(1, …)`), and cap it at the number of children — more columns than items draws nothing more. Fixing it drops the
scenario's `row` and the known row in the same commit.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Treat it as one column, and never draw more columns than there are children".**

**Fixed (P109 ISL-050, s32, 2026-10-09), as ruled.** `calcAutoFit` treats a step (`min + gap`) at or below 0 as one column and never
counts more columns than the Columns holds children (`resolveColumnLayout` passes `children.length`; a caller that passes none keeps
the old count) — as CSS `auto-fit` collapses empty tracks, so with fewer children than would fit, each column is wider than before. The
known row and the scenario's `row` are gone; the Columns spec needs no new version (R11 already said what a person gets). Runtime
49 / 49 at seeds 13 and 20732; mutants 82 / 82; control (the C133 commit's `Columns.tsx`) red on exactly the C134 scenario;
`nda-006-columns-layout.test.tsx` gained the clamp's cases (on the base file it does not compile — the four-argument call — rather than
failing an assertion); viewer Columns tests 105 / 105.
