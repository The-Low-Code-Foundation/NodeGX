/**
 * Variable (catalog type `Variable2`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts` on 2026-10-01 (NSP-012).
 * Not the typed Variables of NSP-011 (variablebase.ts): this is the app-wide, name-keyed one.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: every app-wide variable is ONE KEY of ONE shared record, the
 * one named `--ndl--global-variables` (:83) — which is why a Set Variable anywhere reaches every
 * Variable node reading that name, and why two Variable nodes with one name are one value. The
 * node binds that record at creation and listens to it for life (:83-84). `Name` chooses the key:
 * with the `Name` checkbox on, every write of it rebinds — `Name` and `Value` are sent and
 * `Fetched` fires, whether or not the name changed (:174-180, :252-257; no DEF-046 compare here);
 * with it off only `Name` is sent (:176-179). `Fetch` re-reads the same way and reports `done` at
 * once (:187-194 — one token, settled in the same call, `Fetched` before the outcome). `Value`
 * STORES at the frame end, once per frame (:201-204, :214-250): with no name (`undefined`, `null`
 * or `''`) it REFUSES — `Error` carries the sentence and `Failure` pulses, a plain signal and not
 * an outcome, since a value arriving is nobody's invocation (:241-247, :135-141); with a name it
 * writes the key on the shared record (:249), which notifies this node like any other: `Changed`
 * pulses and `Value` is re-sent when the key written is this node's name and the `Variable
 * changes` checkbox is on (:62-68). A write that does not change the key notifies nothing
 * (model.ts :381 — a Set Variable's write does, by `forceChange`). `Value` reads the key, or
 * nothing while the name is falsy (:156-161).
 */

import type { ChangeEvent } from '../spec';
import { defineNode } from '../spec';
import { emptyId, errorOutput, runOnChange } from './data-base';

/** :19-22, :83 — the one record every Variable in a project is a key of. */
export const GLOBAL_VARIABLES = '--ndl--global-variables';

/** :40-41, :242-245 */
export const NO_NAME_MESSAGE = 'No variable name is set — the value was not stored anywhere a Variable node can read';

export const Variable2 = defineNode({
  type: 'Variable2',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/variablenode2.ts',
  needs: ['registry'],

  // :24-33 — `name`, `value` (pending the store), `lastError`; `hasScheduledStore`
  state: { name: undefined as unknown, value: undefined as unknown, lastError: undefined as string | undefined, storeScheduled: false },
  // :83-84 — bind the shared record and listen to it, at creation
  init: (w) => {
    w.registry.model(GLOBAL_VARIABLES);
    w.watch({ model: GLOBAL_VARIABLES });
    return {};
  },
  outcomes: ['done'], // :132-134 — Fetch cannot fail; the `failure` output is the Value setter's, a plain signal

  inputs: {
    // :165-181
    name: {
      type: 'string',
      coerce: 'none',
      displayName: 'Name',
      group: 'General',
      description: 'Which app-wide variable this node reads and writes',
      examples: ['x', 'y', 'count']
    },
    // :182-195
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description:
        'Re-reads the variable named by Name and refreshes Value. This is additional to Name rebinding on change and to changes being announced; untick either under Run On Value Change to stop it'
    },
    // :196-205
    value: {
      type: '*',
      coerce: 'none',
      displayName: 'Value',
      group: 'General',
      description: 'Stores this value in the named variable as soon as it arrives; refused, loudly, when Name is empty'
    },
    // :54-58 runOnValueChange: inputs ['name'], sources [variable]
    'runOnChange-name': runOnChange('Name'),
    'runOnChange-variable': runOnChange('Variable changes')
  },

  outputs: {
    // :97-105
    name: { type: 'string', displayName: 'Name', group: 'General', description: 'The variable name this node is currently bound to', from: (s) => s.name },
    // :106-111
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the named variable is written from anywhere in the app' },
    // :112-117
    fetched: { type: 'signal', displayName: 'Fetched', group: 'Events', description: 'Fires once Fetch has rebound this node and Value is up to date' },
    // :135-141 — the Value setter's, not an outcome
    failure: {
      type: 'signal',
      displayName: 'Failure',
      group: 'Events',
      description:
        'Fires when a value arrived but could not be stored because no Name is set. This belongs to the Value input rather than to Fetch, so it reports no outcome and does not fire Completed'
    },
    // :142-150
    error: errorOutput('Why the last write was refused, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError),
    // :151-162 — nothing while the name is falsy
    value: {
      type: '*',
      displayName: 'Value',
      group: 'General',
      description: 'Current contents of the named variable, or empty until something writes it',
      // the name as sent is the key — a number keys the record as a plain object does (`data[7]`)
      from: (s, w) => (!s.name ? undefined : w.registry.model(GLOBAL_VARIABLES).get(s.name as string))
    }
  }
}).on(
  {
    // :174-180 — the checkbox alone decides (`shouldRunOnValueChange`, no compare)
    name: (_s, v, i) => (i['runOnChange-name'] ? { set: { name: v }, send: ['name', 'value'], emit: ['fetched'] } : { set: { name: v }, send: ['name'] }),
    // :187-194 — setVariableName(name) then done, in the same call
    fetch: () => ({ send: ['name', 'value'], emit: ['fetched'], outcome: 'done' }),
    // :201-204 — stored, the write scheduled once per frame
    value: (_s, v) => ({ set: { value: v, storeScheduled: true }, send: [] })
  },
  {
    // :214-250 — 'nothing due' and 'stored' return one shape (the flag cleared): neither shows on
    // the wire, and a suite that cannot tell them apart is not asked to
    afterInputs: (s, i, w) => {
      if (!s.storeScheduled) return { set: { storeScheduled: false }, send: [] };
      if (emptyId(s.name)) {
        // :241-247 reportFailure → :208-213: Error, the error channel, Failure
        return { set: { storeScheduled: false, lastError: NO_NAME_MESSAGE }, send: ['error'], emit: ['failure'] };
      }
      // :249 — the name as sent: the notification carries it as is, and :64 compares with `===`.
      // A write that moves the key notifies this node's own listener inside the write (:62-68):
      // the announcement sits here, beside the write
      const globals = w.registry.model(GLOBAL_VARIABLES);
      const moved = globals.get(s.name as string) !== s.value;
      globals.set(s.name as string, s.value);
      if (moved && i['runOnChange-variable']) return { set: { storeScheduled: false }, send: ['value'], emit: ['changed'] };
      return { set: { storeScheduled: false }, send: [] };
    },
    world: {
      // :62-68 — any key of the shared record, written by ANOTHER node; only this node's name is its business
      change: (s, i, e: ChangeEvent) =>
        e.kind === 'model' && i['runOnChange-variable'] && e.name === s.name ? { emit: ['changed'], send: ['value'] } : { send: [] }
    }
  }
);
