---
title: "Model Request"
---
Calls a language model from a cloud function — Anthropic, or an OpenAI-compatible server such as a model on this computer.

Model Request sends one request to a model and hands back either text or, when you give it an Output Schema, a parsed object in exactly the shape you asked for. It runs server-side only: the key is never a port value, never a parameter, and never in the exported workflow a deploy ships — what the graph carries is the NAME of a secret in the project's functions namespace, and the backend resolves it at the moment of the call, uses it in one header, and drops it. Instructions is the system prompt; Input is a single user turn; wire Messages instead when the graph is holding a conversation, and Input is then ignored. Effort is the first lever on both cost and quality — low for tagging and classifying, high for anything that has to be right — and the node sends no thinking budget, because current models think adaptively and reject one. Rate limits and provider faults are retried twice with backoff inside the node, honouring retry-after; a 4xx is not retried, because asking again changes nothing. A refusal arrives as an HTTP 200 with no answer in it, so it fires Failure with Error Code refusal rather than handing an empty string downstream. Every call appends what it cost to the run's execution record, where the dashboard sums it per run. Set Provider to OpenAI-compatible for a model served on your own computer by Ollama, llama.cpp's server or LM Studio: Base URL is that server (http://127.0.0.1:11434 for Ollama), Model is the name it knows the model by, and no key is needed while Base URL is this computer (127.0.0.1, ::1 or localhost — read from the address, so a look-alike name such as 127.0.0.1.example.com still needs one). An Output Schema is sent to such a server as response_format json_schema; a server that ignores it and answers in prose fails with bad_json.

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
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `apiKeySecret` | String | `MODEL_KEY` | The NAME of a secret in the project's functions namespace — never the key itself. It is read server-side at the moment of the call, exactly as the Secret node reads one, used in one header and dropped. There is deliberately no port that could hold the value. With OpenAI-compatible and a Base URL on this computer, a secret that is not provisioned means no key is sent; anywhere else a missing secret fails with secret_missing |
| `baseUrl` | String | `https://api.anthropic.com` | Where the request goes. Change it for a local model server, a proxy, a gateway, or a test double. For OpenAI-compatible, a URL ending in /v1 or /chat/completions is used as given |
| `callInstructions` | String | — | More instructions that change from call to call — who this learner is, what happened last time. Sent after Instructions and never cached, so changing them does not throw the cached Instructions away |
| `effort` | Enum (`none`, `low`, `medium`, `high`, `xhigh`, `max`) | `high` | How hard the model works before answering — the first lever to reach for on both cost and quality. Low for tagging and classifying, high for anything that has to be right. OpenAI-compatible: only None is sent (as reasoning_effort none), and it is the setting a small thinking model on this computer needs — without it a Qwen 3 spends a short Max Tokens thinking and answers nothing; the other values are not sent, because a model that does not think refuses them. Anthropic: None is sent as Low, the lowest it takes |
| `input` | String | — | The one thing being asked, as a single user turn. Ignored when Messages is wired — a graph holding a conversation sends the whole conversation |
| `instructions` | String | — | The system prompt — who the model is being asked to be, and the rules of the task. Cached: the first call writes it to the provider's prompt cache and calls in the next 5 minutes read it at a tenth of the price. Keep it the same on every call; anything that changes per call (a name, today's date) belongs in Per-Call Instructions or Input, or nothing is ever read back. Instructions shorter than the model's minimum (512 tokens on Claude Opus 5, up to 4,096 on some older models) are not cached at all: the call works, and Usage shows 0 written. OpenAI-compatible: Instructions and Per-Call Instructions are sent as one system message, and any caching is the server's own |
| `maxTokens` | Number | `16000` | The ceiling on the answer. Hitting it is not an error: Done fires with Stop Reason set to max_tokens and a truncated Text, so the graph can decide what that means |
| `messages` | Array | — | A whole conversation as [{ role, content }], for a graph that is holding one. When this is wired and non-empty it replaces Input entirely |
| `model` | String | `claude-opus-5` | The model id, sent verbatim. Free text on purpose: a model released after this backend was built needs no release of NodeGX to be usable |
| `outputSchema` | Object | — | A JSON schema the answer must match. When set, the answer is constrained to it and arrives parsed on Json as well as raw on Text. Objects in the schema need additionalProperties false, and the provider refuses the request outright if they do not have it. An OpenAI-compatible server is sent it as response_format json_schema; a server that ignores it and answers in prose fails with bad_json, and an answer that parses is not re-checked against the schema here |
| `provider` | Enum (`anthropic`, `openai-compatible`) | `anthropic` | Which API shape the request is built in. OpenAI-compatible is what a model running on your own computer speaks (Ollama, llama.cpp's server, LM Studio): point Base URL at it, for example http://127.0.0.1:11434, and set Model to the name that server knows the model by. A key is optional only when Base URL is this computer (127.0.0.1, ::1, localhost) |
| `timeoutMs` | Number | `120000` | The whole call's budget, retries included. Keep it under the function's own timeout, or the function answers 504 before this node gets to report anything |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Sends the request |

### What each input does

**Provider** (`provider`)

- always: read when the call is made — blank is Anthropic

**Model** (`model`)

- always: read when the request is built — blank is the default model

**API Key Secret** (`apiKeySecret`)

- always: the name read from the secret store when the call is made

**Base URL** (`baseUrl`)

- always: read when the call is made — blank is the Anthropic API

**Instructions** (`instructions`)

- always: read when the request is built

**Per-Call Instructions** (`callInstructions`)

- always: read when the request is built

**Input** (`input`)

- always: read when the request is built, unless Messages holds a conversation

**Messages** (`messages`)

- always: read when the request is built — a non-empty list replaces Input

**Output Schema** (`outputSchema`)

- always: read when the request is built and again when its answer lands

**Effort** (`effort`)

- always: read when the request is built — blank is high

**Max Tokens** (`maxTokens`)

- always: a positive number, floored, read when the request is built — anything else is 16000

**Timeout (ms)** (`timeoutMs`)

- always: a positive number, floored, read when the call starts and in its timeout sentence — anything else is 120000

**Do** (`send`)

- always: one call at the end of the frame however many presses — Done with the answer published, or Failure with Error, Error Code and Status, per press

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `attempts` | Number | — | How many HTTP requests this call actually took. More than one means the provider rate-limited or faulted and the node retried; it is the number to watch before raising a quota |
| `json` | Object | — | The answer parsed, when Output Schema asked for one. Untouched when no schema was set — a graph that wants an object has to say what shape it is |
| `stopReason` | String | — | Why the model stopped: end_turn when it finished, max_tokens when it ran out of room, tool_use when it wants a tool. A refusal never arrives here — it fires Failure |
| `text` | String | — | The model's answer. When Output Schema is set this is the raw JSON of it |
| `usage` | Object | — | What the call cost, as { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }. A write on every call and reads of 0 means Instructions differ between calls. The same numbers land on the run's execution record, where they are summed per run |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the model has answered and Text, Json, Usage and Stop Reason hold that answer |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why there is no answer, in a sentence. Names the secret or the status, never a key. When the provider answered with an error, its own words follow — here only, never on the execution record, because a server's error can quote the request |
| `errorCode` | String | — | A stable code for the failure, for a graph that branches rather than reads: not_implemented, secret_missing, refusal, bad_json, http_error, rate_limited, timeout, network, unavailable |
| `failure` | Signal | — | Fires when no answer was obtained — a missing secret, a refusal, a provider error that outlived its retries, or an answer that did not match the schema. Read Error Code to tell them apart rather than matching on Error, which is written for a person |
| `status` | Number | — | The HTTP status of the last attempt, or 0 when the request never reached the provider — a missing secret, a provider this node does not know, a timeout |

## Patterns

- Parse Feed → For Each over `items` → Model Request with an Output Schema of { tag, summary } → store the result beside the item: the whole 'tag what just arrived' shape, with no Function node.
- Give Output Schema whenever another node reads the answer. Without it the graph is parsing prose, and prose changes shape between calls.
- Wire Failure. A graph that wires only Done hangs for the whole function timeout the first time a key expires or a provider rate-limits (CWF-018), and that is a 504 nobody can read.
- Branch on Error Code, not on Error. The codes are stable; the sentences are written for a person and will be improved.
- Keep Timeout below the function's own timeout, so this node reports what went wrong instead of the function answering 504 over the top of it.
- A model on the family's own computer: Provider OpenAI-compatible, Base URL http://127.0.0.1:11434 (Ollama), no key. Let the page send a choice from a list, never prompt text; compose the prompt from a fixed template inside the function, give an Output Schema with an enum, and check the answer before it reaches the page. The request body that started the function is on the execution record, so prompt text sent by the page would be too.

## Watch out for

- Putting the key anywhere in the graph. There is no port for it on purpose — a key typed into a node is a key in the exported workflow, in version control, and in every deploy of it.
- Wiring the answer straight into a Response without reading Stop Reason. max_tokens means the answer stopped mid-sentence, and it is a success, not a failure.
- Treating a refusal as an empty answer. It is an HTTP 200 with nothing in it, which is why it fires Failure instead.
- Retrying a failure by re-pressing Do in a loop. A 429 is already retried twice inside the node, with backoff; a loop on top of that is a way to get rate-limited for longer.
- Raising Max Tokens to fix a truncated answer that is truncated because the model was asked for too much. Narrow the request, or give it a schema.
- Pointing a keyless OpenAI-compatible request at another computer. A key is optional only on this computer; anywhere else a missing secret fails with secret_missing before any request is made.

## Examples

**Tag each new feed item with a model, and store it once**

The per-item half of a feed reader, server-side: ask a model for the item's topics in a shape you can rely on, then write the row so that seeing the same item again updates it instead of duplicating it. Five things here are decisions rather than plumbing. First, the key is a NAME — Api Key Secret says MODEL_KEY, and the value lives in the backend's secrets, so the key is never a port value, never in the exported workflow, and never in an execution record. Second, Base Url comes out of a Secret node rather than being typed into the graph, so pointing this at a gateway or a test double is an operator's edit and not an author's. Third, Output Schema is wired from a Function node, not typed: it is an object, and the port only accepts a connection. With it set, Json carries the parsed answer in exactly the shape you asked for, and Text carries the raw JSON of it — which is why the little Function after the model reads Json and joins the list into one readable string rather than storing a blob. Fourth, Create Record's Upsert On names 'id', the feed item's own identity, which Parse Feed guarantees is never empty. The collection must declare that column and a UNIQUE index on it; with the index the second poll updates one row, without it the second poll fails. Fifth, and least decorative, every failure path is wired to a Failed output: a missing secret, a refusal, a script that threw, a write the index refused. This fragment is a Run Tasks task template, and a task that never reaches a completion output is one the loop waits for forever — so the function does not fail, it hangs until its timeout. Note also the Run On Value Change boxes: with a control signal wired, an input that is still ticked runs the node a SECOND time, early, with everything else unset. Every value input here is fed by the signal that should consume it, so every one of them is unticked.

## Related nodes

[Secret](./noodl-cloud-secret.md), [Parse Feed](../data/net-noodl-parse-feed.md), [HTTP Request](../data/net-noodl-http.md), [Response](./noodl-cloud-response.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- services of the backend process a cloud function runs in (`host`)
- the network (`network`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "provider": "anthropic",
  "model": "claude-opus-5",
  "apiKeySecret": "MODEL_KEY",
  "baseUrl": "https://api.anthropic.com",
  "effort": "high",
  "maxTokens": 16000,
  "timeoutMs": 120000,
  "text": "",
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0,
    "cacheReadTokens": 0,
    "cacheWriteTokens": 0
  },
  "stopReason": "",
  "attempts": 0,
  "status": 0,
  "pending": 0,
  "reading": {},
  "calls": {},
  "nextCall": 1
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Messages (`messages`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |
| Output Schema (`outputSchema`) | `object-literal` | text is evaluated as a JavaScript object literal; text that does not evaluate becomes `{}` |

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/model-request.ts"
/**
 * Model Request (`noodl.cloud.modelrequest`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts` on
 * 2026-10-12 (NSP-022 s97–s98), after P107-S97-MRNULLRETRY and P107-S97-MREMPTYANSWER were fixed in it. Cloud-only: graded on the
 * runtime's cloud target, in a backend process the world plays (world.ts HOST `secrets`) talking to a model provider the world
 * plays (NETWORK).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; the request bodies, the answer readers
 * and the error identifiers are the spec's own copies of the node's functions, so a body is byte-for-byte what the node sends.
 *
 * THE RULE. `Do` takes a token per press and ONE call at the end of the frame (`scheduleSend` :679-691, `doSend` :692-762) — the
 * presses of a frame share it; a press while a call is out starts its own, concurrently. The call, in order:
 *   - a Provider that is neither `anthropic` nor `openai-compatible` fails, `not_implemented`, before the secret is touched (:699-710);
 *   - outside a backend (no `_noodl_get_secret`) it fails, `unavailable` (:712-725);
 *   - the secret named by API Key Secret is read, synchronously: a store that throws fails `secret_missing` with the node's own
 *     sentence (:727-735); no secret, not found or empty fails `secret_missing` with the store's reason or the node's sentence
 *     (:744-756) — except for OpenAI-compatible with a Base URL on this computer, which goes on without a key (:737-742);
 *   - the request (`dispatch` :872-1056): one deadline for the whole call, Timeout (ms) from its start (:876); `POST` to
 *     `<base>/v1/messages` (Anthropic: `x-api-key`, `anthropic-version`) or the chat completions URL (OpenAI-compatible: a
 *     `Bearer` key when there is one); each attempt aborted when the deadline comes (:905-906);
 *   - each answer: an abort is `timeout`; a request that never reaches the server is retried after 500 ms, doubled per retry,
 *     never past the deadline, while attempts (3) and time remain, then `network` (:1033-1053); a 429 or 5xx is retried after its
 *     `retry-after` (seconds or a date, capped at 30 s) or the same backoff while attempts remain (:918-933), then `rate_limited`;
 *     any other non-2xx is `http_error` (:936-951); a 2xx that is not JSON, or not an answer of its API, is `network` (:953-975);
 *     a refusal is `refusal` (:987-994); with an Output Schema an answer that does not parse is `bad_json`, Text holding it
 *     (:999-1021); otherwise Done, every value published first (:1021-1030).
 * Every failure writes Error (with the provider's own words after the sentence, for a non-2xx), Error Code and Status (the
 * last attempt's, 0 when none answered), and reports `model-request/<code>` per press (`setError` :664-673). Attempts and Usage
 * are written for every answered call; a refusal's cost was paid. The cost also goes to the run's cost channel
 * (`recordModelCall`, :849-861) — not on the wire: the runtime target keeps it on the handle (`modelCalls`), graded apart.
 * Read when used, not when pressed: Timeout (ms) in the timeout sentence, Output Schema when the answer lands; the body is built
 * at the request.
 */

import { defineNode, type WorldView } from '../spec';
import type { Answer, HostScript } from '../world';

/** :102-110 */
const DEFAULTS = { provider: 'anthropic', model: 'claude-opus-5', apiKeySecret: 'MODEL_KEY', baseUrl: 'https://api.anthropic.com', effort: 'high', maxTokens: 16000, timeoutMs: 120000 };
/** :113, :119-123 */
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;
const MAX_RETRY_AFTER_MS = 30000;

type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
const EMPTY_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

/* eslint-disable @typescript-eslint/no-explicit-any */

/** :139-146 */
function retryAfterMs(header: string | null, now: number): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  const at = Date.parse(header);
  if (!isNaN(at)) return Math.min(Math.max(at - now, 0), MAX_RETRY_AFTER_MS);
  return undefined;
}

/** :149-155 */
function textOf(content: any): string {
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('');
}

/** :157-166 */
function usageOf(usage: any): Usage {
  const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
  if (!usage) return { ...EMPTY_USAGE };
  return { inputTokens: n(usage.input_tokens), outputTokens: n(usage.output_tokens), cacheReadTokens: n(usage.cache_read_input_tokens), cacheWriteTokens: n(usage.cache_creation_input_tokens) };
}

/** :172-176 */
function refusalMessage(stopDetails: any): string {
  const category = stopDetails && stopDetails.category ? String(stopDetails.category) : 'unspecified';
  const explanation = stopDetails && stopDetails.explanation ? ` — ${String(stopDetails.explanation)}` : '';
  return `Model Request: the model declined this request (${category})${explanation}`;
}

/** :187-195 — the PARSED host, never a prefix */
export function isThisComputer(baseUrl: string): boolean {
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === '127.0.0.1' || host === '[::1]' || host === 'localhost';
}

/** :202-206 */
function chatCompletionsUrl(base: string): string {
  if (/\/chat\/completions$/.test(base)) return base;
  if (/\/v1$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

/** :209-217 */
function chatTextOf(message: any): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content.filter((p: any) => p && p.type === 'text' && typeof p.text === 'string').map((p: any) => p.text).join('');
}

/** :224-234 */
function chatUsageOf(usage: any): Usage {
  const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
  if (!usage) return { ...EMPTY_USAGE };
  const cached = n(usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens);
  return { inputTokens: Math.max(0, n(usage.prompt_tokens) - cached), outputTokens: n(usage.completion_tokens), cacheReadTokens: cached, cacheWriteTokens: 0 };
}

/** :237-242 */
const CHAT_STOP_REASONS: Record<string, string> = { stop: 'end_turn', length: 'max_tokens', tool_calls: 'tool_use', function_call: 'tool_use' };

type Read = { usage: Usage; text: string; stopReason: string; refusal?: string };

/** :253-268 (s98: `undefined` when it is not a Messages answer — :260-261) */
function readMessagesAnswer(payload: any): Read | undefined {
  if (!payload || !Array.isArray(payload.content)) return undefined;
  return { usage: usageOf(payload.usage), text: textOf(payload.content), stopReason: payload.stop_reason ? String(payload.stop_reason) : '', refusal: payload.stop_reason === 'refusal' ? refusalMessage(payload.stop_details) : undefined };
}

/** :270-293 */
function readChatAnswer(payload: any): Read | undefined {
  const choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
  if (!choice) return undefined;
  const finish = choice.finish_reason ? String(choice.finish_reason) : '';
  const declined = (choice.message && typeof choice.message.refusal === 'string' && choice.message.refusal.length > 0) || finish === 'content_filter';
  return {
    usage: chatUsageOf(payload.usage),
    text: chatTextOf(choice.message),
    stopReason: declined ? 'refusal' : CHAT_STOP_REASONS[finish] || finish,
    refusal: declined ? `Model Request: the model declined this request (${finish === 'content_filter' ? 'content_filter' : 'refusal'})` : undefined
  };
}

/** :300-313 */
function errorIdentifiers(raw: string): string[] {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const err = parsed && parsed.error && typeof parsed.error === 'object' ? parsed.error : undefined;
  if (!err) return [];
  const words: string[] = [];
  for (const word of [err.type, err.code]) if (typeof word === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(word) && words.indexOf(word) === -1) words.push(word);
  return words;
}

// ------------------------------------------------------------------------------------------------ the node

type Settings = { provider: string; model: unknown; apiKeySecret: unknown; baseUrl: unknown; effort: unknown; maxTokens: number; timeoutMs: number; instructions: unknown; callInstructions: unknown; input: unknown; messages: unknown; outputSchema: unknown };

/** One call: the presses it settles, and — once it is a request — its attempt count, deadline and what it sends. */
type Call = { n: number; attempts: number; deadline: number; url: string; headers: Record<string, string>; body: string; chat: boolean };

type State = Settings & {
  text: string;
  json: unknown;
  usage: Usage;
  stopReason: string;
  attempts: number;
  status: number;
  error: string | undefined;
  errorCode: string | undefined;
  pending: number;
  /** waiting on the secret, by the spec's call id */
  reading: Readonly<Record<string, number>>;
  calls: Readonly<Record<string, Call>>;
  nextCall: number;
};

/** A patch over port names this module builds from parts — erased here, checked by the interpreter at run time (as system-calls.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = any;
const many = (n: number, o: Record<string, unknown>) => Array.from({ length: n }, () => ({ port: 'send', ...o }));

/** :664-673 setError — Error (the provider's words after the sentence), Error Code, Status; a failure per press */
function fail(n: number, message: string, code: string, status?: number, portDetail?: string, extra: { set?: P; send?: string[] } = {}): P {
  return {
    set: { ...(extra.set ?? {}), error: portDetail ? `${message} ${portDetail}` : message, errorCode: code, status: typeof status === 'number' ? status : 0 },
    send: [...(extra.send ?? []), 'error', 'errorCode', 'status'],
    outcomes: many(n, { outcome: 'failure', error: `model-request/${code}` })
  };
}

/** :764-786 buildBody, :788-792 conversation, :837-847 buildSystem */
function conversation(s: Settings): unknown[] {
  return Array.isArray(s.messages) && s.messages.length > 0 ? s.messages : [{ role: 'user', content: s.input === undefined ? '' : String(s.input) }];
}
function buildBody(s: Settings): Record<string, unknown> {
  const body: Record<string, unknown> = { model: s.model || DEFAULTS.model, max_tokens: s.maxTokens || DEFAULTS.maxTokens, messages: conversation(s) };
  const fixed = s.instructions ? String(s.instructions) : '';
  const perCall = s.callInstructions ? String(s.callInstructions) : '';
  const system = !fixed ? perCall || undefined : [{ type: 'text', text: fixed, cache_control: { type: 'ephemeral' } }, ...(perCall ? [{ type: 'text', text: perCall }] : [])];
  if (system !== undefined) body.system = system;
  const outputConfig: Record<string, unknown> = { effort: s.effort === 'none' ? 'low' : s.effort || DEFAULTS.effort };
  if (s.outputSchema !== undefined && s.outputSchema !== null) outputConfig.format = { type: 'json_schema', schema: s.outputSchema };
  body.output_config = outputConfig;
  return body;
}
/** :803-821 buildChatBody */
function buildChatBody(s: Settings): Record<string, unknown> {
  const fixed = s.instructions ? String(s.instructions) : '';
  const perCall = s.callInstructions ? String(s.callInstructions) : '';
  const system = [fixed, perCall].filter(Boolean).join('\n\n');
  const body: Record<string, unknown> = { model: s.model || DEFAULTS.model, max_tokens: s.maxTokens || DEFAULTS.maxTokens, messages: system ? [{ role: 'system', content: system }, ...conversation(s)] : conversation(s) };
  if (s.effort === 'none') body.reasoning_effort = 'none';
  if (s.outputSchema !== undefined && s.outputSchema !== null) body.response_format = { type: 'json_schema', json_schema: { name: 'answer', strict: true, schema: s.outputSchema } };
  return body;
}

/** :872-884 dispatch — the call, then its first attempt */
function dispatch(s: State, id: string, n: number, key: string | undefined, w: WorldView): P {
  const now = w.now();
  const base = String(s.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
  const chat = s.provider === 'openai-compatible';
  const headers: Record<string, string> = chat ? { 'content-type': 'application/json' } : { 'x-api-key': key as string, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' };
  if (chat && key) headers.authorization = `Bearer ${key}`;
  const call: Call = { n, attempts: 0, deadline: now + (s.timeoutMs || DEFAULTS.timeoutMs), url: chat ? chatCompletionsUrl(base) : `${base}/v1/messages`, headers, body: JSON.stringify(chat ? buildChatBody(s) : buildBody(s)), chat };
  return attempt(s, id, call, w);
}

const timeoutSentence = (s: State) => `Model Request: the call did not finish inside ${s.timeoutMs}ms.`;

/** :888-892 finishFailure — Attempts, then the failure */
function finish(s: State, id: string, call: Call, message: string, code: string, status?: number, portDetail?: string, extra: { set?: P; send?: string[] } = {}): P {
  const calls = { ...s.calls };
  delete calls[id];
  return fail(call.n, message, code, status, portDetail, { set: { ...(extra.set ?? {}), calls, attempts: call.attempts }, send: [...(extra.send ?? []), 'attempts'] });
}

/** :894-913 attempt — out of time is a timeout; else the request, aborted when the deadline comes */
function attempt(s: State, id: string, call: Call, w: WorldView): P {
  const remaining = call.deadline - w.now();
  if (remaining <= 0) return finish(s, id, call, timeoutSentence(s), 'timeout');
  const next: Call = { ...call, attempts: call.attempts + 1 };
  const req = `${id}/${next.attempts}`;
  return { set: { calls: { ...s.calls, [id]: next } }, send: [], request: { id: req, method: 'POST', url: call.url, headers: call.headers, body: call.body }, after: [{ ms: remaining, tag: 'abort:' + req }] };
}

/** a retry, `wait` ms on (never past the deadline) */
const retry = (id: string, wait: number): P => ({ send: [], after: [{ ms: wait, tag: 'retry:' + id }] });

const SETTINGS = { provider: DEFAULTS.provider, model: DEFAULTS.model, apiKeySecret: DEFAULTS.apiKeySecret, baseUrl: DEFAULTS.baseUrl, effort: DEFAULTS.effort, maxTokens: DEFAULTS.maxTokens, timeoutMs: DEFAULTS.timeoutMs, instructions: undefined, callInstructions: undefined, input: undefined, messages: undefined, outputSchema: undefined };

const ANSWER = { content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 1, cache_read_input_tokens: 2, cache_creation_input_tokens: 5 } };
const SECRET: HostScript = { services: ['secrets'], answers: [{ match: { service: 'secrets', request: 'MODEL_KEY' }, answer: { ok: { found: true, value: 'sk-test' } } }, { match: { service: 'secrets', request: 'BROKEN' }, answer: { throws: 'locked' } }, { answer: { ok: { found: false } } }] };

export const ModelRequest = defineNode({
  type: 'noodl.cloud.modelrequest',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/modelrequest.ts',
  needs: ['host', 'network', 'clock'],
  worldPool: {
    hosts: [{}, SECRET, SECRET, SECRET],
    responses: [
      { status: 200, body: ANSWER },
      { status: 200, body: ANSWER },
      { status: 200, body: { content: [{ type: 'text', text: '{"a":1}' }], stop_reason: 'max_tokens' } },
      { status: 200, body: { content: [], stop_reason: 'refusal', stop_details: { category: 'cyber', explanation: 'no' } } },
      { status: 200, body: { choices: [{ message: { content: 'yo' }, finish_reason: 'stop' }], usage: { prompt_tokens: 9, completion_tokens: 2, prompt_tokens_details: { cached_tokens: 4 } } } },
      { status: 200, body: { choices: [{ message: { refusal: 'no' }, finish_reason: 'stop' }] } },
      { status: 200, body: {} },
      { status: 200, body: 'null' },
      { status: 200, body: 'not json' },
      { status: 400, body: { error: { type: 'invalid_request_error', message: 'bad' } } },
      { status: 429, headers: { 'retry-after': '1' }, body: 'slow down' },
      { status: 503, body: '' },
      { error: 'fetch failed' },
      { never: true }
    ] as readonly Answer[],
    delays: [0, 0, 10, 500, 2000],
    advances: [0, 1, 100, 500, 1000, 5000, 30000]
  },

  state: { ...SETTINGS, text: '', json: undefined, usage: { ...EMPTY_USAGE }, stopReason: '', attempts: 0, status: 0, error: undefined, errorCode: undefined, pending: 0, reading: {}, calls: {}, nextCall: 1 } as State,
  // :613-619 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :353-372 — `value || default`
    provider: { type: 'enum', enums: ['anthropic', 'openai-compatible'], default: 'anthropic', coerce: 'none', displayName: 'Provider', group: 'General', description: "Which API shape the request is built in. OpenAI-compatible is what a model running on your own computer speaks (Ollama, llama.cpp's server, LM Studio): point Base URL at it, for example http://127.0.0.1:11434, and set Model to the name that server knows the model by. A key is optional only when Base URL is this computer (127.0.0.1, ::1, localhost)", examples: ['anthropic', 'openai-compatible', 'gemini', ''] },
    // :373-384
    model: { type: 'string', default: 'claude-opus-5', coerce: 'none', displayName: 'Model', group: 'General', description: 'The model id, sent verbatim. Free text on purpose: a model released after this backend was built needs no release of NodeGX to be usable', examples: ['claude-sonnet-5', 'qwen3', ''] },
    // :385-399 — raw
    apiKeySecret: { type: 'string', default: 'MODEL_KEY', coerce: 'none', displayName: 'API Key Secret', group: 'General', description: "The NAME of a secret in the project's functions namespace — never the key itself. It is read server-side at the moment of the call, exactly as the Secret node reads one, used in one header and dropped. There is deliberately no port that could hold the value. With OpenAI-compatible and a Base URL on this computer, a secret that is not provisioned means no key is sent; anywhere else a missing secret fails with secret_missing", examples: ['MODEL_KEY', 'MISSING', 'BROKEN'] },
    // :400-411
    baseUrl: { type: 'string', default: 'https://api.anthropic.com', coerce: 'none', displayName: 'Base URL', group: 'General', description: 'Where the request goes. Change it for a local model server, a proxy, a gateway, or a test double. For OpenAI-compatible, a URL ending in /v1 or /chat/completions is used as given', examples: ['http://127.0.0.1:11434', 'http://localhost:8080/v1', 'https://gw.example/chat/completions', 'http://127.0.0.1.evil.example', 'https://api.anthropic.com/', ''] },
    // :412-451 — raw
    instructions: { type: 'string', coerce: 'none', displayName: 'Instructions', group: 'Request', description: "The system prompt — who the model is being asked to be, and the rules of the task. Cached: the first call writes it to the provider's prompt cache and calls in the next 5 minutes read it at a tenth of the price. Keep it the same on every call; anything that changes per call (a name, today's date) belongs in Per-Call Instructions or Input, or nothing is ever read back. Instructions shorter than the model's minimum (512 tokens on Claude Opus 5, up to 4,096 on some older models) are not cached at all: the call works, and Usage shows 0 written. OpenAI-compatible: Instructions and Per-Call Instructions are sent as one system message, and any caching is the server's own", examples: ['Be brief.', ''] },
    callInstructions: { type: 'string', coerce: 'none', displayName: 'Per-Call Instructions', group: 'Request', description: 'More instructions that change from call to call — who this learner is, what happened last time. Sent after Instructions and never cached, so changing them does not throw the cached Instructions away', examples: ['The learner is Ada.', ''] },
    input: { type: 'string', coerce: 'none', displayName: 'Input', group: 'Request', description: 'The one thing being asked, as a single user turn. Ignored when Messages is wired — a graph holding a conversation sends the whole conversation', examples: ['hello', 42] },
    // :452-462 — an array port: a string arrives evaluated as a literal (node.ts)
    messages: { type: 'array', coerce: 'array-literal', displayName: 'Messages', group: 'Request', description: 'A whole conversation as [{ role, content }], for a graph that is holding one. When this is wired and non-empty it replaces Input entirely', examples: [[{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }], []] },
    // :463-477 — an object port
    outputSchema: { type: 'object', coerce: 'object-literal', displayName: 'Output Schema', group: 'Request', description: "A JSON schema the answer must match. When set, the answer is constrained to it and arrives parsed on Json as well as raw on Text. Objects in the schema need additionalProperties false, and the provider refuses the request outright if they do not have it. An OpenAI-compatible server is sent it as response_format json_schema; a server that ignores it and answers in prose fails with bad_json, and an answer that parses is not re-checked against the schema here", examples: [{ type: 'object', additionalProperties: false, properties: { a: { type: 'number' } } }, null] },
    // :478-503
    effort: { type: 'enum', enums: ['none', 'low', 'medium', 'high', 'xhigh', 'max'], default: 'high', coerce: 'none', displayName: 'Effort', group: 'Limits', description: 'How hard the model works before answering — the first lever to reach for on both cost and quality. Low for tagging and classifying, high for anything that has to be right. OpenAI-compatible: only None is sent (as reasoning_effort none), and it is the setting a small thinking model on this computer needs — without it a Qwen 3 spends a short Max Tokens thinking and answers nothing; the other values are not sent, because a model that does not think refuses them. Anthropic: None is sent as Low, the lowest it takes', examples: ['none', 'low', 'max', ''] },
    // :504-529 — a positive finite number, floored; else the default
    maxTokens: { type: 'number', default: 16000, coerce: 'none', displayName: 'Max Tokens', group: 'Limits', description: 'The ceiling on the answer. Hitting it is not an error: Done fires with Stop Reason set to max_tokens and a truncated Text, so the graph can decide what that means', examples: [100, 0, -5, 12.7, 'abc'] },
    timeoutMs: { type: 'number', default: 120000, coerce: 'none', displayName: 'Timeout (ms)', group: 'Limits', description: "The whole call's budget, retries included. Keep it under the function's own timeout, or the function answers 504 before this node gets to report anything", examples: [1000, 3000, 0, 'x'] },
    // :530-550
    send: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Sends the request' }
  },

  outputs: {
    text: { type: 'string', from: (s) => s.text, displayName: 'Text', group: 'Values', description: "The model's answer. When Output Schema is set this is the raw JSON of it" },
    json: { type: 'object', from: (s) => s.json, displayName: 'Json', group: 'Values', description: 'The answer parsed, when Output Schema asked for one. Untouched when no schema was set — a graph that wants an object has to say what shape it is' },
    usage: { type: 'object', from: (s) => s.usage, displayName: 'Usage', group: 'Values', description: "What the call cost, as { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }. A write on every call and reads of 0 means Instructions differ between calls. The same numbers land on the run's execution record, where they are summed per run" },
    stopReason: { type: 'string', from: (s) => s.stopReason, displayName: 'Stop Reason', group: 'Values', description: 'Why the model stopped: end_turn when it finished, max_tokens when it ran out of room, tool_use when it wants a tool. A refusal never arrives here — it fires Failure' },
    attempts: { type: 'number', from: (s) => s.attempts, displayName: 'Attempts', group: 'Values', description: 'How many HTTP requests this call actually took. More than one means the provider rate-limited or faulted and the node retried; it is the number to watch before raising a quota' },
    status: { type: 'number', from: (s) => s.status, displayName: 'Status', group: 'Error', description: 'The HTTP status of the last attempt, or 0 when the request never reached the provider — a missing secret, a provider this node does not know, a timeout' },
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: "Why there is no answer, in a sentence. Names the secret or the status, never a key. When the provider answered with an error, its own words follow — here only, never on the execution record, because a server's error can quote the request" },
    errorCode: { type: 'string', from: (s) => s.errorCode, displayName: 'Error Code', group: 'Error', description: 'A stable code for the failure, for a graph that branches rather than reads: not_implemented, secret_missing, refusal, bad_json, http_error, rate_limited, timeout, network, unavailable' }
  }
}).on(
  {
    provider: (_s, v) => ({ says: 'always: read when the call is made — blank is Anthropic', set: { provider: (v as string) || DEFAULTS.provider }, send: [] }),
    model: (_s, v) => ({ says: 'always: read when the request is built — blank is the default model', set: { model: v || DEFAULTS.model }, send: [] }),
    apiKeySecret: (_s, v) => ({ says: 'always: the name read from the secret store when the call is made', set: { apiKeySecret: v }, send: [] }),
    baseUrl: (_s, v) => ({ says: 'always: read when the call is made — blank is the Anthropic API', set: { baseUrl: v || DEFAULTS.baseUrl }, send: [] }),
    instructions: (_s, v) => ({ says: 'always: read when the request is built', set: { instructions: v }, send: [] }),
    callInstructions: (_s, v) => ({ says: 'always: read when the request is built', set: { callInstructions: v }, send: [] }),
    input: (_s, v) => ({ says: 'always: read when the request is built, unless Messages holds a conversation', set: { input: v }, send: [] }),
    messages: (_s, v) => ({ says: 'always: read when the request is built — a non-empty list replaces Input', set: { messages: v }, send: [] }),
    outputSchema: (_s, v) => ({ says: 'always: read when the request is built and again when its answer lands', set: { outputSchema: v }, send: [] }),
    effort: (_s, v) => ({ says: 'always: read when the request is built — blank is high', set: { effort: v || DEFAULTS.effort }, send: [] }),
    maxTokens: (_s, v) => {
      const n = Number(v);
      return { says: 'always: a positive number, floored, read when the request is built — anything else is 16000', set: { maxTokens: isFinite(n) && n > 0 ? Math.floor(n) : DEFAULTS.maxTokens }, send: [] };
    },
    timeoutMs: (_s, v) => {
      const n = Number(v);
      return { says: 'always: a positive number, floored, read when the call starts and in its timeout sentence — anything else is 120000', set: { timeoutMs: isFinite(n) && n > 0 ? Math.floor(n) : DEFAULTS.timeoutMs }, send: [] };
    },
    send: (s) => ({ says: 'always: one call at the end of the frame however many presses — Done with the answer published, or Failure with Error, Error Code and Status, per press', set: { pending: s.pending + 1 }, send: [], outcome: 'pending' })
  },
  {
    // :692-762 doSend at the frame end
    afterInputs: (s, _i, w) => {
      if (s.pending === 0) return { send: [] };
      const n = s.pending;
      const base = { pending: 0 };
      if (s.provider !== 'anthropic' && s.provider !== 'openai-compatible') return fail(n, `Model Request: provider '${s.provider}' is not implemented. This release speaks anthropic and openai-compatible.`, 'not_implemented', undefined, undefined, { set: base });
      if (!w.hostHas('secrets')) return fail(n, 'Model Request: no secret store is available. This node only works inside a nodegx-backend cloud function (FED-003) — it is not usable in the browser viewer.', 'unavailable', undefined, undefined, { set: base });
      const id = 'call:' + s.nextCall;
      return { set: { ...base, reading: { ...s.reading, [id]: n }, nextCall: s.nextCall + 1 }, send: [], host: { id, service: 'secrets', request: s.apiKeySecret } };
    },
    world: {
      // :727-761 — the secret, inside the call
      host: (s, _i, answer, w) => {
        const n = s.reading[answer.id] ?? 0;
        const reading = { ...s.reading };
        delete reading[answer.id];
        const st = { ...s, reading };
        if ('threw' in answer) return fail(n, 'Model Request: the secret store could not be read.', 'secret_missing', undefined, undefined, { set: { reading } });
        const secret = answer.ok as { found?: unknown; value?: unknown; error?: unknown } | null | undefined;
        if (!secret || !secret.found || !secret.value) {
          if (s.provider === 'openai-compatible' && isThisComputer(String(s.baseUrl || DEFAULTS.baseUrl))) return dispatch(st, answer.id, n, undefined, w); // :737-742
          const name = s.apiKeySecret;
          return fail(n, (secret && (secret.error as string)) || `Model Request: no secret named '${name}' is provisioned for this backend's functions. Add it in the admin dashboard under Secrets, or set NODEGX_SECRET_` + String(name || '').toUpperCase() + ' in the environment.' + (s.provider === 'openai-compatible' ? ' A key is optional only when Base URL is this computer (127.0.0.1, ::1, localhost).' : ''), 'secret_missing', undefined, undefined, { set: { reading } });
        }
        return dispatch(st, answer.id, n, secret.value as string, w);
      },
      // the deadline's abort, and a retry's backoff
      timer: (s, _i, tag, w) => {
        if (tag.startsWith('abort:')) return { send: [], abort: [tag.slice('abort:'.length)] };
        const id = tag.slice('retry:'.length);
        const call = s.calls[id];
        if (!call) return { send: [] };
        return attempt(s, id, call, w);
      },
      // :914-1053 — one attempt's answer
      response: (s, _i, res, w) => {
        const id = res.id.slice(0, res.id.lastIndexOf('/'));
        const call = s.calls[id];
        if (!call) return { send: [] };
        const cancel = ['abort:' + res.id];
        const now = w.now();
        const withCancel = (p: P): P => ({ ...p, cancel });
        if ('aborted' in res) return withCancel(finish(s, id, call, timeoutSentence(s), 'timeout')); // :1035-1041
        if ('error' in res) {
          if (call.attempts < MAX_ATTEMPTS && now < call.deadline) return withCancel(retry(id, Math.max(0, Math.min(RETRY_BASE_MS * Math.pow(2, call.attempts - 1), call.deadline - now)))); // :1044-1047
          return withCancel(finish(s, id, call, `Model Request: the request did not reach the provider. ${res.error.message}`, 'network'));
        }
        const status = res.status;
        if ((status === 429 || status >= 500) && call.attempts < MAX_ATTEMPTS) {
          const after = retryAfterMs(res.headers['retry-after'] ?? null, now) ?? RETRY_BASE_MS * Math.pow(2, call.attempts - 1);
          return withCancel(retry(id, Math.max(0, Math.min(after, call.deadline - now)))); // :918-933
        }
        const raw = res.body ?? '';
        if (status < 200 || status >= 300) {
          const words = errorIdentifiers(raw);
          return withCancel(finish(s, id, call, `Model Request: the provider answered ${status}${words.length ? ` (${words.join(', ')})` : ''}.`, status === 429 || status >= 500 ? 'rate_limited' : 'http_error', status, raw.slice(0, 400).trim() || undefined)); // :936-951
        }
        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return withCancel(finish(s, id, call, `Model Request: the provider answered ${status} with something that is not JSON.`, 'network', status)); // :953-962
        }
        const read = call.chat ? readChatAnswer(payload) : readMessagesAnswer(payload);
        if (!read) return withCancel(finish(s, id, call, `Model Request: the provider answered ${status} with JSON that is not ${call.chat ? 'a chat completion' : 'a Messages answer'}. Check Base URL.`, 'network', status)); // :966-975
        const calls = { ...s.calls };
        delete calls[id];
        const answered = { calls, usage: read.usage, attempts: call.attempts, status }; // :979-985
        const sent = ['usage', 'attempts', 'status'];
        if (read.refusal) return withCancel(fail(call.n, read.refusal, 'refusal', status, undefined, { set: { ...answered, stopReason: 'refusal' }, send: [...sent, 'stopReason'] })); // :987-994
        if (s.outputSchema !== undefined && s.outputSchema !== null) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(read.text);
          } catch {
            // :1003-1015 — Text keeps what came back
            return withCancel(fail(call.n, 'Model Request: Output Schema was set, but the answer did not parse as JSON. Text holds what came back.', 'bad_json', status, undefined, { set: { ...answered, text: read.text, stopReason: read.stopReason }, send: [...sent, 'text', 'stopReason', 'attempts'] }));
          }
          return withCancel({ set: { ...answered, json: parsed, text: read.text, stopReason: read.stopReason, error: undefined, errorCode: undefined }, send: [...sent, 'json', 'text', 'stopReason', 'error', 'errorCode'], outcomes: many(call.n, { outcome: 'done' }) });
        }
        return withCancel({ set: { ...answered, text: read.text, stopReason: read.stopReason, error: undefined, errorCode: undefined }, send: [...sent, 'text', 'stopReason', 'error', 'errorCode'], outcomes: many(call.n, { outcome: 'done' }) }); // :1021-1030
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
