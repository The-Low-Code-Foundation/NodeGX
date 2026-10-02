---
id: P109-F29
title: `uncollapsible-multi-column` fires on wrapped rows of fixed-size swatches and misses the child row that really overflowed a phone
status: fixed
commit: db086d75f
phase: P109
task: ISL-022
severity: medium
area: validator / responsiveArrangement (uncollapsible-multi-column)
found: P105 CG-003 AC1 and §7.2, 2026-09-28; P108 IW-008 added `Robot/Card` (audit P109 F29)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F29; ISL-022 §2; dev-docs/tasks/phase-105-the-coding-garden/CG-003-THE-PAGES.md §7.2
---

The warning fires 4–6 times on every generation of the garden, after GAM-022 was marked done, on rows that are fine:
two are wrapped rows of 44 px colour swatches (told to become 260–320 px columns, which would break them). Meanwhile
the row that really overflowed — `Garden/Top bar`'s tab strip `brTabs`, 506 px wide in a 390 px viewport, so mobile
Chrome zoomed the whole page out and every tap landed 0.77× off — was never inspected. The warning fired on its parent
`brBar`, which does wrap, so it was pinned as noise.

**Where:** `packages/noodl-editor/src/editor/src/validation/responsiveArrangement.ts` — arm B fires on items with an
explicit width (`:188-218, 296-326`, kept on purpose by GAM-022); arm A skips a `contentSize` container and
instance tracks of one node (`:115, 122, 177-182, 327-345`), so `brTabs` (`flexWrap: wrap`, `sizeMode: contentSize`,
which can never wrap) is invisible to it. Last changed 2026-09-16 (`593de4f57`, GAM-022).

**Reproduce:** generate the garden; the gate `packages/noodl-mcp/tests/cg003Template.test.ts:269-279` pins exactly
`Garden/Top bar`, `Robot/Card`, `Robot/Options`, `apply`.

**Proposed:** 🔒 ISL-022 (reverses GAM-022's choice): fire only when a row can be wider than a phone, and add the
`contentSize` + `flexWrap` row to the layout-inert family (`validation/layoutInertCombination.ts`). Medium.

**Fixed (P109 s4, 2026-10-02, `db086d75f`) on Richard's ruling "Yes, both":** arm B silent on items a phone holds, arm A
silent on a wrapped row of clusters, and the new code `row-cannot-wrap` names `brTabs`. ISL-022 §8 s4 has the census and
the pins. ISL-022's AC6 (Claude Code over the real door) is still owed.
