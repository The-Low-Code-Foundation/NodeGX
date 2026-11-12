---
id: P134-S12-HIDDENRUNS
title: "export: a placed component under a parent that is not mounted runs its logic in the running app (its Conditions test, its Functions count) and in neither export, so it shows a fresh state when it is shown"
status: open
severity: low
area: export / the plan's and the React printer's reading of Mounted (`packages/nodegx-export/src/emit/component.ts`, `{cond && <Child/>}`), copied by the HTML printer (`src/emit/html/printComponent.ts`, `when(...)`)
found: P134 session 12, 2026-11-04, grading the Condition Desk against the runtime's own nodes
evidence: packages/nodegx-export/tests/html-a-condition-tests-again.test.ts (the pinned cells, T3); packages/nodegx-export/tests/helpers/condition-desk.ts (the second Lamp)
---

The Condition Desk's second Lamp sits in a Group authored Mounted false and shown by Show. Its input is wired from the
page's Variable, which Lit and Lit again change while it is hidden. In the running app the Lamp's instance exists while it
is not drawn (as the Signal Desk found for a pulse, P18-S126-INSIGNAL): its Condition tests each change and its Function
counts, so on Show it reads "lit 2", and after the next Lit "lit 3". In the React export and the HTML export the part is
made when it is shown, so it reads a fresh count ("" then "lit 1"). Both exports agree with each other at every step.

Predicted wrong before measuring (I wrote "lit 0" for Show): the runtime's instance is the thing to remember.

Reach not measured: how many template components that are placed under a Mounted that a value decides keep state that a
hidden change would move. The Signal Desk's case (a pulse sent with the drawing click) is handled; this is the continuous
case. Fix, if wanted, belongs where the plan decides what a hidden instance is (shared by React, Swift and HTML).
