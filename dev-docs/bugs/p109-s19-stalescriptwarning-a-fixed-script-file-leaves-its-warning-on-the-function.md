---
id: P109-S19-STALESCRIPTWARNING
title: "A fixed script file leaves its \"scripts/…: broken\" warning on the Function after the Function has run clean"
status: fixed
commit: a301c9260
severity: medium
area: runtime / Function node (`packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts`, the `scriptsFor` branch of the run)
found: P109 ISL-005 build session 4, 2026-10-05 (driving AC4 in the editor on a throwaway profile)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Build session 4"
regression: packages/noodl-runtime/test/isl-005-script-files.test.ts "a fixed file clears the failure on the next run"
---

A Function whose script file fails raises the failure through `raiseRuntimeError`. The editor stores it as a warning
on the node, keyed by its code (`function/script-file-failed`, `-missing`, `-name-clash`, `scripts-in-cloud`). Nothing
ever cleared those four keys.

Measured in the editor: `scripts/engine/words.js` was broken from the shell. The Olive Function showed one warning:
`scripts/engine/words.js:3: Unexpected token ';' — breaks 2 Functions: …`. Then the file was fixed. The preview re-ran
and showed "Hi there, Olive!", but the node stayed red with the old message. So the person sees a broken file that is
not broken. The runtime test "a fixed file clears the failure" checked `lastError` only, never the editor's warning, so
it passed.

Fixed: a run whose files load clears all four codes from its node. Driven again on the rebuilt viewer bundle. Broken:
the one warning. Fixed: "Hello, Olive!", and no warning on either Function.
