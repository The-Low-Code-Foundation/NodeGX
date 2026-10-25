/**
 * Request (`noodl.cloud.request`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/request.ts`, its contract
 * (`requestContract.ts`), its origin (`requestOrigin.ts`) and the cloud user service it looks the caller up through
 * (`services/userservice.js`) on 2026-10-12 (NSP-022 s97). Cloud-only: graded on the runtime's cloud target, in a function the
 * world hands a request (world.ts HOST, THE INVOCATION). Measured first through the real `CloudRunner.run` (NSP-022 §6.5).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from; where the rule is JavaScript's (a
 * `JSON.parse` of what was handed, a `for … in` over what it parsed to), the spec runs the same expression on the same value.
 *
 * THE RULE. The node does nothing until the process hands its function the request (`sendRequest`, :214-285). Then:
 *   - the body is `JSON.parse`d — anything that does not parse is `{}` (:216-219); a JSON `null`, a number or a string is what
 *     it parsed to;
 *   - with a session token (`x-parse-session-token`, that spelling only, truthy, :215) the caller is looked up (:221-235): with no
 *     `_noodl_cloudservices` in the process the lookup fails at once ("No active cloud service", userservice.js :33-36);
 *     otherwise it is a `GET <endpoint>/users/me` carrying the app id, the master key, `content-type: application/json`, the
 *     token and (when the process runs one) the run id, and no body (:38-56). Its answer: a 2xx whose body is a JSON object
 *     (or any JSON but `null`) is the caller — Authenticated, User Id its `objectId` (a random 10-character id when it has
 *     none: `Model.get(undefined)`, model.ts :424-428, :297-307), User Id sent at once (:229-231); any other status, a body
 *     that is not JSON (or none), a JSON `null`, and a request that never reaches the server, are a failed lookup
 *     (userservice.js :57-76 — before s97 the first three were never answered and the function waited for its timeout,
 *     P107-S97-USERSMEHANG, fixed);
 *   - a failed lookup, or no token at all, refuses the request — `Unauthenticated requests not accepted.` — unless Allow
 *     Unauthenticated is set NOW (read when the lookup fails, :234, :236);
 *   - then the CONTRACT (:254-259): when any listed parameter declares a type, Required or a Default (`ptype-`, `preq-`,
 *     `pdef-`), the parsed body is checked and coerced (requestContract.ts `applyRequestContract`); a refused field refuses
 *     the request (`Invalid request body: …`, its fields); a body that is not a JSON object (`null`, a number, a string, an
 *     array) names no fields there, so a Required one is `missing` (v2; it threw a `TypeError` before, P107-S97-NULLBODY);
 *   - then Origin (:276-277, requestOrigin.ts), Authenticated (:279), one Parameters output per key of what parsed — only the
 *     ones a wire made (:281-283, :200-203 gated on `hasOutput`) — and Received (:284).
 * A refusal is the function's answer (an `answer` `refuse` event); nothing after it in the list above happens.
 *
 * THE PORTS. Parameters (`params`) lists names; each makes a value OUTPUT `pm-<name>` — registered only by a wire (`registerOutputIfNeeded`
 * :286-295; the editor draws it from the list, typed by the name's Type) — and three edit-only INPUTS, its Type, Required and
 * Default (`ptype-` / `preq-` / `pdef-`, registered on their first write whatever the list says, :308-321).
 */

import { defineNode, type InputDecl, type OutputDecl, type ValueInputDecl, type WorldView } from '../spec';
import type { HostScript, InvocationRequest } from '../world';

// ------------------------------------------------------------------------------------------------ the contract (requestContract.ts)

/** requestContract.ts :56 */
export const REQUEST_PARAM_TYPES = ['*', 'string', 'number', 'boolean', 'object', 'array', 'date'] as const;
type ParamType = (typeof REQUEST_PARAM_TYPES)[number];
/** requestContract.ts :61-63 */
export const TYPE_PREFIX = 'ptype-';
export const REQUIRED_PREFIX = 'preq-';
export const DEFAULT_PREFIX = 'pdef-';

/** :66-68 */
const isContractParameter = (name: string) => name.startsWith(TYPE_PREFIX) || name.startsWith(REQUIRED_PREFIX) || name.startsWith(DEFAULT_PREFIX);

