/**
 * Cloud Function (`CloudFunction2`) — read on 2026-10-03 (NSP-014 s32) from
 * `packages/noodl-viewer-react/src/nodes/std-library/data/cloudfunction2.ts`, with the editor adapter that draws its ports
 * (`noodl-editor/src/editor/src/models/NodeTypeAdapters/CloudFunctionAdapter.ts`) and the session store it reads
 * (`noodl-runtime/src/api/backends/SessionStore.ts`).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (cloudfunction2.ts).
 *
 * WHAT IT CALLS (s32, read before any design — s18's rule): NOT the backend contract. The node makes its OWN request, a raw
 * `XMLHttpRequest` (:38-79) to `<endpoint>/functions/<name>` — so it is a NETWORK conversation (world.ts NETWORK, its XHR
 * face) with the project's cloud services (world.ts PROJECT `cloudServices`), not a BACKEND call. R9 does not reach it.
 *
 * HELD VALUES, raw as they arrive, on ports registered on FIRST WRITE (`registerInputIfNeeded`, :216-230): `function`
 * (the function's name, `setFunctionName` :213-215) and any `in-<name>` (a parameter, `setParamsValue` :210-212, kept in
 * one object across calls — a parameter once set is sent on every later call). The editor draws `in-<p>` for each
 * parameter the function's Request nodes name and `out-<r>` for each result its Response nodes name
 * (CloudFunctionAdapter.ts :79-121) — the PROJECT's, not the params. NSP-021 (s87): `derived` draws them from the
 * project the way the adapter does (the Function picker too), graded by the adapter itself (oracle (c),
 * `noodl-editor/tests-unit/nsp-020/adapter-ports.test.ts`). At play there is no project: an `out-<r>` exists when a wire
 * leaves from it (`registerOutputIfNeeded` :219-228, from `nodescope.ts addConnection`), and a result is sent only on
 * an output the node has (:325) — a play's function answers `sum` and `message` (RESULT_FIELDS, the wires a generated
 * sequence may draw).
 *
 * THE PRESS — `Call` mints a token BEFORE the coalescing guard (:236-237) and schedules ONE call at the frame end however
 * many presses the frame holds (:239-242); every token of the frame is settled by that call's answer, and a press while
 * a call is out owns the NEXT batch (:247-250). At the frame end (`doCall`, :244-339):
 *   no cloud services, or none with an `endpoint` — Error `No cloud services defined in this project.`, every token
 *     Failure (:267-275); no request;
 *   otherwise ONE request: `POST <endpoint>/functions/<encodeURIComponent(function)>` (:286 — an unset function is the
 *     text `undefined`), headers `X-Parse-Application-Id: <appId>` and `Content-Type: application/json` (:58-59),
 *     `x-noodl-cloud-version: <deployVersion>` when the project has one (:61-64), `X-Parse-Session-Token: <token>` when
 *     the browser holds a session for the app id (:73-76), body the JSON text of the held parameters (:78 — a parameter
 *     set to `undefined` is left out, `null` is sent).
 * THE ANSWER (:41-54) — status 200 or 201 is success, with the body parsed as JSON (`undefined` when it does not parse):
 *     nothing parsed — Done, no output moves (:292-299);
 *     otherwise `result || {}` (:301), each of its keys held (`for … in`, so a string result's keys are its indices) and
 *     its `out-<key>` sent WHEN THE NODE HAS ONE (:302-305) — a result key the graph does not wire is held, unseen; then
 *     every token Done (:315).
 *   Anything else is failure (:323-337): Error = the body when it parsed to a string; else its `error` field when truthy
 *     — always TEXT (v2, row D28 ruled "Always text": an object's `message`, else the object as JSON; v1 put the object on
 *     the string port); else `Could not reach the backend at <endpoint>` for status 0 (the
 *     request never reached a server: the world's network error), `Failed running cloud function.` otherwise (a 204
 *     included: only 200 and 201 succeed). Then every token Failure (`cloud-function/call-failed`, :117, :188-196).
 *   Error and the results are never cleared: a later success leaves Error, a result the function stops returning keeps
 *   the previous call's value. No `Unchanged` (:155-156).
 *
 * ROW C54 (NSP-014 §6.35, fixed in P109 ISL-026, ruled "Treat it as empty"): a success whose body is JSON `null` is no
 * result: Done, nothing moves, on both targets. The runtime once read `res.result` of it and threw inside the XHR's
 * `readystatechange`, and the presses were never answered.
 *
 * NOT GRADED HERE, named:
 *   - the editor's warnings (`cloud-function-2`, :253-265) — editor-only, the play has no editor connection;
 *   - the inspector (`lastCallResult`, :131-136) — not a port.
 */

