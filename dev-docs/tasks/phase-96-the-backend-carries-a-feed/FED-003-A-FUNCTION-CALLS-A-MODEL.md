# FED-003 — A function calls a model

> "A big complaint from vibe coders today is about having no visibility in front or back end on how
> things the AI built actually work, or any ability to tweak them by hand as a non coder."
> — Richard, 2026-09-18

## 1. The person sentence

**Someone drops a `Model Request` node into a cloud function, picks the model, writes the
instruction, names the secret that holds the key, and gets back either text or a JSON object in
the shape they asked for. The key never leaves the server. The cost of every call is a number
they can read.**

## 2. What is there (read 2026-09-18, HEAD `f3f67874d`)

| reading | where |
|---|---|
| 🔴 No model call exists in the cloud runtime or the backend. The one mention of Anthropic is the sentence saying SDKs are unsupported | `noodl-viewer-cloud/src/kitModules.ts:115`; grep of `nodegx-backend/src`, `noodl-viewer-cloud/src` |
| A function cannot `require()`, so `@anthropic-ai/sdk` cannot be used from a graph. Raw `fetch` is available (Node 22 global) | `kitModules.ts:111-118`; TALK-007 §3.2 |
| The `Secret` node reads one name from the `functions` namespace, cloud-only, never inspected or logged | `noodl-viewer-cloud/src/nodes/cloud/secret.ts`; `service.ts:43, 808` |
| The editor has a full Anthropic client for its assistant. It is Electron code and not reusable in the backend bundle, but its request shapes are a reference | `noodl-editor/src/editor/src/models/AiAssistant/client/providers/anthropic.ts` |
| Streaming consumption nodes exist (`SSE`, `JSON Stream Parser`, `Text Accumulator`), but a function **cannot emit** a stream. Phase 45 owns that | `noodl-runtime.ts:317-324`; `phase-45-streaming/README.md:15-19` |
| Every run writes an execution record; token counts have nowhere to go yet | `workflow/`, `executions.sqlite` |

## 3. Design

### 3.1 One node, cloud-only: `Model Request`

Ports, in the order the panel shows them:

| port | type | default | note |
|---|---|---|---|
| `provider` | enum `anthropic`, `openai-compatible` | `anthropic` | R2: only `anthropic` implemented this phase; the other errors "not yet" on `Failure` |
| `model` | string | `claude-opus-5` | free text so a new model id needs no release; a picker offers the current ids |
| `apiKeySecret` | string | `MODEL_KEY` | the **name** of a secret in `functions`; resolved server-side exactly as the `Secret` node does. Never a value |
| `baseUrl` | string | `https://api.anthropic.com` | for the fixture in FED-006 and for proxies |
| `instructions` | string | | the system prompt |
| `input` | string | | the user turn. A graph that wants a multi-turn conversation feeds `messages` instead |
| `messages` | array | | optional; `[{role, content}]`; when set, `input` is ignored |
| `outputSchema` | object | | optional JSON schema. When set, the response is constrained to it and the `json` output fires with the parsed object |
| `effort` | enum `low`, `medium`, `high`, `xhigh`, `max` | `high` | |
| `maxTokens` | number | `16000` | |
| `timeoutMs` | number | `120000` | |

Outputs: `text`, `json`, `usage` (`inputTokens`, `outputTokens`, `cacheReadTokens`), `stopReason`,
`Success`, `Failure` (with `status`, `code`, `message`).

### 3.2 The wire

The node builds a `POST {baseUrl}/v1/messages` with headers `x-api-key`, `anthropic-version:
2023-06-01`, `content-type: application/json`, and a body of `model`, `max_tokens`, `system`,
`messages`, `output_config: { effort }`, plus `output_config.format` carrying the schema when
`outputSchema` is set. Thinking is left to the model's default (adaptive on current models;
the node sends no `thinking` field and no `budget_tokens`, which current models reject).
The exact structured-output format block is taken from the docs at build time,
not from memory: https://platform.claude.com/docs/en/build-with-claude/structured-outputs.

