/**
 * The trace schema — `schema/trace.schema.json` is the document a non-TypeScript target
 * validates its own output against (NSP-002 §2.1, AC3); this file is the same rules as code,
 * refusing a malformed trace WITH THE PATH to the bad field.
 *
 * Two copies of one rule set is a drift hazard, so tests/schema.test.ts holds them together: the
 * constants below are compared with the JSON file's `enum` / `required` lists, and a table of
 * good and bad traces must get the same verdict from `ajv` (over the JSON) and from
 * `validateTrace` (this file).
 *
 * Decisions this schema fixes (NSP-002 §4 asked for them to be made here, once):
 *   - `completed` is never an event. Every `outcome` event implies it. A target that fires
 *     `completed` without an outcome, or an outcome without `completed`, is a runtime-error-bus
 *     matter (`outcome/missing-completed`), not a trace matter.
 *   - a `failure` outcome's `error` is the implementation's error CODE (`outcome/…`,
 *     `http/…`), never the message: the code is the stable half of the pair.
 *   - `set` may omit `value` (undefined was written); `value` never may (C3).
 */

import { findNonCanonical } from './canonical';
import type { TraceEvent } from './trace';

import traceSchemaJson from '../schema/trace.schema.json';

const traceSchema = traceSchemaJson as Record<string, unknown>;

/** The JSON schema, as data — for a target that wants to embed it. */
export const TRACE_SCHEMA = traceSchema;

export const EVENT_KINDS = ['set', 'in', 'settle', 'value', 'signal', 'outcome', 'advance', 'request', 'open', 'history', 'dispatch', 'stack', 'route', 'popup', 'backend', 'picker', 'socket', 'act', 'answer'] as const;
export const OUTCOME_VALUES = ['done', 'unchanged', 'failure'] as const;

/** Fields each kind requires and allows, beyond `t` and the always-optional `subject`. */
export const EVENT_FIELDS: Readonly<Record<(typeof EVENT_KINDS)[number], { required: readonly string[]; optional: readonly string[] }>> = Object.freeze({
  set: { required: ['port'], optional: ['value'] },
  in: { required: ['port'], optional: [] },
  settle: { required: [], optional: [] },
  value: { required: ['port', 'value'], optional: [] },
  signal: { required: ['port'], optional: [] },
  outcome: { required: ['port', 'value'], optional: ['error'] },
  // NSP-007 — the world
  advance: { required: ['ms'], optional: [] },
  request: { required: ['method', 'url', 'headers'], optional: ['body'] },
  // NSP-015 — the location
  // s17: a target or features not handed is absent
  open: { required: ['url'], optional: ['target', 'features'] },
  // NSP-016 s70 — a push / replace carries url; a back nothing (world.ts LOCATION, THE SESSION HISTORY)
  history: { required: ['op'], optional: ['url'] },
  dispatch: { required: ['event'], optional: [] },
  // s18 — the Component Stacks (world.ts STACK): a push / replace carries stack?, target?, params, transition; a back action?, results
  stack: { required: ['op'], optional: ['stack', 'target', 'params', 'transition', 'action', 'results'] },
  // s19 — the Routers (world.ts ROUTE): router?, target?, params, openInNewTab
  route: { required: ['params', 'openInNewTab'], optional: ['router', 'target'] },
  // s20 — the popups (world.ts POPUP): a show carries target?, params, stackPolicy, closeOnEscape, modal, accessibleName?; a close popup?, action?, results
  popup: { required: ['op'], optional: ['target', 'params', 'stackPolicy', 'closeOnEscape', 'modal', 'accessibleName', 'popup', 'action', 'results'] },
  // NSP-014 s21 — the backends (world.ts BACKEND): op, backend, args — in the request group
  backend: { required: ['op', 'backend', 'args'], optional: [] },
  // NSP-014 s31 — the file dialog (world.ts PICKER): what the element held at the click — in the LOCATION group
  picker: { required: ['accept', 'capture'], optional: [] },
  // NSP-014 s34 — the WebSocket servers (world.ts SOCKET): a connect carries url, protocols?; a send data; a close code?, reason? — in the request group
  socket: { required: ['op'], optional: ['url', 'protocols', 'data', 'code', 'reason'] },
  // NSP-016 s37 — the person (spec.ts THE PERSON): a stimulus — which act, and the value it carries, if any
  act: { required: ['act'], optional: ['value'] },
  // NSP-016 s56 — the callers (spec.ts THE CALLERS): a Component Stack's answer to a push / replace / back (value, error?), or the
  // back's action? and results handed to the node that pushed the page it popped (`returned`) — in the LOCATION group; s57 a Page
  // Router's answer to a Navigate (`navigate`: value, error?) and the params it hands its page's Page Inputs (`page`: params)
  answer: { required: ['op'], optional: ['value', 'error', 'action', 'results', 'params'] }
});

