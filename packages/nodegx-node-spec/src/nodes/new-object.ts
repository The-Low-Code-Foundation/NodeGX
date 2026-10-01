/**
 * Create New Object (catalog type `NewModel`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/newmodelnode.ts` on 2026-10-01 (NSP-012), with
 * the mixins in modelcrudbase.ts (object-crud-base.ts). `addModelId` is applied with outputs only
 * (:75): the node has an `Id` output and NO `Id` input — it never binds, it only makes.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` mints a fresh ANONYMOUS record at the frame end (a guid
 * draw, :59), writes the held property values onto it (object-crud-base.ts, `_pushInputValues`
 * :61), publishes its id (:63) and reports `done` (:67) — Id before the outcome, so a graph wired
 * `Done → Insert` reads the id. Two presses in one frame mint ONE record and, as written, report
 * ONE outcome: the guard sits before `beginOutcome` (:49-55, by its own comment deliberately).
 * The spec follows the contract (ERG-001 §4) and reports `done` per press; NSP-012 §6 row C9.
 */

import { defineNode } from '../spec';
import { propertyNames } from './data-base';
import { discoverProperty, PROPERTIES_INPUT, PROPERTY_CANDIDATES, propertyInputs, pushInputValues, type PropertyState } from './object-crud-base';

type NewObjectState = PropertyState & { bound: string | undefined; scheduled: boolean; news: number };

export const NewModel = defineNode({
  type: 'NewModel',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/newmodelnode.ts; modelcrudbase.ts',
  needs: ['registry', 'random'],

  state: { bound: undefined, properties: [], inputValues: {}, inputTypes: {}, scheduled: false, news: 0 } as NewObjectState,
  init: (_w, params) => ({ properties: propertyNames(params.properties) }), // modelcrudbase.ts :461
  outcomes: ['done'], // :44-46 — no Failure (it makes its own object), no Unchanged (every Do mints)

  inputs: {
    // :27-34
    new: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Creates a new object with a generated id and writes the property values currently on the inputs'
    },
    properties: PROPERTIES_INPUT
  },

  outputs: {
    // modelcrudbase.ts :244-253 — the record made last; nothing before (no Id input ever sets `modelId`)
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object this node acted on, which is how a newly created one is picked up downstream',
      from: (s) => s.bound
    }
  }
}).on(
  {
    properties: () => ({ send: [] }), // modelcrudbase.ts :449 `set: function () {}`
    // :48-55 — one mint per frame; one outcome per press (the contract's reading, row C9)
    new: (s) => ({ set: { scheduled: true, news: s.news + 1 }, outcome: 'deferred', send: [] })
  },
  {
    derived: {
      inputs: propertyInputs,
      discover: discoverProperty,
      candidates: PROPERTY_CANDIDATES,
      // modelcrudbase.ts :600-605
      on: (s, port, v) =>
        port.startsWith('prop-')
          ? { set: { inputValues: { ...s.inputValues, [port.slice('prop-'.length)]: v } }, send: [] }
          : { set: { inputTypes: { ...s.inputTypes, [port.slice('type-'.length)]: v } }, send: [] }
    },
    // :57-68
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const model = w.registry.model(); // :59 — anonymous: a guid draw
      pushInputValues(s, w, model.getId()); // :61
      const outcomes = Array.from({ length: s.news }, () => ({ port: 'new' as const, outcome: 'done' as const }));
      return { set: { bound: model.getId(), scheduled: false, news: 0 }, send: ['id'], outcomes }; // :63, :67
    }
  }
);
