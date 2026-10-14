---
id: P18-S102-DATEHARNESS
title: The export's Date To String is ungraded since ISL-032 — the date-family spec loads the runtime with a require stub and every runtime reading is blank
status: open
severity: medium
area: export / Date To String (test harness)
found: P18 EXP-011 session 102, 2026-10-14 (the owed whole-package jest run)
evidence: packages/nodegx-export/tests/date-family.test.ts:86-121 — 3 red at HEAD a66ebd2c5 in a clean worktree
---

The spec that holds the exported `dateToString` against the runtime's real `_format` transpiles
`noodl-runtime/src/nodes/std-library/datetostring.ts` and runs it with `require: () => ({})`. P109 ISL-032
(`844f8569b`, 2026-10-06) made that file read its Date through `toDate` from `./date/datemath`, so under the stub
every runtime reading is blank (`Expected: "Europe/London: "`). The three "agrees with the real _format" rows fail,
so whether the export follows ISL-032's ruling (a timestamp renders, an empty Date is Invalid Date, with or without
a Timezone) has not been graded since.

**Reproduce:** `cd packages/nodegx-export && npx jest tests/date-family.test.ts`.

**Proposed:** give the harness a real `require` for `./date/datemath` (transpile it the same way), re-run, and if the
export then disagrees on a timestamp or an empty Date, transcribe ISL-032's `toDate` read. Small.
