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
 * **D12** the node keeps ONE abort controller and clears it on ANY completion (:1108, :1176): when
 * two requests overlap and the earlier one completes — an answer, a 304, an abort — `Cancel` can
 * no longer abort the later one and reports `unchanged` with the request still in flight. The
 * spec models it (`abortable` is cleared by every answer); the scenario "an earlier request's
 * completion disarms Cancel for a later one" is the record.
 *
 * NOT IN THIS SPEC, named: `responseMapping` / `mapping-path-<name>` / the `out-<name>` OUTPUTS
 * (:1025-1039) — derived OUTPUTS are not yet a shape the format has (NSP-007 §5, for NSP-014);
 * `conditional` (:1244-1258, FED-004) — the validator store is the backend host's, a world seam
 * NSP-014 adds; in a browser the port changes nothing on the wire (:1283-1301).
 *
 * ROWS this spec found (NSP-007 §6): **C7** the authentication presets contribute NOTHING —
 * `authConfigurators` read `inputs.authToken` … (:131-157) from the bag the ports fill under
 * `auth-authToken` … (:447-458, `_storeInputValue(name)`), so no preset ever adds a header or a
 * query parameter; the spec keeps the runtime's read (`authContribution` below) so the row can be
 * seen closing. **C8** a non-string `url` (`.match`, :1069), or a truthy non-string `headers` /
 * `queryParams` / `bodyFields` (`.split`, :909-975), throws inside the after-inputs callback
 * (swallowed at nodecontext.ts :472) AFTER the tokens were drained (:1050-1051): the Fetch's
 * outcomes are lost for good and nothing is reported — the spec models the loss (the pending
 * invocations are never settled). **D11** a body that fails to parse under `Response Type: JSON`
 * or an `application/json` answer is reported as `http/network-error`, the code for "never
 * reached a server" (:1194-1203) — the description says "an unparseable body" is a failure, and
 * it is, under the wrong name.
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
    type: 'stringlist',
    examples: ['X-Test', 'Accept, X-Test', ''],
    displayName: 'Headers',
    group: 'Headers',
    description: 'Names the request headers to send; each name listed here gets its own value input'
  }),
  queryParams: port({
    type: 'stringlist',
    examples: ['q', 'q, page', ''],
    displayName: 'Query Parameters',
    group: 'Query Parameters',
    description: 'Names the query-string parameters to append to the URL; each name listed here gets its own value input'
  }),
  bodyType: port({
    type: 'enum',
    enums: ['json', 'form', 'urlencoded', 'raw'],
    default: 'json',
    displayName: 'Body Type',
    group: 'Body',
    description: 'How the body is encoded, which decides both the Content-Type sent and whether a null field value is kept or omitted'
  }),
  bodyFields: port({
    type: 'stringlist',
    examples: ['name', 'name, age', ''],
    displayName: 'Body Fields',
    group: 'Body',
    description: 'Names the fields to put in the request body; each name listed here gets its own value and type input'
  }),
  authType: port({
    type: 'enum',
    enums: ['none', 'bearer', 'basic', 'apiKey'],
    default: 'none',
    displayName: 'Authentication',
    group: 'Authentication',
    description: 'Credential scheme to apply, which decides which credential inputs appear below'
  }),
  responseType: port({
    type: 'enum',
    enums: ['auto', 'json', 'text'],
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

/** :131-157 `authConfigurators`, reading the bag AS THE NODE DOES — by the unprefixed names the ports never write (C7). `authType` itself is :901-903's store. */
function authContribution(values: Values): { headers?: Record<string, string>; queryParams?: Record<string, string> } {
  const v = values as { authType?: unknown; authToken?: string; authUsername?: string; authPassword?: string; authApiKeyName?: string; authApiKeyValue?: string; authApiKeyLocation?: string };
  switch (v.authType) {
    case 'bearer':
      return { headers: v.authToken ? { Authorization: `Bearer ${v.authToken}` } : {} };
    case 'basic':
      if (!v.authUsername || !v.authPassword) return {};
      return { headers: { Authorization: `Basic ${btoa(v.authUsername + ':' + v.authPassword)}` } };
    case 'apiKey':
      if (!v.authApiKeyName || !v.authApiKeyValue) return {};
      if (v.authApiKeyLocation === 'query') return { queryParams: { [v.authApiKeyName]: v.authApiKeyValue } };
      return { headers: { [v.authApiKeyName]: v.authApiKeyValue } };
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
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/httpnode.ts',
  needs: ['network', 'clock'],
  worldPool: { advances: [0, 1, 100, 1000, 29999, 30000] },

  // :316-337 `_internal`; :356-364 initialize. The bags: `values` is `inputValues`; the
  // configuration is one key each. `inFlight` (per request: the tokens it settles, its raw
  // timeout, whether the timeout fired), `abortable` (THE abort controller, :1073), `scheduled`
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
    abortable: undefined as string | undefined,
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
      description: 'Abandons a request that is still in flight, which answers on Canceled rather than Failure; reports Unchanged when there is nothing to cancel'
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
    url: (_s, v) => ({ set: { url: v } }),

    // :386-394 + :494-500 — a token, and one request at the end of the frame
    fetch: (s) => ({ set: { pendingTokens: s.pendingTokens + 1, scheduled: true }, outcome: 'pending' }),

    // :395-402 + :522-531 `cancelFetch` — abort THE controller and report at once
    cancel: (s) => (s.abortable !== undefined ? { set: { abortable: undefined }, abort: [s.abortable], outcome: 'done' } : { outcome: 'unchanged' })
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
                ports['body-type-' + f] = port({ type: 'enum', enums: ['string', 'number', 'boolean', 'array', 'object', '*'], default: 'string', displayName: f + ' Type', group: 'Body', description: 'Type the matching value input accepts and is sent as' });
                ports['body-' + f] = port({
                  type: ((params['body-type-' + f] as ValueInputDecl['type']) || 'string') as ValueInputDecl['type'],
                  displayName: f,
                  group: 'Body',
                  description: bodyType === 'json' ? 'undefined omits this field from the JSON body. null is kept and sent as JSON null.' : 'undefined or null omits this field — this encoding has no way to carry null.'
                });
              }
            }
          } else if (bodyType === 'raw') {
            ports['body-raw'] = str('Body', 'Body', 'Body sent verbatim, with no encoding applied and no Content-Type added for you');
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
          ports['auth-authApiKeyLocation'] = port({ type: 'enum', enums: ['header', 'query'], default: 'header', displayName: 'Add To', group: 'Authentication', description: 'Whether the API key travels as a request header or as a query-string parameter' });
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
          // `authType` (:901-903) is stored with the value ports, in `values`: until C7 is ruled
          // nothing a wire can see reads it — `authConfigurators[authType]` runs, and reads a bag
          // the ports never fill — so a state key of its own would be a branch no test can grade
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
      // a frame with no Fetch leaves the two the way they are — false and 0 — which is also exactly
      // what a frame whose doFetch threw leaves (C8), so the two are one branch on purpose
      if (!s.scheduled) return { set: drained };
      const tokens = s.pendingTokens;
      const rawUrl = s.url || '';
      const method = s.method || 'GET';
      // :951-959 — `bodyFields` is split BEFORE the body-type branch, so a raw body splits it too
      const bodyBuilt = !['GET', 'HEAD', 'OPTIONS'].includes(method as string);
      // C8 — a throw in the callback after the tokens were drained: the outcomes are lost, nothing else moves
      if (typeof rawUrl !== 'string' || badList(s.queryParams) || badList(s.headers) || (bodyBuilt && badList(s.bodyFields))) return { set: drained };
      const url = buildUrl(rawUrl, s);
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
        set: { ...drained, nextId: s.nextId + 1, inFlight: { ...s.inFlight, [id]: { tokens, timedOut: false, timeout } }, abortable: id, lastUrl: url },
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
        // :1108 / :1176 — `clearTimeout`, `abortController = null`, on ANY completion
        const base = { inFlight: rest, abortable: undefined as string | undefined };
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
          // :1191-1203 — the catch: no output moves, the message is the error's (D11: reported under the network error's code)
          return { set: { ...base, error: (e as Error).message || 'Network error' }, cancel, send: ['error'], outcomes: failure('http/network-error') };
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
