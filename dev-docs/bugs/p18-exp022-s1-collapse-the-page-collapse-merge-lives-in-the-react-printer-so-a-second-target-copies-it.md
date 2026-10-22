---
id: P18-EXP022-S1-COLLAPSE
title: The page collapse's style merge is decided in the React printer, not the plan, so the Swift printer had to copy it, and a second copy drifts
status: open
severity: low
area: export / the page collapse (`packages/nodegx-export/src/emit/component.ts` :497-512, the merge of `plan.collapsedGroupId`'s style into the page; copied into `src/emit/swift/view.ts` `styleOf`)
found: EXP-022 session 1, 2026-10-22, writing the Swift printer for story-engine (every page in it collapses its band Group)
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md §9; dev-docs/tasks/phase-18-code-export-v2/exp-022/s1/
---

The plan decides that a page collapses into its one Group (`ComponentPlan.collapsedGroupId`), but **what the collapsed
page looks like** is decided in the React printer: `component.ts` computes the Group's style, puts its declarations first,
and keeps the page's own only where the Group does not set the same property. That is a target-neutral decision (it is
about the graph, not about React), and it sits where only one target reads it.

The Swift printer needs the same answer, so it carries an 8-line copy (`view.ts` `styleOf`). Today the two copies
agree. Nothing makes them keep agreeing: a change to the React rule (a page-own `cssClassName`, §48, is already handled
there and not in the copy) moves one target and not the other, and no test compares them.

**This is the first place EXP-022 found where the plan leaks into a printer.** It is small, and it is the shape §7 said
to look for: "where the IR or the plan leaks React".

**Fix:** the plan (or a shared helper beside `computeNodeStyle`) returns the merged declarations for the root of a
collapsed page, and both printers read them. It changes `plan.ts` or `style.ts`, so it goes through the React session's
whole-package suite first.
