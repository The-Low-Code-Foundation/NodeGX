---
id: P107-C19
title: One Animate To Value with an empty or unknown Easing Curve stops every animation and Repeat in the app
status: fixed
severity: blocker
area: runtime / Animate To Value (and the timer scheduler)
found: P107 NSP-013 s13, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.1d, §6.2
---

Give one Animate To Value an Easing Curve the set does not have — an empty string, `null`, a disconnected
wire, or any text that is not a curve name — and the next time it moves, every animation and every Repeat in
the whole app stops: other Animate To Value nodes freeze or never fire At Target Value, Repeat never ticks
again. Every frame throws `this.ease is not a function`.

Where: `packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts` :226 stores `EaseCurves[value]`
(`undefined` for an unknown name); :108 calls it. `packages/noodl-runtime/src/timerscheduler.ts` `runTimers`
(:116-198) only reassigns `runningTimers` and joins `newTimers` after its loop, and
`packages/noodl-runtime/src/nodecontext.ts` :500-503 does not catch a throw from it — so one node's throw holds
every timer where it is, every frame.

Reproduce: `packages/nodegx-node-spec/scenarios/net.noodl.animatetovalue.json`, the C19 scenario (the runtime
throws at the frame); app-wide: two real Animate nodes + a Repeat in one corpus graph, one curve `''` or
`bounce` — 31/31 frames throw, Repeat 0 ticks vs 9 in the control (NSP-013 §6.1d).

Proposed: fall back to Ease Out on an unknown name (one line in the setter); separately, catch a timer's throw
in `runTimers` so one node cannot stop the others. The deprecated Transition (:175) and Animation (:286) nodes
look curves up the same way (a grep — not measured).

**Ruled (Richard, 2026-10-01, P107 s16):** both fixes. **Fixed:**

1. **The fallback** (`animate-to-value.ts` setter): a name that is not one of `EaseCurves`' own keys moves along
   Ease Out. The spec is v2 and the scenario lost its `row` mark; a second scenario pins `''` / `null` mid-run (Ease
   Out 8.75 at t = 0.5, where Linear gives 5). The runtime conformance test's known row is gone. Stranger round 3b
   (a fresh agent, the v2 spec alone) brought round 3's target up to v2 in one change; all three rounds green.
2. **The timer pass** (`timerscheduler.ts` `runTimers`): each `onStart` / `onRunning` / `onFinish` is caught and
   logged (`console.error`, as `updateDirtyNodes` does), so one timer's throw cannot hold the others; the throwing
   timer runs to its normal end. `packages/noodl-runtime/test/timerscheduler-isolation.test.ts` — red before, green
   after. The deprecated Transition and Animation nodes' own curve lookups were not changed (not ruled, not
   measured); the timer pass now contains whatever they throw.
