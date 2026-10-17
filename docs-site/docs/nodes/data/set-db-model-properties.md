---
title: "Update Record"
---
Update Record: writes property values to an existing cloud database record when Do is triggered.

SetDbModelProperties (Update Record) updates the record identified by `modelId` in the class chosen with the `collectionName` (Class) parameter. Each class property becomes a value input; triggering `store` (Do) applies the connected inputs to the local record and saves them to the server, firing `done` (Done) on confirmation or `failure` with `error` on problems, and `completed` after either. `storeType` (Store to) can switch the node to 'Local only', which updates the in-memory record without any server call — useful for optimistic UI or scratch state. By default only the properties you actually supply are sent (`storeProperties` = 'Only specified'); 'All' sends the record's entire current data. Because the shared local record is updated, every bound Record node and live query in the app sees the change immediately.

## When to use it

The save half of every edit form, and the way to flip a single field ('mark done') from a list row. To create a record use NewDbModelProperties; to remove one use DeleteDbModelProperties; for BYOB backends use noodl.byob.UpdateRecord.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `SetDbModelProperties` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 4 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `accessControl` | Proplist | — | Read and write rules stored on the record as it is written, each rule adding its own Target, Read and Write ports; the NodeGX backend enforces them on every query and every realtime event, and backends with no per-record access control ignore them |
| `idSource` | Enum (`explicit`, `foreach`) | `explicit` | Whether the record comes from the Id input or from the record the surrounding Repeater is on |
| `modelId` | String (ModelName id) | — | Id of the record this node acts on; a record itself is accepted here as well as its Id |
| `onlyIfUnchanged` | String | — | Property names, comma-separated (e.g. version). The update is applied only if these still hold the values the record had when it was read; otherwise Failure fires and nothing is written. Fetch the record again before retrying. Needs a NodeGX backend. Leave empty to always write. |
| `repeaterComponent` | Component | — | Names which Repeater supplies the current record when Id Source is From repeater; leave blank to use the nearest enclosing one |
| `storeProperties` | Enum (`specified`, `all`) | `specified` | Whether to send only the properties wired on this node or every property the record holds; not offered when Store to is Local only |
| `storeType` | Enum (`cloud`, `local`) | `cloud` | Whether the change is sent to the backend as well as applied to the in-memory record, or only held locally |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Writes the property inputs onto the record named by Id, and on to the backend unless Store to is Local only |

### What each input does

**Id Source** (`idSource`)

- always: From repeater binds the surrounding Repeater's item at the end of the frame (outside one, nothing); Explicit leaves it to Id

**Repeater Component** (`repeaterComponent`)

- always: which Repeater supplies the record (blank, the nearest); while From repeater, it is bound again at the end of the frame

**Id** (`modelId`)

- always: the record with that id is bound now (a record handed in, by its id; an empty id binds nothing), and Id is sent again

**Properties to  store** (`storeProperties`)

- always: read by the next save — the property inputs only, or All: the whole record

**Store to** (`storeType`)

- always: read at the next Do — Cloud (or unset) saves to the backend, anything else writes the record here only

**Only If Unchanged** (`onlyIfUnchanged`)

- always: read by the next save — the fields the backend must still hold as this record holds them, or the save is refused

**Access Control Rules** (`accessControl`)

- always: read by the next call — the access rules sent with the record

**Do** (`store`)

- to the backend, with no Class: refused at once, and Error says so → Failure
- to the backend: it joins the frame's batch — at the end of the frame one save answers every press, Done for each; or Error and Failure for each (no record bound, an Only If Unchanged field it cannot check, no backend, or the backend refuses), and what the write replaced is put back
- here only (Store to not Cloud): at the end of the frame the property inputs are written onto the record — Done for each press; Error and Failure for each with no record bound

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the record this node last acted on, which on Create Record is the Id the backend assigned |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the record has been updated, waiting for the backend to answer unless Store to is Local only |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the most recent attempt failed, kept after a later attempt succeeds |
| `failure` | Signal | — | Fires when the backend refused the operation or the node had nothing valid to send, with the reason on Error |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Property input ports follow the selected cloud database class schema.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| storeType = cloud OR storeType NOT SET | `storeProperties` | — |
| idSource = explicit OR idSource NOT SET | `modelId` | — |
| idSource = foreach | `repeaterComponent` | — |

## Ports at runtime

Ports are runtime-determined: `collectionName` (Class) is registered as an edit-only enum of the project's classes plus _User/_Role, and each schema property of the chosen class becomes a value input `prop-<name>` typed from the schema. Access Control rules spawn `acl-<ruleId>-*` inputs like on Create Record. An authoring tool should set `collectionName` in parameters and drive the `prop-<name>` inputs it intends to change.

## Patterns

