---
id: P132-BRANCHNEXT
title: A branch can carry a plain "next" beside its Yes, so the steps after it run whatever the If says
status: fixed
phase: P132
task: BWF-001
severity: medium
area: nodegx-studio / Backend tab (graph edits); backend / workflow validate
found: reading Greenhouse's nodegx.automations.json after Richard's test, 2026-11-02
evidence: Greenhouse nodegx.automations.json, workflow "triggertest"
launch: beta
commit: nodegx-studio 1cc7aa5 + NodeGX f14e46fe8
---

*TriggerTest*'s `branch` step has `routes.ontrue → call-function-3` **and** `next → call-function-2`. The engine follows
`next` always, so Check thirst runs on the No path too, and nothing on screen says so (P132-NOROUTELABELS). Its entry
step, a `transform`, also reads `previous.result`, which is empty at the entry, so the If is always false.

Which Studio action wrote `next` on a routed step is not yet known (*Add a step after* on a branch is the suspect;
an agent's write is possible). Fix (BWF-001 §5-6): Studio adds on a route, never `next`, on a branching step; a
workflow carrying both is drawn with an *Always, as well* wire; `validate` and a save return a warning for both cases,
passed through the MCP's write result.

**Cause (read and gated, P132 s1):** `automations.mjs` `addStepAfter(wf, null, …)`, *Add a step at the start*, always
gave the new step `next: [old entry]`, even a branch; adding after an existing step already carried on down the
branch's first route. Richard added the If at the start, so it got `next → call-function-2`. The panel then listed
only the routes ("Yes: call-function-3, No: nothing") and hid the next.

**Fixed:** Studio (`1cc7aa5`) puts what came after on the branch's first route, at the start too; a switch starts with
its first case as a route; a branch already carrying a next is drawn with an "Always" wire and said in the panel, with
*On Yes / On No* to move it onto a side (`nextOntoRoute`). The backend (`f14e46fe8`, `workflow/definitionWarnings.ts`)
warns of a step with routes and a next, and of an entry step reading `previous`, on validate and on every create /
update answer; the MCP passes the answer through. Gates: automations-check walks add / insert / move / delete around a
branch and finds no step with both (the old start behaviour fails two lines); workflow-validate-http 2 new tests.
