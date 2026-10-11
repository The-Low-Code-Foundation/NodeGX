---
id: P78-DBT-BUNDLEWIRES
title: A function bundle whose wires reach nothing deploys and loads clean, and every call hangs 30 seconds
status: fixed
commit: PENDING
phase: P109
task: ISL-042
severity: medium
area: backend / workflow deploy (bundle validation)
found: P78 Digital Bricks Training template, TASK-L170, 2026-09-23
regression: packages/nodegx-backend/tests/isl042-bundle-wires.test.ts
evidence: templates/digital-bricks-training/tools/deploy-functions.mjs header ("THE TWO SHAPES ARE NOT THE SAME SHAPE" and "A COMPONENT'S INTERFACE IS DERIVED, AND AN EMPTY ONE FAILS SILENTLY"); START-HERE.md "The four read functions (L170)"
---

Two malformed bundles are accepted by `PUT /admin/workflows/:name` and loaded without a word:
- wires in the on-disk spelling (`fromId/fromProperty/toId/toProperty`) where a bundle uses
  `sourceId/sourcePort/targetId/targetPort`;
- a helper component deployed with `ports: []`.

Either way every node sits unwired, no Response node is reached, and the caller waits out the 30-second timeout.
That ends in CWF-018's 504, which talks about unwired `Failure` ports and names neither cause.

**Where:** `WorkflowRunner.loadWorkflow` (`packages/nodegx-backend/src/workflow/WorkflowRunner.ts:673-715`) checks
only that `CloudRunner.load` does not throw. Nothing checks a connection's keys or that a wire into a component
instance names a port the component declares. Not re-measured since 2026-09-23. The two cases are as recorded by
the template's first live calls.

**Reproduce:** deploy a one-endpoint bundle whose `connections` use `fromId…`, then call the endpoint. It returns
504 after 30 s.

**Proposed:** validate a bundle at load: refuse a connection without `sourceId/targetId`, and warn on a wire into a
component port the component does not declare. Small to medium.

**Fixed, P109 s42 (2026-10-11).** Re-measured first: a one-endpoint bundle with `fromId…` wires answered
`PUT /admin/workflows/:name` with 200 `success: true`, and a bundle whose helper had `ports: []` deployed with no word.
`workflow/bundleWiring.ts` `bundleWiringProblems` reads a bundle before it loads:
- a wire without `sourceId` / `targetId` refuses the deploy (400, `success: false`), naming the component and both
  spellings, and nothing is written;
- a wire into (or out of) a port that a component in the same bundle does not declare, and that the instance's own
  `ports` do not carry, deploys with a `warning` naming the caller, the component and the port.
At start, a bundle already on disk still loads as before, and the same sentences go to the log.

Spec red on exactly its two fix arms (4/4 now, with a working-spelling control that answers and a declared-port
control). Corpus: the 24 v2 projects on this machine with cloud functions, bundled by the current cloud bundler,
give 0 refusals and 0 warnings (2,900 wires, 20 helper instances); on d40's real bundle, emptying the helpers' ports
gives 4 warnings and respelling one wire gives 1 refusal. 58 deploy-touching backend suites: 686 passed.
