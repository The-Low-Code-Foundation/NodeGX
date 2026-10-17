---
title: "HTTP Request"
---
HTTP Request: fetches a URL on demand, delivering the parsed response, status code and an outcome signal.

The straightforward HTTP client: set `url` (plus method/headers/body via its configuration), fire `fetch`, and read `response` (parsed body, untyped), `responseHeaders`, and `statusCode`. `done`/`failure` split the outcome, with `error` describing failures, and `completed` fires after either so a chain can carry on regardless. `cancel` aborts an in-flight request: the abandoned request reports `unchanged` beside `canceled`, because nothing arrived and nothing changed, and the `cancel` itself reports `done` when it had something to abandon and `unchanged` when it did not.

## When to use it

One-off or simple API calls where the response can be consumed directly or handed to a Function/Script for shaping. Prefer the REST node when an endpoint is reused enough to deserve declared ports; prefer a cloud function when credentials must stay off the client.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `net.noodl.HTTP` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 5 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `url` | String | `` | Address the request is sent to; any {name} in it becomes a Path Parameter input, and leaving it blank fails the request rather than sending one |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `cancel` | Signal | — | Abandons every request still in flight, each answering on Canceled rather than Failure; reports Unchanged when there is nothing to cancel |
| `fetch` | Signal | — | Sends the request using the values currently on the inputs |

### What each input does

**URL** (`url`)

- always: kept as handed; read when the next Fetch goes — a request already running keeps the address it was sent to

**Fetch** (`fetch`)

- always: one request at the frame's end, however many Fetches arrived, with the values held then, beside any request already running: a 2xx answer sends Response, Status Code and Response Headers, then Done for each Fetch; any other status the same and Error, then Failure; a 304 is Not Modified and Unchanged; no URL, an input that is not text, a body that is not JSON, no answer by Timeout (ms) or none at all is Error and Failure

**Cancel** (`cancel`)

- a request still running: every one is abandoned — each lands as Canceled and Unchanged for its Fetches, Response and Status Code as they were — and this press is Done → Done
- nothing running: Unchanged → Unchanged

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `response` | * | — | Body the server sent, read the way Response Type says: Auto parses JSON when the server said application/json and hands over text otherwise, Text always hands over text, JSON always parses; it keeps the previous body when a request never reached the server |
| `responseHeaders` | Object | — | Every header the server returned, keyed by lower-cased header name |
| `statusCode` | Number | — | HTTP status the server answered with; it keeps the previous status when a request timed out or never reached the server |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `canceled` | Signal | — | Fires only when Cancel abandoned a request in flight; a timeout answers on Failure instead |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the server has answered with a 2xx status and Response is up to date |
| `notModified` | Signal | — | Fires when Conditional is on and the server answered 304 — nothing has changed since the last fetch, Response still holds the previous body, and the invocation reports Unchanged |
| `unchanged` | Signal | — | Fires when nothing was fetched and nothing changed: a Cancel that abandoned a request in flight, a Cancel with no request to abandon, or a Conditional request the server answered 304. Canceled and Not Modified tell those apart |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | What went wrong with the last request, in one sentence; unchanged when a request succeeds |
| `failure` | Signal | — | Fires when the request could not be completed — no URL, a network error, a timeout, an unparseable body, or a non-2xx status — after the reason has been put on Error |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Input and output ports derive from node parameters: configured headers and query parameters become inputs; response mappings become outputs.

## Ports at runtime

Header and body inputs are runtime-registered from the node's method/headers configuration; only the core trigger/result surface is static. Dynamic outputs minted from Response Mapping are all prefixed `out-`, so an author's mapping name can never collide with the node's own ports. NDA-012: exceeding `timeout` fires `failure` with a message naming the timeout — `canceled` fires only for an explicit `cancel`. ERG-001: failures now also reach the runtime error channel, so `On App Error` sees them in a deployed build — codes are `http/no-url`, `http/input-not-text` (a text input holding something else), `http/error-status`, `http/timeout`, `http/network-error` (the request never reached a server) and `http/bad-body` (the server answered, and its body could not be read as JSON). Requests genuinely overlap: a second `fetch` while one is in flight starts a second request, and each invocation carries its own outcome. `statusCode` and `response` keep the *previous* request's answer when a request never reached the server, because a value output cannot be cleared. Deleting the node does not abandon a request already in flight.

## Patterns

- `failure` → Condition `eval` with `result` → error text `visible`: errors as levels, not pulses.

## Examples

**HTTP Request with scripted post-processing and error display**

