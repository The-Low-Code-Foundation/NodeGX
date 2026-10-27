---
id: P121-TWO003-SB004PIN
title: "sb004's \"the POINTER arm with no schema fails LOUDLY\" read red (400 expected, 200 received): CLOUDPOINTSTO gave the cloud runtime the backend's schema, so the filter now narrows, and the pin still asked for the refusal"
status: fixed
commit: d582a7f37
severity: low
area: backend / tests (SB-004 §7, `packages/nodegx-backend/tests/sb004-publication-invariant.test.ts`)
found: Beta sweep s13, 2026-10-27 (a backend run for P112-OWN023-KEYNEEDSAGENT)
evidence: probe of the arm's response, `{"result":{"n":2}}`, the two rows on `mine` of three; red with s13's backend files at HEAD too
regression: packages/nodegx-backend/tests/sb004-publication-invariant.test.ts "the POINTER arm with no schema in the bundle NARROWS — never a success carrying every row"
---

A test that lied, not a product defect. SB-004 §7 builds a cloud function whose `points to` filter runs on a bundle with
empty `metadata`. DEF-012 pinned "fails loudly" (400). P121-TWO003-CLOUDPOINTSTO (2a692b8e0, Beta sweep s5) then gave
the cloud runtime the backend's own schema (`_noodl_cloudservices.collections()`), so on the built-in backend the
filter is no longer schema-less: it narrows to the right two rows. The s5 grading ran "backend specs that run
functions, 39 suites", and this file was not in that list. OWN-026 OPENSTAT's bug file also names this test as red with
its files at HEAD (2026-10-23), with no row of its own.

Fixed: the pin asserts the narrowing (200, n === 2; n === 3 would be the SB-004 widening). A runtime with no schema at
all still refuses rather than widen, graded in `noodl-runtime/test/queryutils.test.ts` (`needs the collection schema`).
