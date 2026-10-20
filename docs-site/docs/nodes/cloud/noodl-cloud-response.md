---
title: "Response"
---
Exit point of a cloud function component: collects result values and sends the reply back to the caller.

Response ends a cloud function — it only exists in the cloud runtime. Declare the function's result values as a name list in `params`; each name becomes an input named `pm-<name>` to feed (wire `pm-audioUrl`, never `audioUrl`: a name without the prefix is never made), and a matching `out-<name>` output appears on the browser-side Cloud Function (CloudFunction2) caller. Triggering `send` (Send, signal) replies to the pending call: with `status` 'success' (the default) it returns HTTP 200 with the collected result values, with `status` 'failure' it returns HTTP 400 carrying `errorMessage`, which the caller surfaces on its `error` output before firing `failure`. A function can contain several Response nodes — for example one success and one failure path — but exactly one should send per call.

## When to use it

End every path through a cloud function with one. Without a `send`, the caller's request never completes. In browser components use Component Outputs instead.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.response` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `params` | Stringlist | — | Names to return in the response body, each becoming an input to supply it |
| `status` | Enum (`success`, `failure`) | `success` | Whether the caller gets a 200 carrying Parameters or a 400 carrying Error Message |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `send` | Signal | — | Sends the response and ends the request, which can only happen once |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `errorMessage` | String | — | Message returned to the caller; used only when Status is Failure |

### What each input does

**params** (`params`)

- always: nothing while it runs; each name makes a value input the payload carries

**Error Message** (`errorMessage`)

- always: read when Send is pressed with Status Failure

**Status** (`status`)

- always: read when Send is pressed — unset or success is a 200, anything else a 400

**Send** (`send`)

- no request reached the function this node is part of: the reason on Error → Failure
- the request was already answered — by another Response, by a refusal, or by the runner's timeout: the reason on Error → Failure
- otherwise: the payload goes out just after — a 200 carrying the Parameters when Status is unset or success, else a 400 carrying the Error Message → Done

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires as the response goes out, and before the request scope is torn down |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the response could not be sent |
| `failure` | Signal | — | Fires when the response could not be sent, because there is no request in scope or one was already answered |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Input ports mirror the result values declared for the cloud function (one input per response value).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| status = success OR status NOT SET | `params` | — |
| status = failure | `errorMessage` | — |
| status = success OR status NOT SET | — | — |

## Ports at runtime

Each name in the `params` stringlist becomes a runtime-registered input (stored as `pm-<name>`, type '*') collected into the success reply. Declared port groups make the ports conditional on `status`: `params` (and its `pm-` inputs) exist while status is 'success' or unset, `errorMessage` exists while status is 'failure'. CloudFunctionAdapter mirrors the union of all Response nodes' `params` onto the browser-side caller as `out-<name>` outputs.

## Patterns

- Two Response nodes — one with status 'success', one with status 'failure' and an `errorMessage` — triggered from the two branches of a Condition: explicit success/failure replies.
- Feed `pm-` inputs as values as your logic computes them; only `send` decides when the reply goes out.

## Watch out for

- Finishing a function path without triggering any Response `send` — the browser-side caller hangs until the request times out.

## Examples

**Cloud function round trip: browser call → request → response**

