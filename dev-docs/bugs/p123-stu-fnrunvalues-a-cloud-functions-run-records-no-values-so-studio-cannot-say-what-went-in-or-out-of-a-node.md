---
id: P123-STU-FNRUNVALUES
title: A cloud function's run records each node's outcome but never its values, so Studio cannot say what went in or out of a node
status: open
severity: medium
area: nodegx-backend execution record (WorkflowRunner.ts step sink) / noodl-runtime Node.beginOutcome; nodegx-studio Backend tab
found: STU-092 (Richard's Greenhouse note 3: "can't see a run's data, what went in and out of each step, as in the NodeGX editor"), 2026-10-30
evidence: packages/nodegx-backend/src/workflow/WorkflowRunner.ts:413-488 writes outputData { outcome, detail? } only; packages/noodl-runtime/src/node.ts:998-1023 beginOutcome() is called with no inputData by almost every node (log.ts:140 the exception); per-wire values exist only in the trace buffer (tracebuffer.ts), not in GET /executions/:id
phase: P123
task: nodegx-studio docs/SCOPE.md § STU-092
---

STU-092 shows, for a backend WORKFLOW's run, what went into each step and what came out: the engine records
`inputData` (the payload, the step's params as resolved, `previous`) and `outputData` per step (WorkflowEngine.ts
startNode / completeNode). The same was asked for a cloud FUNCTION's run (Richard: "as in the NodeGX editor", whose
popover reads a wire's value from the live trace). A function's execution record cannot carry it: each step is one
node's outcome (`done` / `unchanged` / `failure`, with a failure's subject), the node's own input and output port values
are never written. So Studio's function view lights the nodes that acted (STU-085) and says nothing of their values.

Not decided: whether the backend records a bounded copy of each acting node's inputs/outputs into the execution
record (BoundedExecutionLogger already caps a workflow's values at 50 KB each, 8 MB a run), or Studio reads the
function's trace for a run. The first is the one that survives the run (a run from last night has no live trace).
