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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const traceSchema = require('../schema/trace.schema.json') as Record<string, unknown>;

/** The JSON schema, as data — for a target that wants to embed it. */
export const TRACE_SCHEMA = traceSchema;

export const EVENT_KINDS = ['set', 'in', 'settle', 'value', 'signal', 'outcome', 'advance', 'request', 'open', 'history', 'dispatch', 'stack', 'route', 'popup'] as const;
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
  history: { required: ['op', 'url'], optional: [] },
  dispatch: { required: ['event'], optional: [] },
  // s18 — the Component Stacks (world.ts STACK): a push / replace carries stack?, target?, params, transition; a back action?, results
  stack: { required: ['op'], optional: ['stack', 'target', 'params', 'transition', 'action', 'results'] },
  // s19 — the Routers (world.ts ROUTE): router?, target?, params, openInNewTab
  route: { required: ['params', 'openInNewTab'], optional: ['router', 'target'] },
  // s20 — the popups (world.ts POPUP): a show carries target?, params, stackPolicy, closeOnEscape, modal, accessibleName?; a close popup?, action?, results
  popup: { required: ['op'], optional: ['target', 'params', 'stackPolicy', 'closeOnEscape', 'modal', 'accessibleName', 'popup', 'action', 'results'] }
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
      if (e.op !== 'push') return bad(`${at}.op`, 'op is push');
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
