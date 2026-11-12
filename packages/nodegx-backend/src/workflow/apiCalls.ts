/**
 * P132 BWF-012 — saved API calls (ruling R7): a *Call an API* set up once, named, and used by name in any workflow,
 * with only its blanks filled. Pure: no file, no network, so the project-file validator, the registry and the step
 * executor all read the same rules.
 *
 * THE SHAPE
 * ---------
 * A saved call is `{ id, name?, description?, params, blanks? }`. `params` are exactly an `http-request` step's
 * (address, method, query, headers, body, authentication by Secret NAME: never a value, BWF-006's rule, checked by
 * the same `validateHttpRequestParams`). A **blank** is a part a workflow fills: `{ name, type?, example?,
 * description? }`, used inside the params as `{"$path": "fill.<name>"}` (or inside a formula, `{"$fn": "text",
 * "args": ["https://…?q=", {"$path": "fill.city"}]}`). A saved call reads its blanks and nothing else: no `body.…`,
 * no `upstream.…`, so it means the same thing in every workflow that uses it.
 *
 * A step uses one as `{ kind: 'http-request', params: { call: '<id>', fill: { city: {"$path": "body.city"} } } }`.
 * Any other param the step sets is its own and wins over the saved call's (`query` and `headers` merged by name), so a
 * workflow can, say, wait longer than the others. The saved call is read when the step RUNS, so a change to it reaches
 * every workflow that uses it with no edit to any of them (AC2).
 *
 * @module nodegx-backend/workflow/apiCalls
 */

import { API_CALL_BLANK_TYPES } from './apiCallTypes';
import type { ApiCallInput, ApiCallLookup } from './apiCallTypes';
import { validateHttpRequestParams } from './steps/httpParams';
import { collectValuePaths, isPlainObject, resolveValueDeep } from './steps/values';
import type { WorkflowDefinition, WorkflowStep } from './types';

/** The same id rule as a workflow's. */
export const API_CALL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
/** A blank's name: it is written after `fill.`, so a path segment. */
export const API_CALL_BLANK_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
export { API_CALL_BLANK_TYPES } from './apiCallTypes';
export type { ApiCallBlank, ApiCallBlankType, ApiCallDefinition, ApiCallInput, ApiCallLookup } from './apiCallTypes';

/** The params a saved call never holds: they are how a STEP uses one. */
const STEP_ONLY = ['call', 'fill'];

/** The blank a `fill.<name>…` path names, or undefined for any other path. */
function blankOf(path: string): string | undefined {
  const m = /^fill\.([^.]+)/.exec(path);
  return m ? m[1] : undefined;
}

/** Every blank the params read, in the order first read. */
export function blanksRead(params: Record<string, unknown>): string[] {
  const seen: string[] = [];
  for (const { path } of collectValuePaths(params, 'params')) {
    const b = blankOf(path);
    if (b && !seen.includes(b)) seen.push(b);
  }
  return seen;
}