interface ParamSpec {
  name: string;
  type: ParamType;
  required: boolean;
  default?: unknown;
}
interface ParamError {
  name: string;
  code: 'missing' | 'type';
  expected: ParamType;
  received?: string;
}

/** :112-115 */
const describeError = (e: ParamError) => (e.code === 'missing' ? `"${e.name}" is required` : `"${e.name}" expects ${e.expected}, received ${e.received}`);

/** :126-130 — empty entries dropped, repeats collapsed, no trimming */
export function paramNames(value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  const raw = Array.isArray(value) ? value.map((v) => String(v)) : typeof value === 'string' ? value.split(',') : [];
  return raw.filter((p, i, all) => !!p && all.indexOf(p) === i);
}

/** :133-137 */
const asType = (value: unknown): ParamType => ((REQUEST_PARAM_TYPES as readonly string[]).indexOf(value as string) !== -1 ? (value as ParamType) : '*');

/** :151-163 */
function requestParamSpecs(parameters: Readonly<Record<string, unknown>>): ParamSpec[] {
  return paramNames(parameters['params']).map((name) => {
    const spec: ParamSpec = { name, type: asType(parameters[TYPE_PREFIX + name]), required: parameters[REQUIRED_PREFIX + name] === true || parameters[REQUIRED_PREFIX + name] === 'true' };
    const declaredDefault = parameters[DEFAULT_PREFIX + name];
    if (declaredDefault !== undefined && declaredDefault !== '') spec.default = declaredDefault;
    return spec;
  });
}

/** :166-168 */
const contractIsEmpty = (specs: ParamSpec[]) => specs.every((s) => s.type === '*' && !s.required && s.default === undefined);

/** :171-175 */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/** :177-179 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

type Coerced = { ok: true; value: unknown } | { ok: false };
const FAILED: Coerced = { ok: false };

/** :192-267 */
function coerce(type: ParamType, value: unknown): Coerced {
  switch (type) {
    case '*':
      return { ok: true, value };
    case 'string':
      if (typeof value === 'string') return { ok: true, value };
      if (typeof value === 'number' && isFinite(value)) return { ok: true, value: String(value) };
      if (typeof value === 'boolean') return { ok: true, value: String(value) };
      if (isPlainObject(value) || Array.isArray(value)) {
        try {
          return { ok: true, value: JSON.stringify(value) };
        } catch {
          return FAILED;
        }
      }
      return FAILED;
    case 'number': {
      if (typeof value === 'number') return isFinite(value) ? { ok: true, value } : FAILED;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return FAILED;
        const n = Number(trimmed);
        return isFinite(n) ? { ok: true, value: n } : FAILED;
      }
      if (typeof value === 'boolean') return { ok: true, value: value ? 1 : 0 };
      return FAILED;
    }
    case 'boolean':
      if (typeof value === 'boolean') return { ok: true, value };
      if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (lowered === 'true') return { ok: true, value: true };
        if (lowered === 'false') return { ok: true, value: false };
        return FAILED;
      }
      if (typeof value === 'number' && isFinite(value)) return { ok: true, value: value !== 0 };
      return FAILED;
    case 'object':
    case 'array': {
      const wanted = type === 'array' ? Array.isArray(value) : isPlainObject(value);
      if (wanted) return { ok: true, value };
      if (typeof value === 'string') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(value);
        } catch {
          return FAILED;
        }
        return (type === 'array' ? Array.isArray(parsed) : isPlainObject(parsed)) ? { ok: true, value: parsed } : FAILED;
      }
      return FAILED;
    }
    case 'date': {
      if (value instanceof Date) return isFinite(value.getTime()) ? { ok: true, value } : FAILED;
      if (typeof value === 'number' && isFinite(value)) return { ok: true, value: new Date(value) };
      if (typeof value === 'string') {
        const ms = Date.parse(value);
        return isFinite(ms) ? { ok: true, value: new Date(ms) } : FAILED;
      }
      return FAILED;
    }
  }
}