A cloud function is a component that runs server-side: Request is its entry (its `params` become outputs carrying the caller's inputs; `receive` fires per invocation) and Response is its exit (its `params` become inputs; `send` returns them). In the browser, Call Cloud Function (CloudFunction2) names the function; the function's request params appear as inputs and its response params as outputs. Here two numbers are summed server-side: the browser sends a and b, the function computes with an Expression, and `sum` comes back on `success`.

**Server-side aggregation exposed as a cloud function**

Aggregate Records runs count/sum/min/max/average over a database class without transferring the records — it exists only in the cloud runtime, so the idiomatic shape is a small cloud function around it: Request triggers the aggregate's fetch, `fetched` sends the Response, and the aggregate results (outputs generated from the `aggregates` configuration) are returned as response params. The browser calls it like any cloud function and renders the statistic.

**Speak a phrase: text-to-speech in a cloud function, played in the page as it came**

A text-to-speech (TTS) API is called from a cloud function, so its key stays on the server, and the page plays what comes back. Three decisions matter. First, the key is a NAME: Secret reads GEMINI_API_KEY from the backend's secrets, the Function sends it in the x-goog-api-key header (never in the URL, which ends up in logs), and the key is never a port value the page can see. Second, and the one that is easy to get wrong: the audio an API returns today is almost always a FINISHED FILE (WAV, MP3 or OGG, with its own header, and sometimes extra chunks after the samples), so the cloud function passes the base64 and its MIME type through untouched and the page plays it as it is. Only a MIME type that says raw samples (audio/L16 or audio/pcm, which older Gemini text-to-speech returned) needs a WAV header put around it. Wrapping a finished file in a second header plays its first header as a click and anything after the samples as half a second of loud static. Gemini's current text-to-speech model returns audio/wav, so the wrap branch does not run for it. Third, failures stay readable: a script that threw answers through a failure Response with its own message, and a missing secret answers with a fixed sentence, because the Secret's own error names a server path the page should not show. Playback is a Function calling `new Audio(...)`, run from the call's Done; the call starts from a press, so the browser allows sound. In this function the value inputs have Run On Value Change unticked, because a signal runs each Function.

## Related nodes

[Request](./noodl-cloud-request.md), [Cloud Function](../cloud-services/cloud-function2.md), [Condition](../logic/condition.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- services of the backend process a cloud function runs in (`host`)

### Starting state

```json
{
  "responseParameters": {}
}
```

### How actions report back

Each time Send is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/cloud-response.ts"
/**
 * Response (`noodl.cloud.response`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/response.ts` and the runner that
 * hands it the request's callbacks (`noodl-viewer-cloud/src/index.ts` `CloudRunner.run` :297-323) on 2026-10-12 (NSP-022 s97).
 * Cloud-only: graded on the runtime's cloud target, in a function the world hands a request (world.ts HOST, THE INVOCATION).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE. Send takes a token per press and answers at once (`sendResponse` :148-211), reading the inputs as they stand:
 *   - a Response that holds no request — it was not part of the function when the request arrived, or no request reached the
 *     function (the runner installs the callbacks only on the Response nodes of the component it built, :301-323) — fails:
 *     `response/no-request-in-scope` (:157-164);
 *   - a request already answered — by another Response, by this one, by the request's refusal, or abandoned by the runner's
 *     timeout — fails: `response/already-sent` (:172-179);
 *   - otherwise the payload goes out: Status unset or `success` (exactly) is `200` carrying `{"result": <Parameters>}`; anything
 *     else `400` carrying `{"error": <Error Message>}` (:149, :181-183). Done is reported BEFORE the payload is delivered
 *     (:198 then :208): delivering tears the function down. Every failure puts its reason on Error (`_failResponse` :139-147);
 *     a Done touches nothing.
 * Parameters (`params`) lists names; each makes an INPUT `pm-<name>` (shown while Status is Success or unset, :15-44) whose
 * value the payload carries under its name — every `pm-` input written, whatever the list says (`registerInputIfNeeded`
 * :212-220), from its first write on.
 *
 * Not in a one-node play: the runner's teardown once the payload is delivered (index.ts :238-271, graded by its own tests), and
 * the branch reached only when something downstream of this node's own Done answers the request first (:200-210).
 */

import { defineNode, type ValueInputDecl } from '../spec';
import type { HostScript } from '../world';

type State = {
  /** :45-47, :127-129 — by name, in the order first written */
  responseParameters: Readonly<Record<string, unknown>>;
  /** :116-124, :140 */
  lastError: string | undefined;
};

/** :160 */
export const NO_REQUEST = 'This Response node has no request to answer — it was not part of the cloud function when the request arrived';
/** :166-167 */
export const ALREADY_SENT = 'The request has already been answered — a cloud function can only send one response';

/** :32-43 / :217-219 — a parameter's value input, type `*`, raw */
const paramInput = (name: string): ValueInputDecl => ({ type: '*', coerce: 'none', displayName: name, group: 'Parameters', description: `The value returned under ${name} in the response body`, examples: [42, 'ok', true, null, { a: 1 }, [1, 2]] });

const NAMES = ['total', 'ok'];

/** The processes a sequence plays in: no request; a request open the whole play; one another Response, or the runner's timeout, settles. */
const HOSTS: ReadonlyArray<HostScript> = [{}, { invocation: {} }, { invocation: {} }, { invocation: { settledAt: 10 } }, { invocation: { settledAt: 1 } }];

export const CloudResponse = defineNode({
  type: 'noodl.cloud.response',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/response.ts; packages/noodl-viewer-cloud/src/index.ts',
  needs: ['host'],
  worldPool: { hosts: HOSTS },

  state: { responseParameters: {}, lastError: undefined } as State,
  // :111-115 outcomeOutputs({ done, failure }) — no Unchanged
  outcomes: ['done', 'failure'],

  inputs: {
    // :49-56 — held raw
    params: { type: 'stringlist', coerce: 'none', editOnly: true, group: 'Parameters', description: 'Names to return in the response body, each becoming an input to supply it', examples: ['total', 'total,ok', 'ok', ''] },
    // :57-65 — held raw
    errorMessage: { type: 'string', coerce: 'none', displayName: 'Error Message', group: 'General', description: 'Message returned to the caller; used only when Status is Failure', examples: ['Not allowed', '', 0] },
    // :77-98 — held raw; the declared default never runs the setter, so unset reads as success (:149)
    status: { type: 'enum', enums: ['success', 'failure'], default: 'success', coerce: 'none', displayName: 'Status', group: 'General', description: 'Whether the caller gets a 200 carrying Parameters or a 400 carrying Error Message', examples: ['success', 'failure', 'Success'] },
    // :66-76
    send: { type: 'signal', outcome: true, displayName: 'Send', group: 'General', description: 'Sends the response and ends the request, which can only happen once' }
  },

  outputs: {
    // :116-124
    error: { type: 'string', from: (s) => s.lastError, displayName: 'Error', group: 'Error', description: 'Why the response could not be sent' }
  }
}).on(
  {
    params: () => ({ says: 'always: nothing while it runs; each name makes a value input the payload carries', send: [] }),
    errorMessage: () => ({ says: 'always: read when Send is pressed with Status Failure', send: [] }),
    status: () => ({ says: 'always: read when Send is pressed — unset or success is a 200, anything else a 400', send: [] }),
    send: (s, i, w) => {
      const req = w.invocation();
      if (req === 'none') return { says: 'no request reached the function this node is part of: the reason on Error', set: { lastError: NO_REQUEST }, send: ['error'], outcome: 'failure', error: 'response/no-request-in-scope' };
      if (req === 'settled') return { says: 'the request was already answered — by another Response, by a refusal, or by the runner\'s timeout: the reason on Error', set: { lastError: ALREADY_SENT }, send: ['error'], outcome: 'failure', error: 'response/already-sent' };
      const success = i.status === undefined || i.status === 'success';
      const payload = success ? { status: 200, body: JSON.stringify({ result: s.responseParameters }) } : { status: 400, body: JSON.stringify({ error: i.errorMessage }) };
      return { says: 'otherwise: the payload goes out just after — a 200 carrying the Parameters when Status is unset or success, else a 400 carrying the Error Message', send: [], outcome: 'done', answers: [{ op: 'respond', ...payload }] };
    }
  },
  {
    derived: {
      // :32-43 — drawn while Status is Success or unset
      inputs: (params) => (params.status === 'success' || params.status === undefined ? Object.fromEntries(paramNamesOf(params.params).map((n) => ['pm-' + n, paramInput(n)])) : {}),
      // :212-220 — any `pm-` name, on its first write
      discover: (port) => (port.startsWith('pm-') ? paramInput(port.slice('pm-'.length)) : undefined),
      candidates: NAMES.map((n) => 'pm-' + n),
      // :127-129
      on: (s, port, v) => ({ set: { responseParameters: { ...s.responseParameters, [port.slice('pm-'.length)]: v } }, send: [] })
    }
  }
);

/** :244 — the editor-side split of the list (`decodeStringList`): empty entries dropped, repeats collapsed */
function paramNamesOf(value: unknown): string[] {
  if (value === undefined) return [];
  return String(value)
    .split(',')
    .filter((p, i, all) => p && all.indexOf(p) === i);
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
