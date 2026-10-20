---
id: P18-S102-DATEHARNESS
title: The export's Date To String is ungraded since ISL-032 — the date-family spec loads the runtime with a require stub and every runtime reading is blank
status: fixed
regression: packages/nodegx-export/tests/date-family.test.ts §A "dateToString agrees with the real _format — tokens, blanks, and the number it now reads" (red on the pre-fix lib once the harness reads the runtime for real)
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

**Fixed 2026-10-14 (session 104). The harness fix uncovered a real export defect, so it was two fixes.**

1. **The harness.** `require: () => ({})` is replaced by a `require` that hands `datetostring.ts` the real
   `datemath` module and throws on any other import, naming the module. An import the harness does not know is now
   a load failure, not a blank reading.
2. **The export.** With real readings back, two of the three rows agreed. The third row showed the defect the stub
   had hidden: the runtime renders `1709197503000` as `2024-02-29` and the exported `dateToString` blanked it. The
   emitted lib (`src/emit/dateLib.ts`) still read a number unconverted, as the node did before D14. It now reads
   through the lib's own `toDate` with the node's `if (!t) throw`, and the module header that called the old read
   "faithful" says what is true now. The grid gained `{}` and `true`, which are blank on both sides.

Readings: `date-family` 45/45. The HLS-001 corpus golden was regenerated, with 2 lines predicted and 2 counted
(`deadline-desk` and `due-desk` `src/lib/date.ts`; 0 added, 0 removed). The package's `tsc --noEmit` is 0. The
whole-package jest reads `Test Suites: 1 failed, 114 passed, 115`, and the one red is `hls001-catalog-cardinality`
(CATALOGNAME).
