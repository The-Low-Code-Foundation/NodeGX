---
id: P132-HIDDENPANELCHURN
title: With a backend workflow open in the editor, the hidden Components panel's filter input and the dialog layer's empty portal divs are rewritten about 15,000 times a second
status: open
phase: P132
task: BWF-008
severity: medium
area: noodl-editor / views/panels/ComponentsPanel (FilterBar SearchInput) and the dialog-layer portal (`.dialog-layer-portal-target`)
found: driving BWF-008 item 3 (the value picker's field trees) in the dev editor on a Greenhouse copy, 2026-11-03 (s11); measured, cause unfound
evidence: a MutationObserver on document.body for 2 s, the value picker CLOSED: 29,904 childList mutations on DIV.dialog-layer-portal-target and 3,204 attribute mutations on INPUT.SearchInput-module__SearchInput (placeholder "Filter components", width 0: the Components panel is not the panel on screen). The portal held 49 empty DIVs (class "", outerHTML 11 chars).
launch: none
---

Seen while measuring whether the new field-tree list re-rendered in a loop: it does not (no mutation was inside
`[role=tree]`), but something else does, all the time. With the Workflows panel showing *When a plant is watered* and
a step selected, the Components panel (hidden behind the Workflows panel) keeps rewriting its filter input's
attributes, and `.dialog-layer-portal-target` keeps adding and removing children: 49 empty `<div>`s sat in it at the
moment of reading. Nothing visible changes. Over 15,000 DOM changes a second costs a laptop's battery and CPU for as
long as a workflow is open, and may be why presses sometimes seemed not to land during this drive.

Not known: whether it happens with a page (not a workflow) open, whether it happened before P132, and what writes it.
First step: the same 2 s observer at HEAD with a page open, then with a workflow open; then React DevTools' "highlight
updates" on the Components panel. The observer used is in the BWF-008 s11 record.
