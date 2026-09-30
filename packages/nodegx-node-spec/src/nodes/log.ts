/**
 * Log (`net.noodl.Log`) — read from `packages/noodl-runtime/src/nodes/std-library/log.ts` on
 * 2026-09-30 (NSP-011).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * What the wire carries is small: `Value` passes straight through (:120-129, :150-158) and every
 * `Log` pulse reports `done` (:135-146, :190) — no failure, no unchanged (:159-160). The line
 * itself goes to a sink the runtime attaches (`nodeScope.runContext.log`, :175-179) or to the
 * console (:181-187). That is an EFFECT, not a trace event; NSP-007 routes it through the world.
 * Until then the runtime target captures it on the handle (`logs`, node-spec-target.ts) and the
 * runtime suite checks it is written — checked, not ignored (NSP-011 §3) — but this spec does not
 * grade its text.
 *
 * `message`, `level` and `data` reach nothing a wire can see, so they are not state here (the
 * interpreter keeps every value input anyway; a mutant that dropped a store of them could only
 * survive). Their arrival rules are written down for NSP-007's effect arm: `level` falls back to
 * `'info'` for anything not in the list (:106 — a cleared enum arrives as `''`; `effectiveLevel`
 * below), and `message` / `data` are stored raw (:85-87, :116-118) and shaped only at write time
 * (:170, :173).
 */

import { defineNode } from '../spec';

/** :49 */
export const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/** :106 (and :141, :169) — the level the line is written at; anything not in the list is `info`. For NSP-007. */
export function effectiveLevel(value: unknown): (typeof LEVELS)[number] {
  return (LEVELS as readonly unknown[]).includes(value) ? (value as (typeof LEVELS)[number]) : 'info';
}

export const Log = defineNode({
  type: 'net.noodl.Log',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/log.ts',

  // initialize (:73-75) seeds `level` — an effect's field; the only state a wire sees is the passthrough
  state: { value: undefined as unknown },
  // :161 outcomeOutputs({ done }) — "No `Failure` … No `Unchanged`: every Log writes" (:159-160)
  outcomes: ['done'],

  inputs: {
    // :77-88 — raw
    message: {
      type: 'string',
      coerce: 'none',
      displayName: 'Message',
      group: 'General',
      description:
        'The line to write. Free text, so keep credentials out of it by habit — the backend does ' +
        'scrub the values of its own stored secrets out of this before it is written, but that ' +
        'cannot cover a credential it never issued'
    },
    // :89-108 — `LEVELS.indexOf(value) === -1 ? 'info' : value` (:106)
    level: {
      type: 'enum',
      enums: LEVELS,
      default: 'info',
      coerce: 'none',
      displayName: 'Level',
      group: 'General',
      description:
        'How loud this line is. In a cloud function the backend drops anything below its ' +
        'configured level, so Debug lines cost nothing in production unless someone turns them on'
    },
    // :109-119 — raw (an `object` port: node.ts evaluates a string literal on arrival; the effect sees it, the wire does not)
    data: {
      type: 'object',
      coerce: 'none',
      displayName: 'Data',
      group: 'General',
      description:
        'An optional object written alongside the message as structured fields. In a cloud ' +
        'function every property whose NAME says it holds a credential is redacted on the way out'
    },
    // :120-129 — raw, flagged through to the output
    value: {
      type: '*',
      coerce: 'none',
      displayName: 'Value',
      group: 'General',
      description: 'Passed straight through to the Value output, so this node can sit inline on a wire'
    },
    // :130-147 `valueChangedToTrue` → `_write(beginOutcome(…))`
    log: {
      type: 'signal',
      outcome: true,
      displayName: 'Log',
      group: 'Actions',
      description: 'Writes the line. Nothing is written until this fires'
    }
  },

  outputs: {
    // :150-158
    value: {
      type: '*',
      from: (s) => s.value,
      displayName: 'Value',
      group: 'Values',
      description: 'Whatever arrived on the Value input, unchanged — this node never alters what passes through it'
    }
  }
}).on({
  value: (_s, v) => ({ set: { value: v } }),
  // :164-191 — the line is written (sink or console) and `done` reported in the same call
  log: () => ({ outcome: 'done' })
});
