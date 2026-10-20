---
id: P18-S116-ROWSPREAD
title: Two Texts in a row share its width in the running app and sit at their content width in the export
status: open
severity: low
area: export / layout (Text size mode)
found: P18 session 116, 2026-10-16, reading the s116 drive's screenshots (and s115's, which show the same)
evidence: dev-docs/tasks/phase-18-code-export-v2/s116-queryparams-drive/shot-runtime-berlin.png against shot-export-fixed-berlin.png; s115-query-drive/shot-runtime.png against shot-export-fixed.png; nodegx-export src/emit/style.ts:651-654 (a width is emitted only when the `width` parameter is set); runtime noodl-viewer-react src/nodes/visual/text.ts:166 (`defaultSizeMode: 'contentHeight'`)
---

`ContactRow` (the export suite's `search-desk`) is a row Group holding two Texts, name and city, with a column gap and
no width set on either. In the running app each Text takes half the row: the cities line up at the row's middle
(x = 418 of an 800-wide page). In the exported app each Text is as wide as its words and the city sits right after the
name. Same rows, same words, a different page.

Measured on two drives' screenshots, both pre-existing (s115 shows it at HEAD `5eeb07bdc` too). The cause is not read
yet: the runtime's Text defaults to the `contentHeight` size mode, whose width is the port's default rather than the
content, and the export emits a width only when the parameter is set; whether that default is 100% (and so the halves
are flex shrink) has to be read in `addDimensions` before a fix. Reach unmeasured: any Text with no width in a row.
