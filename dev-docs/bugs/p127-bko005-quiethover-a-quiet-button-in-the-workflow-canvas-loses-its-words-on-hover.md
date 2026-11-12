---
id: P127-BKO005-QUIETHOVER
title: In Studio's dark workflow canvas, every quiet button lost its words on hover (a light background under light text)
status: fixed
severity: low
area: "nodegx-studio `editor/studio.html` CSS: `button.quiet:hover` (the light theme's `--panel-2` background, specificity 0,2,1) beat `.wf button` (0,1,1) for the background, while `.wf button:hover` set only the border and a light `--fg` text"
found: P127 BKO-005, 2026-10-27, the first `--shots` run of `editor/automations-drive.mjs`, with the pointer still on the new "Move it" button
evidence: "MEASURED: `look/bko-005-trigger-moved.png` (first run) showed \"Move it\" as a blank white box; the same shot after the fix shows the label on a dark hover. READ: the same rules hold for every `quiet` button inside `.wf` (\"All workflows on this page\", Back, Rename, Fit, the zoom buttons)."
commit: nodegx-studio 4dc3310
---

What a person sees: hovering a quiet button in Workflow's canvas (Back, All workflows on this page, Rename, the zoom
buttons, and BKO-005's Move it) turned it into a white box with no words, until the pointer left.

Fixed by giving `.wf button:hover` its own dark background.

No automated regression: a hover state cannot be read from computed style without forcing it. The drive's
`--shots` takes `look/bko-005-trigger-moved.png` with the pointer still on the button.
