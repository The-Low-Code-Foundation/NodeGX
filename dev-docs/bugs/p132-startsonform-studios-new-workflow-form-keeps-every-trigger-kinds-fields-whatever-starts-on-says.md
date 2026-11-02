---
id: P132-STARTSONFORM
title: Studio's New workflow form shows the table fields and the time together, whatever "Starts on" says
status: fixed
phase: P132
task: BWF-001
severity: medium
area: nodegx-studio / Backend tab (New workflow)
found: Richard testing Greenhouse in Studio, 2026-11-02
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/README.md (point 2)
launch: beta
commit: nodegx-studio 1cc7aa5
---

Richard: "When I create a new workflow, I chose 'Starts on - Time of day' but you still see the 'When a - plant - is
created' as well as the 'every day at - 8:00', same for any of the 'starts on' options, the fields don't change to suit
the selection."

The form (studio.html 5713-5735) builds both rows up front and `check()` (5724) is meant to hide one; for him neither
hides. A webhook is not offered at all. Fix: one form per trigger kind, rebuilt on change, webhook included (BWF-001 §2).

**Cause (measured 2026-11-02, P132 s1, Electron app on a Greenhouse copy):** the form did set `hidden` on the rows it
did not need (`tableRow.hidden = starts.value !== 'db-change'`), but `.field { display: grid }` beat the `[hidden]`
attribute, so every row stayed on screen whatever was chosen. `getComputedStyle` on the hidden row: `display: grid`.
STU-092's gate only ever set values in the form, never looked at what was shown: a hole shaped like the defect.

**Fixed** (nodegx-studio `1cc7aa5`): `.field[hidden] { display: none }`; one set of fields per choice (a change to a
table; a time and which days; a call from outside, the webhook's address and key or signature; nothing). Gate:
automations-drive "each Starts-on choice shows its own fields and no other's, on screen"; with the CSS line removed it
fails with every row shown for every choice.
