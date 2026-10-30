---
id: P123-STU-MAPBARNULL
title: Studio prints "null" at the end of Data → Map's bar on "Who can reach what", and in a drawer with no buttons
status: fixed
commit: nodegx-studio 500cad0
severity: low
launch: beta
area: nodegx-studio `editor/studio.html` renderMap (`bar.append(…, cond ? button : null)`) and openDrawer (`d.append(…, foot ? … : null)`)
found: P123-STU-DARKMAP's drive, 2026-10-30 (check:data's `stu-060-map.png`: "null" at the bar's right end)
evidence: check:data with the fix undone — FAIL the map's bar says nothing it should not ("null"), 80/82
---

Studio's `h()` drops a null child, but `Element.append` (the DOM's own) writes a null out as the text "null". Two
calls passed one straight to it: Data → Map's bar on "Who can reach what" (the "New data type" button is only on
"Data model") showed **null** at its right end, from dfa84e7 on; and a drawer opened with no buttons ("The imported
rows" while it checks, "Deploy to live" while it compares) showed **null** under its body. A sweep of every
`append`/`prepend`/`replaceChildren` in `studio.html` for a null or `&&` argument found these two only.

Fixed: both pass `...(cond ? [el] : [])`. check:data asserts the bar holds no "null"/"undefined" (fails with the fix
undone, passes with it).
