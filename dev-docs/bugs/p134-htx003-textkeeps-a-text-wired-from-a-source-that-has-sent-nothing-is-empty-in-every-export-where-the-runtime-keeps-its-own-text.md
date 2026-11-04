---
id: P134-HTX003-TEXTKEEPS
title: "export: a Text whose text is wired from a source that has sent nothing yet is empty in every export; the running app keeps the Text's own words until the wire delivers"
status: open
severity: low
area: export / the React printer's text child (`packages/nodegx-export/src/emit/component.ts`, `{source ?? ''}`), copied by the HTML printer (`src/emit/html/printComponent.ts`, `bindText` over `show()`)
found: P134 HTX-003 session 5, 2026-11-04, grading the Checkbox Desk against the runtime's own nodes
evidence: packages/nodegx-export/tests/html-lists-fields-pages.test.ts §F (F1 pins the cell); dev-docs/tasks/phase-134-the-app-in-plain-files/README.md §10 session 5
---

A Text whose text is wired from a Function that has not run (the Checkbox Desk's bare box: the Function runs on Save)
shows the Text's own text in the running app until the wire delivers: its default "Text", or what the author typed
("not saved yet", measured the same day). Every export shows nothing there: React prints `{saveItOut?.said ?? ''}`, the
HTML export `bindText(…)` over `undefined`. The runtime's rule is the one HTX-001 copied for Mounted (P18 session 126:
a wire never delivers `undefined`, so the node keeps its authored value until it does); the text child does not follow it.

Reach, measured across `templates/` on 2026-11-04: 16 Texts carry typed-in words and a wire into their text, 6 of them
fed by a Function (gram 3, marketplace 2, members-area 1). Whether each one's source starts with no value was not
measured one by one; a Function run by a press always does.

Fix where the plan or the React printer decides it, and the HTML printer copies it (P134-HTX001-PRINTERDECIDES): while
the source is `undefined`, the Text's authored text (or its catalog default). The same question probably stands for a
Button's label and any other wired text sink; not measured.
