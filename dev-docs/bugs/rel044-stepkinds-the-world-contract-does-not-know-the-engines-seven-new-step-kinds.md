---
id: REL044-STEPKINDS
title: The world contract's step kinds stop at "split" — the seven the engine gained for backend workflows (create-record … run-workflow) are missing
status: open
severity: low
area: project contract / `packages/nodegx-project-contract/world/verbs.ts` `VERB_STEP_KINDS` (:87), against `packages/nodegx-backend/src/workflow/types.ts` `StepKind`
found: release 0.4.4, PR #54 CI run 43061637414, job "Test (runtime, backend, viewer, mcp, preview)" (not a required check), 2026-11-12
evidence: "`tests/verbs.test.ts` › the step kinds are the engine's, in its order: expected 7 more than received: create-record, update-record, delete-record, find-records, http-request, send-email, run-workflow. Green on release 0.4.3's run (39454201907), so new with the P132 step kinds"
---

What it costs a person: a world verb that projects to one of the seven new kinds would be refused by `validate_world` as "not a step
kind the engine has". No verb in VERB_NODES projects to them today, so nothing a person does now is refused; the world simply cannot
use the kinds backend workflows by hand were built on.

Fix: add the seven, in the engine's order, and decide which verb nodes bind to them. The pin already exists (it is this red).