HTTP Request (net.noodl.HTTP) fetches the `url` when `fetch` fires and delivers `response` (parsed body), `statusCode`, and either `done` or `failure` with `error` — plus `completed` after either, to carry on regardless. The response is post-processed by a Script node (Javascript2), whose input/output ports are declared by its own code — here it reads `Inputs.response` and produces a `headline` output. Errors surface as a level: `failure` evaluates a Condition whose `result` shows the error text.

## Related nodes

[REST](./rest2.md), [Script](../custom-code/javascript2.md), [Function](../custom-code/java-script-function.md), [Cloud Function](../cloud-services/cloud-function2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the network (`network`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "headers": "",
  "queryParams": "",
  "bodyFields": "",
  "values": {},
  "scheduled": false,
  "pendingTokens": 0,
  "nextId": 1,
  "inFlight": {},
  "abortable": []
}
```

### How actions report back

Each time Fetch or Cancel is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/http.ts"
/**
 * HTTP Request (`net.noodl.HTTP`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/httpnode.ts` on 2026-09-30 (NSP-007).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations. `Fetch` does not send: it takes an outcome token and asks for
 * ONE request at the end of the frame, however many times it is pulsed (:480-490, :494-500) —
 * the tokens are all settled by that one request's answer. At the frame's end (:1042-1200,
 * `doFetch`) the URL is built from the raw `url` with its `{name}` placeholders filled from the
 * `path-<name>` values, the listed query parameters appended, the listed headers gathered, the
 * body encoded the way `bodyType` says (only for a method that is not GET / HEAD / OPTIONS), and
 * the request handed to the world (`fetch`) beside a timeout timer of `timeout` ms (:1075-1078).
 * No URL at all is a `failure` (`http/no-url`) with `Error` set, and no request (:1062-1071).
 * When the answer lands: a 304 pulses `Not Modified` and settles the tokens `unchanged` with no
 * output moved (:1116-1126); otherwise the body is read the way `responseType` says
 * (:1133-1155 — Auto parses JSON when the server says `application/json`, JSON always parses and
 * FAILS when it cannot, Text hands over the text); `Response`, `Status Code` and `Response
 * Headers` move (:995-1040); a 2xx settles `done`, anything else `failure` (`http/error-status`)
 * with `Error` = `HTTP <status>: <statusText>` (:1160-1170). A request that never reaches a
 * server, or a body that will not parse, is a `failure` (`http/network-error`) with `Error` =
 * the error's message and NO output moved (:1194-1203). The timeout ABORTS the request and the
 * abort is a `failure` (`http/timeout`) with `Error` = `Request timed out after <timeout> ms`
 * (:1075-1078, :1194-1203); `Cancel` aborts the LAST request issued — the node keeps ONE abort
 * controller (:1073-1074), replaced by every request and cleared by every answer (:1108,
 * :1176) — pulses `Canceled` and settles the tokens `unchanged` (:1181-1190), and itself reports
 * `done`, or `unchanged` when it had nothing to abort (:522-531).
 *
 * THE WORLD carries the request as `{ method, url, headers, body }` — exactly what the node hands
 * `fetch` (:1123-1128): the raw `method` (`value || 'GET'`, :906), the built URL, the headers it
 * chose (a `Content-Type` is added for a JSON or URL-encoded body it built, :1087-1093), the body
 * as text, form entries, or nothing. Header names are lower-cased on the wire (world.ts). No
 * `User-Agent`: that is the backend host's (:1104-1110), not a browser's.
 *
 * Almost every port is DERIVED (:435-465 `registerInputIfNeeded`): the configuration ports
 * (`method`, `timeout`, `headers`, `queryParams`, `bodyType`, `bodyFields`, `authType`,
 * `responseType`) and the value ports minted from them (`path-…`, `header-…`, `query-…`,
 * `body-…`, `auth-…`) are registered on first write, whatever the params; `updatePorts`
 * (:1179-1454) is what the editor draws for a given configuration. Only `url`, `fetch` and
 * `cancel` are declared (:370-402).
 *
 * **D12** (v5, fixed in P109 ISL-030, ruled "Every request still running"): one abort controller PER REQUEST, each
 * removed when its own request completes, and `Cancel` aborts every one still running, in the order they were sent
 * (`abortable` is that list). v4 kept ONE controller cleared by ANY completion, so an earlier request finishing left
 * `Cancel` unable to reach a later one, which reported `unchanged` with the request still in flight.
 *
 * NOT IN THIS SPEC, named: `responseMapping` / `mapping-path-<name>` / the `out-<name>` OUTPUTS
 * (:1025-1039) — derived OUTPUTS are not yet a shape the format has (NSP-007 §5, for NSP-014);
 * `conditional` (:1244-1258, FED-004) — the validator store is the backend host's, a world seam
 * NSP-014 adds; in a browser the port changes nothing on the wire (:1283-1301).
 *
 * ROWS this spec found (NSP-007 §6): **C7** (v3, fixed in P109 ISL-030, ruled "Fix it, send the credential"): the
 * presets read the `auth-…` ports by the names they store under (`authInputs`), so Bearer sends `Authorization:
 * Bearer <token>`, Basic the encoded user name and password, and API Key its header or query parameter; v2 modelled
 * the loss (the configurators read `authToken` … from a bag the ports fill under `auth-authToken` …). **C8** (v2, fixed in P109 ISL-026, ruled "Fail and say which input"): a truthy
 * non-string `url`, `queryParams`, `headers` or — when a body is built — `bodyFields` fails the Fetch with
 * `http/input-not-text`, Error "<the input> is not text", and no request; v1 modelled the loss (the runtime
 * threw inside the callback after the tokens were drained, and the outcomes were never settled). **D11** (v4, fixed in P109
 * ISL-030, ruled "Give it its own code"): a body that fails to parse under `Response Type: JSON` or an `application/json`
 * answer fails under `http/bad-body`, its message unchanged; v3 reported `http/network-error`, the code for "never reached a
 * server".
 */

import { defineNode, type ValueInputDecl } from '../spec';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The node's own JavaScript on a raw value — no conversion of the spec's choosing. */
const js = (v: unknown): any => v;

/** :1069 */
const PATH_PARAM = /\{([A-Za-z0-9_]+)\}/g;
/** :928-931 and the other five sites — a stringlist parameter as the node reads it. */
const list = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
/** :107-109 `hasHttpParamValue` — the empty-value contract: undefined and null abstain. */
const has = (v: unknown): boolean => v !== undefined && v !== null;

type Values = Readonly<Record<string, unknown>>;
interface InFlight {
  tokens: number;
  timedOut: boolean;
  /** The raw `timeout` the request was sent with — the message names it (:1196). */
  timeout: unknown;
}

const port = (decl: ValueInputDecl): ValueInputDecl => ({ coerce: 'none', ...decl });
const str = (displayName: string, group: string, description: string): ValueInputDecl => port({ type: 'string', displayName, group, description });

/** The configuration ports, registered on first write (:439-450) and drawn by `updatePorts`. */
const CONFIG: Readonly<Record<string, ValueInputDecl>> = Object.freeze({
  method: port({
    editOnly: true,
    type: 'enum',
    enums: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    default: 'GET',
    displayName: 'Method',
    group: 'Request',
    description: 'HTTP verb the request is sent with; GET, HEAD and OPTIONS send no body and hide the Body group'
  }),
  timeout: port({
    type: 'number',
    default: 30000,
    examples: [1000, 100, 30000],
    displayName: 'Timeout (ms)',
    group: 'Request',
    description: 'Time before the request is abandoned, in milliseconds; abandoning it fires Failure, not Canceled, and 0 or blank means 30000'
  }),
  headers: port({
    editOnly: true,
    type: 'stringlist',
    examples: ['X-Test', 'Accept, X-Test', ''],
    displayName: 'Headers',
    group: 'Headers',
    description: 'Names the request headers to send; each name listed here gets its own value input'
  }),
  queryParams: port({
    editOnly: true,
    type: 'stringlist',
    examples: ['q', 'q, page', ''],
    displayName: 'Query Parameters',
    group: 'Query Parameters',
    description: 'Names the query-string parameters to append to the URL; each name listed here gets its own value input'
  }),
  bodyType: port({
    editOnly: true,
    type: 'enum',
    enums: ['json', 'form', 'urlencoded', 'raw'],
    labels: { json: 'JSON', form: 'Form Data', urlencoded: 'URL Encoded', raw: 'Raw' },
    default: 'json',
    displayName: 'Body Type',
    group: 'Body',
    description: 'How the body is encoded, which decides both the Content-Type sent and whether a null field value is kept or omitted'
  }),
  bodyFields: port({
    editOnly: true,
    type: 'stringlist',
    examples: ['name', 'name, age', ''],
    displayName: 'Body Fields',
    group: 'Body',
    description: 'Names the fields to put in the request body; each name listed here gets its own value and type input'
  }),
  authType: port({
    editOnly: true,
    type: 'enum',
    enums: ['none', 'bearer', 'basic', 'apiKey'],
    labels: { none: 'None', bearer: 'Bearer Token', basic: 'Basic Auth', apiKey: 'API Key' },
    default: 'none',
    displayName: 'Authentication',
    group: 'Authentication',
    description:
      'Credential scheme to apply, which decides which credential inputs appear below; Bearer and Basic set the ' +
      'Authorization header, so leave Authorization out of Headers'
  }),
  responseType: port({
    editOnly: true,
    type: 'enum',
    enums: ['auto', 'json', 'text'],
    labels: { auto: 'Auto', json: 'JSON', text: 'Text' },
    default: 'auto',
    displayName: 'Response Type',
    group: 'Response',
    description:
      'How to read the body. Auto parses JSON when the server says application/json and hands over ' +
      'text otherwise. Text always hands over text, whatever the server claimed — which is what an ' +
      'XML or feed parser downstream needs. JSON always parses, and fires Failure when the body is not JSON'
  })
});

/** :452-462 — the prefixes whose ports store a value and nothing more. */
const VALUE_PREFIXES = ['path-', 'header-', 'query-', 'body-', 'auth-', 'mapping-path-'];

/** `authConfigurators` on `authInputs(inputValues)` — the `auth-…` ports by the names they store under (v3, C7). `authType` itself is :901-903's store. */
function authContribution(values: Values): { headers?: Record<string, string>; queryParams?: Record<string, string> } {
  const v = values as Record<string, any>;
  const token = v['auth-authToken'];
  const user = v['auth-authUsername'];
  const password = v['auth-authPassword'];
  const keyName = v['auth-authApiKeyName'];
  const keyValue = v['auth-authApiKeyValue'];
  switch (v.authType) {
    case 'bearer':
      return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
    case 'basic':
      if (!user || !password) return {};
      return { headers: { Authorization: `Basic ${btoa(user + ':' + password)}` } };
    case 'apiKey':
      if (!keyName || !keyValue) return {};
      if (v['auth-authApiKeyLocation'] === 'query') return { queryParams: { [keyName]: keyValue } };
      return { headers: { [keyName]: keyValue } };
    default:
      return {}; // 'none', undefined, or a name no configurator has (:945 `authConfigurators[authType]`)
  }
}

/** :852-903 `buildUrl` on a string url. */
export function buildUrl(url: string, s: { queryParams: unknown; values: Values }): string {
  let out = url;
  for (const param of out.match(PATH_PARAM) || []) {
    const name = param.replace(/[{}]/g, '');
    const value = s.values['path-' + name];
    if (has(value)) out = out.replace(param, encodeURIComponent(String(value)));
  }
  const query: Record<string, unknown> = {};
  if (s.queryParams) {
    for (const qp of list(s.queryParams as string)) {
      const value = s.values['query-' + qp];
      if (has(value) && value !== '') query[qp] = value; // :884-887 — an empty string omits, as it always has
    }
  }
  const auth = authContribution(s.values);
  if (auth.queryParams) Object.assign(query, auth.queryParams);
  const qs = Object.entries(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  if (qs) out += (out.includes('?') ? '&' : '?') + qs;
  return out;
}

/** :905-927 `buildHeaders`. */
export function buildHeaders(s: { headers: unknown; values: Values }): Record<string, string> {
  const headers: Record<string, string> = {};
  if (s.headers) {
    for (const h of list(s.headers as string)) {
      const value = s.values['header-' + h];
      if (has(value)) headers[h] = String(value);
    }
  }
  const auth = authContribution(s.values);
  if (auth.headers) Object.assign(headers, auth.headers);
  return headers;
}

/** :929-989 `buildBody` — as it travels: text, `{ $form }` entries, the raw value, or nothing. */
export function buildBody(method: unknown, s: { bodyType: unknown; bodyFields: unknown; values: Values }): unknown {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method as string)) return undefined;
  const bodyType = s.bodyType || 'json';
  const fields = list((s.bodyFields as string) || '');
  if (bodyType === 'json') {
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const value = s.values['body-' + f];
      if (value !== undefined) body[f] = value; // :960-967 — JSON has a null; undefined abstains
    }
    return Object.keys(body).length > 0 ? JSON.stringify(body) : undefined;
  }
  if (bodyType === 'form') {
    const entries: Array<[string, string]> = [];
    for (const f of fields) {
      const value = s.values['body-' + f];
      if (has(value)) entries.push([f, String(value)]); // :971-975 FormData.append — a string of it
    }
    return { $form: entries };
  }
  if (bodyType === 'urlencoded') {
    const params = new URLSearchParams();
    for (const f of fields) {
      const value = s.values['body-' + f];
      if (has(value)) params.append(f, String(value));
    }
    return params.toString();
  }
  if (bodyType === 'raw') return s.values['body-raw'];
  return undefined;
}

