---
id: P107-C20
title: Animate To Value waits forever when Delay arrives as text or is disconnected
status: fixed
commit: dbd5b9c90
phase: P109
task: ISL-026
severity: medium
area: runtime / Animate To Value
found: P107 NSP-013 s13, 2026-10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.animatetovalue.json "a Delay arriving as TEXT is read as a number: at time 1000 '100' waits 100 ms, so the run reaches its target and fires At Target Value at 1200 (v3, C20)" and "a Delay written undefined (a wire let go) is no delay … (v3, C20)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2
---

Wire a Delay that arrives as text (`"100"`) and the move starts at "the time so far" with `100` stuck on the end
— after the app has run 1000 ms, at 1000100 ms (16 minutes); after an hour, weeks later. Disconnect the Delay
wire (`undefined`) and the move never starts at all, and At Target Value never fires, until a number reaches
Delay and a new target restarts the run.

Where: `packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts` :208 stores Delay raw;
`packages/noodl-runtime/src/timerscheduler.ts` :180 `currentTime + timer.delay` (a string join; NaN for undefined).

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.animatetovalue.json`, the two C20 scenarios.

Proposed: `Number(value) || 0` in the setter (one line).

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Read it as a number".** "100" waits 100 ms and a missing Delay starts at once. A one-line change. The question as asked: *"Should Animate To Value read Delay as a number, and treat a missing Delay as no delay?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s22, ISL-026), as ruled.** The setter reads Delay as `Number(value) || 0`. The spec is v3 with a version note, and its two C20 scenarios were rewritten to the ruled behaviour. Runtime at seed 20732: CONFORMS, 16 / 16, 0 generated divergences, mutants 25 / 25. Control (HEAD's `animate-to-value.ts`): both scenarios fail, plus 3 generated divergences. The spec is stranger-guarded, so C19's precedent was followed: hashes re-recorded, and a fresh agent handed only the round-3b brief brought `stranger-3/nodes.js` up to v3 from the version note alone, in one line (round 3c, P107 NSP-006 §5.9). Three rounds: 41 passed, 17 skipped, hash gate green.