/** :286-321 — the body the graph sees, and every reason it should not run. A body that is not an object names no fields (v2). */
function applyRequestContract(specs: ParamSpec[], parsed: unknown): { values: Record<string, unknown>; errors: ParamError[] } {
  const body: Record<string, unknown> = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const values: Record<string, unknown> = { ...body };
  const errors: ParamError[] = [];
  for (const spec of specs) {
    const supplied = body[spec.name];
    if (supplied === undefined || supplied === null) {
      if (spec.default !== undefined) {
        const coerced = coerce(spec.type, spec.default);
        if (coerced.ok) values[spec.name] = coerced.value;
        else delete values[spec.name];
      } else if (spec.required) errors.push({ name: spec.name, code: 'missing', expected: spec.type });
      else delete values[spec.name];
      continue;
    }
    const coerced = coerce(spec.type, supplied);
    if (coerced.ok) values[spec.name] = coerced.value;
    else errors.push({ name: spec.name, code: 'type', expected: spec.type, received: describe(supplied) });
  }
  return { values, errors };
}

// ------------------------------------------------------------------------------------------------ the origin (requestOrigin.ts)

/** :32-37 */
function firstHeaderValue(value: unknown): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  if (typeof single !== 'string') return undefined;
  const first = single.split(',')[0].trim();
  return first.length > 0 ? first : undefined;
}

/** :66-84 */
export function requestOrigin(headers: unknown): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  const bag: Record<string, string> = {};
  for (const key of Object.keys(headers as Record<string, unknown>)) {
    const value = firstHeaderValue((headers as Record<string, unknown>)[key]);
    if (value !== undefined) bag[key.toLowerCase()] = value;
  }
  const o = bag['origin'];
  if (o && /^https?:\/\//i.test(o)) return o.replace(/\/+$/, ''); // :45-49, :75-76
  const host = bag['x-forwarded-host'] || bag['host'];
  if (!host) return undefined;
  const fp = bag['x-forwarded-proto'];
  const proto = fp && (fp.toLowerCase() === 'http' || fp.toLowerCase() === 'https') ? fp.toLowerCase() : undefined; // :52-56
  return (proto || 'http') + '://' + host;
}

// ------------------------------------------------------------------------------------------------ the node

/** :234, :236 */
export const UNAUTHENTICATED = 'Unauthenticated requests not accepted.';

/** model.ts :297-307 `_randomString(10)` — the id `Model.get(undefined)` mints, over the world's random */
const GUID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function guid(w: WorldView): string {
  let out = '';
  for (let i = 0; i < 10; ++i) out += GUID_CHARS[Math.floor((1 + w.random()) * 0x10000) % GUID_CHARS.length];
  return out;
}

type State = {
  /** :180 — `ptype-` / `preq-` / `pdef-`, by full name, raw (`registerInputIfNeeded` :316-319) */
  contract: Readonly<Record<string, unknown>>;
  /** :125-127, :229 */
  authenticated: boolean | undefined;
  /** :134-136, :230 */
  authUserId: unknown;
  /** :148-150, :276 */
  origin: unknown;
  /** :176, :200-203 */
  requestParameters: Readonly<Record<string, unknown>>;
  /** the request between its lookup and the lookup's answer: what was parsed and the headers handed */
  waiting: { params: unknown; headers: Readonly<Record<string, unknown>> } | undefined;
};

type Patch = Record<string, unknown>;

/** What happens after the caller is known or not (:238-285): the contract, then the outputs and Received — or the refusal. */
function proceed(s: State, params: unknown, headers: Readonly<Record<string, unknown>>, i: { params: unknown }, w: WorldView, before: { set: Partial<State>; send: string[] }): Patch {
  const st: State = { ...s, ...before.set, waiting: undefined };
  let body = params;
  const contract = requestParamSpecs({ ...st.contract, params: i.params }); // :197-199, read now
  if (!contractIsEmpty(contract)) {
    // a refusal keeps what the lookup wrote (User Id is already sent, :229-231) and writes nothing more — one request a play
    const refuse = (answer: Record<string, unknown>): Patch => ({ ...(before.send.length > 0 ? { set: before.set } : {}), send: before.send, answers: [answer] });
    let checked: ReturnType<typeof applyRequestContract>;
    try {
      checked = applyRequestContract(contract, body as Record<string, unknown>);
    } catch (e) {
      return refuse({ op: 'refuse', reason: (e as Error).message });
    }
    if (checked.errors.length > 0) return refuse({ op: 'refuse', reason: 'Invalid request body: ' + checked.errors.map(describeError).join('; '), fields: checked.errors }); // :257, requestContract.ts :100-103
    body = checked.values;
  }
  const requestParameters: Record<string, unknown> = { ...st.requestParameters };
  const sendDerived: string[] = [];
  for (const key in body as Record<string, unknown>) {
    requestParameters[key] = (body as Record<string, unknown>)[key];
    if (w.hasOutput('pm-' + key)) sendDerived.push('pm-' + key);
  }
  return { set: { ...st, origin: requestOrigin(headers), requestParameters }, send: [...before.send, 'origin', 'auth'], sendDerived, emit: ['receive'] };
}

