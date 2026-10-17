---
id: P123-FLOATLOST
title: A Bubble Floating Group converts to a plain Group that scrolls away with the page, and the import report counts it as mapped
status: open
severity: medium
area: P123 importer (`dev-docs/tasks/phase-123-open-bubble/import/bubble2nodegx.mjs` `typeMap`/`styleTypeMap`: `FloatingGroup: 'Group'`)
found: docs session (Bubble dictionary page), 2026-10-17, while writing the Floating group example in `docs-site/docs/bubble-dictionary.md`
evidence: `scripts/bubble-dictionary/sample.bubble.json` element `cmMwz` (the template's "Floating Mobile Nav Menu") → `el_cmMwz` has no `position` parameter; `grep -c float bubble2nodegx.mjs` is 0
---

In Bubble a Floating Group is pinned to the browser window (top, bottom, left or right) and stays put while the page
scrolls: a sticky header or a mobile menu. The converter maps it to an ordinary `Group` in the page flow, so the menu
or header scrolls away with everything else. The import report says 100% of elements mapped and lists nothing,
so the person importing gets no warning.

Fix: read the floating group's `float_relative_to` / vertical and horizontal float settings from a real export and set
`position: fixed` (or `sticky`) with the matching offsets on the Group. Until then, a finding in IMPORT-REPORT.md.
Size: one table row plus one export to pin the property names.