Non-streaming. A response with `stop_reason: "refusal"` fires `Failure` with `code: "refusal"`
and the category from `stop_details`; `max_tokens` fires `Success` with `stopReason` set so the
graph can decide. HTTP 429 and 5xx are retried twice with backoff inside the node, honouring
`retry-after`; 4xx are not.

### 3.3 The secret path

The node never holds the key as a port value. It asks the backend's secret resolver for
`apiKeySecret` at execution time, the same call the `Secret` node makes (`service.ts:808`),
uses it in the header, and drops it. `getInspectInfo` returns ports minus the key. The execution
record stores the request body **without headers** and the response body **without** anything
the schema did not ask for. A test greps the record and the log for the key value.

### 3.4 What a person sees afterwards

Each call appends `{ model, inputTokens, outputTokens, cacheReadTokens, durationMs }` to the
execution record's `modelCalls` array. The dashboard's execution view sums them per run. That is
the whole of cost visibility for this phase; a per-backend monthly total is a later task and is
noted in the README's out-of-scope list only if Richard asks for it.

### 3.5 Why not a kit module

A cloud kit module could carry a hand-rolled client today with no backend change. It would be
invisible in the node picker, unversioned with the backend, and outside the secret path. R1's
argument for `Parse Feed` applies here twice over: the key handling has to be the backend's,
not a kit's.

## 4. Acceptance criteria

1. **AC1** — Against a fixture endpoint that records requests, a function with `Model Request`
   (`instructions`, `input`, no schema) sends the body of §3.2 with the key from
   `secrets.json` `functions.MODEL_KEY` in `x-api-key`, and fires `Success` with `text` and
   `usage` populated from the fixture's response.
2. **AC2** — With `outputSchema` set, the request carries the format block and `json` fires with
   the parsed object; a fixture response that does not parse fires `Failure` with `code:
   "bad_json"`.
3. **AC3** — The key value appears in no port value, no inspector payload, no log line and no
   execution record: asserted by grepping all three after AC1 and AC2.
4. **AC4** — A missing secret name fires `Failure` with `code: "secret_missing"` and the name,
   before any request is made.
5. **AC5** — A fixture that returns 429 then 200 yields one `Success` and two recorded attempts;
   a fixture that returns 400 yields one `Failure` and one attempt.
6. **AC6** — A fixture returning `stop_reason: "refusal"` fires `Failure` with `code: "refusal"`.
7. **AC7** — `provider: openai-compatible` fires `Failure` with `code: "not_implemented"` and the
   node's description says so.
8. **AC8** — The node is absent from the browser runtime's catalogue and present in the cloud
   catalogue with `availableIn: ["cloud"]`; the MCP `get_node_type` output documents every port
   in §3.1.
9. **AC9** — The execution record of AC1 carries one `modelCalls` entry with the five fields of
   §3.4, and the dashboard shows the sum.

---

## 5. Built — s3, 2026-09-19

**All nine ACs green.** 24 specs across two suites, plus the six regenerations a new node type owes
(README §7 rule 5), a seventh step they do not name (decision 4), and one gate that could not be
run (R5 below).

| | where | what it grades |
|---|---|---|
| the node | `noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` | `noodl.cloud.modelrequest`, cloud-only |
| registered | `noodl-viewer-cloud/src/nodes/index.ts` | beside `Secret`, and for the same reason |
| **offered** | `noodl-runtime/src/nodelibraryexport.ts` → Cloud Functions ▸ AI | see decision 4 — this was missed first time and is invisible to every test |
| the cost channel | `noodl-runtime/src/runcontext.ts` (`RuntimeModelCall`), `nodegx-backend/src/workflow/WorkflowRunner.ts` | AC9 |
| the drive | `nodegx-backend/tests/fed-003-model-request.test.ts` | 16 specs, AC1–AC7 + AC9, real service + recording fixture |
| the sum | `nodegx-backend/src/execution/modelCost.ts`, `server/byob-admin.ts` | AC9's second half — see §5.5 |
| the unit half | `noodl-viewer-cloud/tests/fed-003-model-request.test.ts` | 8 specs, what an HTTP drive structurally cannot reach |
| classified | `noodl-editor/src/editor/src/validation/backendRequirement.ts` | AIB-007's completeness guard — see decision 5 |

