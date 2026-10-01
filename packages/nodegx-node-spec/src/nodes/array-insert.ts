/**
 * Insert Object Into Array (catalog type `CollectionInsert`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-insert.ts` and
 * `collection-failure.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Array Id` binds as Clear Array's does (collection-failure.ts
 * :91-101). `Object Id` is kept as sent (:46-48). Each `Do` is one invocation (:56) done at the
 * frame end in press order (:58-96): with no Object Id ever sent it fails with
 * `insert-into-array/no-object-id` (:66-69 — checked FIRST); with no array bound,
 * `insert-into-array/no-array` (:71-74); otherwise the record NAMED by Object Id is reached —
 * create-on-read, so an id nothing has loaded is minted empty and inserted (:92, `Model.get`;
 * `null` names the record `'null'`) — and added to the array in place: `done` when it joined,
 * `unchanged` when it was already a member (:93-95, the ERG-001 reference case; `add` is a silent
 * no-op on a member, collection.ts :663). `Error` carries a failure's sentence and is never
 * cleared by a later success.
 */

import { defineNode } from '../spec';
import { NO_ARRAY } from './array-clear';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :160-167 */
export const NO_OBJECT_ID = (action: string) => 'Nothing to ' + action + ' — no Object Id was supplied. Connect one before triggering this node.';

export const CollectionInsert = defineNode({
  type: 'CollectionInsert',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-insert.ts; collection-failure.ts',
  needs: ['registry'],

  state: { bound: undefined as string | undefined, modifyId: undefined as unknown, error: undefined as string | undefined, adds: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :101-105

  inputs: {
    // :28-40
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to insert into; clearing it unbinds the node, and the next Do then fails rather than writing to a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :41-49 — as sent
    modifyId: identifier('Object Id', 'Modify', 'Id of the object to insert; a record with this id is created if none has been loaded yet', ['m1', 'm2', 'm3', 'zz']),
    // :50-98
    add: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Adds the object named by Object Id to the array, or fires Failure if either cannot be resolved'
    }
  },

  outputs: {
    error: errorOutput('Why the last attempt changed nothing, in one sentence; empty until something fails', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    collectionId: (_s, v, _i, w) => {
      if (v === undefined || v === null) return { set: { bound: undefined }, send: [] };
      const name = w.registry.isCollection(v) ? v.getId() : v;
      return { set: { bound: w.registry.collection(name).getId() }, send: [] };
    },
    modifyId: (_s, v) => ({ set: { modifyId: v }, send: [] }),
    add: (s) => ({ set: { adds: s.adds + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :58-96, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.adds === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'add'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.adds; k++) {
        if (s.modifyId === undefined) {
          error = NO_OBJECT_ID('insert'); // :66-69
          outcomes.push({ port: 'add', outcome: 'failure', error: 'insert-into-array/no-object-id' });
          continue;
        }
        if (s.bound === undefined) {
          error = NO_ARRAY('insert'); // :71-74
          outcomes.push({ port: 'add', outcome: 'failure', error: 'insert-into-array/no-array' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const model = w.registry.model(s.modifyId); // :92 — create-on-read
        const alreadyPresent = collection.contains(model); // :93
        collection.add(model); // :94
        outcomes.push({ port: 'add', outcome: alreadyPresent ? 'unchanged' : 'done' }); // :95
      }
      return error === s.error ? { set: { adds: 0 }, send: [], outcomes } : { set: { adds: 0, error }, send: ['error'], outcomes };
    }
  }
);
