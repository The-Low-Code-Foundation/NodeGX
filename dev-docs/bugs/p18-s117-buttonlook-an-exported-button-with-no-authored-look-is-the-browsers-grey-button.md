---
id: P18-S117-BUTTONLOOK
title: An exported Button with no authored look is the browser's grey button; the running app's is black with white text
status: open
severity: low
area: export / Button
found: P18 session 117, 2026-10-16, driving P18-S116-QUERYFETCH (`s117-queryfetch-drive/`)
evidence: dev-docs/tasks/phase-18-code-export-v2/s117-queryfetch-drive/shot-runtime-added.png beside shot-export-fixed-added.png; noodl-viewer-react/src/nodes/controls/button.ts `inputCss.backgroundColor` (default '#000000'); nodegx-export src/emit/style.ts :83 (the Button maps only its label and Enabled)
---

A page with a Button whose look nobody set: in the running app it is a black button with white text and padding. In the
exported app it is a bare `<button>`, so it shows the browser's own grey button with black text, a different size, in a
different place in the row.

Seen in the s117 drive: the Refresh and Add buttons of `fetch-desk`, both with only a label. The two screenshots show
the same rows from the same request, and different buttons.

Reach, counted from the project files on this machine (not from the export): 1,548 Button nodes in 177 project folders;
518 of them, in 78 folders, author no background colour and no variant. Some of those may take their look from a style
or theme the export already carries; how many export grey is not yet measured.

Where: the runtime's Button declares its look defaults on its inputs (`button.ts` `inputCss`, `backgroundColor` default
`#000000`, and the text colour and padding beside it); the export emits an authored value only, so an unset one falls
back to the browser's. The fix is the defaults the runtime's own definition declares, emitted in the Button's class when
the author left them unset (ISL-011 did the same for a kit's default CSS). Small. Read the runtime's full default set
first, from the definition, not from a screenshot.
