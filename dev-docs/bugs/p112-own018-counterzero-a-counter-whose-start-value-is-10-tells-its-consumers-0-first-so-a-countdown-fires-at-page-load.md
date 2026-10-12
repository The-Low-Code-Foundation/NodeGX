---
id: P112-OWN018-COUNTERZERO
title: "A Counter whose Start Value is 10 tells its wired consumers 0 first (its parameters are queued, its wires seed at once), so the obvious countdown — Counter → `count === 0` → act — fires at page load: Mistral's quiz skipped question 1"
status: fixed
severity: high
area: runtime / Counter (`packages/noodl-runtime/src/nodes/std-library/counter.ts` `currentCount`); the general shape is `NodeScope.setNodeParameters` queueing parameters while `connectInput` seeds targets immediately
found: P112 OWN-018 s2, 2026-10-12 (Mistral Large 4 in OpenCode, quiz run 1; tarballs packed at 5754e993e)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
kit: runtime
regression: packages/noodl-runtime/test/own018-a-countdown-condition-fires-at-load.test.ts
commit: dd7ff4756
---

Mistral's `Logic/Quiz Engine`: Counter (Start Value "10") → Expression `count === 0 && !answered` → Condition (Run On
Value Change on, the default) → `ontrue` locks the question and starts a one-second advance Timer. In the packed
preview, question 2 appeared ~1 s after Start every time.

**Measured, in order:**
- Browser, `Noodl.Variables` sampled every 5 ms after Start: `answered` true at 23 ms (the time's-up branch), the
  engine's own `start` at 38 ms, question 2 at 1,036 ms.
- Cutting the gate's two outgoing wires: question 1 counts 10 → 0 normally (so the gate fires, not the beat).
- Cutting `answered` into the Expression, or writing Start Value as the number 10: still skips (neither is the cause).
- Runtime harness, the engine's nodes and wires exactly as written, the Expression's evaluations wrapped:
  `scope {count: 0} → true`, then `{count: 10} → false`. A probe wired beside it only ever received `count=10`.

**Why:** `setNodeParameters` queues a node's parameters (`queueInput`); they land at the node's first update. A
component's wires are made right after its nodes are created, and `connectInput` hands the target the source's
current value at once. The Counter's count before its queued Start Value lands is `initialize`'s 0. Whether a consumer
evaluates in that window depends on update order, so a small graph hides it and an engine-sized one shows it.

**Fixed here (s2):** `currentCount` reports the model's Start Value until the first one lands
(`counter.ts`). Test `packages/noodl-runtime/test/own018-a-countdown-condition-fires-at-load.test.ts` over
`test/fixtures/own018-quiz-engine/` (Mistral's graph): green with the fix; with the getter reverted the gate fires
`ontrue` at load. A lone Counter → recorder does NOT reproduce it (passes both ways) and is not a test.

**The second instance, fixed the same way:** Mistral's Results page reads two Variables into `max(score, best)` on
Did Mount and writes the answer back into `bestScore`. In the browser at the second Results mount: bestScore 3 → 0
and localStorage "3" → "0". The Variable's Name is a queued parameter too, so its `value` getter answered nothing
until it landed. The getter now answers from the model's Name until then. Both getters remember what they handed
out, so the queued parameter landing does not deliver the same value twice (exp-011 s66-5 pins exactly once; it
failed with the first version of this fix). Test: the same file, sabotage → bestScore ends 0. Counter v2, Variable2
v1 and Variable v1 conform.

**Not fixed, the class:** any node whose output getter reads state a queued parameter sets has the same window, and
the principled fix is in the runtime (apply a node's queued parameters before its wires seed), which touches every
node. Census owed before claiming the class or changing the queue.
