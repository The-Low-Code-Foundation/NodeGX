/**
 * Add Record Relation (`AddDbModelRelation`) and Remove Record Relation (`RemoveDbModelRelation`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode-addrelation.ts` and `dbmodelnode-removerelation.ts`
 * on 2026-10-02 (NSP-014 s21), with the mixins in dbmodelcrudbase.ts (record-base.ts): `addBaseInfo`, `addModelId`
 * with inputs and outputs, `addRelationProperty` (:729-773). The two files are the same code but for their words
 * and the operation (a diff of the two, s21, names nothing else), so one factory writes both.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from in the ADD file; the remove
 * file is the same code 13-20 lines earlier (validateInputs :54 there, :51 here; the call :127 there, :146 here).
 *
 * THE RULE, before the citations: `Do` joins the frame's batch with NO check at the press (:113-120). At the frame's
 * end ONE operation answers the whole batch (:121-122, `scheduleOnce`), after a check in this order, the first
 * failing one the batch's Failure (:51-90, `validateInputs`; each is `=== undefined`, so `''` and `null` pass):
 * no Class (`No class specified` — not Delete Record's sentence), no Relation, no Target Record Id, no record bound,
 * and a Target Record whose class is unknown — the record of that name was never LOADED from a backend (`_class`,
 * :106-111; world.ts REGISTRY `classes`). Then the Backend (:143-144; the not-configured sentence). Then the node
 * hands its backend `addRelation` / `removeRelation({ collection, objectId, key: <Relation>, targetObjectId:
 * <Target Record Id>, targetCollection: <its class> })` (:146-157; world.ts BACKEND, R9). Success copies every key
 * of what the backend handed back onto the record the call was made for (:158-164 — a `for…in`; the REST adapter
 * hands `{ objectId }`, RestDataAdapter.ts :1575-1580), then Done for every press; a failure is Error = the
 * backend's message or `Failed to add relation.` / `Failed to remove relation.` (:166-168), then Failure.
 *
 * NOT GRADED HERE, named: the record write on success (the registry's; no single-node trace reads it — a graph with a
 * Record watching the record will); the editor warning `validateInputs` sends (:92-101; editor only).
 */

import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import type { RegistryScript } from '../registry';
import {
  bindId,
  discoverRecordPort,
  NO_BACKEND_MESSAGE,
  onRecordPort,
  RECORD_ERROR_OUTPUT,
  RECORD_FAILURE_CODE,
  RECORD_ID_INPUTS,
  RECORD_ID_OUTPUT,
  RECORD_ID_STATE,
  type RecordIdState
} from './record-base';
import type { InputDecl, ValueInputDecl } from '../spec';

type Job = 'bind' | 'relate';

type RelationState = RecordIdState & {
  /** :750 `_internal.targetModelId` — stored raw */
  targetModelId: unknown;
  /** :769-771 `_internal.relationProperty` — stored raw */
  relationProperty: unknown;
  jobs: readonly Job[];
  scheduled: boolean;
  presses: number;
  /** every call made, by the spec's call id: the presses its answer settles and the record it was made for (:142 `const model = internal.model`) */
  calls: Readonly<Record<string, { presses: number; record: string }>>;
  nextCall: number;
};

/** record-ports.ts :350-366 — the Relation dropdown, from the selected Class's relation fields; registered on first write (:757-766), stored raw. Edit-only. */
const relationPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', editOnly: true, displayName: 'Relation', group: 'General', examples: ['tags', 'tags', 'owner'] });

function discover(port: string): InputDecl | undefined {
  if (port === 'relationProperty') return relationPort();
  return discoverRecordPort(port);
}

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'failure' as const, error: RECORD_FAILURE_CODE }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'done' as const }));

/** The backends a sequence plays with — weighted to answers, as Delete Record's. A relation answer is a record (`{ objectId }`, the REST adapter's) or nothing. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { objectId: 'r1' } } }] },
  { answers: [{ answer: { ok: { objectId: 'r1', updatedAt: 'later' } } }] },
  { backends: ['main', 'other'], answers: [{ answer: { ok: null }, after: 1 }] },
  { answers: [{ answer: { ok: { objectId: 'r1' } }, after: 100 }] },
  { answers: [{ answer: { error: 'Relation not found' } }] },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] }
];

/** The records a sequence starts with: some LOADED (with a class), most not. */
const REGISTRIES: ReadonlyArray<RegistryScript> = [
  { classes: { t1: 'Tag', t2: 'Tag' } },
  { classes: { t1: 'Tag' }, models: { r1: { title: 'x' } } },
  {}
];