### 5.1 Measurements

- **`test:main`: 8055/8055 tests pass, 503/504 suites** — measured over a shared checkout that
  was also carrying another session's in-flight P94 editor edits, which is exactly what the one
  failing suite turned out to be. `chr-007/widgetDispatch` **fails to RUN**, caused by an
  uncommitted `Ports.ts` import that does not exist on HEAD (R5). s3 first called that red
  "pre-existing" on the strength of a control that swapped only the catalog files — the peer's
  edit stood in both arms, so it proved nothing about the cause. Corrected in R5.
- **`noodl-mcp`: back to R4's recorded floor — 7 suites / 8 tests**, the same seven names, and
  `nodeDocBudget` still reds on `Group` at exactly **14,315**, the figure R4 recorded. `Model
  Request` is not what moves it.
- `noodl-runtime` 2833 passed, `noodl-viewer-cloud` 234 passed.
- **The listing ratchet cost +464 wire bytes**, measured as a one-variable control (62,137 with
  this branch's catalog and ledger, 61,673 against HEAD's). See decision 6.
- `export-ledger:check` 180 types / 17 backend-only; picker coverage **118/130**, unchanged —
  a `backend-only` row is not in that denominator, so no number needed moving.

### 5.2 Decisions taken while building

1. **The outcome ports are `Done`/`Failure`/`Completed`, not §3.1's "Success".** ERG-001's outcome
   contract owns this vocabulary repo-wide and `outcomeOutputs()` spells it; §0.2's finding was
   eight ports displaying "Done" under four internal names. "Success" in the ACs describes the
   happy path, not a port spelling, and a ninth name would have been the defect that contract
   exists to stop.
2. **The failure detail is three ports — `Error`, `Error Code`, `Status` — decided up front**, per
   §2's third read-first item. `Error Code` carries the ACs' own literals (`secret_missing`,
   `bad_json`, `refusal`, `not_implemented`, plus `http_error`, `rate_limited`, `timeout`,
   `network`, `unavailable`) rather than `Parse Feed`'s `family/kebab` form: those strings were
   fixed by the ACs before either node existed and FED-006 will branch on them. The `family/kebab`
   form still appears on the OUTCOME (`model-request/…`), which is the execution record's
   vocabulary and not the graph's.
3. **`Attempts` is an output port.** AC5 says "two recorded attempts" and did not say where. A port
   is the answer that is visible to the person the phase is about, and it is also the number to
   watch before raising a provider quota.
4. 🔴 **Registering a node is not offering it, and nothing in the test suite knows the difference.**
   The node was registered, both suites were green, all nine ACs were satisfied — and
   `inNodePicker` came out **`false`**, the only `false` among eighteen cloud nodes. The picker's
   index is a curated list in `noodl-runtime/src/nodelibraryexport.ts`; a type absent from it runs
   perfectly and cannot be added to a graph by a human being. It was caught by reading the
   generated catalog against its siblings, not by a gate. **A new node type owes a seventh step:
   check `inNodePicker` in the generated catalog, or add a row to that list and know why not.**
5. **Classified `backend-free`, with `Secret` and not with the "runs inside a cloud function" group.**
   AIB-007's guard forced the decision, which is what it is for. The node reads the hosting
   process's own secret store and then calls a *model provider* — neither half is a request to a
   configured NodeGX backend, so a "you have no backend" diagnostic would name the wrong thing
   twice.
