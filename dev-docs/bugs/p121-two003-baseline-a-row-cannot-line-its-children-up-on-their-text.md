---
id: P121-TWO003-BASELINE
title: A row can't line its children up on their text (Group's Align Items has no "baseline"), so a heading with small words beside it sits on the wrong line
status: open
severity: low
area: runtime / Group (`alignItems` enum: flex-start, flex-end, center, stretch)
found: P121 TWO-003 s5, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §8.5
---

The marketplace's approved picture draws a section heading with small words on the same line ("Sellers … in 3
countries", "On sale … prices in GH₵"), lined up on their text: CSS `align-items: baseline`. Through the MCP door,
`alignItems: 'baseline'` on a Group is refused: `"baseline" is not one of this port's options → available:
flex-start, flex-end, center, stretch` (measured 2026-10-14, `npm run template:marketplace`).

The template uses `flex-end`, which lines up the bottoms of the two boxes; with a 1.125 rem heading and 0.75 rem
words the small words sit a little below the heading's text. Cosmetic, and every heading-with-a-count row meets it.

Fix, proposed: add `baseline` (and `first baseline`) to Group's Align Items, and to Align Self where it is offered.
