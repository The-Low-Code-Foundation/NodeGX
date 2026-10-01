/**
 * UUID (`net.noodl.UUID`) — read from `packages/noodl-runtime/src/nodes/std-library/crypto/uuid.ts`
 * and `crypto/encoding.ts` on 2026-09-30 (NSP-007).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE: the node holds one version-4 UUID, drawn from the platform's random source ONCE AT
 * CREATION (uuid.ts :48-54) so `Id` is never empty, and again on every `New` (:96-110), which
 * reports `done`. The draws come from the WORLD (spec.ts `WorldView.uuid`; world.ts): a target's
 * `crypto.randomUUID` is the world's seeded source, so the first id a node shows is the world's
 * first draw and the n-th `New` shows its (n+1)-th — a target that draws lazily, or twice, shows
 * a different id in the same place.
 *
 * The failure path (:99-104: no cryptographic source at all → `Error` set, `failure`
 * `uuid/failed`, `Id` kept) cannot happen under a world, which always has one; it is declared in
 * `outcomes` (the catalog draws the port) and has no reducer branch — a §6 note in NSP-007, not
 * a row: nothing a wire can carry distinguishes it from a world with entropy.
 */

import { defineNode } from '../spec';

export const Uuid = defineNode({
  type: 'net.noodl.UUID',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/crypto/uuid.ts',
  needs: ['random'],

  // :29-33 `_internal.uuid`, `_internal.error`
  state: { uuid: undefined as string | undefined, error: undefined as string | undefined },
  // :48-54 initialize → randomUuid() (encoding.ts :151-162: `crypto.randomUUID` where it exists)
  init: (w) => ({ uuid: w.uuid() }),
  // :55-57
  inspect: (s) => s.uuid ?? '',
  // :81-84 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :59-67
    generate: { type: 'signal', outcome: true, displayName: 'New', group: 'Actions', description: 'Generates a fresh UUID, replacing the one on Id' }
  },

  outputs: {
    // :70-80
    uuid: {
      type: 'string',
      from: (s) => s.uuid,
      displayName: 'Id',
      group: 'Values',
      description:
        'A random version-4 UUID, generated once when the node is created and again on every New. ' +
        'Use this rather than Unique Id wherever the id has to be globally unique or unguessable'
    },
    // :85-93 — never defined under a world (the failure path is unreachable), so never sent (C3)
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why no UUID could be generated' }
  }
}).on({
  // :96-110 _generate: a fresh draw, `error` cleared, both flagged, `done`
  generate: (_s, _i, w) => ({ set: { uuid: w.uuid(), error: undefined }, outcome: 'done' })
});
