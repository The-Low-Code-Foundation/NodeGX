---
id: P127-BKO007-STALEDRAFT
title: After a drag onto a table whose panel is open, the panel's rule editor shows the old rule as the person's choice, and its Make it so would put the old rule back
status: fixed
severity: medium
area: "@nodegx/backend-map `public/app.js`: the table panel's draft (`state.edit`) was seeded only in `select()`; `afterGesture` and `undo` re-read the backend and drew the panel again from the old draft"
found: P127 BKO-007 AC9, 2026-10-31, the hands driven inside Studio in the conversation (Studio's hosted-check, the todo copy)
evidence: "MEASURED (hands-ui.test.mjs step 8, training copy, before the fix): Progress open, Anyone at all dragged onto it and made; the backend's find = public, the panel's read choice = authenticated, Make it so enabled, its preview 'After this: reading directly — Anyone signed in'. After the toast's Undo, the mirror: choice = public, Make it so enabled. Studio's picture: dev-docs/tasks/phase-127-the-backend-in-the-open/look/bko-007-hosted-made.png (the header says Open to anyone at all, the choice says Anyone signed in)"
owner: P127 s13 (2026-10-31)
commit: 397e656f2
regression: dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/hands-ui.test.mjs "its open panel shows the rule as it now is (anyone at all may see), and offers nothing to make" and "and its open panel shows the rule put back, with nothing to make"
kit: backend-map
---

Medium: nothing changes until the person presses Make it so, but the panel then says the old rule is what they chose,
with a preview of it. One press after a grant takes the grant back, and one press after Undo puts the undone grant
back. The header above the editor (from the backend) and the editor (from the draft) disagree on the same screen.

**Fix:** `freshEdit(key)` seeds the draft from the rule as it now is. `select()` uses it, and `afterGesture` and `undo`
call it for the open table before drawing the panel again. Before the fix the first check was red (the evidence
above); with only the `undo` line taken out, the second is red (choice = public, Make it so enabled).

**Not changed:** a reload because the file or the backend changed outside the map (`load(true)` from the feed) still
keeps the draft, so a person half-way through choosing doesn't lose it. If they had chosen nothing, the editor can lag
the rule the same way until they reopen the table. Not measured.

Reaches people with the next `@nodegx/backend-map` publish (0.1.7) and Studio's pin.
