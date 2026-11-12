---
id: P132-AAQ001STARTPAGE
title: Two AAQ-001 start-page specs are red at HEAD under test:ci seed 85853 (expect /Pages/Checkout, get /Pages/Article)
status: open
phase: P132
task: BWF-008
severity: low
area: noodl-editor / tests/ai/authoring-plan.test.ts (AAQ-001, "the apply registers the pages it created")
found: test:ci for BWF-008 s10, 2026-11-03; the same two red at HEAD 40569c58 with the same seed and none of s10's files
evidence: "Expected '/Pages/Article' to be '/Pages/Checkout'." and "Expected undefined to be '/Pages/Checkout'." in both "moves the start page off the template's ACTUAL home" and "… off an EMPTY placeholder home"; 3083 specs / 2 failures with s10's files, 3074 / 2 at HEAD, seed 85853
---

Not P132's: filed here because P132 s10 met it and nobody owned it. `NOODL_SPEC_SEED=85853 npm run test:ci` in
`packages/noodl-editor` reds both, with or without s10's ten editor files (they were swapped to HEAD for the control
run). The start page reads `/Pages/Article`, a page another spec makes, so the likely cause is a start page left set by
an earlier spec in this seed's order rather than the apply itself. Run the two alone first; if they pass alone, it is a
spec that does not reset the project's start page.
