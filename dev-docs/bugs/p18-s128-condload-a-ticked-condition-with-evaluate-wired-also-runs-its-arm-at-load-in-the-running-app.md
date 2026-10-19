---
id: P18-S128-CONDLOAD
title: A Condition with Evaluate wired and its box ticked also tests its value at load in the running app and runs its arm; the export runs the arm only on Evaluate
status: open
severity: low
area: export / Condition (`runOnValueChange: { controlSignal: 'eval', inputs: ['condition'] }`), the branch compiled into a handler
found: P18 session 128, 2026-10-19, the Set Desk's Condition variant (`tests/the-set-runs-its-done-chain.test.ts`), first draft
evidence: dev-docs/tasks/phase-18-code-export-v2/s128-setdone/EXPECTED.md ("the Condition variant"); both arms read at load
---

A Condition whose Evaluate is wired from a click, with its Condition a literal `true` and "re-test on change" left ticked
(the default since NDA-017), is tested twice by the runtime: once as its value arrives at load (the `condition` setter
schedules an evaluation, `condition.ts`), and once on each click. At load it sends On True, so the chain behind it runs
before anyone has clicked. The export compiles the arm into the click's handler only.

Measured on the Set Desk with the Condition between Ready and its Set: the runtime's load reading is
"said nothing · said nothing · order nothing · told ready · game idle · the banner" (the chain ran: the banner is open,
`told` is written), the export's "said nothing · echo nothing · order nothing · told nothing · game idle". After the click
both read the same. Session 127's Signal Desk had the same shape (its Hide click through a Condition) and did not show it:
the arm it ran at load hid a banner that was already hidden.

Reach in the 19 shipped templates: 2 Conditions with Evaluate wired and the box ticked (the Site Builder), both with an
unwired condition; whether either has a value at load is not measured (an unset condition never arrives, so never tests).
The spec's variant unticks the box, which is the shape it grades.
