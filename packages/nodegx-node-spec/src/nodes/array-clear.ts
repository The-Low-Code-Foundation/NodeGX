/**
 * Clear Array (catalog type `CollectionClear`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-clear.ts` and the failure
 * surface the three mutators share, `collection-failure.ts`, on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Array Id` binds the node to the shared array of that name,
 * reaching it the moment the id arrives (collection-failure.ts :91-101, :63-66 — `Collection.get`,
 * create-on-read, so naming an array makes it); `undefined` and `null` UNBIND (:95-98 — an
 * author clearing the field, or an explicit clear on a wire), and an array handed in place of a
 * name binds to that array (:99). Each `Do` is one invocation with its own token (:42) and does
 * its work at the end of the frame (:44-63), in press order: with no array bound it FAILS with
 * `clear-array/no-array` and writes why on `Error` (:51-54, :149-157); otherwise it empties the
 * array in place — ONE `change` for the whole clear (collection.ts `set([])` batches) — and
 * reports `unchanged` when the array was already empty, `done` when something left (:60-62).
 * `Error` is written on a failure and never cleared by a later success (:212-224 clear only the
 * editor's warning).
 */

import { defineNode } from '../spec';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :149-157 */
export const NO_ARRAY = (action: string) => 'Nothing to ' + action + ' — no array is bound. Set the Array Id input, or connect one, before triggering this node.';

export const CollectionClear = defineNode({
  type: 'CollectionClear',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-clear.ts; collection-failure.ts',
  needs: ['registry'],

  // `_internal.collection` (as its name), `_internal.error`; `clears` counts the presses of the frame
  state: { bound: undefined as string | undefined, error: undefined as string | undefined, clears: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :68-72

  inputs: {
    // :24-36 → collection-failure.ts :91-101
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to empty; clearing it unbinds the node, and the next Do then fails rather than emptying a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :37-65
    clear: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Removes every item from the array, or fires Failure if no array is bound'
    }
  },

  outputs: {
    error: errorOutput('Why the last attempt changed nothing, in one sentence; empty until something fails', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    // collection-failure.ts :91-101 — `undefined` / `null` unbind; an array binds by its id; a name reaches `Collection.get(name)`
    collectionId: (_s, v, _i, w) => {
      if (v === undefined || v === null) return { set: { bound: undefined }, send: [] };
      const name = w.registry.isCollection(v) ? v.getId() : v;
      return { set: { bound: w.registry.collection(name).getId() }, send: [] };
    },
    // :41-42 — one token per press, settled at the frame end
    clear: (s) => ({ set: { clears: s.clears + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :44-63, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.clears === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'clear'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.clears; k++) {
        if (s.bound === undefined) {
          error = NO_ARRAY('clear'); // :51-54 → collection-failure.ts :149-157
          outcomes.push({ port: 'clear', outcome: 'failure', error: 'clear-array/no-array' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const wasEmpty = collection.length === 0; // :60
        collection.set([]); // :61
        outcomes.push({ port: 'clear', outcome: wasEmpty ? 'unchanged' : 'done' }); // :62
      }
      return error === s.error ? { set: { clears: 0 }, send: [], outcomes } : { set: { clears: 0, error }, send: ['error'], outcomes };
    }
  }
);
