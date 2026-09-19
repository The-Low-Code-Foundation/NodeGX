---
title: "Model Request"
---
Calls a language model from a cloud function. The key is read server-side from a named secret; every call's cost is written down.

Model Request sends one request to a model and hands back either text or, when you give it an Output Schema, a parsed object in exactly the shape you asked for. It runs server-side only: the key is never a port value, never a parameter, and never in the exported workflow a deploy ships — what the graph carries is the NAME of a secret in the project's functions namespace, and the backend resolves it at the moment of the call, uses it in one header, and drops it. Instructions is the system prompt; Input is a single user turn; wire Messages instead when the graph is holding a conversation, and Input is then ignored. Effort is the first lever on both cost and quality — low for tagging and classifying, high for anything that has to be right — and the node sends no thinking budget, because current models think adaptively and reject one. Rate limits and provider faults are retried twice with backoff inside the node, honouring retry-after; a 4xx is not retried, because asking again changes nothing. A refusal arrives as an HTTP 200 with no answer in it, so it fires Failure with Error Code refusal rather than handing an empty string downstream. Every call appends what it cost to the run's execution record, where the dashboard sums it per run.

## When to use it

Any time a backend needs a model: tagging or summarising items a schedule just polled, classifying an inbound webhook, extracting fields from text a person pasted, drafting a reply for someone to approve. Use Output Schema whenever the answer feeds another node rather than a person — it is the difference between a graph that reads a field and a graph that parses prose. For a model call from a browser, there is deliberately no node: that would be a key in a page.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.modelrequest` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `apiKeySecret` | String | `MODEL_KEY` | The NAME of a secret in the project's functions namespace — never the key itself. It is read server-side at the moment of the call, exactly as the Secret node reads one, used in one header and dropped. There is deliberately no port that could hold the value |
| `baseUrl` | String | `https://api.anthropic.com` | Where the request goes. Change it for a proxy, a gateway, or a test double |
| `effort` | Enum (`low`, `medium`, `high`, `xhigh`, `max`) | `high` | How hard the model works before answering — the first lever to reach for on both cost and quality. Low for tagging and classifying, high for anything that has to be right |
| `input` | String | — | The one thing being asked, as a single user turn. Ignored when Messages is wired — a graph holding a conversation sends the whole conversation |
| `instructions` | String | — | The system prompt — who the model is being asked to be, and the rules of the task |
| `maxTokens` | Number | `16000` | The ceiling on the answer. Hitting it is not an error: Done fires with Stop Reason set to max_tokens and a truncated Text, so the graph can decide what that means |
| `messages` | Array | — | A whole conversation as [{ role, content }], for a graph that is holding one. When this is wired and non-empty it replaces Input entirely |
| `model` | String | `claude-opus-5` | The model id, sent verbatim. Free text on purpose: a model released after this backend was built needs no release of NodeGX to be usable |
| `outputSchema` | Object | — | A JSON schema the answer must match. When set, the answer is constrained to it and arrives parsed on Json as well as raw on Text. Objects in the schema need additionalProperties false, and the provider refuses the request outright if they do not have it |
| `provider` | Enum (`anthropic`, `openai-compatible`) | `anthropic` | Which API shape the request is built in. Only Anthropic is implemented; OpenAI-compatible is listed so a graph drawn today keeps its wiring when it arrives, and until then it fails on Failure with Error Code not_implemented rather than pretending |
| `timeoutMs` | Number | `120000` | The whole call's budget, retries included. Keep it under the function's own timeout, or the function answers 504 before this node gets to report anything |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Sends the request |

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `attempts` | Number | — | How many HTTP requests this call actually took. More than one means the provider rate-limited or faulted and the node retried; it is the number to watch before raising a quota |
| `json` | Object | — | The answer parsed, when Output Schema asked for one. Untouched when no schema was set — a graph that wants an object has to say what shape it is |
| `stopReason` | String | — | Why the model stopped: end_turn when it finished, max_tokens when it ran out of room, tool_use when it wants a tool. A refusal never arrives here — it fires Failure |
| `text` | String | — | The model's answer. When Output Schema is set this is the raw JSON of it |
| `usage` | Object | — | What the call cost, as { inputTokens, outputTokens, cacheReadTokens }. The same numbers land on the run's execution record, where they are summed per run |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the model has answered and Text, Json, Usage and Stop Reason hold that answer |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why there is no answer, in a sentence. Names the secret or the status, never a key |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: not_implemented, secret_missing, refusal, bad_json, http_error, rate_limited, timeout, network, unavailable |
| `failure` | Signal | — | Fires when no answer was obtained — a missing secret, a refusal, a provider error that outlived its retries, or an answer that did not match the schema. Read Error Code to tell them apart rather than matching on Error, which is written for a person |
| `status` | Number | — | The HTTP status of the last attempt, or 0 when the request never reached the provider — a missing secret, an unimplemented provider, a timeout |

## Patterns

- Parse Feed → For Each over `items` → Model Request with an Output Schema of { tag, summary } → store the result beside the item: the whole 'tag what just arrived' shape, with no Function node.
- Give Output Schema whenever another node reads the answer. Without it the graph is parsing prose, and prose changes shape between calls.
- Wire Failure. A graph that wires only Done hangs for the whole function timeout the first time a key expires or a provider rate-limits (CWF-018), and that is a 504 nobody can read.
- Branch on Error Code, not on Error. The codes are stable; the sentences are written for a person and will be improved.
- Keep Timeout below the function's own timeout, so this node reports what went wrong instead of the function answering 504 over the top of it.

## Watch out for

- Putting the key anywhere in the graph. There is no port for it on purpose — a key typed into a node is a key in the exported workflow, in version control, and in every deploy of it.
- Wiring the answer straight into a Response without reading Stop Reason. max_tokens means the answer stopped mid-sentence, and it is a success, not a failure.
- Treating a refusal as an empty answer. It is an HTTP 200 with nothing in it, which is why it fires Failure instead.
- Retrying a failure by re-pressing Do in a loop. A 429 is already retried twice inside the node, with backoff; a loop on top of that is a way to get rate-limited for longer.
- Raising Max Tokens to fix a truncated answer that is truncated because the model was asked for too much. Narrow the request, or give it a schema.

## Related nodes

[Secret](./noodl-cloud-secret.md), [Parse Feed](../data/net-noodl-parse-feed.md), [HTTP Request](../data/net-noodl-http.md), [Response](./noodl-cloud-response.md)


:::info Generated
This page is generated from `node-catalog-enriched.json`. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source enrichment instead.
:::
