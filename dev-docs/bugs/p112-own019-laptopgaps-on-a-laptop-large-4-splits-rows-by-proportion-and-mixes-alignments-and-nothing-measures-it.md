---
id: P112-OWN019-LAPTOPGAPS
title: "On a laptop, Large 4's landing pages split a row by proportion or space-between across the whole width and mix centred with left-aligned parts in one section — a two-character number gets a fifth of the page, a price sits 250 px off its centred heading — and neither render_report nor the Launch grader measures it"
status: fixed
commit: 262698308
phase: P112
task: OWN-019
severity: medium
area: kit — what the agent is told about laptop layout (Vibe AGENTS.md / the style skill), the Columns node's description (`noodl-viewer-react/src/nodes/visual/columns.ts`, proportions only), `render_report`'s look tells; the lab's `own-019/grade-launch.mjs` look checks
found: P112 OWN-019 s5, 2026-10-14 — Richard, reading RL1's laptop page ("funny justification choices and spacing in a couple of the Driftwood examples")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s5)
regression: packages/nodegx-render-measure/tests/laptopGaps.test.js "🔴 RL1's number row and its eyebrow are named; its nav bar and FAQ '+' rows are not"
kit: mcp
---

Richard's screenshot of RL1 (tgz30, 17/17): each feature row puts "01" at the far left and the title/body ~230 px
further right, the number ~17 px above the title's line. Read from RL1's graph (`Components/FeatureSection`): a
**Columns** node, `layoutString: "1 4"` — the number column is a fixed fifth of the content width, because Columns
takes proportions only ("Column widths as space-separated proportions"); the number (mono `text-sm`) is top-aligned
beside a serif `text-2xl` title with `leading-snug`, so their first lines don't share a line.

The same family in L1 (s4, tgz28, 17/17, the look Richard liked): the pricing section centres its heading and line
but leaves the Monthly/Yearly toggle and "€6 a month" ~250 px left of centre; each feature row pushes its card to
the far right (`justifyContent: space-between` across the full row), a wide hole between text and card.

Both pages pass every check today: render_report reads overflow, fit and template tells; the Launch grader's look
checks are font, palette, scale, contrast, phone width and "the laptop layout differs". None reads a dead gap or an
alignment that changes inside a section, so the agent's own look (render_report) never showed it either.

**Proposed (to measure, for tgz31 — not the running series kit tgz30):** (1) say it where the agent decides layout: a
label or number beside text is a row Group (the label at its own width, the copy grows), not Columns proportions; a
section keeps one alignment; a row on a wide page has a max width and a gap, not space-between to the edges; (2) a
render_report look tell the agent sees at 1280: siblings in one row separated by more than ~20% of the row's width,
and a section whose children's centres differ by more than ~40 px when its heading is centred; (3) the same two
measurements in grade-launch.mjs, proven on RL1 / L1 (red) and a control. Richard's look verdict is the final word.

**Ruled R39 (Richard, ~17:00): "Yes to all of the above", plus render_report at three sizes. Built (s5):**
(1) `render_report` reports `row-gap` and `alignment-drift` at desktop width — render-measure measures each child's
ink (text runs via Range, painted boxes); graded on the gallery: RL1 3 gaps + 2 drifts, L1 3 gaps + its pricing drift
("centres 'Pricing', but 'Monthly' sits 256px left"), GL1 2 drifts, the nine quiz apps and s4's Launch control none
(`262698308`). (2) `render_report` renders desktop, 768×1024 and phone by default (`ed121860d` — the first cut sent
"tablet", which the real CLI refused on every call; its specs stub the CLI; caught by a real run before any kit
carried it). (3) `get_style_vocabulary` says the layout rules (`layout`, and a LAYOUT line in the prompt form).
(4) The Launch grader's `gaps` and `align` (render-measure's own measure and summarise at 1280): control 19/19, RL1
17/19 (exactly those two). Ships in tgz31; whether Large 4 then builds without the holes is measured there.
