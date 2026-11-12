---
id: P132-FOCUSBYINDEX
title: A Backend panel redraw puts the caret in whichever field took the old one's place, and holds back outside changes
status: open
phase: P132
task: BWF-012
severity: low
area: nodegx-studio / Backend tab (renderAutoStepPanel's focus restore, takeOutside)
found: s15 (2026-11-04), Studio's automations drive, BWF-012's first run (144/145)
evidence: nodegx-studio editor/automations-drive.mjs BWF-012 "drawn in the list"
launch: none
commit: worked around for Save this call in nodegx-studio (BWF-012's commit); the mechanism is unchanged
---

`renderAutoStepPanel` keeps the focus over a redraw by POSITION: the index of the focused control among the panel's
inputs, selects and textareas, focused again in the new panel. When the redraw changes which controls there are (a
form box removed, a step that now uses a saved call and has other fields), that index names a different control, so
the caret lands in a field the person never chose.

It matters because `takeOutside` holds a redraw back while a field is focused (so typing keeps its caret): with the
caret moved into a field nobody is typing in, a change made outside Studio (the agent, another window) is not drawn
until that field is left. In the drive, the second workflow written from outside never appeared in the list. A person
clicking anywhere releases it, so it shows as "Studio did not update until I clicked", which is easy to miss.

Worked around where it was met: *Save this call* leaves its name box before it saves, so nothing is restored. Not
fixed: any other panel action that removes the focused control while it is focused has the same reach (a form box with
its own Save, a field that a change hides). The fix is to restore by identity (the control's `data-input`, its label,
or the setting's name), and to restore nothing when that control is gone.