- DbModel2 `prop-<name>` → Text Input `startValue`, edited `text` → `prop-<name>`, Button `onClick` → `store`: prefill, edit, save.
- 'From repeater' `idSource` inside a list row: one node updates whichever record the row represents.
- Two people editing one record: bump a `version` property on every save and set `onlyIfUnchanged` to `version`. The second save to land gets `failure` instead of silently replacing the first; on `failure`, fetch the record again (DbModel2) and let the person re-apply their change.

## Watch out for

- Setting `storeProperties` to 'All' to 'be safe' — it uploads the record's entire local data and can overwrite fields other users changed; send only what the form edits.
- Retrying a `failure` from `onlyIfUnchanged` by pressing Do again without fetching the record first: the precondition is taken from the record as it was read, so the retry fails the same way until the record is re-read.

## Examples

**Load, edit and save a single record**

The record-detail flow: a Record node (DbModel2) binds to one database object by `modelId` and exposes its properties as schema-generated outputs. The edit field is initialised from the record, and Save (SetDbModelProperties) writes the changed property back on click, targeting the same id. `done` confirms the round trip, and `completed` fires after it whatever the outcome. Property ports on both nodes come from the database schema — they are runtime-determined, wired here exactly as the editor would write them.

**Records on a REST backend: query, create, update, delete**

One Record family serves every backend. Query Records fetches on demand into `items` (re-trigger `storageFetch` to refresh — a query with realtime off does not re-query itself), Create/Update/Delete Record each act on a `store` signal and answer `done` (or `failure`) followed by `completed`, and Update and Delete take the record's `modelId`. After any write the query's `storageFetch` is re-triggered to refresh the list. No node here names a backend, so all five resolve the project's selected one; set the `Backend` input to point a single node somewhere else. Rename and Delete live on the row, not on the page, because the row is the only thing that knows which record it is: it publishes them as `signal` ports on its `Component Outputs`, and the Repeater re-publishes each one as `itemOutputSignal-rename` / `itemOutputSignal-delete` alongside `itemActionItemId`, the id of the row that fired, and the edited title as `itemOutput-title`. The value and the trigger leave the SAME node, so they always describe the same row. Wiring the signal is what makes both arrive — the Repeater only tracks an item output that something is connected to.

## Related nodes

[Record](../cloud-services/db-model2.md), [Create Record](./new-db-model-properties.md), [Delete Record](./delete-db-model-properties.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 4. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)
- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "inputValues": {},
  "accessControl": {},
  "jobs": [],
  "saveScheduled": false,
  "savePresses": 0,
  "storeScheduled": false,
  "storePresses": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/update-record.ts"
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
 *   (:163-181); then a Backend the project does not have is the not-configured sentence and nothing is written
 *   (v2, row C34); then every property port is written onto the record, what it replaced kept; otherwise the node hands its backend `save({ collection: <Class>, objectId: <the record's id>, data:
 *   <the property ports, or the whole record under Properties to store = All>, acl: <the rules' ACL>, ifMatch })`
 *   (:194-199; world.ts BACKEND, R9). Success writes every key the backend hands back onto the record and is Done for
 *   each press (:200-206). ANY failure puts back what the write replaced (v2, row C34 ruled "Put the old values back": v1
 *   put it back only for a refused precondition, and kept a write no backend held); one whose detail says
 *   `precondition-failed` says so (:208-216); any other is the backend's message or `Failed to save.` (:218). A press while an earlier save is
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
 *   - the success's `save` event on the store; a project with NO backend configured at all (row C33, fixed in P109
 *     ISL-029: the wire refuses with its sentence and sends nothing; graded by the runtime's isl-029-no-backend-configured test).
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
import { ACCESS_CONTROL_INPUT, aclFor, aclInputs, aclRefusal, discoverWritePort, recordFieldInputs, dones, failures, onWritePort, RECORD_WRITE_STATE, WRITE_CANDIDATES, type RecordWriteState } from './record-write';

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

