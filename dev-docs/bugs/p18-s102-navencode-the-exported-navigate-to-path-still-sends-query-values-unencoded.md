---
id: P18-S102-NAVENCODE
title: The exported Navigate To Path still sends Query values unencoded — the running app encodes them since D21
status: open
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
