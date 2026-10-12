---
id: P109-S17-SCRIPTSUNDEF
title: A Function body's `Scripts.<file>` is underlined "'Scripts' is not defined", and `Scripts` is never offered
status: fixed
commit: 68b881b53
severity: medium
area: editor / code editor (noodl-core-ui `esLintDiagnostics.ts`, `noodl-api-surface.ts`)
found: P109 ISL-005 build session 2, 2026-10-05 (reading slice 5 before driving it)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 5b"
regression: packages/noodl-core-ui/tests/code-editor/isl005ScriptsInTheEditor.test.ts "lints `Scripts` as defined; a typo on the next line is still reported"
---

Since ISL-005 slice 1 (`53e89d2f2`) a Function's body is compiled with a fifth argument, `Scripts`, one entry per file in
its Uses. The code editor's lint globals for a Function and its completion list still named four, so every line that
reached a script file carried a `no-undef` warning, and typing `Scr` offered nothing. Fixed with `Scripts` in both lists,
plus `Scripts.` and `Scripts.<name>.` completion from the node's Uses and the file's exports.