/** Every reason a saved call is not valid. `at` names it in each sentence. */
export function validateApiCall(raw: unknown): string[] {
  if (!isPlainObject(raw)) return ['a saved API call must be an object'];
  const c = raw as Partial<ApiCallInput> & Record<string, unknown>;
  const at = typeof c.id === 'string' && c.id ? `saved call "${c.id}"` : 'a saved call';
  const errors: string[] = [];
  for (const key of Object.keys(c)) {
    if (!['id', 'name', 'description', 'params', 'blanks', 'createdAt', 'updatedAt'].includes(key)) errors.push(`${at}: unknown key "${key}"`);
  }
  if (typeof c.id !== 'string' || !c.id) errors.push(`${at}: needs an id, the name a workflow uses it by ("call")`);
  else if (!API_CALL_ID_RE.test(c.id)) errors.push(`${at}: the id must match [A-Za-z0-9][A-Za-z0-9_-]{0,63}`);
  if (c.name !== undefined && typeof c.name !== 'string') errors.push(`${at}: name must be text`);
  if (c.description !== undefined && typeof c.description !== 'string') errors.push(`${at}: description must be text`);
  if (!isPlainObject(c.params)) {
    errors.push(`${at}: needs "params", the settings of a Call an API step (url, method, query, headers, body, authentication)`);
    return errors;
  }
  for (const k of STEP_ONLY) if (k in c.params) errors.push(`${at}.params.${k}: a saved call cannot itself use a saved call`);
  errors.push(...validateHttpRequestParams(c.params, at));

  const declared = new Set<string>();
  if (c.blanks !== undefined && !Array.isArray(c.blanks)) errors.push(`${at}: blanks must be a list`);
  for (const b of Array.isArray(c.blanks) ? c.blanks : []) {
    if (!isPlainObject(b) || typeof b.name !== 'string' || !API_CALL_BLANK_RE.test(b.name)) {
      errors.push(`${at}: every blank needs a name of letters, digits and "_" (it is written as fill.<name>)`);
      continue;
    }
    if (declared.has(b.name)) errors.push(`${at}: the blank "${b.name}" is named twice`);
    declared.add(b.name);
    if (b.type !== undefined && !(API_CALL_BLANK_TYPES as readonly unknown[]).includes(b.type)) {
      errors.push(`${at}: blank "${b.name}" type must be one of ${API_CALL_BLANK_TYPES.join(', ')}`);
    }
    if (b.description !== undefined && typeof b.description !== 'string') errors.push(`${at}: blank "${b.name}" description must be text`);
  }
  for (const { path, where } of collectValuePaths(c.params, `${at}.params`)) {
    const b = blankOf(path);
    if (b === undefined) {
      errors.push(
        `${where} reads "${path}": a saved call reads only its blanks ({"$path": "fill.<blank>"}), so it means the same ` +
          'in every workflow. Make it a blank, and the workflow fills it.'
      );
    } else if (!declared.has(b)) errors.push(`${where} reads the blank "${b}", which is not in "blanks"`);
  }
  return errors;
}

/** True when a step uses a saved call. */
export function usesSavedCall(step: WorkflowStep): boolean {
  return step.kind === 'http-request' && !!step.params && step.params.call !== undefined;
}

/** The id of every saved call a workflow uses. */
export function callsUsedBy(def: Pick<WorkflowDefinition, 'steps'>): string[] {
  const out: string[] = [];
  for (const s of def.steps || []) {
    if (usesSavedCall(s) && typeof s.params!.call === 'string' && !out.includes(s.params!.call)) out.push(s.params!.call);
  }
  return out;
}

/**
 * What a workflow's use of saved calls gets wrong, against the calls there are: an unknown call, a blank left empty,
 * a fill for a blank the call does not have. Each sentence names them.
 */
export function validateCallUses(def: Pick<WorkflowDefinition, 'steps'>, lookup: ApiCallLookup): string[] {
  const errors: string[] = [];
  for (const s of def.steps || []) {
    if (!usesSavedCall(s)) continue;
    const id = s.params!.call;
    if (typeof id !== 'string') continue; // the shape check names it
    const saved = lookup(id);
    if (!saved) {
      errors.push(`step "${s.id}": there is no saved API call "${id}". Save it first, or choose one that exists.`);
      continue;
    }
    const fill = isPlainObject(s.params!.fill) ? s.params!.fill : {};
    const blanks = (saved.blanks || []).map((b) => b.name);
    const empty = blanks.filter((b) => fill[b] === undefined);
    if (empty.length) {
      errors.push(`step "${s.id}": the saved call "${id}" has ${empty.length === 1 ? 'a blank' : 'blanks'} to fill: ${empty.map((b) => `"${b}"`).join(', ')} (params.fill.<blank>)`);
    }
    const unknown = Object.keys(fill).filter((k) => !blanks.includes(k));
    if (unknown.length) {
      errors.push(`step "${s.id}": the saved call "${id}" has no blank ${unknown.map((b) => `"${b}"`).join(', ')}${blanks.length ? ` (its blanks: ${blanks.join(', ')})` : ' (it has none)'}`);
    }
  }
  return errors;
}

/**
 * The params a step that uses a saved call runs with: the saved call's, its blanks filled with the step's resolved
 * `fill`, and the step's own params over them (`query` and `headers` merged by name). `stepParams` is already
 * resolved against the run.
 */
export function mergeSavedCall(saved: ApiCallInput, stepParams: Record<string, unknown>): Record<string, unknown> {
  const fill = isPlainObject(stepParams.fill) ? stepParams.fill : {};
  const base = resolveValueDeep(saved.params, { fill }) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(stepParams)) {
    if (STEP_ONLY.includes(k) || v === undefined) continue;
    if ((k === 'query' || k === 'headers') && isPlainObject(v) && isPlainObject(base[k])) out[k] = { ...base[k], ...v };
    else out[k] = v;
  }
  return out;
}
