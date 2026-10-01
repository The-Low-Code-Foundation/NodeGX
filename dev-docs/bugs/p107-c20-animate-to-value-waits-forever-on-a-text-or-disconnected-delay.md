---
id: P107-C20
title: Animate To Value waits forever when Delay arrives as text or is disconnected
status: needs-ruling
severity: medium
area: runtime / Animate To Value
found: P107 NSP-013 s13, 2026-10-01
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