/** The caller could not be looked up (:232-235): refused unless Allow Unauthenticated is set now; else on, unauthenticated. */
function lookupFailed(s: State, i: { params: unknown; allowNoAuth: unknown }, w: WorldView): Patch {
  const waiting = s.waiting!;
  if (!i.allowNoAuth) return { send: [], answers: [{ op: 'refuse', reason: UNAUTHENTICATED }] };
  return proceed(s, waiting.params, waiting.headers, i, w, { set: {}, send: [] });
}

/** `res.json()` of a body (userservice.js :62-67) — a parse that fails, or `null`, is the lookup's failure (:73-75). */
function json(body: string | null): { ok: true; value: unknown } | { ok: false } {
  if (body === null) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false };
  }
}

/** :28-35 PARAM_TYPE_ENUM — `Any` first */
const PARAM_TYPES_ENUM = [...REQUEST_PARAM_TYPES];
const PARAM_TYPE_LABELS: Readonly<Record<string, string>> = { '*': 'Any', string: 'String', number: 'Number', boolean: 'Boolean', object: 'Object', array: 'Array', date: 'Date' };

const typeInput = (name: string): ValueInputDecl => ({ type: 'enum', enums: PARAM_TYPES_ENUM, labels: PARAM_TYPE_LABELS, coerce: 'none', editOnly: true, displayName: `${name} — Type`, group: 'Parameter Types', description: `What ${name} must be. Any accepts whatever arrives; another type is checked and converted where the conversion is lossless, and a request carrying something else is refused with a 400 naming the field`, examples: ['number', 'string', 'boolean', 'object', 'array', 'date', '*', 'quaternion'] });
const requiredInput = (name: string): ValueInputDecl => ({ type: 'boolean', coerce: 'none', editOnly: true, displayName: `${name} — Required`, group: 'Parameter Types', description: `Whether a request without ${name} is refused with a 400. A Default wins over Required`, examples: [true, false, 'true'] });
const defaultInput = (name: string): ValueInputDecl => ({ type: 'string', coerce: 'none', editOnly: true, displayName: `${name} — Default`, group: 'Parameter Types', description: `The value ${name} takes when the request leaves it out or sends null, converted to its Type`, examples: ['0', '7', 'abc', '', '{"a":1}', '2026-01-01'] });

/** :303-321 — a contract row's input, by its full name */
function contractInput(port: string): ValueInputDecl | undefined {
  if (port.startsWith(TYPE_PREFIX)) return typeInput(port.slice(TYPE_PREFIX.length));
  if (port.startsWith(REQUIRED_PREFIX)) return requiredInput(port.slice(REQUIRED_PREFIX.length));
  if (port.startsWith(DEFAULT_PREFIX)) return defaultInput(port.slice(DEFAULT_PREFIX.length));
  return undefined;
}

/** :66-78 — the value a parameter carries; typed by its Type (`typeFromParameter`), Any when it declares none or one not in the list */
const paramOutput = (name: string, type: ParamType = '*'): OutputDecl<State> => ({ type, from: (s: State) => s.requestParameters[name], onWire: true, displayName: name, group: 'Parameters', description: `${name} from the request body, after the contract has checked and converted it` });

/** The candidates a sequence lists and wires */
const NAMES = ['total', 'a', '0'];

