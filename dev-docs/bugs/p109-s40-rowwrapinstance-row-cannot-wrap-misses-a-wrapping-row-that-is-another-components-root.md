---
id: P109-S40-ROWWRAPINSTANCE
title: "`row-cannot-wrap` misses a wrapping, content-sized row when it is another component's root placed in a row"
status: fixed
commit: ec1f21e96
phase: P109
task: ISL-022
severity: medium
area: editor validator (`layoutInertCombination.ts`, `row-cannot-wrap`), the MCP door's write diagnostics
found: P109 s4, 2026-10-02 (ISL-022 AC6's first agent round, recorded in the task only); filed P109 s40, 2026-10-10
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-022-THE-WRAPPED-ROW-WARNING-MEANS-A-ROW-WILL-OVERFLOW.md §8 s4 (finding 1) and s40
regression: packages/noodl-mcp/tests/isl022RowWrapAcrossComponents.test.ts
---

ISL-022's `row-cannot-wrap` reads one component, and returned nothing for a component's root (`if (!parent) return []`).
So the garden's `brTabs` shape, split across two components (a `Tab Bar` whose ROOT is the row of five tabs at
`contentSize` with `flexWrap: wrap`, placed in `Top Bar`'s row) was never named. That is exactly how Claude Code built the
top bar in AC6's first round; it only missed the shape because it also left out the wrap. On a phone the row runs past
the screen and the browser cuts it off or zooms the page out.

Fixed: the rule also reads the placed component's single visual root through the project views and reports on the
placement (`checkPlacedRowCannotWrap`). The census over all 13 templates shows 0 fires of the new arm. Specs: the editor's
`tests-unit/validation/isl-022-the-wrapped-row-warning.test.ts` (15 cases, two mutants) and the door spec above
(red with `views` un-wired).
