---
id: P121-TWO005-TABMARK
title: A Button's icon goes left or right of its label only, so a bottom bar's tab (its mark over its word) needs a two-line label and CSS
status: open
severity: low
area: viewer / Button (`packages/noodl-viewer-react/src/components/controls/Button/Button.tsx`, `iconPlacement` in `node-shared-port-definitions.ts`)
found: P121 TWO-005 s14, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-005-THE-COMMUNITY-APP.md §9.5
kit: core
---

A phone app's bottom bar draws each tab as a mark over a word: ⌂ over Feed, 🙏 over Prayer. The approved picture for
the community template does (`.nav button b { font-size: 1.3rem }` over a small word). A Button has an icon, but
`iconPlacement` takes `left` or `right` only, so the mark can't go above the label.

Measured 2026-10-15, building the template's sections (TWO-005 slice 4): the workaround is a label with a newline in
it (`⌂\nFeed`), the class `white-space: pre-line`, and `display: block` plus `::first-line { font-size: 1.3rem }` to
draw the mark large. It works because the Button renders its label as one bare text node. Without the
`::first-line` rule the marks drew at the word's size (the drive's check, mark taller than word: 15 px against 15 px,
red). On a tablet the same tabs run down a rail as one line, so the CSS undoes it there.

A builder without CSS can't make the bar the picture shows. An agent reaching for `iconPlacement: 'top'` is refused.

Fix, proposed (small): `iconPlacement: 'top'` (and `bottom`) on Button: the icon and the label stacked, centred, with
Icon Spacing between them. The node spec, both catalogues and the docs carry the new values.