/** The requests a function is handed: tokens, bodies, headers. */
const ORIGIN = { origin: 'https://app.example.com', host: 'localhost:8577' };
const invocations: HostScript['invocation'][] = [
  { headers: { 'x-parse-session-token': 't1', ...ORIGIN }, body: '{"total":"42","a":1}' },
  { headers: { 'x-parse-session-token': 't1' }, body: '{"total":7}', at: 5 },
  { headers: { host: 'example.com', 'x-forwarded-proto': 'https' }, body: '{"total":"banana"}' },
  { headers: {}, body: '{}' },
  { headers: {}, body: 'null' },
  { headers: {}, body: '"ab"' },
  { headers: { 'x-parse-session-token': 't1' }, body: 'not json' },
  { headers: { 'X-Parse-Session-Token': 't1', origin: 'null', host: 'h' } },
  { headers: { 'x-parse-session-token': 't1' }, body: '{"a":null}', at: 100 },
  { headers: { host: 'internal:8577', 'x-forwarded-host': 'public.example.com', 'x-forwarded-proto': 'https, http' }, body: '{"total":"7"}' },
  { headers: { origin: ['https://app.example.com/', 'https://b.example'], 'x-forwarded-proto': 'jAvascript', host: 'h' }, body: '{}' }
];
const CLOUD = { appId: 'app', masterKey: 'mk', endpoint: 'https://be.example' };
const HOSTS: HostScript[] = [{}];
for (const invocation of invocations) {
  HOSTS.push({ invocation });
  HOSTS.push({ invocation, cloudServices: CLOUD });
}
HOSTS.push({ invocation: invocations[0], cloudServices: { ...CLOUD, runId: 'run-1' } });

