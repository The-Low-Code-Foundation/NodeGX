/**
 * Create New Array (catalog type `CollectionNew`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-new.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` mints a fresh ANONYMOUS array at the end of the frame (a
 * guid draw, `Collection.get()` with no name, :80) and copies whatever `Items` last held into it
 * (:81 — only when something was ever sent; an `Items` never written leaves the new array empty),
 * then publishes the new array's id (:85) and reports `done` (:87). The array it made last time is
 * left as it is: a second `Do` makes a second array with a second id, so `Id` moves every time.
 *
 * Two presses in one frame do ONE mint (:73-74, the `hasScheduledNew` guard) and, as the runtime
 * is written, ONE outcome: the guard sits BEFORE `beginOutcome` (:73-75), so the second press
 * reports nothing at all — where the Array node's `Fetch` (collectionnode2.ts :294-300), Set
 * Variable's `Do` and Array Filter's `Filter` mint a token per press and report each. The spec
 * follows the contract and the three siblings (ERG-001 §4: one outcome per invocation): every
 * press reports `done`. NSP-012 §6 row C9 holds the difference for a ruling; the runtime's
 * reading is counted under it, never hidden.
 */

import { defineNode } from '../spec';

export const CollectionNew = defineNode({
  type: 'CollectionNew',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-new.ts',
  needs: ['registry', 'random'],

  // :10-15 — `_internal.collection` (the array made last), `_internal.sourceCollection` (Items as
  // sent, `undefined` until written), `hasScheduledNew`; `news` counts the presses of the frame
  state: { collectionId: undefined as string | undefined, source: undefined as unknown, scheduled: false, news: 0 },
  outcomes: ['done'], // :65 outcomeOutputs({ done }) — no Failure (cannot fail to make one), no Unchanged (every Do mints)

  inputs: {
    // :28-35
    new: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Creates a fresh array with a generated id and copies Items into it'
    },
    // :36-44 — stored as sent; a string literal is evaluated by the port's array typecast (node.ts setInputValue)
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'Contents to copy into the new array when Do fires; leave unconnected to start empty'
    }
  },

  outputs: {
    // :47-59 — the last array made, or nothing (`undefined`) before the first Do
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the array made by the last Do — give it to an Array node or a mutator to reach the same array; empty until Do has fired',
      from: (s) => s.collectionId
    }
  }
}).on(
  {
    // :41-43 — whatever arrived, `undefined` included (`sourceCollection = value`)
    items: (_s, v) => ({ set: { source: v }, send: [] }),
    // :72-76 — queued once per frame; every press owes an outcome (the contract's reading, row C9)
    new: (s) => ({ set: { scheduled: true, news: s.news + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :77-88
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const collection = w.registry.collection(); // :80 — anonymous: a guid draw
      if (s.source !== undefined) collection.set(s.source); // :81
      const outcomes = Array.from({ length: s.news }, () => ({ port: 'new' as const, outcome: 'done' as const }));
      return { set: { collectionId: collection.getId(), scheduled: false, news: 0 }, send: ['id'], outcomes }; // :85-87
    }
  }
);
