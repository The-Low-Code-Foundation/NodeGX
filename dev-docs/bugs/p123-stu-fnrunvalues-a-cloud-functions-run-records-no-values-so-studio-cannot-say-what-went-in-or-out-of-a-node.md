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

## 2026-11-01 — backend half done: the record now carries each acting node's values (Studio half still open)

Decided for the overnight sweep: the backend records a **bounded copy** in the execution record (it survives the
run; a trace does not).

**What the backend now records.** The runtime hands the step sink each acting node's port values, opt-in:
`NodeRunContext.recordValues` (noodl-runtime `runcontext.ts`), which only nodegx-backend's cloud-function runner sets.
`node.ts` snapshots `_inputValues` at `beginOutcome` (and on the `raiseRuntimeError` step path) and the output ports
(through their getters) at the step's end, after the outcome's signals. Signal ports and `undefined` are left out
(a declared signal input is found in the node register's metadata; the instance entry does not carry its type).
A host that does not opt in (browser, editor preview, every spec with its own `runContext`) gets the step objects
exactly as before. The sink (`nodegx-backend/src/workflow/stepValues.ts`) then, per port: detaches (JSON copy;
an unserialisable value becomes an `__error` marker for that port only), redacts by NAME with the service's one
key rule (`SENSITIVE_KEY_PATTERN` via `ops/redact.ts`, at any depth; one exemption: a key ending `Tokens` holding
a number, a token count like `maxTokens`), redacts by VALUE (`SecretValueScrubber`, every function secret the
backend holds), then bounds at `executions.maxValueBytes` (50 KB) per port, and cuts the largest ports until the
step fits. A `Secret` node's outputs are `[REDACTED]` whole by node type (value scrubbing misses a secret under
8 characters). The run budget (8 MB) and `metadata.recordCapped` stay in `BoundedExecutionLogger`, which now also
counts a port cut one level down. The node's own `beginOutcome(inputData)` context (Log's line, Model Request's
secret NAME) is laid over the ports and keeps its old by-value-only scrub.

**Studio half: the shape.** Additive; `outcome` / `detail` are where they were.

```
step.inputData  = { <input port>: <value>, … }                                  // same shape as a workflow step's inputData
step.outputData = { outcome: 'done'|'unchanged'|'failure', detail?, outputs?: { <output port>: <value>, … } }
a cut value     = { __truncated: true, __originalSize, __maxSize, __preview }    // the workflow record's own marker
a secret        = "[REDACTED]"
```

Measured (`GET /executions/:id`, the spec's run): `log` → `inputData {level:"info", message:"passing", value:"Ada"}`,
`outputData {outcome:"done", outputs:{value:"Ada"}}`; `sec` → `inputData {name:"STRIPE_KEY"}`,
`outputData.outputs {value:"[REDACTED]"}`; `res` → `inputData {"pm-greeting":"Ada", "pm-blob":{__truncated…,
__originalSize:61202, __maxSize:51200}, "pm-password":"[REDACTED]", "pm-key":"[REDACTED]", …}`;
`metadata.recordCapped.valuesTruncated: 2` (trigger body + the port).

**Regression:** `packages/nodegx-backend/tests/p123-stu-fnrunvalues.test.ts`, 7/7 green. Red without the fix
(`recordValues: true` removed from `WorkflowRunner.createRunContext`): 5 failed, 2 passed (the control and the pure
unit arm). Mutants: the node-type rule off reddens the short-secret arm; the name rule off reddens the
`pm-password` arm. Neighbours green: backend 13 files / 151 tests (def004, fed-003, prd-002, cloud-log-node,
cloud-secret-node, workflow-*), and earlier 21 files / 446 tests; runtime 27 files / 368 tests over the outcome
seam. fed-003 AC3 caught the first version (the name rule hid `apiKeySecret: "MODEL_KEY"`, the secret's NAME the
node deliberately records, and redacted `maxTokens` / `usage.*Tokens`), which is why the node's own context keeps
the old scrub and token counts are spared.
