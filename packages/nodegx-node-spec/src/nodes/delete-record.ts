/**
 * Delete Record (`DeleteDbModelProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/deletedbmodelpropertiesnode.ts` on 2026-10-02 (NSP-014 s21),
 * with the mixins in dbmodelcrudbase.ts (record-base.ts): `addBaseInfo`, `addModelId` with inputs and outputs.
 * Neither `addInputProperties` nor `addAccessControl` — the node has no `prop-` ports.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` (:22-29 → :32-78) is checked at the press — a falsy Class fails that
 * press at once, `No class name specified` (:40-41, dbmodelcrudbase.ts :244-254) — and otherwise joins the
 * frame's batch (:42). At the frame's end ONE operation answers the whole batch (:44-45, `scheduleOnce`): no
 * record bound is `Missing Record Id` (:47-50); a Backend the project does not have is the not-configured
 * sentence (:63-64); otherwise the node hands its backend `delete({ collection: <Class>, objectId: <the bound
 * record's id> })` (:66-68; world.ts BACKEND, R9). The backend's answer settles the batch: success is Done for
 * every press of it (:69-72), a failure sets Error to the backend's message, or `Failed to delete.` when it
 * gave none (:73-75), and is Failure for every press. A press while an earlier delete is still out makes a
 * second, separate call (measured s21, probe P8). Every failure carries `record/storage-op-failed`.
 *
 * NOT GRADED HERE, named:
 *   - the success's `model.notify('delete')` (:70) — the record's watchers hear it; no single-node trace
 *     reads it. A graph with a Record or Query Records watching the record will.
 *   - the scope: `nodeScope.ModelScope`, capital M (:52-63, PLAT-003 §27.3) — Delete Record resolves its store
 *     against NO scope where its siblings use the component's. A play has one scope, so it is invisible here.
 *   - a project with NO backend configured: `forBackend` falls back to the legacy store (`CloudStore.forScope`)
 *     with no endpoint — a browser sends `DELETE undefined/classes/<Class>/<id>` to the app's own host and reports
 *     what it answers; on Node the press is never answered (row C33, NSP-014 §6.2). Not a world the BACKEND seam
 *     plays (R9: every play has a backend).
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

type Job = 'bind' | 'delete';

type DeleteRecordState = RecordIdState & {
  /** the frame's scheduled callbacks, in order (`bindToRepeaterItem`, `scheduleOnce('StorageDelete')`) */
  jobs: readonly Job[];
  /** dbmodelcrudbase.ts :196-205 `hasScheduledStorageDelete` */
  scheduled: boolean;
  /** :42 `pendingOutcomesDelete.length` — the presses the frame's batch holds */
  presses: number;
  /** every delete made, by the spec's call id: how many presses its answer settles (ids are never reused, so an answered one need not be forgotten) */
  calls: Readonly<Record<string, number>>;
  /** the spec's next call id */
  nextCall: number;
};

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'failure' as const, error: RECORD_FAILURE_CODE }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'done' as const }));

/** The backends a sequence plays with: at once (weighted — a sequence reaches a call rarely), late, refused with and without a message, silent, and a project with two. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: null } }] },
  { answers: [{ answer: { ok: null } }] },
  { backends: ['main', 'other'], answers: [{ answer: { ok: null }, after: 1 }] },
  { answers: [{ answer: { ok: null }, after: 100 }] },
  { answers: [{ answer: { error: 'Forbidden' } }] },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'Record not found' } }, { match: { collection: 'Lesson' }, answer: { ok: null }, after: 1 }, { answer: { error: '' } }] }
];

export const DeleteRecord = defineNode({
  type: 'DeleteDbModelProperties',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/deletedbmodelpropertiesnode.ts; dbmodelcrudbase.ts',
  needs: ['backend', 'registry'],
  worldPool: { backends: BACKENDS },

  state: { ...RECORD_ID_STATE, jobs: [], scheduled: false, presses: 0, calls: {}, nextCall: 1 } as DeleteRecordState,
  // dbmodelcrudbase.ts :156-161 outcomeOutputs({ done, failure }) — no Unchanged on the family (:150-155)
  outcomes: ['done', 'failure'],

  inputs: {
    ...RECORD_ID_INPUTS,
    // :22-29
    store: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Deletes the record named by Id from its Class in the backend' }
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
    // :40-44 — the pre-flight at the press, then one batch per frame
    store: (s) => {
      if (!s.collectionId) return { set: { error: NO_CLASS_MESSAGE }, send: ['error'], outcome: 'failure', error: RECORD_FAILURE_CODE };
      return { set: { presses: s.presses + 1, scheduled: true, jobs: s.scheduled ? s.jobs : [...s.jobs, 'delete' as const] }, send: [], outcome: 'pending' };
    }
  },
  {
    derived: {
      inputs: () => ({}),
      discover: discoverRecordPort,
      candidates: RECORD_CANDIDATES,
      on: (_s, port, v) => onRecordPort(port, v)
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
      for (const job of s.jobs) {
        if (job === 'bind') {
          bound = undefined; // :579-583 — outside any Repeater nothing resolves
          send.push('id'); // :632
          continue;
        }
        // :45 — the batch, taken
        const n = s.presses;
        if (bound === undefined) {
          error = 'Missing Record Id'; // :47-50
          send.push('error');
          outcomes.push(...failures(n));
          continue;
        }
        const backend = w.backendFor(s.backendId); // :63, dbmodelcrudbase.ts :283-301
        if (backend === undefined) {
          error = NO_BACKEND_MESSAGE(s.backendId);
          send.push('error');
          outcomes.push(...failures(n));
          continue;
        }
        // :66-68
        const id = 'delete:' + nextCall++;
        call = { id, op: 'delete', backend, args: { collection: s.collectionId, objectId: bound } };
        calls = { ...calls, [id]: n };
      }
      const patch = { set: { bound, error, jobs: [], scheduled: false, presses: 0, calls, nextCall }, send: [...new Set(send)], outcomes };
      return call ? { ...patch, backend: call } : patch;
    },
    world: {
      // :69-75 — the answer settles its batch
      backend: (s, _i, answer) => {
        const n = s.calls[answer.id] ?? 0;
        if ('ok' in answer) return { send: [], outcomes: dones(n) };
        return { set: { error: answer.error || 'Failed to delete.' }, send: ['error'], outcomes: failures(n) };
      }
    }
  }
);
