---
id: P107-C133
title: A Columns whose Medium Layout or Small Layout holds a number (or any value that is not a string) blanks the page when the container narrows into that band
status: fixed
commit: 8d2fe2678
phase: P109
task: ISL-050
severity: high
area: viewer / Columns (packages/noodl-viewer-react/src/components/visual/Columns/Columns.tsx `pickBreakpointLayout` :277-293 picks the layout by truthiness and `parseLayout` :147-154 calls `.split` on it, inside the render; no error boundary holds a built-in node, kit-node-boundary.ts)
found: P107 NSP-016 s60, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.21; measured on the runtime target ("columnLayout.split is not a function", thrown while React draws the Columns)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.visual.columns.json "row C133 — a Small Layout of 0 or null is inert; 2 applies: Small"
---

**What a person sees.** A Columns with Small Below set and Small Layout wired from a Number, a States node whose value is a number,
or an Expression: the moment the container is narrower than Small Below — a phone, or the window dragged narrower — the whole page
goes blank. Medium Layout the same. `0` and `null` are harmless (the band is never picked); `2`, `true` or an object take the page down.

**Where.** The breakpoint layouts are plain props, handed through as they come. `pickBreakpointLayout` picks one when it is truthy
and returns it as the layout string; `parseLayout(columnLayout)` calls `columnLayout.split(' ')`, which a number does not have. The
throw is in render, and a built-in node has no error boundary, so React unmounts the root. Layout String itself does not have this
defect: `readColumnLayoutString` reads a number as its `String`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says what a person should get (R11: the band
applies, Breakpoint Small, At Small); the runtime target counts the divergence as a known row, and the generated sequences withhold
the throwing values (conformance.test.ts `WITHHELD`).

**Proposed fix.** Read Medium Layout and Small Layout through `readColumnLayoutString` before they are used, as Layout String is: a
number is its text, anything else no layout (the band then picks the base layout). Fixing it moves the row's scenario (drop `row`)
and the known row and the withheld values in the same commit.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Read a number as its text, and anything else as no layout".** As Layout String already does.

**Fixed (P109 ISL-050, s32, 2026-10-09), as ruled.** `pickBreakpointLayout` reads Medium and Small Layout through
`readColumnLayoutString`, as Layout String is: a number as its text, anything else — a list, an object, a blank string — no layout, so
the band is left to the base layout. The band is still picked only by a truthy layout, so `0` stays inert (the ruling's literal
reading, `"0"`, would have made it apply; the spec's R11 intent and every earlier release keep it inert). The known row and the two
`WITHHELD` entries are gone, and the scenario's `row`. Columns spec v2 (a band layout must also read as one); a scenario added for the
list, object and blank-string half, which no recorded scenario reached (only a generated sequence did) — it fails against v1. Runtime
48 / 49 at seeds 13 and 20732 (the other is C134's known row); mutants 82 / 82 at both; control (HEAD's `Columns.tsx`) red on exactly
the C133 scenario; viewer Columns tests 104 / 104.