import type { InputDecl, OutputDecl, PortContext, ValueInputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import type { Answer, CloudServicesScript } from '../world';
import { dones, failures } from './user-actions';

/** :118 */
export const CALL_ERROR_CODE = 'cloud-function/call-failed';

/** :268 */
const NO_CLOUD_SERVICES = 'No cloud services defined in this project.';

/** The results a play's function answers — the `out-` names a generated sequence may wire (`outputCandidates`). */
export const RESULT_FIELDS = ['sum', 'message'] as const;

/** One call made: the tokens its answer settles, and the endpoint it went to (the failure names it, :328). */
type InFlight = {
  tokens: number;
  endpoint: unknown;
};

type CloudFunctionState = {
  /** `_internal.functionName` (:94) */
  functionName: unknown;
  /** `_internal.paramsValues` (:96) */
  params: Readonly<Record<string, unknown>>;
  /** `_internal.resultsValues` (:98) */
  results: Readonly<Record<string, unknown>>;
  /** `_internal.error` (:99) */
  error: unknown;
  /** `_internal.pendingCall` — the presses of this frame (:107) */
  presses: number;
  /** `_internal.hasScheduledCall` (:101) */
  scheduled: boolean;
  /** each call made, by the spec's request id — what its closure holds (:249, :283-284) */
  inFlight: Readonly<Record<string, InFlight>>;
  nextId: number;
};

/** A parameter port (CloudFunctionAdapter.ts :92-99 — type `*`). */
const paramPort = (name: string): ValueInputDecl => ({
  type: '*',
  coerce: 'none',
  displayName: name,
  group: 'Parameters',
  description: 'The ' + name + ' parameter, sent in the JSON body of every later call; undefined leaves it out, null sends null',
  examples: [1, 2, 'hi', null, { k: 1 }, [1, 2], true, undefined]
});

/** The function port (CloudFunctionAdapter.ts :66-77 — a picker of the project's cloud functions; the name, raw). */
const functionPort = (): InputDecl => ({
  type: 'string',
  coerce: 'none',
  editOnly: true,
  displayName: 'Function',
  group: 'General',
  description: 'Name of the cloud function to run; left unset, the call goes to a function named "undefined"',
  examples: ['add', 'add', 'say hi/now', '', undefined]
});

/** A result output (CloudFunctionAdapter.ts :112-119 — type `*`). */
const resultOutput = (name: string): OutputDecl<CloudFunctionState> => ({
  type: '*',
  displayName: name,
  group: 'Results',
  description: 'The ' + name + ' result of the last call that returned it; a later call that does not return it leaves it as it was',
  from: (s) => s.results[name]
});

/** What the play's function answers — the JSON a Response node sends, and the ways a call goes wrong. */
const ANSWERS: readonly Answer[] = [
  // weighted toward a result that moves (s32 reach: 25 result sends in 400 sequences before these three)
  { status: 200, body: { result: { sum: 3, message: 'hi' } } },
  { status: 200, body: { result: { sum: 4, message: 'yo' } } },
  { status: 200, body: { result: { sum: 6, message: null } } },
  { status: 201, body: { result: { sum: 8, other: true } } },
  { status: 200, body: { result: { sum: 5 } } },
  { status: 201, body: { result: {} } },
  { status: 200, body: { result: 'ok' } },
  { status: 200, body: 'not json' },
  { status: 200 },
  { status: 204 },
  { status: 400, body: { code: 141, error: 'Missing parameter a' } },
  { status: 500, body: '"plain text error"' },
  { status: 404, body: { code: 141, error: { reason: 'no such function' } } },
  { error: 'connect ECONNREFUSED' },
  // C54 — a null success body is no result (fixed in ISL-026)
  { status: 200, body: null }
];

/** The projects a play's sequences draw (PROJECT `cloudServices`): one signed in on a deployed backend, one with no endpoint, none. */
const CLOUD_SERVICES: ReadonlyArray<CloudServicesScript | null> = [
  { appId: 'app1', endpoint: 'https://cloud.example' },
  { appId: 'app1', endpoint: 'https://cloud.example', deployVersion: 'v7', sessionToken: 'tok' },
  { appId: 'app1', endpoint: 'https://cloud.example' },
  { appId: 'app1' },
  null
];

/** :41-54 + :291-337 — what an answer makes the node do, from the status and the parsed body. */
function answered(s: CloudFunctionState, f: InFlight, status: number, json: unknown, w: WorldView) {
  const n = f.tokens;
  if (status === 200 || status === 201) {
    if (json === undefined) return { set: {}, send: [] as never[], outcomes: dones('call' as const, n) }; // :292-299
    // :301 — C54: `null.result` throws on the runtime; the sensible reading is no result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = (json === null ? undefined : (json as any).result) || {};
    const results: Record<string, unknown> = { ...s.results };
    const sendDerived: string[] = [];
    for (const key in result) {
      results[key] = result[key]; // :303
      if (w.hasOutput('out-' + key)) sendDerived.push('out-' + key); // :325 — only when the node has the output
    }
    return { set: { results }, send: [] as never[], sendDerived, outcomes: dones('call' as const, n) }; // :315
  }
  // :324-330
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e: any = json;
  const raw = typeof e === 'string' ? e : (e && e.error) || (status === 0 ? 'Could not reach the backend at ' + String(f.endpoint) : 'Failed running cloud function.');
  // v2 (row D28 ruled "Always text"): an object's `message` when it has one, else the object as JSON; anything else as text
  const message = raw !== null && typeof raw === 'object' ? (raw as { message?: unknown }).message : undefined;
  const error = typeof raw === 'string' ? raw : typeof message === 'string' && message !== '' ? message : raw !== null && typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  return { set: { error }, send: ['error' as const], outcomes: failures('call' as const, CALL_ERROR_CODE, n) }; // :336 → :188-196
}

/** nameListParameter.ts `parseNameList` — a string split on `,` (untrimmed, empty names kept), a list of strings as it is, anything else nothing. */
const nameList = (v: unknown): readonly string[] => (typeof v === 'string' ? v.split(',') : Array.isArray(v) && v.every((e) => typeof e === 'string') ? (v as string[]) : []);

const CLOUD_PREFIX = '/#__cloud__/';

/** CloudFunctionAdapter.ts :79-121 — the distinct names the called function's nodes of a type list in their `params`, in order. */
function functionNames(params: Readonly<Record<string, unknown>>, context: Readonly<PortContext>, type: 'noodl.cloud.request' | 'noodl.cloud.response'): string[] {
  if (params.function === undefined) return [];
  const fn = context.components?.[CLOUD_PREFIX + String(params.function)];
  const names: string[] = [];
  for (const node of fn?.nodes?.[type] ?? []) for (const n of nameList(node.params)) if (!names.includes(n)) names.push(n);
  return names;
}

/** :43-48 — the body as JSON, or `undefined` when it will not parse (an empty body included). */
function parsed(text: string | null): unknown {
  try {
    return JSON.parse(text ?? '');
  } catch {
    return undefined;
  }
}

export const CloudFunction = defineNode({
  type: 'CloudFunction2',
  // v2 (P109 ISL-030, row D28 ruled "Always text"): Error is always text — an object's message, or the object as JSON.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/data/cloudfunction2.ts; noodl-editor/…/NodeTypeAdapters/CloudFunctionAdapter.ts',
  needs: ['network', 'project'],
  worldPool: { responses: ANSWERS, delays: [0, 0, 1, 100], advances: [0, 1, 100], cloudServices: CLOUD_SERVICES },
  state: { functionName: undefined, params: {}, results: {}, error: undefined, presses: 0, scheduled: false, inFlight: {}, nextId: 1 } as CloudFunctionState,
  // :157-162 — no Unchanged
  outcomes: ['done', 'failure'],
  inputs: {
    // :138-146
    call: { type: 'signal', outcome: true, displayName: 'Call', group: 'Actions', description: 'Runs the selected cloud function with the current input values' }
  },
  outputs: {
    // :163-171
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last call failed; empty until one does', from: (s) => s.error }
  }
}).on(
  {
    // :143-145 → :231-243 — a token per press, one call per frame
    call: (s) => ({
      says: 'always: one call at the end of the frame, however many presses — when it answers, its results and Done for each press, or Error and Failure for each; with no cloud services, Error and Failure for each at the end of the frame',
      set: { presses: s.presses + 1, scheduled: true },
      send: [],
      outcome: 'pending'
    })
  },
  {
    derived: {
      // NSP-021 (s87) — from the PROJECT, as CloudFunctionAdapter.ts `updatePortsForNode` draws them (:56-121): Function, a
      // picker of every component holding a Request node (:59-77, drawn whenever there is a project); then an `in-` per
      // name the called function's Request nodes list. At play the context holds no components: nothing is drawn, and
      // `function` and any `in-` name are registered on first write (:233-243, `discover`)
      inputs: (params, context) => {
        const components = context.components;
        if (!components) return {};
        const functions = Object.keys(components).filter((name) => (components[name].nodes?.['noodl.cloud.request'] ?? []).length > 0);
        const ports: Record<string, InputDecl> = { function: { ...functionPort(), type: 'component', enums: functions } };
        for (const n of functionNames(params, context, 'noodl.cloud.request')) ports['in-' + n] = paramPort(n);
        return ports;
      },
      // :103-121 — an `out-` per name its Response nodes list; at play, only where a wire leaves from it (`onWire`)
      outputs: (params, context) => {
        const out: Record<string, OutputDecl<CloudFunctionState>> = {};
        for (const r of functionNames(params, context, 'noodl.cloud.response')) out['out-' + r] = { ...resultOutput(r), onWire: true };
        return out;
      },
      needs: ['components'],
      discover: (port) => (port === 'function' ? functionPort() : port.startsWith('in-') ? paramPort(port.slice('in-'.length)) : undefined),
      // :219-228 — a wire to any `out-` name registers its getter
      discoverOutput: (port) => (port.startsWith('out-') ? resultOutput(port.slice('out-'.length)) : undefined),
      candidates: ['function', 'in-a', 'in-b'],
      outputCandidates: RESULT_FIELDS.map((r) => 'out-' + r),
      on: (s, port, v) => (port === 'function' ? { set: { functionName: v }, send: [] } : { set: { params: { ...s.params, [port.slice('in-'.length)]: v } }, send: [] })
    },
    // :244-339 `doCall`, once at the frame end
    afterInputs: (s, _i, w: WorldView) => {
      if (!s.scheduled) return { set: {}, send: [] };
      const drained = { scheduled: false, presses: 0 };
      const tokens = s.presses;
      const cs = w.cloudServices();
      // :267-275
      if (cs === undefined || cs.endpoint === undefined) return { set: { ...drained, error: NO_CLOUD_SERVICES }, send: ['error'], outcomes: failures('call', CALL_ERROR_CODE, tokens) };
      // :56-78 `_makeRequest` — the header order is the node's
      const headers: Record<string, unknown> = { 'X-Parse-Application-Id': cs.appId, 'Content-Type': 'application/json' };
      if (cs.deployVersion) headers['x-noodl-cloud-version'] = cs.deployVersion;
      if (cs.sessionToken !== undefined) headers['X-Parse-Session-Token'] = cs.sessionToken;
      const id = String(s.nextId);
      return {
        set: { ...drained, nextId: s.nextId + 1, inFlight: { ...s.inFlight, [id]: { tokens, endpoint: cs.endpoint } } },
        send: [],
        request: { id, method: 'POST', url: cs.endpoint + '/functions/' + encodeURIComponent(s.functionName as string), headers, body: JSON.stringify(s.params) }
      };
    },
    world: {
      // :41-54 — status 200 / 201 is success; a request that never reached a server is status 0 with no body
      response: (s, _i, res, w) => {
        // the call's own batch (:249 — a closure per call); an answer lands once, so nothing is taken out
        const f = s.inFlight[res.id];
        if (!f) return {};
        const status = 'status' in res ? res.status : 0;
        const json = 'status' in res ? parsed(res.body) : undefined;
        return answered(s, f, status, json, w);
      }
    }
  }
);