export const CloudRequest = defineNode({
  type: 'noodl.cloud.request',
  version: 2,
  changes: [
    {
      version: 2,
      says: 'A body that is not a JSON object, sent to a function whose parameters declare a contract, names no fields: a Required one refuses the request with the 400 naming it, and with none Required the function runs. It threw a TypeError reading a name off null (a 500)',
      row: 'P107-S97-NULLBODY (the Beta sweep s5)',
      migration: { none: 'Nothing a project stores changes: only a caller sending a body that is not an object to a function with a contract gets a different answer' }
    }
  ],
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/request.ts; packages/noodl-viewer-cloud/src/nodes/cloud/requestContract.ts; packages/noodl-viewer-cloud/src/nodes/cloud/requestOrigin.ts; packages/noodl-viewer-cloud/src/services/userservice.js',
  needs: ['host', 'network', 'random'],
  worldPool: {
    hosts: HOSTS,
    // the caller lookup's answers (userservice.js :52-66)
    responses: [
      { status: 200, body: { objectId: 'u1', username: 'ada' } },
      { status: 200, body: { objectId: 'u1' } },
      { status: 200, body: {} },
      { status: 200, body: { objectId: 7 } },
      { status: 200, body: 'null' },
      { status: 200, body: 'not json' },
      { status: 204 },
      { status: 401, body: { error: 'Invalid session token' } },
      { status: 500, body: '<html>bad gateway</html>' },
      { status: 500, body: 'null' },
      { error: 'fetch failed' },
      { never: true }
    ],
    delays: [0, 0, 1, 50]
  },

  state: { contract: {}, authenticated: undefined, authUserId: undefined, origin: undefined, requestParameters: {}, waiting: undefined } as State,

  inputs: {
    // :154-163 — held raw, read when the request comes and again when its lookup fails
    allowNoAuth: { type: 'boolean', default: false, coerce: 'none', displayName: 'Allow Unauthenticated', group: 'General', description: 'Whether a request with no valid session token is allowed to run this function at all', examples: [true, false, 'false', 1] },
    // :164-172 — held raw
    params: { type: 'stringlist', coerce: 'none', editOnly: true, group: 'Parameters', description: 'Names to pull out of the request body, each becoming an output — and a Type, Required and Default row to declare what it is', examples: ['total', 'total,a', 'a,0', '0,1', ''] }
  },

  outputs: {
    // :114-119
    receive: { type: 'signal', displayName: 'Received', group: 'General', description: 'Fires when a request arrives, after every parameter output has been updated' },
    // :120-128 — its getter, `!!`
    auth: { type: 'boolean', from: (s) => !!s.authenticated, displayName: 'Authenticated', group: 'Request', description: 'Whether the request carried a session token that resolved to a user' },
    // :129-137 — declared `boolean`, carries the id
    userId: { type: 'boolean', from: (s) => s.authUserId, displayName: 'User Id', group: 'Request', description: 'Id of the user the session token resolved to, and blank for an unauthenticated request' },
    // :142-151
    origin: { type: 'string', from: (s) => s.origin, displayName: 'Origin', group: 'Request', description: 'The address the calling app is served from — its Origin header, or this backend’s own host when the caller sent none. Blank when neither is known (a workflow step has no caller). Caller-supplied like every header: right for links sent back to whoever called, not a proof of where the request came from.' }
  }
}).on(
  {
    allowNoAuth: () => ({ says: 'always: read when a request comes, and again when its caller cannot be looked up', send: [] }),
    params: () => ({ says: 'always: nothing while it runs; read when a request comes — each name a contract row and an output a wire can take', send: [] })
  },
  {
    derived: {
      // :80-111 — what the editor draws per name: the output, then (rule-major) its Type, Required and Default rows
      inputs: (params) => {
        const names = paramNames(params.params);
        return Object.fromEntries([...names.map((n) => [TYPE_PREFIX + n, typeInput(n)]), ...names.map((n) => [REQUIRED_PREFIX + n, requiredInput(n)]), ...names.map((n) => [DEFAULT_PREFIX + n, defaultInput(n)])]) as Record<string, InputDecl>;
      },
      outputs: (params) => Object.fromEntries(paramNames(params.params).map((n) => ['pm-' + n, paramOutput(n, asType(params[TYPE_PREFIX + n]))])),
      // :308-321 — a contract row registers on its first write, whatever the list says
      discover: contractInput,
      candidates: NAMES.flatMap((n) => [TYPE_PREFIX + n, REQUIRED_PREFIX + n, DEFAULT_PREFIX + n]),
      // :286-295 — a wire from any `pm-` name registers it
      discoverOutput: (port) => (port.startsWith('pm-') ? paramOutput(port.slice('pm-'.length)) : undefined),
      outputCandidates: NAMES.map((n) => 'pm-' + n),
      // :316-319 — kept by full name, raw
      on: (s, port, v) => ({ set: { contract: { ...s.contract, [port]: v } }, send: [] })
    },
    world: {
      // :214-237 — the request handed
      invoke: (s, i, req, w) => {
        const token = req.headers['x-parse-session-token'];
        let params: unknown = {};
        try {
          params = JSON.parse(req.body as string);
        } catch {
          /* :218-219 */
        }
        const waiting = { params, headers: req.headers };
        if (!token) {
          if (!i.allowNoAuth) return { send: [], answers: [{ op: 'refuse', reason: UNAUTHENTICATED }] }; // :236
          return proceed(s, params, req.headers, i, w, { set: {}, send: [] });
        }
        const cloud = w.hostCloud();
        if (!cloud) return lookupFailed({ ...s, waiting }, i, w); // userservice.js :33-36
        const headers: Record<string, unknown> = { 'X-Parse-Application-Id': cloud.appId, 'X-Parse-Master-Key': cloud.masterKey, 'content-type': 'application/json', 'X-Parse-Session-Token': token };
        if (cloud.runId !== undefined) headers['X-NodeGX-Run'] = cloud.runId; // :49-50
        return { set: { waiting }, send: [], request: { id: 'users/me', method: 'GET', url: cloud.endpoint + '/users/me', headers } };
      },
      // userservice.js :57-76 → :150-169, request.ts :223-235
      response: (s, i, res, w) => {
        if (!s.waiting) return { send: [] };
        if ('error' in res || 'aborted' in res) return lookupFailed(s, i, w); // :73-75
        const parsed = json(res.body);
        if (!parsed.ok || parsed.value === null || !(res.status >= 200 && res.status < 300)) return lookupFailed(s, i, w); // :62-72
        const objectId = (parsed.value as { objectId?: unknown }).objectId;
        const id = objectId === undefined ? guid(w) : objectId; // cloudstore.js :408, model.ts :424-428
        return proceed(s, s.waiting.params, s.waiting.headers, i, w, { set: { authenticated: true, authUserId: id }, send: ['userId'] });
      }
    }
  }
);