/** The backends a sequence plays with: at once (weighted), late, a refused precondition, refused with and without a message, silent, a project with two, a user signed in on the active one, on the other one only (v4), and on the legacy store only (v4: nobody to the rules). */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { updatedAt: 't1' } } }] },
  { answers: [{ answer: { ok: { title: 'from the backend' } } }], sessions: { main: { objectId: 'u1' } } },
  { backends: ['main', 'other'], answers: [{ answer: { ok: {} }, after: 1 }], sessions: { other: { objectId: 'u3' } } },
  { answers: [{ answer: { error: 'conflict', detail: { reason: 'precondition-failed' } } }] },
  { answers: [{ answer: { error: 'Forbidden' }, after: 100 }], sessions: { main: { objectId: 'u1' } } },
  { answers: [{ answer: { ok: { updatedAt: 't1' } } }], user: 'u9' },
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
  // v2 (P109 ISL-029, row C34 ruled "Put the old values back"): any failed save puts back what its write replaced, and a
  // Backend the project does not have writes nothing; v1 kept the write on every failure but a refused precondition.
  // v3 (P109 ISL-029, row C35 ruled "Refuse the save and say why"): a rule set to Role that names no role fails the save
  // with ACL_ROLE_MISSING, nothing written or sent; v2 sent the key `role:undefined`.
  // v4 (P109 ISL-029, row D24 ruled "Ask the record's own backend"): the access rules' signed-in user is the one signed in on
  // the backend the save goes to (its session); v3 read the legacy store's, so a Log In there was nobody to the rules.
  version: 4,
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
      when: (p) => p.storeType === 'cloud' || p.storeType === undefined,
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
    idSource: (s, v) => ({ says: 'always: From repeater binds the surrounding Repeater\'s item at the end of the frame (outside one, nothing); Explicit leaves it to Id', set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :532-538
    repeaterComponent: (s, v) => ({ says: 'always: which Repeater supplies the record (blank, the nearest); while From repeater, it is bound again at the end of the frame', set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :548-553
    modelId: (_s, v, _i, w) => ({ says: 'always: the record with that id is bound now (a record handed in, by its id; an empty id binds nothing), and Id is sent again', set: bindId(v, w), send: ['id'] }),
    storeProperties: (_s, v) => ({ says: 'always: read by the next save — the property inputs only, or All: the whole record', set: { storeProperties: v }, send: [] }),
    storeType: (_s, v) => ({ says: 'always: read at the next Do — Cloud (or unset) saves to the backend, anything else writes the record here only', set: { storeType: v }, send: [] }),
    onlyIfUnchanged: (_s, v) => ({ says: 'always: read by the next save — the fields the backend must still hold as this record holds them, or the save is refused', set: { onlyIfUnchanged: parseNames(v) }, send: [] }),
    accessControl: (_s, v) => ({ says: 'always: read by the next call — the access rules sent with the record', set: { accessControlRules: v }, send: [] }),
    // :64-67
    store: (s) => {
      if (s.storeType === undefined || s.storeType === 'cloud') {
        // :146-148 — the pre-flight at the press, then one batch per frame
        if (!s.collectionId) return { says: 'to the backend, with no Class: refused at once, and Error says so', set: { error: NO_CLASS_MESSAGE }, send: ['error'], outcome: 'failure', error: RECORD_FAILURE_CODE };
        return {
          says: 'to the backend: it joins the frame\'s batch — at the end of the frame one save answers every press, Done for each; or Error and Failure for each (no record bound, an Only If Unchanged field it cannot check, no backend, or the backend refuses), and what the write replaced is put back',
          set: { savePresses: s.savePresses + 1, saveScheduled: true, jobs: s.saveScheduled ? s.jobs : [...s.jobs, 'save' as const] },
          send: [],
          outcome: 'pending'
        };
      }
      // :227-230 — the invocation is minted before the guard
      return {
        says: 'here only (Store to not Cloud): at the end of the frame the property inputs are written onto the record — Done for each press; Error and Failure for each with no record bound',
        set: { storePresses: s.storePresses + 1, storeScheduled: true, jobs: s.storeScheduled ? s.jobs : [...s.jobs, 'store' as const] },
        send: [],
        outcome: 'pending'
      };
    }
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (dbmodelcrudbase.ts `_updatePorts` :373-401): the Backend picker and the Class
      // from the project, the property ports from the Class's columns and the wires, then each access rule's ports
      inputs: (params, context) => ({ ...recordCrudInputs(context), ...recordFieldInputs(params, context), ...aclInputs(params) }),
      needs: ['schema', 'backends', 'wired', 'wiredOutputs'],
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
        const aclRefused = aclRefusal(s); // v3 (C35) — rules that cannot be sent refuse the save, nothing written
        if (aclRefused !== undefined) {
          fail(n, aclRefused);
          continue;
        }
        const backend = w.backendFor(s.backendId); // dbmodelcrudbase.ts :283-301 — v2 (C34): before the write, which it spares
        if (backend === undefined) {
          fail(n, NO_BACKEND_MESSAGE(s.backendId));
          continue;
        }
        // the write, what it replaces kept for any failure (v2, C34)
        const before: Record<string, unknown> = {};
        for (const key in s.inputValues) {
          before[key] = record.get(key);
          record.set(key, s.inputValues[key], { resolve: true });
        }
        const id = 'save:' + nextCall++;
        // :194-199 — `data` is the live object on the runtime; the call is recorded canonical at the call
        call = {
          id,
          op: 'save',
          backend,
          args: { collection: s.collectionId, objectId: record.getId(), data: s.storeProperties === 'all' ? { ...record.data } : { ...s.inputValues }, acl: aclFor(s, w.backendUser(backend)), ifMatch }
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
        // what the write replaced, put back on ANY failure (v2, C34; v1 only for a refused precondition)
        if (record && call) for (const key in call.before) record.set(key, call.before[key]);
        if (answer.detail && answer.detail.reason === 'precondition-failed') {
          return { set: { error: PRECONDITION_MESSAGE }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
        }
        return { set: { error: answer.error || 'Failed to save.' }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
