---
id: P18-EXP022-S7-NOWORLD
title: The Swift graph target could not play a scenario that declares a world — the React target plays it under the world's clock and seeded random, which the store nodes read
status: fixed
severity: low
area: export / Swift graph harness (`packages/nodegx-export/tests/helpers/swift-graph-target.ts`); the JavaScript host's test seam (`src/emit/swift/scripts.ts`, `__nodegx.world`)
found: EXP-022 session 7, 2026-10-22, the second build of the 14 graph scenarios ("swift has no install(): it cannot play a graph that needs a world")
fixed: EXP-022 session 7, 2026-10-22
commit: 62f274719
evidence: packages/nodegx-export/tests/node-spec-graph-swift.test.ts B1, B2 (the 9 store scenarios, each trace equal to React's)
---

The store scenarios declare a world (`world: {}`). The React graph target's `install` puts the world's clock over
`Date.now` (it stands at 0 until an `advance`) and its seeded random over `Math.random`; history entries, transaction ids
and action ids read both. The Swift target had no `install`, so the runner refused every such scenario; a no-op
`install` alone would have played them on the phone's real clock and random, where React's run on the world's.

**Fix:** the harness builds the same world the runner builds (graph.ts `worldFor`'s rule) and writes its clock and its
first 512 random numbers into each play: `Scripts.shared.world(now:randoms:)` pins `Date.now` and replays `Math.random` in
the JavaScriptCore host (a play that draws more says so), and `fresh()` puts both back. The target's own `install` is a
no-op, because the world is played inside the app.
