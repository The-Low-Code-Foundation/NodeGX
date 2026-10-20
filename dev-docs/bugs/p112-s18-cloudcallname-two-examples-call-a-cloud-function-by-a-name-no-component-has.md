---
id: P112-S18-CLOUDCALLNAME
title: "Two catalog examples call a cloud function by a name no component has: `AddNumbers` and `TaskStats`, for components at `/Cloud Functions/Add Numbers` and `/Cloud Functions/Task Stats`, outside the cloud sheet"
status: fixed
severity: medium
area: catalog examples (`docs/node-catalog/examples/fn-cloud-function-roundtrip.json`, `fn-aggregate-stats-function.json`); the example gate does not check that a `CloudFunction2`'s `function` names a component
kit: mcp
found: P112 lane 1 s18, 2026-10-14 (writing WAVTWICE's example beside them)
evidence: this file
regression: packages/noodl-mcp/tests/own015WavTwice.test.ts "every example call names a cloud function the same example ships"
commit: 2aceb7ec2
---

The runtime finds a cloud function by the component's path after `/#__cloud__/` (`noodl-viewer-cloud/src/index.ts`
:285; `CloudFunction2`'s enrichment says so). The two examples an agent reads first for a browser → server call named
the call `AddNumbers` / `TaskStats` and put the function at `/Cloud Functions/Add Numbers` / `/Cloud Functions/Task
Stats`. An agent that copies one is told by `create_component` to put a cloud component under `#__cloud__/`
(`author.ts` :533-538), so it writes `#__cloud__/Cloud Functions/Add Numbers`, and the call it copied names nothing.
`catalog:examples` cannot see it: a call naming a function that does not exist validates clean (measured: the WAVTWICE
example with `function: "NoSuchFunction"`, 1/1 clean).

**Fixed:** both examples now put the function at `/#__cloud__/Cloud Functions/…` and call it by that path, as the s15
stranger did on its own. A test checks every example's calls against the cloud components the same example ships. Not
fixed here: the validator itself does not check that a call names an existing cloud function (a rule for the editor's
validation, so the agent's own graph gets the same check). The other eight cloud examples have no caller and keep
`/Cloud Functions/…`.
