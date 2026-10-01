/**
 * Unique Id — read from `packages/noodl-runtime/src/nodes/std-library/uniqueid.ts` and
 * `packages/noodl-runtime/src/model.ts` (`Model.guid`, :297-311) on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node holds one ten-character id drawn from `Math.random`
 * ONCE AT CREATION (:22-25) and again on every `New` (:34-45), which reports `done` and nothing
 * else (:69-72: the draw cannot fail and cannot repeat the id it holds). The draw is
 * `Model.guid()` — the registry's own formula (registry.ts `guid`: ten draws from the world's
 * random source), so under a world the first id is the world's first ten draws and a `New` the
 * next ten, exactly as an anonymous record's id is minted. `Id` is a list key, not a credential
 * (:52-60): for anything unguessable the description points at UUID.
 */

import { defineNode } from '../spec';

export const UniqueId = defineNode({
  type: 'Unique Id',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/uniqueid.ts; packages/noodl-runtime/src/model.ts',
  needs: ['random'],

  // :22-25 initialize → Model.guid()
  state: { guid: '' },
  init: (w) => ({ guid: w.registry.guid() }),
  // :26-28
  inspect: (s) => s.guid,
  // :69-72 outcomeOutputs({ done })
  outcomes: ['done'],

  inputs: {
    // :30-46
    new: { type: 'signal', outcome: true, displayName: 'New', group: 'Actions', description: 'Generates a fresh id, replacing the one on Id' }
  },

  outputs: {
    // :48-66
    guid: {
      type: 'string',
      from: (s) => s.guid,
      displayName: 'Id',
      group: 'Values',
      description:
        'A short random id — 10 characters, from Math.random(). Good for keying a list. For a record ' +
        'id, an idempotency key or anything that must be unguessable, use the UUID node instead'
    }
  }
}).on({
  // :34-45 — a fresh draw, flagged, `done`
  new: (_s, _i, w) => ({ set: { guid: w.registry.guid() }, outcome: 'done' })
});