6. **The `list_node_types` ratchet moved 62,000 → 66,000, and the interesting number is not 464.**
   HEAD was already at 61,673 against a 62,000 ceiling — **327 bytes of headroom left out of the
   3,614 FLD-013 built it with.** Roughly 3,000 bytes had been spent since by changes that each
   fitted underneath and therefore never had to say so, which is the one thing a ratchet cannot
   catch. The new ceiling restores comparable headroom; a session that finds itself a few hundred
   bytes under it again should read that as the listing needing a diet.
7. **`fld013ExportReach`'s census is now DERIVED from the ledger, not pinned.** `expect(carried.
   length).toBe(29 + …)` was `27` at FED-002 and would have been `30` here — a literal three
   sessions in a row had to edit to keep saying the same thing. It reads the ledger's own census
   now; the nine translated-but-refusing names stay pinned, because those cannot be derived, and a
   mutation making every row carry the field is still caught.

### 5.3 What the request actually sends, and where it came from

Taken from the API docs at build time (2026-09-19), not from memory, as §3.2 requires:
`output_config.format` is `{ type: 'json_schema', schema }` with **no beta header**, and `effort`
sits inside `output_config` beside it. The node sends **no `thinking` field and no
`budget_tokens`** — current models think adaptively by default and reject a token budget with a
400 — and the drive asserts the absence of all three, plus the absence of the deprecated
top-level `output_format`.

### 5.4 The one thing AC3 nearly did not grade

The first drive was 14/14 green on its first run, which is when an instrument is least trustworthy.
Three key-leak mutations were run against it:

| mutation | caught? |
|---|---|
| key appended to the answer on the success path | ✅ both instruments |
| key pasted into the failure message | ❌ **drive green** — it drove only `/ok`; the leak was on a path the spec never walked |
| key written into the execution record's step `inputData` | ✅ drive (the unit half cannot see a record) |

A fourth mutation (key written to `_internal.error` before dispatch) was caught by neither and was
**not a hole**: `dispatch` overwrites that field on both paths, so the defect healed itself before
anything could read it — invisible to every arm that completes.

Both instruments were widened rather than the result accepted: the unit spec now enumerates
**every output port from the node definition itself** on both the success and failure paths, so a
port added next year is covered without anybody remembering to; the drive's success Response now
carries all eight value ports rather than the five a happy graph reads, and AC3 drives a failure as
well as a success — which is what its own wording ("after AC1 **and AC2**") always said.

### 5.5 AC9's second half — "the dashboard shows the sum"

The record carrying `modelCalls` was the easy half and it was nearly the only half built. The
dashboard's execution view is a JSON dump of `GET /executions/:id` (`admin/ui/index.html:1418`),
so the entries were *visible* there the moment `WorkflowRunner` stamped them — but nothing summed
them, and the AC asks for a sum.

It is computed **server-side and derived at read time** (`execution/modelCost.ts`), for two
reasons:

- **Derived, not stored.** The array is appended to as each call settles; a total written beside
  it would be a second copy of a number with a second writer, and a run can append after it was
  written. There is exactly one way for those to disagree and no way for a reader to tell which
  is right.
- **On the route, not in the client.** The dashboard is not the only reader — the editor's History
  panel and MCP's backend tools read the same route. A sum computed in one client is a sum the
  other two do not have, and rule 1 says a capability does not live where a person cannot reach
  it.

`modelCost` is **absent**, not zeroed, on a run that called no model: "spent nothing" and "could
not have spent anything" are different sentences, and nearly every run in this product is the
second. Both halves are asserted, and the summing spec drives a function that calls the model
**twice in one run** — against a single-call run, a summariser that echoed `modelCalls[0]` would
be indistinguishable from one that adds.

⚠️ **What is NOT done, deliberately: the formatting.** The sum is a JSON object in the execution
view, not a rendered line. §8's close condition is *Richard has seen the execution record in the
dashboard and ruled it legible* — so the presentation is the thing that ruling is for, and
guessing it now would mean building it twice. FED-006 carries it.
