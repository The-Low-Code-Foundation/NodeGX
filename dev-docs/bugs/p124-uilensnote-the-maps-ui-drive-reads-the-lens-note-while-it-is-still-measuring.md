---
id: P124-UILENSNOTE
title: "The backend map's page drive reads the lens note the moment the lens is clicked, while it still says \"Running the backend's functions as Someone not signed in…\", so `ui.test.mjs` is red"
status: fixed
commit: (this session, the Beta sweep s4)
severity: low
area: backend map tests (`dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/ui.test.mjs` :73-75)
found: the Beta sweep, 2026-10-25, running the package's `npm test` for NPMAUDIT-BACKENDMAPSCREENS
regression: dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/ui.test.mjs
evidence: `node test/ui.test.mjs` → `FAIL the lens says, in words: "Running the backend's functions as Someone not signed in… 0 rows have reached them so far.…"`, red twice with this session's map changes AND with the committed (HEAD) map code swapped back in
kit: core
---

The test clicks the "not signed in" lens and reads `#lensNote` at once, expecting the rule-based sentence "Someone not
signed in can run 1 of 27 functions (unsubscribe)". The lens now measures by running the functions as that person,
which takes a while, so the note still says it is running. The next assertion ("the lens says, measured: …") passes.
Either wait for the measured note before reading, or assert the sentence the page now shows. Not decided which is the
promise.

**Fixed (2026-10-25, the Beta sweep s4): the test reads the promise the page makes now.** `app.js` `renderLensNote`
decides it: a lens with a measurement (the "not signed in" one has one now, `state.reach` with no id) says what came
back, "<who> can reach N of T rows, in L of 27 tables. Dark tables: …"; the rule-based "can run N of M functions"
sentence is what a lens says only when nothing was measured. So the drive waits for the run to finish (the wait
`people.test.mjs` uses) and asserts the measured sentence from the page's own counts. `node test/ui.test.mjs` all
passed; the package's `npm test` exit 0, "Everything passed".