function relationNode(o: { type: string; source: string; op: 'addRelation' | 'removeRelation'; doDescription: string; noTarget: string; noRecord: string; failed: string }) {
  return defineNode({
    type: o.type,
    version: 1,
    source: o.source + '; dbmodelcrudbase.ts',
    needs: ['backend', 'registry'],
    worldPool: { backends: BACKENDS, registries: REGISTRIES },

    state: { ...RECORD_ID_STATE, targetModelId: undefined, relationProperty: undefined, jobs: [], scheduled: false, presses: 0, calls: {}, nextCall: 1 } as RelationState,
    // dbmodelcrudbase.ts :156-161 — no Unchanged on the family (:150-155)
    outcomes: ['done', 'failure'],

    inputs: {
      ...RECORD_ID_INPUTS,
      // :28-38
      store: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: o.doDescription },
      // dbmodelcrudbase.ts :743-752 — a wire only (`allowConnectionsOnly`), stored raw
      targetId: {
        type: 'string',
        coerce: 'none',
        displayName: 'Target Record Id',
        group: 'General',
        description: 'Id of the record at the other end of the relation, which must come from a Query Records or Record output so that its class is known',
        examples: ['t1', 't1', 't2', 'r2', '', null]
      }
    },

    outputs: {
      id: RECORD_ID_OUTPUT,
      error: RECORD_ERROR_OUTPUT
    }
  }).on(
    {
      idSource: (s, v) => ({ set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
      repeaterComponent: (s, v) => ({ set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
      modelId: (_s, v, _i, w) => ({ set: bindId(v, w), send: ['id'] }),
      targetId: (_s, v) => ({ set: { targetModelId: v }, send: [] }),
      // :113-123 — no check at the press
      store: (s) => ({ set: { presses: s.presses + 1, scheduled: true, jobs: s.scheduled ? s.jobs : [...s.jobs, 'relate' as const] }, send: [], outcome: 'pending' })
    },
    {
      derived: {
        inputs: () => ({}),
        discover,
        candidates: ['relationProperty', 'collectionName', 'backendId'],
        on: (_s, port, v) => (port === 'relationProperty' ? { set: { relationProperty: v }, send: [] } : onRecordPort(port, v))
      },
      afterInputs: (s, _i, w) => {
        if (s.jobs.length === 0) return { send: [] };
        let bound = s.bound;
        let error = s.error;
        let calls = s.calls;
        let nextCall = s.nextCall;
        let call: { id: string; op: string; backend: string; args: Record<string, unknown> } | undefined;
        const send: Array<'id' | 'error'> = [];
        const outcomes: Array<{ port: 'store'; outcome: 'done' | 'failure'; error?: string }> = [];
        // :106-111 — the target record's class: `Model.get(id)._class`, create-on-read
        const targetClass = () => (s.targetModelId === undefined ? undefined : ((w.registry.model(s.targetModelId) as unknown as { _class?: string })._class));
        for (const job of s.jobs) {
          if (job === 'bind') {
            bound = undefined; // dbmodelcrudbase.ts :579-583
            send.push('id');
            continue;
          }
          const n = s.presses;
          // :51-90 validateInputs — the first problem wins
          let problem: string | undefined;
          if (s.collectionId === undefined) problem = 'No class specified';
          else if (s.relationProperty === undefined) problem = 'No relation property specified';
          else if (s.targetModelId === undefined) problem = o.noTarget;
          else if (bound === undefined) problem = o.noRecord;
          else if (targetClass() === undefined)
            problem =
              `The target record "${String(s.targetModelId)}" has not been loaded, so its class is unknown. ` +
              'Connect the Id from a Query Records / Record node rather than from a raw string, or the relation ' +
              'cannot be written.';
          if (problem === undefined) {
            const backend = w.backendFor(s.backendId); // :143-144
            if (backend === undefined) problem = NO_BACKEND_MESSAGE(s.backendId);
            else {
              // :146-157
              const id = o.op + ':' + nextCall++;
              call = {
                id,
                op: o.op,
                backend,
                args: { collection: s.collectionId, objectId: bound, key: s.relationProperty, targetObjectId: s.targetModelId, targetCollection: targetClass() }
              };
              calls = { ...calls, [id]: { presses: n, record: bound as string } };
              continue;
            }
          }
          error = problem;
          send.push('error');
          outcomes.push(...failures(n));
        }
        const patch = { set: { bound, error, jobs: [], scheduled: false, presses: 0, calls, nextCall }, send: [...new Set(send)], outcomes };
        return call ? { ...patch, backend: call } : patch;
      },
      world: {
        // :158-168
        backend: (s, _i, answer, w) => {
          const c = s.calls[answer.id];
          const n = c ? c.presses : 0;
          if ('ok' in answer) {
            const response = answer.ok as Record<string, unknown> | null;
            if (c && response && typeof response === 'object') {
              const m = w.registry.model(c.record);
              for (const key in response) m.set(key, response[key]); // :160-162
            }
            return { send: [], outcomes: dones(n) };
          }
          return { set: { error: answer.error || o.failed }, send: ['error'], outcomes: failures(n) };
        }
      }
    }
  );
}

export const AddRecordRelation = relationNode({
  type: 'AddDbModelRelation',
  source: 'packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode-addrelation.ts',
  op: 'addRelation',
  doDescription: 'Adds the record named by Target Record Id to the chosen Relation on the record named by Id',
  noTarget: 'No target record Id (the record to add a relation to) specified',
  noRecord: 'No record Id specified (the record that should get the relation)',
  failed: 'Failed to add relation.'
});

export const RemoveRecordRelation = relationNode({
  type: 'RemoveDbModelRelation',
  source: 'packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode-removerelation.ts',
  op: 'removeRelation',
  doDescription: 'Removes the record named by Target Record Id from the chosen Relation on the record named by Id',
  noTarget: 'No target record Id (the record to remove a relation from) specified',
  noRecord: 'No record Id specified (the record that should lose the relation)',
  failed: 'Failed to remove relation.'
});
