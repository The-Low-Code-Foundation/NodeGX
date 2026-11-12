---
id: P112-OWN027-IMAGEGROUNDSPILL
title: An imageGround band holding more than a headline spills upward over the band above it, and no gate notices
status: fixed
severity: medium
area: mcp / style vocabulary composition `imageGround` + render_report
found: P112 OWN-027 arm T v2b-e4b and v2b-lfm3, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/T/v2b-e4b/shots/pages-home-desktop.png (top: the gallery's cards drawn over the hero headline), runs/T/v2b-e4b/ledger.json (s2n0.look = imageGround, s2.bits = headline, sub-line, list of items, photo)
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/nodegx-render-measure/tests/own028Gates.test.js "fires when a band draws its content up over the band above, naming both and by how much"
---

What a person sees: the top of the page is a pile-up. The hero's headline has a row of cards printed over it, and
the cards belong to the NEXT section.

Cause: the `imageGround` composition (`get_style_vocabulary` → compositions) is `sizeMode: "explicit"`,
`height: 520px`, `justifyContent: "flex-end"`. Put a headline in it and it is a photo band with words at the
bottom, as designed. Put a headline, a sub-line and a 4-card grid in it (E4B did; LFM3 did with six bits) and the
content is taller than 520 px. Because it is packed to the END of a fixed box, the overflow grows **upward**, out
of the top of the band and over the section above. Nothing clips it.

No gate saw it: render_report on v2b-e4b reported `minimum-layout-width` and `low-contrast-text` only. Bands
overlapping is not measured.

Fix, in two parts, both small: (1) the composition takes `sizeMode: "contentHeight"` + `minHeight: 520px` instead
of a fixed height. It is still a 520 px photo band when it holds a headline and grows downward when it holds
more. OWN-027's harness does exactly this as rule V10. (2) render_report: a finding when a section's box overlaps
its previous sibling's box (`overlapping-sections`).

Fixed (OWN-028 AC2): `imageGround` is `sizeMode contentHeight` + `minHeight 520px` (description says so; `ui-image-scrim-band` the same, enriched catalog merged); TPL-001 and TPL-003 pin the bytes they shipped. render_report `overlapping-sections` reads each band's ink against its neighbours' boxes. Proof: own-027-T-v2b-e4b fires at desktop (the gallery 891 px up over the hero), 768 and phone; the same copy with the composition applied by hand renders the gallery under its heading and the finding is gone; own-027-C stays clean.
