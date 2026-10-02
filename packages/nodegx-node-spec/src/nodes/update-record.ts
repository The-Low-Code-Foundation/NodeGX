/**
 * Update Record (`SetDbModelProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode.ts` on 2026-10-02 (NSP-014 s22), with
 * the mixins in dbmodelcrudbase.ts: `addBaseInfo`, `addModelId` with inputs and outputs (record-base.ts),
 * `addInputProperties` and `addAccessControl` (record-write.ts).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: TWO NODES IN ONE, chosen at each press by `Store to` (:64-67) — unset or `cloud`
 * is the backend branch, anything else the local one.
 *   CLOUD (`scheduleSave`, :138-222): checked at the press — a falsy Class fails that press at once, `No class name
 *   specified` (:146-147) — and otherwise joins the frame's batch. At the frame's end ONE save answers the batch: no
 *   record bound is `Missing Record Id` (:153-156); `Only If Unchanged` names are read off the record BEFORE the write
 *   — a name the record does not hold, or holds a list or object under, fails with its sentence and writes nothing
 *   (:163-181); then every property port is written onto the record (:184-188) — AND STAYS WRITTEN whatever follows
 *   but a refused precondition (row C34) — then a Backend the project does not have is the not-configured sentence
 *   (:191-192); otherwise the node hands its backend `save({ collection: <Class>, objectId: <the record's id>, data:
 *   <the property ports, or the whole record under Properties to store = All>, acl: <the rules' ACL>, ifMatch })`
 *   (:194-199; world.ts BACKEND, R9). Success writes every key the backend hands back onto the record and is Done for
 *   each press (:200-206). A failure whose detail says `precondition-failed` puts back what the write replaced and says
 *   so (:208-216); any other is the backend's message or `Failed to save.` (:218). A press while an earlier save is
 *   out makes a second call.
 *   LOCAL (`scheduleStore`, :223-251): NO pre-flight — every press is an invocation (:227) — and one write per frame:
 *   no record bound is `Missing Record Id` (:241-244); otherwise the property ports are written onto the record and
 *   every press is Done (:246-249). No call.
 * Every failure carries `record/storage-op-failed`.
 *
 * NOT GRADED HERE, named:
 *   - the writes onto the record and the success's write-back are invisible to a one-node trace except where the node
 *     reads them back — an All save's `data` and an `ifMatch` (scenarios use both); a graph with a Record watching it
 *     will see the rest;
 *   - the adapter's own refusals (Only If Unchanged on a backend that cannot check it, a save answered with no record):
 *     under R9 they are a backend's answers — a world scripts them as `{ error }`;
 *   - the success's `save` event on the store; a project with NO backend configured at all (row C33).
 */

import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import {
  bindId,
  discoverRecordPort,
  NO_BACKEND_MESSAGE,
  NO_CLASS_MESSAGE,
  onRecordPort,
  RECORD_CANDIDATES,
  RECORD_ERROR_OUTPUT,
  RECORD_FAILURE_CODE,
  RECORD_ID_INPUTS,
  RECORD_ID_OUTPUT,
  RECORD_ID_STATE,
  type RecordIdState
} from './record-base';
import { ACCESS_CONTROL_INPUT, aclFor, aclInputs, discoverWritePort, dones, failures, onWritePort, RECORD_WRITE_STATE, WRITE_CANDIDATES, type RecordWriteState } from './record-write';

/** :211-214 */
export const PRECONDITION_MESSAGE = 'Someone else changed this record after it was read, so this update was not applied. Fetch the record again, then retry.';
/** :172-174 */
export const UNREAD_MESSAGE = (name: string) => `Only If Unchanged names "${name}", which this record has not been read with. Fetch the record first.`;
export const NOT_SCALAR_MESSAGE = (name: string) => `Only If Unchanged names "${name}", which holds an object or list. Name a plain value such as a version number.`;

type Job = 'bind' | 'save' | 'store';

type UpdateRecordState = RecordIdState &
  RecordWriteState & {
    /** `_internal.storeType` (:99-101) — raw; unset is the backend branch */
    storeType: unknown;
    /** `_internal.storeProperties` (:82-84) — raw; anything but `all` sends the property ports only */
    storeProperties: unknown;
    /** `_internal.onlyIfUnchanged` (:122-131) — the names, or `undefined` */
    onlyIfUnchanged: readonly string[] | undefined;
    /** the frame's scheduled callbacks, in order (`bindToRepeaterItem`, `scheduleOnce('StorageSave')`, `scheduleStore`) */
    jobs: readonly Job[];
    /** dbmodelcrudbase.ts :196-205 `hasScheduledStorageSave` */
    saveScheduled: boolean;
    /** :148 — the cloud presses the frame's batch holds */
    savePresses: number;
    /** :229-230 `hasScheduledStore` */
    storeScheduled: boolean;
    /** :227 — the local presses the frame's batch holds */
    storePresses: number;
    /** every save made, by the spec's call id: the presses it settles, the record it wrote, and what the write replaced (:184-188) */
    calls: Readonly<Record<string, { n: number; record: string; before: Readonly<Record<string, unknown>> }>>;
    nextCall: number;
  };

