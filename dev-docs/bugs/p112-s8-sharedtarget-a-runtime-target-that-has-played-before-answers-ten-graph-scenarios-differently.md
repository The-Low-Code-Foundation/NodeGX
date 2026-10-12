---
id: P112-S8-SHAREDTARGET
title: "A runtime target that has played a graph scenario before answers ten of the 85 differently from a fresh one — nine by an id minted from the world's random stream, one by a popup's Closed — so the recorded traces hold only for a target's first play"
status: open
severity: low
area: runtime test helper (`packages/noodl-runtime/test/helpers/node-spec-target.ts` — the header says a target plays many scenarios; `graph.test.ts` makes a fresh one per scenario, so Node never sees this)
kit: node-spec
found: P112 OWN-006 s8, 2026-10-11 — the prototype page's bridge handed ONE page engine all 85 graph scenarios in a row (`suite-adapter.mjs` `graphTarget()`, the first run): 75 passed, 10 failed; the same engine fresh per scenario (`graph-target-check`): 85 / 85
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-006-THE-EDITOR-SUITE.md §6.4 (the ten, named); OWN-003 §6.1
regression: none yet — the suite now asks for a fresh runner per scenario (`suite.ts` `graphTarget`), which sidesteps it; a test that plays s07–s09, t03 and t12 twice on one `runtimeTarget()` and compares the second play with the first would pin it
---

Nine of the ten differ only in an id: Query Records' and Filter Records' `items` array (`{"$array":"15iCnKz2Hk"}` on a
fresh target, `HkQr3xpUEP` or `nKz2HkQr3x` on one that played before — the same records inside), and Optimistic Update's
`transactionId` (`tx_0_mkorf98kq` against `tx_0_aah5u9hf8`). The world's random stream is seeded per play, so a
different id means a different NUMBER of draws before the mint: something drawn once per target (a lazy construction
that reads `Math.random`, the family NSP-014 s25 (T13) found in the session store and moved before `installWorld`) is
drawn in a target's first play and never again. The tenth — nested popups: `show.Closed` pulsed 0 times, the claim
says 1, and the trace has a `Closed` signal where the recording has a settle — is state a popup play leaves behind on
the target (the stand-in host or its root scope, `installPopups`), not a draw.

Why low: no Node test runs graph scenarios on a shared target, and the editor suite now grades each scenario on a
fresh runner, as the recordings were made. Why filed: the helper's header promises "a target plays many scenarios",
the conformance runner relies on that for single-node scenarios, and a stranger who grades their own graph runner
across one long-lived engine will meet exactly these ten and read them as their own faults. The ten names are in
OWN-006 §6.4.

**Plain words:** *"The reference engine gives slightly different answers to ten tests on its second run than on its
first, because one random draw happens only the first time. The tests were recorded from first runs, so every grader
now starts a fresh engine for each test."*
