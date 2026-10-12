---
id: P109-S17-SCRIPTFILEMODE
title: A project script file opens in the Script node's mode, so every `use(…)` and `exports.x` is underlined and `define` / `Noodl` are offered
status: fixed
commit: 68b881b53
severity: medium
area: editor / script file tab (`views/documents/ScriptFileDocument`) and the code editor's modes (noodl-core-ui)
found: P109 ISL-005 build session 2, 2026-10-05 (reading slice 5 before driving it)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 5b"
regression: packages/noodl-core-ui/tests/code-editor/isl005ScriptsInTheEditor.test.ts "lints `use`, `exports`, `module` and `console` as defined"
---

The script tab passed `validationType="script"`, the Script node's mode, whose names are `define`, `script`, `Node`,
`Noodl` and the browser's. A script file is compiled with `use`, `exports` and `module`, and is given `Noodl`, `window`
and `document` as `undefined`. So the editor underlined the file's working code and offered names that throw. Fixed
with a `'scriptfile'` mode that matches the runtime.
