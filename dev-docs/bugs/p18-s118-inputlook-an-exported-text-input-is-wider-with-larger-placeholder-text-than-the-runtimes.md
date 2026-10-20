---
id: P18-S118-INPUTLOOK
title: An exported Text Input is wider than the running app's, and its placeholder text is larger
status: open
severity: low
area: export / Text Input (look)
found: P18 session 118, 2026-10-16, driving P18-S116-FIELDMOUNT (s118-fieldmount-drive)
evidence: dev-docs/tasks/phase-18-code-export-v2/s118-fieldmount-drive/shot-runtime-load.png beside shot-export-fixed-load.png (and s116-queryparams-drive's three shots, the same page)
---

The same unstyled City box (search-desk's Text Input, placeholder only) in the runtime and in the export, side by
side in one headless Chrome at 800 × 900. Read by eye off the screenshots, not from computed style: the runtime's box
runs from x ≈ 24 to ≈ 200 and its placeholder is set noticeably smaller; the exported box runs to ≈ 225 with a larger
placeholder. Height and border look the same. The cause is not read: the runtime's default width and font size for a
Text Input against what `style.ts` emits for an input with nothing authored. Measure it with `getComputedStyle` on the
`<input>` in both arms before fixing, as P18-S117-BUTTONLOOK should be.
