/**
 * What Create New Object and Set Object Properties share — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/modelcrudbase.ts` on 2026-10-01 (NSP-012): the
 * mixins `addModelId` (:157-326) and `addInputProperties` (:334-607), as the two nodes compose
 * them. This file is their spec-side twin; new-object.ts and set-object-properties.ts supply
 * what their runtime files supply.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE PROPERTY WRITE (:454-525, `_pushInputValues`): the keys written are the names the graph's
 * `Properties` parameter lists (:461-465 — the PARAMETER, read off the graph model, never the
 * input) that a value or a type arrived for; a key whose value is `undefined` is skipped (:480 —
 * the empty-value contract: never set, or set to nothing, leaves the record's key alone); an
 * `Array`-typed key handed a STRING is read as a JavaScript literal, and one that will not read
 * becomes `[]` when it looks like one (`[` or `{` in it) and otherwise names the array of that
 * text (:483-510); an `Object`-typed key handed a string names the record of that text,
 * create-on-read (:512-518); `null` is written as it is (:520-523); every key goes through
 * `model.set(key, value, { resolve: true })` (:523 — a dotted key writes into a nested record),
 * notifying whoever holds the record.
 *
 * The array-literal branch calls the editor connection without a guard (:485-489); it is safe
 * because every runtime constructs one, connected or not (noodl-runtime.ts :419-420) — measured
 * on the runtime target, which has no editor: the branch runs (NSP-012 s9 first read it as a
 * throw; the row was dropped the same session).
 */

import type { ValueInputDecl, WorldView } from '../spec';
import { propertyNames } from './data-base';

/** :354-362 */
export const PROPERTY_TYPES = ['string', 'boolean', 'number', 'date', 'array', 'object', '*'] as const;

/** :370-387 — the value input one property gets; its declared type follows the matching `type-<p>` parameter. */
export function propertyValueInput(p: string, type: unknown): ValueInputDecl {
  const declared = typeof type === 'string' && (PROPERTY_TYPES as readonly string[]).includes(type) ? (type as (typeof PROPERTY_TYPES)[number]) : '*';
  return {
    type: declared,
    coerce: 'none',
    displayName: p,
    group: 'Property Values',
    description: 'undefined leaves this property on the record unchanged. null clears it (writes null onto the record and notifies).',
    examples: ['v', 1, true, 'm1', '[1,2]', 'abc', { n: 1 }]
  };
}

/** :389-406 — the type selector one property gets. */
export function propertyTypeInput(p: string): ValueInputDecl {
  return {
    type: 'enum',
    enums: PROPERTY_TYPES,
    default: '*',
    coerce: 'none',
    editOnly: true,
    displayName: p,
    group: 'Property Types',
    description: 'How to read the ' + p + ' value before writing it: Object and Array turn a string into the object or array it names, and Any writes it through untouched'
  };
}

/** :443-450 */
export const PROPERTIES_INPUT = {
  type: 'stringlist',
  coerce: 'none',
  editOnly: true,
  displayName: 'Properties',
  group: 'Properties to set',
  description: 'Names the properties to write; each name listed here gets a value input and a type selector',
  examples: ['a', 'a,b', 'name,count']
} as const;

/** :572-585 registerInputIfNeeded — `prop-…` and `type-…`, on first write. */
export function discoverProperty(port: string): ValueInputDecl | undefined {
  if (port.startsWith('prop-')) return propertyValueInput(port.slice('prop-'.length), '*');
  if (port.startsWith('type-')) return propertyTypeInput(port.slice('type-'.length));
  return undefined;
}

export const PROPERTY_CANDIDATES = ['prop-a', 'prop-b', 'type-a', 'type-b'];

/** :364-406 — the ports an editor draws for a `properties` parameter. */
export function propertyInputs(params: Readonly<Record<string, unknown>>): Record<string, ValueInputDecl> {
  const out: Record<string, ValueInputDecl> = {};
  for (const p of propertyNames(params.properties)) {
    out['prop-' + p] = propertyValueInput(p, params['type-' + p]);
    out['type-' + p] = propertyTypeInput(p);
  }
  return out;
}

export type PropertyState = {
  /** the graph's `properties` parameter (:461) */
  properties: readonly string[];
  inputValues: Readonly<Record<string, unknown>>;
  inputTypes: Readonly<Record<string, unknown>>;
};

/** :454-525 — the write, onto a record the caller resolved. */
export function pushInputValues(st: PropertyState, w: WorldView, modelId: string): void {
  const model = w.registry.model(modelId);
  const all = new Set<string>([...Object.keys(st.inputTypes), ...Object.keys(st.inputValues)]); // :457-459
  const keysToSet = [...all].filter((key) => st.properties.indexOf(key) !== -1); // :465
  for (const key of keysToSet) {
    let value: unknown = st.inputValues[key];
    if (value === undefined) continue; // :480
    const type = st.inputTypes[key];
    if (type !== undefined && type === 'array' && typeof value === 'string') {
      // :483-510
      const source = value;
      try {
        value = (0, eval)(source); // :492
      } catch {
        if (source.indexOf('[') !== -1 || source.indexOf('{') !== -1) value = []; // :494-504
        else value = w.registry.collection(source); // :506-507
      }
    }
    if (type !== undefined && type === 'object' && typeof value === 'string') value = w.registry.model(value); // :512-518
    model.set(key, value, { resolve: true }); // :523
  }
}