/** The backends a sequence plays with: at once (weighted), late, a refused precondition, refused with and without a message, silent, a project with two. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { updatedAt: 't1' } } }] },
  { answers: [{ answer: { ok: { title: 'from the backend' } } }], user: 'u1' },
  { backends: ['main', 'other'], answers: [{ answer: { ok: {} }, after: 1 }] },
  { answers: [{ answer: { error: 'conflict', detail: { reason: 'precondition-failed' } } }] },
  { answers: [{ answer: { error: 'Forbidden' }, after: 100 }], user: 'u1' },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'Record not found' } }, { match: { collection: 'Lesson' }, answer: { ok: { version: 9 } }, after: 1 }, { answer: { error: '' } }] }
];

/** :122-131 */
function parseNames(value: unknown): readonly string[] | undefined {
  const names =
    typeof value === 'string'
      ? value
          .split(',')
          .map((n) => n.trim())
          .filter((n) => n !== '')
      : [];
  return names.length > 0 ? names : undefined;
}

const isScalar = (v: unknown) => v === null || typeof v === 'string' || typeof v === 'boolean' || typeof v === 'number';

export const UpdateRecord = defineNode({
  type: 'SetDbModelProperties',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode.ts; dbmodelcrudbase.ts',
  needs: ['backend', 'registry'],
  worldPool: {
    backends: BACKENDS,
    registries: [{ models: { r1: { title: 'x', version: 3, tags: ['a'] } } }, { models: { r1: { title: 'x', version: 3, tags: ['a'] } } }, {}]
  },

  state: {
    ...RECORD_ID_STATE,
    ...RECORD_WRITE_STATE,
    storeType: undefined,
    storeProperties: undefined,
    onlyIfUnchanged: undefined,
    jobs: [],
    saveScheduled: false,
    savePresses: 0,
    storeScheduled: false,
    storePresses: 0,
    calls: {},
    nextCall: 1
  } as UpdateRecordState,
  // dbmodelcrudbase.ts :156-161 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    ...RECORD_ID_INPUTS,
    // :59-68
    store: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Writes the property inputs onto the record named by Id, and on to the backend unless Store to is Local only' },
    // :69-85
    storeProperties: {
      type: 'enum',
      enums: ['specified', 'all'],
      default: 'specified',
      coerce: 'none',
      displayName: 'Properties to  store',
      group: 'General',
      description: 'Whether to send only the properties wired on this node or every property the record holds; not offered when Store to is Local only'
    },
    // :86-102
    storeType: {
      type: 'enum',
      enums: ['cloud', 'local'],
      default: 'cloud',
      coerce: 'none',
      displayName: 'Store to',
      group: 'General',
      description: 'Whether the change is sent to the backend as well as applied to the in-memory record, or only held locally'
    },
    // :114-132
    onlyIfUnchanged: {
      type: 'string',
      coerce: 'none',
      displayName: 'Only If Unchanged',
      group: 'General',
      description:
        'Property names, comma-separated (e.g. version). The update is applied only if these still hold the values the record had when it was read; otherwise Failure fires and nothing is written. Fetch the record again before retrying. Needs a NodeGX backend. Leave empty to always write.',
      examples: ['version', 'version, title', 'nothere', 'tags', '', ' , ']
    },
    // dbmodelcrudbase.ts :815-845
    accessControl: ACCESS_CONTROL_INPUT
  },

  outputs: {
    id: RECORD_ID_OUTPUT,
    error: RECORD_ERROR_OUTPUT
  }
}).on(
  {
    // dbmodelcrudbase.ts :517-521
    idSource: (s, v) => ({ set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :532-538
    repeaterComponent: (s, v) => ({ set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :548-553
    modelId: (_s, v, _i, w) => ({ set: bindId(v, w), send: ['id'] }),
    storeProperties: (_s, v) => ({ set: { storeProperties: v }, send: [] }),
    storeType: (_s, v) => ({ set: { storeType: v }, send: [] }),
    onlyIfUnchanged: (_s, v) => ({ set: { onlyIfUnchanged: parseNames(v) }, send: [] }),
    accessControl: (_s, v) => ({ set: { accessControlRules: v }, send: [] }),
    // :64-67
    store: (s) => {
      if (s.storeType === undefined || s.storeType === 'cloud') {
        // :146-148 — the pre-flight at the press, then one batch per frame
        if (!s.collectionId) return { set: { error: NO_CLASS_MESSAGE }, send: ['error'], outcome: 'failure', error: RECORD_FAILURE_CODE };
        return { set: { savePresses: s.savePresses + 1, saveScheduled: true, jobs: s.saveScheduled ? s.jobs : [...s.jobs, 'save' as const] }, send: [], outcome: 'pending' };
      }
      // :227-230 — the invocation is minted before the guard
      return { set: { storePresses: s.storePresses + 1, storeScheduled: true, jobs: s.storeScheduled ? s.jobs : [...s.jobs, 'store' as const] }, send: [], outcome: 'pending' };
    }
  },
  {
    derived: {
      inputs: aclInputs,
      discover: (port) => discoverWritePort(port) ?? discoverRecordPort(port),
      candidates: [...RECORD_CANDIDATES, ...WRITE_CANDIDATES],
      on: (s, port, v) => (port === 'collectionName' || port === 'backendId' ? onRecordPort(port, v) : { set: onWritePort(s, port, v), send: [] })
    },
    // the frame's scheduled callbacks, in order
    afterInputs: (s, _i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      let bound = s.bound;
      let error = s.error;
      let call: { id: string; op: string; backend: string; args: Record<string, unknown> } | undefined;
      let calls = s.calls;
      let nextCall = s.nextCall;
      const send: Array<'id' | 'error'> = [];
      const outcomes: Array<{ port: 'store'; outcome: 'done' | 'failure'; error?: string }> = [];
      const fail = (n: number, message: string) => {
        error = message;
        send.push('error');
        outcomes.push(...failures(n, RECORD_FAILURE_CODE));
      };
      for (const job of s.jobs) {
        if (job === 'bind') {
          bound = undefined; // dbmodelcrudbase.ts :579-583 — outside any Repeater nothing resolves
          send.push('id');
          continue;
        }
        if (job === 'store') {
          // :233-250
          const n = s.storePresses;
          if (bound === undefined) {
            fail(n, 'Missing Record Id');
            continue;
          }
          const record = w.registry.model(bound);
          for (const key in s.inputValues) record.set(key, s.inputValues[key], { resolve: true });
          outcomes.push(...dones(n));
          continue;
        }
        // :150-221 — the frame's one save
        const n = s.savePresses;
        if (bound === undefined) {
          fail(n, 'Missing Record Id');
          continue;
        }
        const record = w.registry.model(bound);
        // :163-181 — the precondition, read BEFORE the write
        let ifMatch: Record<string, unknown> | undefined;
        let refused = false;
        if (s.onlyIfUnchanged) {
          ifMatch = {};
          for (const name of s.onlyIfUnchanged) {
            const held = record.get(name);
            if (!isScalar(held)) {
              fail(n, held === undefined ? UNREAD_MESSAGE(name) : NOT_SCALAR_MESSAGE(name));
              refused = true;
              break;
            }
            ifMatch[name] = held;
          }
        }
        if (refused) continue;
        // :184-188 — the write, kept whatever follows (row C34)
        const before: Record<string, unknown> = {};
        for (const key in s.inputValues) {
          if (ifMatch) before[key] = record.get(key);
          record.set(key, s.inputValues[key], { resolve: true });
        }
        const backend = w.backendFor(s.backendId); // :191-192, dbmodelcrudbase.ts :283-301
        if (backend === undefined) {
          fail(n, NO_BACKEND_MESSAGE(s.backendId));
          continue;
        }
        const id = 'save:' + nextCall++;
        // :194-199 — `data` is the live object on the runtime; the call is recorded canonical at the call
        call = {
          id,
          op: 'save',
          backend,
          args: { collection: s.collectionId, objectId: record.getId(), data: s.storeProperties === 'all' ? { ...record.data } : { ...s.inputValues }, acl: aclFor(s, w.backendUser()), ifMatch }
        };
        calls = { ...calls, [id]: { n, record: bound, before } };
      }
      const patch = {
        set: { bound, error, jobs: [], saveScheduled: false, savePresses: 0, storeScheduled: false, storePresses: 0, calls, nextCall },
        send: [...new Set(send)],
        outcomes
      };
      return call ? { ...patch, backend: call } : patch;
    },
    world: {
      backend: (s, _i, answer, w) => {
        const call = s.calls[answer.id];
        const n = call?.n ?? 0;
        const record = call ? w.registry.model(call.record) : undefined;
        if ('ok' in answer) {
          // :200-206 — every key handed back, written as handed
          const response = answer.ok as Record<string, unknown> | null;
          if (record && response) for (const key in response) record.set(key, response[key]);
          return { send: [], outcomes: dones(n) };
        }
        if (answer.detail && answer.detail.reason === 'precondition-failed') {
          // :208-216 — what the write replaced, put back
          if (record && call) for (const key in call.before) record.set(key, call.before[key]);
          return { set: { error: PRECONDITION_MESSAGE }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
        }
        return { set: { error: answer.error || 'Failed to save.' }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
      }
    }
  }
);
