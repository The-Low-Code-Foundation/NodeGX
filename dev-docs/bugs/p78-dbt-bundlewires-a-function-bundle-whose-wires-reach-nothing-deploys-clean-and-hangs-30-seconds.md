---
id: P78-DBT-BUNDLEWIRES
title: A function bundle whose wires reach nothing deploys and loads clean, and every call hangs 30 seconds
status: open
severity: medium
area: backend / workflow deploy (bundle validation)
found: P78 Digital Bricks Training template, TASK-L170, 2026-09-23
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
