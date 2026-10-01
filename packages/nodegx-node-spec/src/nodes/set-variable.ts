/**
 * Set Variable (catalog type `Set Variable`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/setvariablenode.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` writes one key of the shared `--ndl--global-variables`
 * record (:60, variable2.ts) at the frame end — one write for any number of presses in a frame,
 * one outcome PER press (:137-145, :159-211). With no `Name` (`undefined`, `null`, `''`) nothing
 * is written: `Error` carries the sentence and every press reports `failure` with
 * `set-variable/no-name` (:186-193). Otherwise the value written is `Value` as last sent, read
 * through `Set as` (:195-202): `Empty string` writes `''` and needs no Value; `Object` turns a
 * STRING into the record of that name (create-on-read, :199-200); `Array` turns a string into the
 * array of that name (:201); `Boolean` writes `!!value`; every other choice — `String`, `Number`,
 * `Date`, `Any` — writes what arrived untouched (the description's "coerced" is Boolean's alone;
 * NDA-012 filed the rest). The write FORCES a change notification (:205-207), so every Variable
 * node reading the name fires `Changed` even for the same value — and `done` is reported last
 * (:210). `Value` is a port the runtime registers on first write whatever `Set as` says (:213-223);
 * the editor draws it under the chosen type, and not at all for `Empty string` (:233-250).
 */

import type { ValueInputDecl, ValueType } from '../spec';
import { defineNode } from '../spec';
import { emptyId, errorOutput } from './data-base';
import { GLOBAL_VARIABLES } from './variable2';

/** :45-46, :187-190 */
export const NO_NAME_MESSAGE = 'No variable name is set — the value was not stored anywhere a Variable node can read';

/** :104-118 */
const SET_WITH = ['string', 'boolean', 'number', 'emptyString', 'date', 'object', 'array', '*'] as const;

/** :233-250 — the `value` port's declared type follows `Set as` (a value the editor could not offer reads as Any). */
function valuePort(setWith: unknown): ValueInputDecl {
  const type: ValueType = typeof setWith === 'string' && (SET_WITH as readonly string[]).includes(setWith) && setWith !== 'emptyString' ? (setWith as ValueType) : '*';
  return { type, coerce: 'none', displayName: 'Value', group: 'General', description: 'The value to write into the named variable when Do fires', examples: ['m1', 'abc', 'x'] };
}

export const SetVariable = defineNode({
  type: 'Set Variable',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/setvariablenode.ts',
  needs: ['registry'],

  // :21-38 — `name`, `value`, `lastError`, `setWith` (unset until the panel writes it: the declared default never runs a setter), the pending tokens
  state: { name: undefined as unknown, value: undefined as unknown, setWith: undefined as unknown, lastError: undefined as string | undefined, dos: 0, scheduled: false },
  // :60 — the shared record, bound at creation (nothing is watched: this node only writes)
  init: (w) => {
    w.registry.model(GLOBAL_VARIABLES);
    return {};
  },
  outcomes: ['done', 'failure'], // :76-79

  inputs: {
    // :91-103
    name: {
      type: 'string',
      coerce: 'none',
      displayName: 'Name',
      group: 'General',
      description: 'Which app-wide variable to write; leaving it blank refuses the write rather than storing it somewhere unreadable',
      examples: ['x', 'y', 'count']
    },
    // :104-132 — panel only
    setWith: {
      type: 'enum',
      enums: SET_WITH,
      default: '*',
      coerce: 'none',
      editOnly: true,
      displayName: 'Set as',
      group: 'General',
      description:
        'Chooses the type of the Value port; Empty string stores "" and needs no Value, Object and Array accept an id as well as a value, and Boolean is coerced'
    },
    // :133-146
    do: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Writes Value into the named variable, or fires Failure when no Name is set'
    }
  },

  outputs: {
    // :80-88
    error: errorOutput('Why the write was refused, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    name: (_s, v) => ({ set: { name: v }, send: [] }), // :100-102
    setWith: (_s, v) => ({ set: { setWith: v }, send: [] }), // :129-131
    // :137-145 — a token per press, one store per frame
    do: (s) => ({ set: { dos: s.dos + 1, scheduled: true }, outcome: 'deferred', send: [] })
  },
  {
    // :228-250 — the one dynamic port, registered on first write whatever `Set as` says (:218-222)
    derived: {
      inputs: (params): Record<string, ValueInputDecl> => (params.setWith === 'emptyString' ? {} : { value: valuePort(params.setWith) }),
      discover: (port) => (port === 'value' ? valuePort('*') : undefined),
      candidates: ['value'],
      on: (_s, _port, v) => ({ set: { value: v }, send: [] }) // :156-158 setValue
    },
    // :164-211
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const n = s.dos;
      if (emptyId(s.name)) {
        // :186-193 reportFailure: Error first, then every token fails
        const outcomes = Array.from({ length: n }, () => ({ port: 'do' as const, outcome: 'failure' as const, error: 'set-variable/no-name' }));
        return { set: { scheduled: false, dos: 0, lastError: NO_NAME_MESSAGE }, send: ['error'], outcomes };
      }
      let value: unknown = s.setWith === 'emptyString' ? '' : s.value; // :195
      if (s.setWith === 'object' && typeof value === 'string') value = w.registry.model(value); // :199-200
      if (s.setWith === 'array' && typeof value === 'string') value = w.registry.collection(value); // :201
      if (s.setWith === 'boolean') value = !!value; // :202
      w.registry.model(GLOBAL_VARIABLES).set(s.name as string, value, { forceChange: true }); // :205-207 — the name as sent (a Variable node compares the notification's name with `===`)
      const outcomes = Array.from({ length: n }, () => ({ port: 'do' as const, outcome: 'done' as const })); // :210
      return { set: { scheduled: false, dos: 0 }, send: [], outcomes };
    }
  }
);
