/**
 * Remove Object From Array (catalog type `CollectionRemove`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-remove.ts` and
 * `collection-failure.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: binding and `Object Id` as Insert's. Each `Do` (:58) at the
 * frame end, in press order (:60-104): no Object Id → `remove-from-array/no-object-id` (:68-71);
 * no array → `remove-from-array/no-array` (:73-76); an Object Id NO RECORD HAS EVER BEEN LOADED
 * UNDER → `remove-from-array/unknown-object-id` with the id in the sentence (:83-87 — `Model.exists`
 * answers both tiers, and nothing is minted on this path); otherwise the record is removed from
 * the array in place: `done` when it was a member, `unchanged` when it was not (:100-103 — the
 * third path ERG-001 §0 found; `remove` of a non-member is a silent no-op, collection.ts :679-681).
 */

import { defineNode } from '../spec';
import { NO_ARRAY } from './array-clear';
import { NO_OBJECT_ID } from './array-insert';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :190-199 */
export const UNKNOWN_OBJECT_ID = (action: string, id: unknown) =>
  `Nothing to ${action} — no record with the Id "${id}" has been loaded, so this would have done nothing. Connect the Id from a query, a Repeater item or an Object node rather than from a raw string.`;

export const CollectionRemove = defineNode({
  type: 'CollectionRemove',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-remove.ts; collection-failure.ts',
  needs: ['registry'],

  state: { bound: undefined as string | undefined, modifyId: undefined as unknown, error: undefined as string | undefined, removes: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :109-113

  inputs: {
    // :28-40
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to remove from; clearing it unbinds the node, and the next Do then fails rather than acting on a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :41-51
    modifyId: identifier(
      'Object Id',
      'Modify',
      'Id of the object to remove; the record must already have been loaded, or the removal is refused instead of quietly doing nothing',
      ['m1', 'm2', 'm3', 'zz']
    ),
    // :52-106
    remove: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Removes the object named by Object Id from the array, or fires Failure if either cannot be resolved'
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
    remove: (s) => ({ set: { removes: s.removes + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :60-104, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.removes === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'remove'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.removes; k++) {
        if (s.modifyId === undefined) {
          error = NO_OBJECT_ID('remove'); // :68-71
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/no-object-id' });
          continue;
        }
        if (s.bound === undefined) {
          error = NO_ARRAY('remove'); // :73-76
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/no-array' });
          continue;
        }
        if (!w.registry.modelExists(s.modifyId)) {
          error = UNKNOWN_OBJECT_ID('remove', s.modifyId); // :83-87
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/unknown-object-id' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const model = w.registry.model(s.modifyId); // :100
        const wasMember = collection.contains(model); // :101
        collection.remove(model); // :102
        outcomes.push({ port: 'remove', outcome: wasMember ? 'done' : 'unchanged' }); // :103
      }
      return error === s.error ? { set: { removes: 0 }, send: [], outcomes } : { set: { removes: 0, error }, send: ['error'], outcomes };
    }
  }
);
