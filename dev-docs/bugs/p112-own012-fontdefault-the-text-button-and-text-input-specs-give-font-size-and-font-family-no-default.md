---
id: P112-OWN012-FONTDEFAULT
title: "The Text, Button and Text Input specs give Font Size and Font Family no default, so a drawer measuring text from the descriptions has to assume the browser's (16 px, system-ui) on every node that sets neither"
status: open
phase: P112
task: OWN-012
severity: low
area: "`@nodegx/node-spec` visual specs (`src/nodes/text.ts` `fontSize` / `fontFamily`, `button.ts`, `text-input.ts`); the canvas measurer `src/draw-canvas.ts` reports the assumption"
found: P112 OWN-012 s2, 2026-10-18 (the todo template's first page drawn from the descriptions: 9 of 17 boxes carried the assumption)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-012/measured/measure-todo-list-copy-390x844.json (`needs`: "Font Family has no default in the spec; system-ui assumed" on every Text, Button and Text Input)
kit: node-spec
---

A visual spec says what a person gets (P107 R11). The Text spec's `fontSize` and `fontFamily` ports have no `default`
(`text.ts` :294, `fontFamily` beside it); the Button's and the Text Input's are the same. The runtime does have a
default — the browser's 16 px in the page's font — but it lives in CSS, which the spec deliberately leaves out, so a
drawer that measures text from the descriptions (OWN-012, `src/draw-canvas.ts`) has to assume a size and a family and
say so. On the todo template's sign-in page every text sets a size but none sets a family: nine nodes carry the
assumption. The measurement still matched (system-ui is what the real app resolves to on this Mac), so the row is
about the description, not the pixels: a description that depends on an unwritten default is incomplete.

**Fix shape:** give the three specs' `fontSize` a default of 16 and `fontFamily` a default that names the inherited
font in the vocabulary's own words (the Text spec's Line Height Auto already says "follow the font"). Then the
measurer's "assumed" need goes, and `tests/draw.test.ts`'s canvas-measurer rows read the default from the spec.
