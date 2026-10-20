---
title: "Delete Record"
---
Delete Record: permanently removes one record from the cloud database by id when its store signal fires.

Delete Record removes the record identified by `modelId` (or, per `idSource`, the enclosing repeater item) from its class when `store` fires. `done` confirms and `completed` follows it; `failure`/`error` carry access-control or missing-record problems, with `completed` after those too. Query Records nodes observing the class see the record leave their results automatically.

## When to use it

Destructive removal of cloud records. If the product needs undo or soft delete, model an 'archived' flag with Update Record instead — deletion is final.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `DeleteDbModelProperties` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `idSource` | Enum (`explicit`, `foreach`) | `explicit` | Whether the record comes from the Id input or from the record the surrounding Repeater is on |
| `modelId` | String (ModelName id) | — | Id of the record this node acts on; a record itself is accepted here as well as its Id |
| `repeaterComponent` | Component | — | Names which Repeater supplies the current record when Id Source is From repeater; leave blank to use the nearest enclosing one |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Deletes the record named by Id from its Class in the backend |

### What each input does

**Id Source** (`idSource`)

- always: From repeater binds the surrounding Repeater's item at the end of the frame (outside one, nothing); Explicit leaves it to Id

**Repeater Component** (`repeaterComponent`)

- always: which Repeater supplies the record (blank, the nearest); while From repeater, it is bound again at the end of the frame

**Id** (`modelId`)

- always: the record with that id is bound now (a record handed in, by its id; an empty id binds nothing), and Id is sent again

**Do** (`store`)

- no Class: refused at once, and Error says so → Failure
- otherwise it joins the frame's batch: at the end of the frame one delete answers every press — Done for each, or Error and Failure for each (no record bound, no backend, or the backend refuses)

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the record this node last acted on, which on Create Record is the Id the backend assigned |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the backend has deleted the record and everything bound to it has been told that it is gone |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the most recent attempt failed, kept after a later attempt succeeds |
| `failure` | Signal | — | Fires when the backend refused the operation or the node had nothing valid to send, with the reason on Error |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups). Some ports are discovered at runtime from user code, parameters or connected components, and are pushed to the editor per instance; the static port list below is incomplete for such instances.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| idSource = explicit OR idSource NOT SET | `modelId` | — |
| idSource = foreach | `repeaterComponent` | — |

## Ports at runtime

Class choice and id sourcing are schema/editor-driven (declared-port-groups + runtime-discovered); the port set follows the configured class, and `idSource` can bind the id to the enclosing repeater item instead of the input.

## Watch out for

- Wiring a click straight to `store` with no confirmation step for user-facing deletes.

## Examples

**Add and remove a relation between records; delete a record**

Relations link records without embedding them: Add Record Relation points `modelId` (the owner) at `targetId` (the related record) on a named relation field, Remove Record Relation severs the same pair, and Delete Record removes a record entirely. All three act on ids delivered by wires — here from the enclosing component's inputs — and fire `done` on success or `failure` with `error`, with `completed` after either.

**Records on a REST backend: query, create, update, delete**

One Record family serves every backend. Query Records fetches on demand into `items` (re-trigger `storageFetch` to refresh — a query with realtime off does not re-query itself), Create/Update/Delete Record each act on a `store` signal and answer `done` (or `failure`) followed by `completed`, and Update and Delete take the record's `modelId`. After any write the query's `storageFetch` is re-triggered to refresh the list. No node here names a backend, so all five resolve the project's selected one; set the `Backend` input to point a single node somewhere else. Rename and Delete live on the row, not on the page, because the row is the only thing that knows which record it is: it publishes them as `signal` ports on its `Component Outputs`, and the Repeater re-publishes each one as `itemOutputSignal-rename` / `itemOutputSignal-delete` alongside `itemActionItemId`, the id of the row that fired, and the edited title as `itemOutput-title`. The value and the trigger leave the SAME node, so they always describe the same row. Wiring the signal is what makes both arrive — the Repeater only tracks an item output that something is connected to.

## Related nodes

[Update Record](./set-db-model-properties.md), [Create Record](./new-db-model-properties.md), [Query Records](../cloud-services/db-collection2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)
- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "jobs": [],
  "scheduled": false,
  "presses": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/delete-record.ts"
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
 *   - row C36 (NSP-014 §6.5, fixed in P109 ISL-029): the success tells the record the call was made FOR, taken at the
 *     call, as Update Record does: a binding cleared or moved while the delete is out changes nothing — Done. The
 *     runtime once read the binding live: a cleared one threw there (the REST adapter handed the TypeError to `error`,
 *     Failure for a delete that happened), and a moved one told the WRONG record it was deleted.
 *   - a project with NO backend configured: the Parse wire refuses the request at the moment it would be made — Failure
 *     "This project has no backend configured. Add one in the Backend panel.", nothing sent (row C33, fixed in P109
 *     ISL-029; it used to send `DELETE undefined/classes/…` to the app's own host). Not a world the BACKEND seam plays
 *     (R9: every play has a backend): graded by noodl-runtime `test/nodes/isl-029-no-backend-configured.test.ts`.
 */

import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import {
  bindId,
  discoverRecordPort,
  recordCrudInputs,
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
    idSource: (s, v) => ({ says: 'always: From repeater binds the surrounding Repeater\'s item at the end of the frame (outside one, nothing); Explicit leaves it to Id', set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :532-538
    repeaterComponent: (s, v) => ({ says: 'always: which Repeater supplies the record (blank, the nearest); while From repeater, it is bound again at the end of the frame', set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :548-553
    modelId: (_s, v, _i, w) => ({ says: 'always: the record with that id is bound now (a record handed in, by its id; an empty id binds nothing), and Id is sent again', set: bindId(v, w), send: ['id'] }),
    // :40-44 — the pre-flight at the press, then one batch per frame
    store: (s) => {
      if (!s.collectionId) return { says: 'no Class: refused at once, and Error says so', set: { error: NO_CLASS_MESSAGE }, send: ['error'], outcome: 'failure', error: RECORD_FAILURE_CODE };
      return {
        says: 'otherwise it joins the frame\'s batch: at the end of the frame one delete answers every press — Done for each, or Error and Failure for each (no record bound, no backend, or the backend refuses)',
        set: { presses: s.presses + 1, scheduled: true, jobs: s.scheduled ? s.jobs : [...s.jobs, 'delete' as const] },
        send: [],
        outcome: 'pending'
      };
    }
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (dbmodelcrudbase.ts `_updatePorts` :373-385): the Backend picker and the Class
      inputs: (_params, context) => recordCrudInputs(context),
      needs: ['schema', 'backends'],
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
