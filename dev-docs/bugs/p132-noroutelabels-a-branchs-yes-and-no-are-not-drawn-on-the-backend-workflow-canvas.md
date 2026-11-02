---
id: P132-NOROUTELABELS
title: A branch's Yes and No are not drawn on Studio's backend workflow canvas
status: fixed
phase: P132
task: BWF-001
severity: medium
area: nodegx-studio / Backend tab (canvas)
found: Richard testing Greenhouse in Studio, 2026-11-02
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/README.md (point 4)
launch: beta
commit: nodegx-studio 1cc7aa5
---

Richard: "I added an IF, added a yes branch, but you don't see 'yes' or 'no' on the workflow to know wtf you've doing."

`automations.mjs` `stepWires` (:89) keeps each wire's route, but `renderAutoWorkflow` reduces every wire to `then` or
`fail` (studio.html 5496), all from one `out` port (5418); the legend says only "the next step" / "when a step fails".
The route words (`ROUTE_WORDS` 5508) appear only in the side panel. Fix: a labelled port per route (BWF-001 §3).

**Fixed** (nodegx-studio `1cc7aa5`, P132 s1): each way on is its own port on the card's right edge, named where it
leaves (Yes, No, a switch's cases and Anything else, If there are none / some, Always, If it fails), from
`automations.mjs` `stepPorts` (the panel's Then lines read the same). A way on with nothing on it is drawn open with a
"+". Gates: automations-check (TriggerTest's If: Yes, an open No, Always; a three-case switch: four named ports) and
automations-drive (the If draws Yes and an open No with a "+").
