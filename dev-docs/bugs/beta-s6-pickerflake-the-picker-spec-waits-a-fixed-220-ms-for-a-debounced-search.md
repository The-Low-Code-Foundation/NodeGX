---
id: BETA-S6-PICKERFLAKE
title: The admin app's Picker spec failed once in ten runs of the admin-app suite and was not caught again; it waits a fixed 220 ms after every keystroke for a debounced search
status: open
severity: low
area: tests / `packages/nodegx-backend/tests/admin-app/picker.test.tsx` (BMG-001 AC6), eleven `await settle(220)`
found: the Beta sweep s6, 2026-10-25 — `tests/admin-app` + `bmg-010` run ten times after the Storage flakes were fixed: `FAIL tests/admin-app/picker.test.tsx` once (1 of 224), then six green runs in a row
evidence: the failing case's name and message were not captured (the run's log was not kept); the spec's only timing is the fixed `settle(220)` after each type or key press
regression: none yet — owed: wait with `until()` (`tests/admin-app/dom.ts`) for the list the step reads, as the Storage specs now do
---

The Picker searches as you type, after a debounce, then draws the matches. Each step of the spec types or presses a
key and waits 220 ms before reading the list. That is the debounce plus a guess at drawing time, the shape that
reddened the two Storage cases this session (P116-S23-STORAGEFLAKE, BETA-S6-MOVEWORDSFLAKE).

Not fixed: the failure was not caught a second time, so which step failed is not known, and converting eleven waits
without a reproduction grades nothing. Next: an instrument (the debounce or the mocked search slowed) that reddens a
step on HEAD, then `until()` at that step.