export type Validation = { ok: true; events: TraceEvent[] } | { ok: false; path: string; message: string };

export function validateTrace(input: unknown): Validation {
  if (!Array.isArray(input)) return bad('$', 'a trace is an array of events');
  for (let i = 0; i < input.length; i++) {
    const at = `$[${i}]`;
    const e = input[i] as Record<string, unknown> | null;
    if (!e || typeof e !== 'object' || Array.isArray(e)) return bad(at, 'an event is an object');
    const t = e.t;
    if (!(EVENT_KINDS as readonly unknown[]).includes(t)) return bad(`${at}.t`, `t must be one of ${EVENT_KINDS.join(', ')}`);
    const fields = EVENT_FIELDS[t as (typeof EVENT_KINDS)[number]];
    for (const f of fields.required) {
      if (!(f in e)) return bad(`${at}.${f}`, `a ${String(t)} event requires "${f}"`);
    }
    for (const key of Object.keys(e)) {
      if (key === 't' || key === 'subject') continue;
      if (!fields.required.includes(key) && !fields.optional.includes(key)) return bad(`${at}.${key}`, `a ${String(t)} event does not carry "${key}"`);
    }
    if ('subject' in e && (typeof e.subject !== 'string' || e.subject.length === 0)) return bad(`${at}.subject`, 'subject is a non-empty string');
    // a port name MAY be empty: String Format registers the empty placeholder `{}` as the port named '' (NSP-006 found the schema refusing it)
    if ('port' in e && typeof e.port !== 'string') return bad(`${at}.port`, 'port is a string');
    // NSP-016 s37 — an act names what the person did; its value, when it carries one, is checked below with the others
    if (t === 'act' && (typeof e.act !== 'string' || e.act.length === 0)) return bad(`${at}.act`, 'act is the name of what the person did');
    if (t === 'outcome') {
      if (!(OUTCOME_VALUES as readonly unknown[]).includes(e.value)) return bad(`${at}.value`, `an outcome is one of ${OUTCOME_VALUES.join(', ')}`);
      if ('error' in e && (typeof e.error !== 'string' || e.error.length === 0)) return bad(`${at}.error`, 'error is a non-empty error code');
    } else if (t === 'advance') {
      if (typeof e.ms !== 'number' || !(e.ms >= 0)) return bad(`${at}.ms`, 'ms is a number of milliseconds, 0 or more');
    } else if (t === 'request') {
      if (typeof e.url !== 'string') return bad(`${at}.url`, 'url is a string');
      const h = e.headers;
      if (!h || typeof h !== 'object' || Array.isArray(h)) return bad(`${at}.headers`, 'headers is an object of strings');
      for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
        if (typeof v !== 'string') return bad(`${at}.headers.${k}`, 'a header value is a string');
        if (k !== k.toLowerCase()) return bad(`${at}.headers.${k}`, 'a header name is lower-cased');
      }
      const ncm = findNonCanonical(e.method, `${at}.method`);
      if (ncm) return bad(ncm, 'method is not in canonical form');
      if ('body' in e && e.body !== undefined) {
        const ncb = findNonCanonical(e.body, `${at}.body`);
        if (ncb) return bad(ncb, 'body is not in canonical form');
      }
    } else if (t === 'open') {
      for (const f of ['url', 'target', 'features'] as const) {
        if (!(f in e)) continue;
        const nc = findNonCanonical(e[f], `${at}.${f}`);
        if (nc) return bad(nc, `${f} is not in canonical form`);
      }
    } else if (t === 'history') {
      if (e.op !== 'push' && e.op !== 'replace' && e.op !== 'back') return bad(`${at}.op`, 'op is push, replace or back');
      if (e.op === 'back') {
        if ('url' in e) return bad(`${at}.url`, 'a back carries no url');
        continue;
      }
      if (!('url' in e)) return bad(`${at}.url`, `a history ${e.op} requires "url"`);
      const nc = findNonCanonical(e.url, `${at}.url`);
      if (nc) return bad(nc, 'url is not in canonical form');
    } else if (t === 'dispatch') {
      if (typeof e.event !== 'string' || e.event.length === 0) return bad(`${at}.event`, 'event is the dispatched event\'s type');
    } else if (t === 'stack') {
      if (e.op !== 'push' && e.op !== 'replace' && e.op !== 'back') return bad(`${at}.op`, 'op is push, replace or back');
      for (const f of ['stack', 'target', 'params', 'transition', 'action', 'results'] as const) {
        if (!(f in e)) continue;
        const nc = findNonCanonical(e[f], `${at}.${f}`);
        if (nc) return bad(nc, `${f} is not in canonical form`);
      }
    } else if (t === 'route') {
      for (const f of ['router', 'target', 'params', 'openInNewTab'] as const) {
        if (!(f in e)) continue;
        const nc = findNonCanonical(e[f], `${at}.${f}`);
        if (nc) return bad(nc, `${f} is not in canonical form`);
      }
    } else if (t === 'popup') {
      if (e.op !== 'show' && e.op !== 'close') return bad(`${at}.op`, 'op is show or close');
      for (const f of ['target', 'params', 'stackPolicy', 'closeOnEscape', 'modal', 'accessibleName', 'popup', 'action', 'results'] as const) {
        if (!(f in e)) continue;
        const nc = findNonCanonical(e[f], `${at}.${f}`);
        if (nc) return bad(nc, `${f} is not in canonical form`);
      }
    } else if (t === 'backend') {
      if (typeof e.op !== 'string' || e.op.length === 0) return bad(`${at}.op`, 'op is the contract method the node called');
      if (typeof e.backend !== 'string' || e.backend.length === 0) return bad(`${at}.backend`, 'backend is the id of the backend the call went to');
      if (e.args === null || typeof e.args !== 'object' || Array.isArray(e.args)) return bad(`${at}.args`, 'args is the options object as handed');
      const nc = findNonCanonical(e.args, `${at}.args`);
      if (nc) return bad(nc, 'args is not in canonical form');
    } else if (t === 'picker') {
      if (typeof e.accept !== 'string') return bad(`${at}.accept`, 'accept is what the element held at the click, a string');
      if (typeof e.capture !== 'string') return bad(`${at}.capture`, 'capture is what the element held at the click, a string');
    } else if (t === 'answer') {
      if (e.op === 'page') {
        // NSP-016 s57 — what a Page Router hands its page's Page Inputs
        if ('value' in e || 'error' in e || 'action' in e || 'results' in e) return bad(`${at}.value`, 'a page carries the params handed, nothing else');
        if (!('params' in e)) return bad(`${at}.params`, 'a page carries the params handed');
        const nc = findNonCanonical(e.params, `${at}.params`);
        if (nc) return bad(nc, 'params is not in canonical form');
      } else if (e.op === 'returned') {
        if ('value' in e || 'error' in e || 'params' in e) return bad(`${at}.value`, 'a returned carries the back\'s action and results, no value');
        if (!('results' in e)) return bad(`${at}.results`, 'a returned carries the results handed');
        for (const f of ['action', 'results'] as const) {
          if (!(f in e)) continue;
          const nc = findNonCanonical(e[f], `${at}.${f}`);
          if (nc) return bad(nc, `${f} is not in canonical form`);
        }
      } else {
        if (e.op !== 'push' && e.op !== 'replace' && e.op !== 'back' && e.op !== 'navigate') return bad(`${at}.op`, 'op is push, replace, back, navigate, returned or page');
        if (!(OUTCOME_VALUES as readonly unknown[]).includes(e.value)) return bad(`${at}.value`, 'value is done, unchanged or failure');
        if (e.value === 'failure' ? typeof e.error !== 'string' || e.error.length === 0 : 'error' in e) return bad(`${at}.error`, 'error is the failure\'s code, and only with a failure');
        if ('action' in e || 'results' in e || 'params' in e) return bad(`${at}.action`, 'only a returned carries action and results, only a page params');
      }
    } else if (t === 'socket') {
      if (e.op !== 'connect' && e.op !== 'send' && e.op !== 'close') return bad(`${at}.op`, 'op is connect, send or close');
      for (const f of ['url', 'protocols', 'data', 'code', 'reason'] as const) {
        if (!(f in e)) continue;
        const nc = findNonCanonical(e[f], `${at}.${f}`);
        if (nc) return bad(nc, `${f} is not in canonical form`);
      }
    } else if ('value' in e) {
      if (t === 'value' && e.value === undefined) return bad(`${at}.value`, 'a value event never carries undefined (C3)');
      if (e.value !== undefined) {
        const nc = findNonCanonical(e.value, `${at}.value`);
        if (nc) return bad(nc, 'value is not in canonical form (see canonical.ts)');
      }
    }
  }
  return { ok: true, events: input as TraceEvent[] };
}

function bad(path: string, message: string): Validation {
  return { ok: false, path, message };
}

/** Throws with the path when a trace is malformed; returns it typed otherwise. */
export function assertTrace(input: unknown): TraceEvent[] {
  const v = validateTrace(input);
  // `=== false`, not `!v.ok`: a truthiness narrowing needs strictNullChecks, and the runtime
  // package compiles this file with `strict: false` when its tests import the adapter.
  if (v.ok === false) throw new Error(`malformed trace: ${v.message} (${v.path})`);
  return v.events;
}
