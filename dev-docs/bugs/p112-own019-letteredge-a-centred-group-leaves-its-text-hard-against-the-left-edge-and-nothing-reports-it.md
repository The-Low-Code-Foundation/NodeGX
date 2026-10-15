---
id: P112-OWN019-LETTEREDGE
title: "TL2's hero week strip draws each day letter hard against its chip's left edge: the chip Group centres its child (alignItems/justifyContent center), but a Text stretches to the Group's width and is left-aligned, and no render_report reading says text touches the edge of its own outlined box"
status: fixed
commit: 2ba01d07f
phase: P112
task: OWN-019
severity: medium
area: kit / MCP — the look teaching (`get_style_vocabulary` layout rules) and render-measure (`packages/noodl-mcp` render harness: no "text against its box's edge" reading); the node model's Text width default is the trap
found: P112 OWN-019 s7, 2026-10-15 11:10 (Richard's look verdict on TL2, tgz33, graded 19/19)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s7); TL2 `components/Shared/DayChip/nodes.json`
regression: packages/nodegx-render-measure/tests/textAgainstEdge.test.js "🔴 TL2's chip letters, set left in a stretched Text, are named on HEAD — the reverted arm is silent"
kit: mcp
---

Richard (on TL2's laptop hero): "a weird artifact for the weekday repeater in the hero part" — seven outlined chips,
each letter (M T W T F S S) at the chip's top-left edge, the chips' corners pressing past the strip's rounded track.

TL2's `/Shared/DayChip`: `chip_root` Group — width 100%, height 48 px, `flexDirection: column`, `alignItems: center`,
`justifyContent: center`, a 1 px glass border; `chip_letter` Text with only a colour and line height. Large 4 asked for
a centred letter the way CSS would; the Text fills the Group's width and its letter sits left, so only `textAlignX:
center` on the Text centres it (the s6 control's wordmark fix was the same parameter). The grader passed TL2 19/19:
`align` reads a section's parts against a centred heading, `gaps` reads holes between a row's parts — neither reads a
letter inside its own box.

Open: a reading for text whose ink sits within a few px of the edge of the bordered or filled box that holds it (with
TL2's chips as the known-firing case, and the gallery's corpus as the control), and a line in the layout rules that a
Group's centring does not centre a Text's letters. Then the Launch series again.

Fixed (s8, 2026-10-15): render_report's new `text-against-edge` (warning, every width) — the words' own ink (a Range)
within 3 px of the inner left or right edge of the nearest of their first four ancestors with a border or a fill
(a page-wide band and an inline highlight are not frames). It names up to three and says what to set: "Centring a
Group does not centre a Text's letters … give the Text textAlignX: center, or give the box padding." And
get_style_vocabulary's `layout` rules now say the same where the look is chosen. Measured from source over the whole
gallery (26 apps, three widths each): **TL2 fires** — its seven day chips, 0 px from the left edge, at 1280 (155×48)
and at 390 (39×48) — and **the other 25 are silent** (9 quizzes, 6 Launch pages, Pack It, the editors, the
yardstick-era apps). Not yet re-run in a Launch round.
