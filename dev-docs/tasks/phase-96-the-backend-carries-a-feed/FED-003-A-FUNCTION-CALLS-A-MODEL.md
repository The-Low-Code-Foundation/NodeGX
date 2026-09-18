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
