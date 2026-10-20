---
id: P112-OWN021-FEEDFLAKE
title: The community feed spec failed once in a run of all 37 template suites and passed four times alone
status: open
severity: low
area: backend tests / `packages/nodegx-backend/tests/two-005-feed.test.ts`
found: P112 OWN-021 S2, 2026-10-19
evidence: this file
phase: P112
---

Before committing the two P121 templates (OWN-021 S2), the backend's 37 template suites ran in one
`jest --runInBand` at `nice -n 19` beside a peer's model lab (692 s): 25 passed, 11 skipped (mutant arms),
and **`two-005-feed.test.ts` failed once** (`Tests: 1 failed, 210 passed`). Which of its nine tests failed was
not captured: the run's output was filtered to suite lines.

Run alone straight after, four times: 9 / 9 each time (5–10 s). The likeliest candidate is its race test,
"a burst of taps by one person counts once, however many rows the race leaves", which leans on timing; that
is a guess, not a measurement.

**To pick up:** run the 37 suites together again, unfiltered (`--verbose`), and read which test and why. If it
is the burst, the spec needs a bound on what a slow box may leave, not the product.
