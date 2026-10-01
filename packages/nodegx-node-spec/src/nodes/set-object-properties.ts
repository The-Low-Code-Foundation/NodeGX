/**
 * Set Object Properties (catalog type `SetModelProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/setmodelpropertiesnode.ts` on 2026-10-01
 * (NSP-012), with the mixins in modelcrudbase.ts (object-crud-base.ts): `addModelId` with inputs
 * and outputs, `addFailure` under `set-object-properties`, `addInputProperties`.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Id` binds the record of that name the moment it arrives —
 * a record handed in becomes its id (modelcrudbase.ts :233), an EMPTY id (`undefined`, `null`,
 * `''`) binds nothing (:289-293), anything else reaches its record create-on-read (:295-296) —
 * and `Id` is re-sent (:298-301); there is no checkbox and no compare. `Id Source` =
 * `From repeater` binds the enclosing Repeater's item at the frame end (:200-203, :262-266); a
 * node outside one binds NOTHING (foreachitem.ts :124-136). `Do` writes the held property values
 * onto the bound record at the frame end (:537-571) — see object-crud-base.ts for the write —
 * and reports `done` (:569); with no record bound it FAILS with `set-object-properties/no-object`,
 * the sentence on `Error` naming which way it was unbound (:556-563, :79-105). Two presses in one
 * frame do ONE write and, as written, report ONE outcome (:538-543, the guard before the token);
 * the spec reports one per press (NSP-012 §6 row C9).
 */

import { defineNode } from '../spec';
import { emptyId, errorOutput, propertyNames } from './data-base';
import { discoverProperty, PROPERTIES_INPUT, PROPERTY_CANDIDATES, propertyInputs, pushInputValues, type PropertyState } from './object-crud-base';

/** :22 */
export const FAILURE_CODE_PREFIX = 'set-object-properties';

/** modelcrudbase.ts :79-85 */
export const NO_OBJECT_MESSAGE = (action: string, fromRepeater: boolean) =>
  fromRepeater
    ? 'Nothing to ' + action + ' — Id Source is "From repeater" and no item resolved.'
    : 'Nothing to ' + action + ' — no object is bound. Set the Id input, or connect one, before triggering this node.';

type Job = 'bind' | 'store';

type SetObjectState = PropertyState & {
  modelId: unknown;
  bound: string | undefined;
  idSource: unknown;
  repeaterComponent: unknown;
  error: string | undefined;
  jobs: readonly Job[];
  stores: number;
  scheduled: boolean;
};

export const SetModelProperties = defineNode({
  type: 'SetModelProperties',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/setmodelpropertiesnode.ts; modelcrudbase.ts',
  needs: ['registry'],

  state: { modelId: undefined, bound: undefined, idSource: undefined, repeaterComponent: undefined, error: undefined, properties: [], inputValues: {}, inputTypes: {}, jobs: [], stores: 0, scheduled: false } as SetObjectState,
  init: (_w, params) => ({ properties: propertyNames(params.properties) }), // modelcrudbase.ts :461
  outcomes: ['done', 'failure'], // :48-50 + `addFailure` :56

  inputs: {
    // modelcrudbase.ts :187-204
    idSource: {
      type: 'enum',
      enums: ['explicit', 'foreach'],
      default: 'explicit',
      coerce: 'none',
      editOnly: true,
      displayName: 'Id Source',
      group: 'General',
      description: 'Where the object comes from: the Id input, or the item of the Repeater this node sits inside'
    },
    // :209-221
    repeaterComponent: {
      type: 'component',
      coerce: 'none',
      displayName: 'Repeater Component',
      group: 'General',
      description: 'Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Id Source is From repeater',
      examples: ['Row', '']
    },
    // :222-237
    modelId: {
      type: 'string',
      coerce: 'none',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object to act on, which is created the first time it is named; an Object may be wired here instead, and null or blank binds nothing so Do fails',
      examples: ['m1', 'm2', 'm3', 'zz']
    },
    properties: PROPERTIES_INPUT,
    // :30-38
    store: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Writes the property values currently on the inputs onto the object named by Id'
    }
  },

  outputs: {
    // modelcrudbase.ts :244-253
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object this node acted on, which is how a newly created one is picked up downstream',
      from: (s) => (s.bound !== undefined ? s.bound : s.modelId)
    },
    // modelcrudbase.ts :60-68
    error: errorOutput('Why no object was bound, and what to set so that one is', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    // modelcrudbase.ts :200-203
    idSource: (s, v) => ({ set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :215-220
    repeaterComponent: (s, v) => ({ set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :232-237 → setModelID :289-297 → setModel :298-301
    modelId: (_s, value, _i, w) => {
      const v = w.registry.isRecord(value) ? value.getId() : value; // :233
      if (emptyId(v)) return { set: { modelId: v, bound: undefined }, send: ['id'] }; // :290-293
      return { set: { modelId: v, bound: w.registry.model(v).getId() }, send: ['id'] }; // :295-296
    },
    properties: () => ({ send: [] }),
    // :34-37 → modelcrudbase.ts :537-543 — one write per frame; one outcome per press (the contract's reading, row C9)
    store: (s) => ({ set: { stores: s.stores + 1, scheduled: true, jobs: s.scheduled ? s.jobs : [...s.jobs, 'store' as const] }, outcome: 'deferred', send: [] })
  },
  {
    derived: {
      inputs: propertyInputs,
      discover: discoverProperty,
      candidates: PROPERTY_CANDIDATES,
      on: (s, port, v) =>
        port.startsWith('prop-')
          ? { set: { inputValues: { ...s.inputValues, [port.slice('prop-'.length)]: v } }, send: [] }
          : { set: { inputTypes: { ...s.inputTypes, [port.slice('type-'.length)]: v } }, send: [] }
    },
    // the frame's scheduled callbacks, in order (:263, :546)
    afterInputs: (s, _i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      let bound = s.bound;
      let error = s.error;
      let scheduled = s.scheduled;
      let stores = s.stores;
      const send: Array<'id' | 'error'> = [];
      const outcomes: Array<{ port: 'store'; outcome: 'done' | 'failure'; error?: string }> = [];
      for (const job of s.jobs) {
        if (job === 'bind') {
          bound = undefined; // modelcrudbase.ts :264 — outside any Repeater the walk misses
          send.push('id'); // :300
          continue;
        }
        // :546-570
        scheduled = false;
        const n = stores;
        stores = 0;
        if (bound === undefined) {
          error = NO_OBJECT_MESSAGE('store', s.idSource === 'foreach'); // :80-87
          send.push('error');
          for (let k = 0; k < n; k++) outcomes.push({ port: 'store', outcome: 'failure', error: FAILURE_CODE_PREFIX + '/no-object' }); // :99-104
          continue;
        }
        pushInputValues(s, w, bound); // :566
        for (let k = 0; k < n; k++) outcomes.push({ port: 'store', outcome: 'done' }); // :569
      }
      return { set: { bound, error, scheduled, stores, jobs: [] }, send: [...new Set(send)], outcomes };
    }
  }
);
