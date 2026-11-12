---
id: P112-OWN029-IMAGEGROUNDNOTOP
title: An imageGround band taller than its 520px floor starts its text flush against its top edge, and no gate notices
status: fixed
severity: medium
area: mcp / style vocabulary composition `imageGround` + render_report
found: P112 OWN-029 run A2-puppy round 3, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-029/runs/A2-puppy/r3/shots/pages-home-desktop.png (third band, "Your new companion awaits. Explore adorable pups." touching the band above), runs/A2-puppy/ledger.json (roundsLog[3].sections[2].band = imageGround, bits eyebrow/headline/sub-line/body text/quote/name line + a 6-item list; roundsLog[3].findings = [])
kit: mcp
phase: P112 OWN-029
commit: 1d0639e73
regression: packages/noodl-mcp/tests/styleTools.test.ts "imageGround keeps room above its copy once it is taller than its floor"
---

What a person sees: a photo band whose headline is pressed against the top of the band, with no breathing room,
as if it were cut off by the section above.

Cause: OWN-028 fixed P112-OWN027-IMAGEGROUNDSPILL by making `imageGround` grow with what it holds
(`sizeMode: contentHeight`, `minHeight: 520px`, `justifyContent: flex-end`). It kept the one padding it had,
`paddingBottom: var(--space-12)`, and has no `paddingTop`
(`packages/noodl-editor/src/editor/src/models/StyleTokensModel/StyleCompositions.ts`, id `imageGround`). While the
content is shorter than 520 px the free space sits above it, so nobody noticed. Once the content is taller (a
headline, three lines and a six-card grid) the band is exactly as tall as its content plus 48 px at the bottom, and
the first line of text starts at the band's top edge.

No gate saw it: render_report reported no finding for the page. `overlapping-sections` does not fire (nothing
overlaps), and `text-at-viewport-edge` measures the horizontal edges only.

Fix, likely: give `imageGround` a `paddingTop` (the other spine bands use `--space-16`…`--space-24`), and say so in
its description. A render check for "text within N px of its band's top edge" would catch the class.


**Fixed 2026-10-29 (OWN-029 s3, `1d0639e73`):** `imageGround` and `ui-image-scrim-band` carry `paddingTop: var(--space-16)`; TPL-001/TPL-003 keep their shipped bytes by dropping it from their spread. The render check for text at a band's top edge was not added (the composition no longer produces it).