/** A truthy non-string where the node calls `.split` (C8). */
const badList = (v: unknown): boolean => !!v && typeof v !== 'string';

const repeat = <T>(n: number, item: T): T[] => Array.from({ length: n }, () => item);

export const HttpRequest = defineNode({
  type: 'net.noodl.HTTP',
  // v2 (P109 ISL-026, P107-C8 ruled "Fail and say which input"): an input the request reads as text that holds something else
  // fails the Fetch with `http/input-not-text`, naming the input on Error; v1 lost the outcome (the runtime threw).
  // v3 (P109 ISL-030, P107-C7 ruled "Fix it, send the credential"): the Authentication presets send their credential; v2
  // sent nothing (the presets read a key the ports never write).
  // v4 (P109 ISL-030, P107-D11 ruled "Give it its own code"): a body that cannot be read as JSON fails under `http/bad-body`;
  // v3 used `http/network-error`, the code for a request that never reached a server.
  // v5 (P109 ISL-030, P107-D12 ruled "Every request still running"): a controller per request, and Cancel aborts every request
  // still running; v4 kept one, cleared by any completion, so Cancel could miss a later request.
  version: 5,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/httpnode.ts',
  needs: ['network', 'clock'],
  worldPool: { advances: [0, 1, 100, 1000, 29999, 30000] },

  // :316-337 `_internal`; :356-364 initialize. The bags: `values` is `inputValues`; the
  // configuration is one key each. `inFlight` (per request: the tokens it settles, its raw
  // timeout, whether the timeout fired), `abortable` (the requests Cancel aborts, v5), `scheduled`
  // (`hasScheduledFetch`), `pendingTokens` (`pendingFetchOutcomes.length`), `nextId` (the spec's).
  state: {
    url: undefined as unknown,
    method: undefined as unknown,
    timeout: undefined as unknown,
    headers: '' as unknown,
    queryParams: '' as unknown,
    bodyType: undefined as unknown,
    bodyFields: '' as unknown,
    responseType: undefined as unknown,
    values: {} as Values,
    scheduled: false,
    pendingTokens: 0,
    nextId: 1,
    inFlight: {} as Readonly<Record<string, InFlight>>,
    abortable: [] as readonly string[],
    response: undefined as unknown,
    statusCode: undefined as number | undefined,
    responseHeaders: undefined as Record<string, string> | undefined,
    error: undefined as string | undefined,
    lastUrl: undefined as string | undefined
  },
  // :366-371 — the last request, or not executed yet
  inspect: (s) => (s.lastUrl === undefined ? '[Not executed yet]' : `${String(s.method || 'GET')} ${s.lastUrl}`),
  // :492-506 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :375-385 — stored raw
    url: port({
      type: 'string',
      default: '',
      examples: ['https://api.example.com/users', 'https://api.example.com/users/{id}', 'https://api.example.com/items?page=1', '/relative/path', ''],
      displayName: 'URL',
      group: 'Request',
      description: 'Address the request is sent to; any {name} in it becomes a Path Parameter input, and leaving it blank fails the request rather than sending one'
    }),
    // :386-394
    fetch: { type: 'signal', outcome: true, displayName: 'Fetch', group: 'Actions', description: 'Sends the request using the values currently on the inputs' },
    // :395-402
    cancel: {
      type: 'signal',
      outcome: true,
      displayName: 'Cancel',
      group: 'Actions',
      description: 'Abandons every request still in flight, each answering on Canceled rather than Failure; reports Unchanged when there is nothing to cancel'
    }
  },

  outputs: {
    // :407-418
    response: {
      type: '*',
      from: (s) => s.response,
      displayName: 'Response',
      group: 'Response',
      description:
        'Body the server sent, read the way Response Type says: Auto parses JSON when the server ' +
        'said application/json and hands over text otherwise, Text always hands over text, JSON always ' +
        'parses; it keeps the previous body when a request never reached the server'
    },
    // :419-428
    statusCode: {
      type: 'number',
      from: (s) => s.statusCode,
      displayName: 'Status Code',
      group: 'Response',
      description: 'HTTP status the server answered with; it keeps the previous status when a request timed out or never reached the server'
    },
    // :429-437
    responseHeaders: { type: 'object', from: (s) => s.responseHeaders, displayName: 'Response Headers', group: 'Response', description: 'Every header the server returned, keyed by lower-cased header name' },
    // :438-452
    canceled: { type: 'signal', displayName: 'Canceled', group: 'Events', description: 'Fires only when Cancel abandoned a request in flight; a timeout answers on Failure instead' },
    // :453-472
    notModified: {
      type: 'signal',
      displayName: 'Not Modified',
      group: 'Events',
      description:
        'Fires when Conditional is on and the server answered 304 — nothing has changed since the ' +
        'last fetch, Response still holds the previous body, and the invocation reports Unchanged'
    },
    // :473-479
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'What went wrong with the last request, in one sentence; unchanged when a request succeeds' }
  }
}).on(
  {
    // :375-385 — raw
    url: (_s, v) => ({ says: 'always: kept as handed; read when the next Fetch goes — a request already running keeps the address it was sent to', set: { url: v } }),

    // :386-394 + :494-500 — a token, and one request at the end of the frame
    fetch: (s) => ({
      says: "always: one request at the frame's end, however many Fetches arrived, with the values held then, beside any request already running: a 2xx answer sends Response, Status Code and Response Headers, then Done for each Fetch; any other status the same and Error, then Failure; a 304 is Not Modified and Unchanged; no URL, an input that is not text, a body that is not JSON, no answer by Timeout (ms) or none at all is Error and Failure",
      set: { pendingTokens: s.pendingTokens + 1, scheduled: true },
      outcome: 'pending'
    }),

    // `cancelFetch` — abort every request still running and report at once (v5, D12)
    cancel: (s) =>
      s.abortable.length > 0
        ? { says: 'a request still running: every one is abandoned — each lands as Canceled and Unchanged for its Fetches, Response and Status Code as they were — and this press is Done', set: { abortable: [] }, abort: [...s.abortable], outcome: 'done' }
        : { says: 'nothing running: Unchanged', outcome: 'unchanged' }
  },
  {
    derived: {
      // :1179-1454 `updatePorts` — what the editor draws for these params
      inputs: (params) => {
        const ports: Record<string, ValueInputDecl> = {};
        if (typeof params.url === 'string') {
          for (const name of new Set((params.url.match(PATH_PARAM) || []).map((p) => p.replace(/[{}]/g, '')))) {
            ports['path-' + name] = str(name, 'Path Parameters', 'undefined or null leaves the {' + name + '} placeholder in the URL literally, unreplaced — a path segment cannot be empty.');
          }
        }
        ports.headers = CONFIG.headers;
        if (typeof params.headers === 'string') for (const h of list(params.headers)) ports['header-' + h] = str(h, 'Headers', 'undefined or null omits this header — an HTTP header has no way to carry null.');
        ports.queryParams = CONFIG.queryParams;
        if (typeof params.queryParams === 'string') for (const q of list(params.queryParams)) ports['query-' + q] = str(q, 'Query Parameters', "undefined, null or '' omits this query parameter — a query string has no way to carry null.");
        ports.method = CONFIG.method;
        const method = (params.method as string) || 'GET';
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          ports.bodyType = CONFIG.bodyType;
          const bodyType = params.bodyType || 'json';
          if (bodyType === 'json' || bodyType === 'form' || bodyType === 'urlencoded') {
            ports.bodyFields = CONFIG.bodyFields;
            if (typeof params.bodyFields === 'string') {
              for (const f of list(params.bodyFields)) {
                ports['body-type-' + f] = port({ type: 'enum', enums: ['string', 'number', 'boolean', 'array', 'object', '*'], labels: { string: 'String', number: 'Number', boolean: 'Boolean', array: 'Array', object: 'Object', '*': 'Any' }, editOnly: true, default: 'string', displayName: f + ' Type', group: 'Body', description: 'Type the matching value input accepts and is sent as' });
                ports['body-' + f] = port({
                  type: ((params['body-type-' + f] as ValueInputDecl['type']) || 'string') as ValueInputDecl['type'],
                  displayName: f,
                  group: 'Body',
                  description: bodyType === 'json' ? 'undefined omits this field from the JSON body. null is kept and sent as JSON null.' : 'undefined or null omits this field — this encoding has no way to carry null.'
                });
              }
            }
          } else if (bodyType === 'raw') {
            ports['body-raw'] = { ...str('Body', 'Body', 'Body sent verbatim, with no encoding applied and no Content-Type added for you'), editOnly: true, codeEditor: 'json' };
          }
        }
        ports.authType = CONFIG.authType;
        const authType = params.authType || 'none';
        if (authType === 'bearer') ports['auth-authToken'] = str('Token', 'Authentication', 'Token sent as "Authorization: Bearer …"; leave blank and no Authorization header is sent at all');
        else if (authType === 'basic') {
          ports['auth-authUsername'] = str('Username', 'Authentication', 'Half of the Basic credential; no Authorization header is sent unless both this and Password are set');
          ports['auth-authPassword'] = str('Password', 'Authentication', 'Half of the Basic credential; no Authorization header is sent unless both this and Username are set');
        } else if (authType === 'apiKey') {
          ports['auth-authApiKeyName'] = str('Key Name', 'Authentication', 'Header or query-parameter name the key is sent under; nothing is sent unless Key Value is set too');
          ports['auth-authApiKeyValue'] = str('Key Value', 'Authentication', 'The key itself; nothing is sent unless Key Name is set too');
          ports['auth-authApiKeyLocation'] = port({ type: 'enum', enums: ['header', 'query'], labels: { header: 'Header', query: 'Query Parameter' }, default: 'header', displayName: 'Add To', group: 'Authentication', description: 'Whether the API key travels as a request header or as a query-string parameter' });
        }
        ports.timeout = CONFIG.timeout;
        ports.responseType = CONFIG.responseType;
        return ports;
      },
      // :435-465 `registerInputIfNeeded` — a configuration name, or any prefixed name, on first write
      discover: (name) => CONFIG[name] ?? (VALUE_PREFIXES.some((p) => name.startsWith(p)) ? port({ type: name.startsWith('body-') ? '*' : 'string' }) : undefined),
      candidates: [
        'method',
        'timeout',
        'headers',
        'queryParams',
        'bodyType',
        'bodyFields',
        'authType',
        'responseType',
        'header-X-Test',
        'header-Accept',
        'query-q',
        'query-page',
        'path-id',
        'body-name',
        'body-age',
        'body-raw',
        'auth-authToken',
        'auth-authUsername',
        'auth-authPassword',
        'auth-authApiKeyName',
        'auth-authApiKeyValue',
        'auth-authApiKeyLocation'
      ],
      // the configuration setters (:882-919) and `_storeInputValue` (:421-423)
      on: (s, name, value) => {
        switch (name) {
          case 'method':
            return { set: { method: js(value) || 'GET' } }; // :905-907
          case 'timeout':
            return { set: { timeout: js(value) || 30000 } }; // :909-911
          case 'headers':
            return { set: { headers: js(value) || '' } }; // :881-883
          case 'queryParams':
            return { set: { queryParams: js(value) || '' } }; // :885-887
          case 'bodyFields':
            return { set: { bodyFields: js(value) || '' } }; // :893-895
          case 'bodyType':
            return { set: { bodyType: value } }; // :889-891 raw
          // `authType` (:901-903) is stored with the value ports, in `values`, beside the `auth-…` values it reads (v3, C7)
          case 'responseType':
            return { set: { responseType: js(value) || 'auto' } }; // :913-915
          default:
            return { set: { values: { ...s.values, [name]: value } } };
        }
      }
    },

    // :1042-1200 `doFetch`, run once at the frame's end when a Fetch scheduled it (:494-500)
    afterInputs: (s) => {
      const drained = { scheduled: false, pendingTokens: 0 };
      // a frame with no Fetch leaves the two the way they are — false and 0
      if (!s.scheduled) return { set: drained };
      const tokens = s.pendingTokens;
      const rawUrl = s.url || '';
      const method = s.method || 'GET';
      // :951-959 — `bodyFields` is split BEFORE the body-type branch, so a raw body splits it too
      const bodyBuilt = !['GET', 'HEAD', 'OPTIONS'].includes(method as string);
      // C8 (v2) — the first input the request reads as text that holds something else, in the order it is read
      const notText = typeof rawUrl !== 'string' ? 'URL' : badList(s.queryParams) ? 'Query Parameters' : badList(s.headers) ? 'Headers' : bodyBuilt && badList(s.bodyFields) ? 'Body Fields' : undefined;
      if (notText !== undefined) {
        return { set: { ...drained, error: notText + ' is not text' }, send: ['error'], outcomes: repeat(tokens, { port: 'fetch' as const, outcome: 'failure' as const, error: 'http/input-not-text' }) };
      }
      const url = buildUrl(rawUrl as string, s); // a string here: the C8 branch above returned for anything else
      const headers = buildHeaders(s);
      const body = buildBody(method, s);
      const timeout = s.timeout || 30000; // :1057
      if (!url) {
        // :1062-1071
        return { set: { ...drained, error: 'URL is required', lastUrl: url }, send: ['error'], outcomes: repeat(tokens, { port: 'fetch' as const, outcome: 'failure' as const, error: 'http/no-url' }) };
      }
      // :1087-1093 — a Content-Type for the bodies the node encoded itself
      const bodyType = s.bodyType || 'json';
      if (body && bodyType === 'json' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      else if (body && bodyType === 'urlencoded' && !headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const id = String(s.nextId);
      return {
        set: { ...drained, nextId: s.nextId + 1, inFlight: { ...s.inFlight, [id]: { tokens, timedOut: false, timeout } }, abortable: [...s.abortable, id], lastUrl: url },
        after: [{ ms: timeout, tag: 'timeout:' + id }], // :1075-1078, armed before the request goes
        request: { id, method, url, headers, body }
      };
    },

    world: {
      // :1075-1078 — the timeout: mark it, abort the request; the abort's landing reports it
      timer: (s, _i, tag) => {
        const id = tag.slice('timeout:'.length);
        const f = s.inFlight[id];
        if (!f) return {};
        return { set: { inFlight: { ...s.inFlight, [id]: { ...f, timedOut: true } } }, abort: [id] };
      },

      // :1096-1210 — the promise chain's `.then`s and `.catch`
      response: (s, _i, res) => {
        const f = s.inFlight[res.id];
        if (!f) return {};
        const { [res.id]: _done, ...rest } = s.inFlight;
        // `clearTimeout`, and THIS request's controller leaves the set (v5, D12)
        const base = { inFlight: rest, abortable: s.abortable.filter((x) => x !== res.id) };
        const cancel = ['timeout:' + res.id];
        const n = f.tokens;
        const failure = (code: string) => repeat(n, { port: 'fetch' as const, outcome: 'failure' as const, error: code });
        if ('aborted' in res) {
          if (!f.timedOut) return { set: base, cancel, emit: ['canceled'], outcomes: repeat(n, { port: 'fetch' as const, outcome: 'unchanged' as const }) }; // :1181-1190
          return { set: { ...base, error: `Request timed out after ${String(f.timeout)} ms` }, cancel, send: ['error'], outcomes: failure('http/timeout') }; // :1194-1203
        }
        if ('error' in res) {
          return { set: { ...base, error: res.error.message || 'Network error' }, cancel, send: ['error'], outcomes: failure('http/network-error') }; // :1194-1203
        }
        if (res.status === 304) return { set: base, cancel, emit: ['notModified'], outcomes: repeat(n, { port: 'fetch' as const, outcome: 'unchanged' as const }) }; // :1116-1126
        const responseType = s.responseType || 'auto';
        const text = res.body ?? '';
        let body: unknown;
        try {
          if (responseType === 'text') body = text;
          else if (responseType === 'json') {
            try {
              body = JSON.parse(text);
            } catch (e) {
              throw new Error('Response Type is JSON but the body is not JSON: ' + (e && (e as Error).message ? (e as Error).message : String(e))); // :1139-1150
            }
          } else if ((res.headers['content-type'] || '').includes('application/json')) body = JSON.parse(text); // :1152-1155 `response.json()`
          else body = text;
        } catch (e) {
          // :1191-1203 — the catch: no output moves, the message is the error's; the code is `http/bad-body` (v4, D11 — v3
          // reported the network error's code for a request the server answered)
          return { set: { ...base, error: (e as Error).message || 'Network error' }, cancel, send: ['error'], outcomes: failure('http/bad-body') };
        }
        // :995-1040 `processResponse`, then :1160-1170
        const moved = { ...base, response: body, statusCode: res.status, responseHeaders: res.headers };
        if (res.status >= 200 && res.status < 300) {
          return { set: moved, cancel, send: ['response', 'statusCode', 'responseHeaders'], outcomes: repeat(n, { port: 'fetch' as const, outcome: 'done' as const }) };
        }
        return { set: { ...moved, error: `HTTP ${res.status}: ${res.statusText}` }, cancel, send: ['response', 'statusCode', 'responseHeaders', 'error'], outcomes: failure('http/error-status') };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
