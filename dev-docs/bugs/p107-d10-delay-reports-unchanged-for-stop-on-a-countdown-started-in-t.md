---
id: P107-D10
title: Delay reports Unchanged for Stop on a countdown started in the same frame, yet stops it
status: fixed
commit: 375993cb3
phase: P109
task: ISL-032
severity: low
area: runtime / Delay
found: P107 (the node says what it does) s8, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Timer.json "Stop while queued: reports done — the countdown is cancelled, no Started ever (v2; was row D10: it reported unchanged)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-007-THE-WORLD.md §6 (row D10) — the row names how it is reproduced and pinned
---

Delay reports Unchanged for Stop on a countdown started in the same frame, yet stops it.

**Node:** Delay

**What, with the line:** `Stop` on a QUEUED countdown (started this frame, not yet joined) reports `unchanged` — `_isRunning` is false until the timer joins at the frame (timerscheduler.ts :181) — yet `stop()` removes it from the queue (:108-113): the countdown is cancelled and the outcome says nothing changed

**How it is pinned:** scenario *Stop while queued: reports unchanged, yet the countdown is cancelled — no Started ever (D10)*

**Proposed answer:** **runtime bug** (ERG-001): `done` when the stop removed a queued timer; or the description names the frame boundary

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Report Done".** Stop says it stopped something whenever it did. A small change in one node, and only graphs that start and stop in the same frame notice. The question as asked: *"Should Stop report Done when it cancels a countdown that was started in the same frame?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 375993cb3 (P109 ISL-032, 2026-10-06), as ruled.** Stop is Done when the timer was running or in the scheduler's queue. Delay (Timer) v2; the now-equivalent drop-set mutant declared.
