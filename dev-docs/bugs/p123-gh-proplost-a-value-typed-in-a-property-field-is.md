---
id: P123-GH-PROPLOST
title: A value typed in a property field is dropped when another field is touched within 350 ms
status: fixed
severity: medium
area: nodegx-studio / property panel (editor/studio.html fieldFor `set`, one shared `propTimer`)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
commit: nodegx-studio b3c6a94 (editor/studio.html, editor/check.mjs)
regression: ../nodegx-studio/editor/check.mjs "a length typed in a style and a weight picked straight after are both written"
---

A typed value is saved 350 ms after the last keystroke, through ONE timer shared by every field of the panel
(`studio.html` `fieldFor`: `set(v, false)` → `clearTimeout(propTimer); propTimer = setTimeout(run, 350)`), and blur
does not flush it. So typing a font size and then, within 350 ms, picking a weight in the next dropdown (an immediate
`set`, which also clears `propTimer`) or typing in the next field silently drops the first value.

Measured: a Text style filled field by field 250 ms apart kept 1 of 6 values (only the dropdown's Font Weight reached
`nodegx.styles.json`); 550 ms apart, 6 of 6. A person tabbing between fields can hit it.

Fix (small): one timer per field, or flush the pending write on blur / before any other `set`.

Fix (2026-10-30, nodegx-studio `editor/studio.html` `propLater`/`propFlush`): a typed value still waits 350 ms for the
next keystroke, but the pending write is kept with its field's key, and any other field's write (typed or picked)
runs it first instead of clearing it. The page data's name box uses the same pending slot. A field's write also names
the component it was typed in, so a page switched within 350 ms no longer takes it.

Graded: `check:editor` 236/236 with the new row (a style's Spacing typed `23`, then Font Weight picked Bold at once:
both in `nodegx.styles.json`); with the old shared timer put back, 235/236, that row alone failing (`lengths: []`).
