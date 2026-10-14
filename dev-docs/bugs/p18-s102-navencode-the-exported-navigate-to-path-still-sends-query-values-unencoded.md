---
id: P18-S102-NAVENCODE
title: The exported Navigate To Path still sends Query values unencoded — the running app encodes them since D21
status: fixed
regression: packages/nodegx-export/tests/navigate-to-path.test.ts §15.7 "the query half is encoded, and a null is left out" (15 rows red on the pre-fix emitter) and §15.6's two re-pointed pins
severity: medium
area: export / Navigate To Path
found: P18 EXP-011 session 102, 2026-10-14 (the owed whole-package jest run)
evidence: packages/nodegx-export/tests/navigate-to-path.test.ts §15.6 — red at HEAD a66ebd2c5 in a clean worktree
---

A Query value with `&` or `#` in it now reaches the page correctly in the running app (P107-D21, fixed by
`9404f00c4`), but the exported app was transcribed from the old runtime and still appends `name=value` as it is, so
the same value splits into two parameters there. The running app and the exported one disagree about the URL.

**Where:** the export's Navigate To Path translation (`packages/nodegx-export/src/analyze/plan.ts`) carries no
`encodeURIComponent`. Its tripwire fired as designed: §15.6 "this node still encodes neither half of the url" and
"an unset query parameter is still omitted rather than sent empty" (the runtime now reads `!= null`) both fail on
HEAD's `navigatetopath` source. EXP-011 §17's rule: a translation that asserts a runtime behaviour must fail the day
the behaviour changes.

**Reproduce:** `cd packages/nodegx-export && npx jest tests/navigate-to-path.test.ts` — 2 failures.

**Proposed:** transcribe D21's encoding and its null rule into the export, move the two §15.6 pins to what the
runtime now says, and add an emitted-app case with `&` in a value. Small. Belongs to lane 6 / ISL-043.

**Fixed 2026-10-14 (session 104).** `src/emit/component.ts`'s `navigate-path` case now transcribes D21. In the
static suffix, a literal name and value are encoded at emit time and an expression is printed as
`encodeURIComponent(String(expr))`. In the omittable loop, the key is encoded at emit time and the test is the
runtime's `value !== undefined && value !== null`. The path half is unchanged: D20 inserts it as written, and §15.6
pins that split (two `encodeURIComponent(` call sites in the node, none on the path).

§15.7 grades the consequence, not just the printed text. Each of nine literal values (`a&b`, `x#y`, a space, `50%`,
`k=v`, `1+1`, `é`, `it's`, `plain`) is checked against the runtime's own line and read back with `URLSearchParams`,
which is the exported page's reader. The wired loop is transpiled and run with the Variable stubbed: undefined and
null are left out, while `a&b`, `0` and `''` are sent. The new-tab arm, a raw path beside an encoded query, and a
whole-app typecheck are covered too. One shape moved: an untrimmed name `" sort"` now prints `%20sort`, as the
runtime does.

Readings: the spec reads 98/98, and 15 failed on HEAD's emitter. The package's `tsc --noEmit` (which includes
tests) is 0. The whole-package jest reads `Test Suites: 2 failed, 113 passed, 115`, and the two are
`hls001-catalog-cardinality` (CATALOGNAME) and `date-family` (DATEHARNESS).
