---
id: P112-OWN026-BUTTONFILLSROW
title: "A Button set to Content Height in a row keeps Width's default 100%, so it fills what its row leaves (Watering Can's Sign out stretches beside \"My plants\"), and nothing warns"
status: open
severity: low
area: noodl-mcp validation / Studio layouttips (P112-OWN020-FILLGROW's family: warn and teach) — runtime behaviour is as specified
kit: node-spec
found: Richard, 2026-11-03, on Watering Can (Mistral Large 4.0): "the 'sign out' button takes up the width left by 'My plants' and has no spacing between the text and button"
evidence: ~/wc/watering-can/components/Pages/Home/nodes.json — `header` row (justifyContent space-between) holds `title` Text (contentSize) and `signout_btn` Button {sizeMode: contentHeight, no width}; node-shared-port-definitions.ts addDimensions (Width shown under contentHeight, default 100%); layout.ts Layout.size (a % on the row's axis becomes flex-grow)
---

**What happens:** the Button's own default is Content Size and would hug its label. The agent set `sizeMode:
"contentHeight"` (as on its full-width buttons) and gave no width. Content Height means "width from Width", whose default
is 100%. In a row a percentage width becomes flex-grow, so the button takes everything the title leaves, and
space-between has nothing left to space.

**Not a runtime defect:** the spec's R38 rows read this way. The gap is that nothing says so: Studio's layout tips know
two row codes (`content-row-splits-its-children`, `row-of-words-fills-its-column`) and neither covers a control at an
unwired default 100% beside a sized sibling in a row. A warning naming the element, with the fix "Content Size" (or a px
width), would have caught it, the way FILLGROW was ruled: warn and teach.
