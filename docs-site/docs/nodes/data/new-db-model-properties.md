---
title: "Create Record"
---
Create Record: inserts a record into a cloud database class from its property inputs when Do is triggered.

NewDbModelProperties (Create Record) creates one record in the cloud database class chosen with the `collectionName` (Class) parameter. Each property of the class becomes a value input; when the `store` (Do) signal is triggered, the current input values are sent to the server as a new record. On success the node binds to the new record, outputs its `id`, and fires `done` (Done) followed by `completed`; on failure it fires `failure` with a message on `error`, and `completed` after that too. Optionally, `sourceObjectId` seeds the new record with the data of an existing local object (explicit property inputs win), and Access Control Rules restrict who can read/write the record (defaulting to the creating user when a rule is left unconfigured).

## When to use it

The write half of every 'add item' flow — forms, quick-add buttons, duplicating a record via `sourceObjectId`. Live Query Records nodes pick the new record up automatically, so no manual re-fetch is needed. To modify an existing record use SetDbModelProperties instead; for a non-cloud (BYOB) backend use noodl.byob.CreateRecord.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `NewDbModelProperties` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 4 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `accessControl` | Proplist | — | Read and write rules stored on the record as it is written, each rule adding its own Target, Read and Write ports; the NodeGX backend enforces them on every query and every realtime event, and backends with no per-record access control ignore them |
| `sourceObjectId` | String | — | Id of an existing record whose properties seed the new one before the property inputs are applied over them; leave blank to start empty |
| `upsertOn` | String | — | Name of a unique-indexed property. When a record already holds this value the write updates that record instead of creating a second one. Leave empty to always create. |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Creates a record in the chosen Class from the property inputs and sends it to the backend |

### What each input does

**Source Object Id** (`sourceObjectId`)

- always: read by the next create — the record whose data the new one starts from, the property inputs written over it (a record handed in, by its id)

**Upsert On** (`upsertOn`)

- always: read by the next create — the field that makes it update a record already holding that value (blank, none)

**Access Control Rules** (`accessControl`)

- always: read by the next call — the access rules sent with the record

**Do** (`store`)

- no Class: refused at once, and Error says so → Failure
- otherwise it joins the frame's batch: at the end of the frame one create answers every press — Id is the new record's, and Done for each; or Error and Failure for each (no backend, or the backend refuses)

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the record this node last acted on, which on Create Record is the Id the backend assigned |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the backend has stored the new record and Id carries the Id it was given |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the most recent attempt failed, kept after a later attempt succeeds |
| `failure` | Signal | — | Fires when the backend refused the operation or the node had nothing valid to send, with the reason on Error |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Property input ports follow the selected cloud database class schema.

## Ports at runtime

Ports are runtime-determined: `collectionName` (Class) is registered as an edit-only enum of the project's classes plus _User/_Role, and each schema property of the chosen class becomes a value input `prop-<name>` typed from the schema. Each entry in the `accessControl` list additionally spawns `acl-<ruleId>-target` (user/everyone/role), then `acl-<ruleId>-userid` or `acl-<ruleId>-role`, plus `acl-<ruleId>-read` and `acl-<ruleId>-write` booleans. An authoring tool should set `collectionName` in parameters and drive `prop-<name>` inputs it knows from the class schema.

## Patterns

- Text Input `text` → `prop-<name>`, Button `onClick` → `store`: the minimal create form.
- `done` → a navigation or Event Sender, with `id` as payload: jump straight to the new record's detail page.

## Watch out for

- Re-fetching a Query Records node after `done` — live queries already receive the new record; only re-fetch when the query is not live.

## Examples

**Create a record with an uploaded file attachment**

The create-with-attachment flow: Open File Picker hands the picked browser file to Upload File, which stores it in cloud storage and outputs a `cloudFile`. Cloud File exposes that file's `url`, previewed in an Image (the cloudfile→image cast). When the upload succeeds, Create Record (NewDbModelProperties) writes a new 'Attachment' record whose properties — including the file — are set on the node's schema-generated inputs.

**Records on a REST backend: query, create, update, delete**

One Record family serves every backend. Query Records fetches on demand into `items` (re-trigger `storageFetch` to refresh — a query with realtime off does not re-query itself), Create/Update/Delete Record each act on a `store` signal and answer `done` (or `failure`) followed by `completed`, and Update and Delete take the record's `modelId`. After any write the query's `storageFetch` is re-triggered to refresh the list. No node here names a backend, so all five resolve the project's selected one; set the `Backend` input to point a single node somewhere else. Rename and Delete live on the row, not on the page, because the row is the only thing that knows which record it is: it publishes them as `signal` ports on its `Component Outputs`, and the Repeater re-publishes each one as `itemOutputSignal-rename` / `itemOutputSignal-delete` alongside `itemActionItemId`, the id of the row that fired, and the edited title as `itemOutput-title`. The value and the trigger leave the SAME node, so they always describe the same row. Wiring the signal is what makes both arrive — the Repeater only tracks an item output that something is connected to.

**Record audio in the browser and save it**

The full arc of a MediaRecorder capture, which is longer than it looks because three different things have to be true before a single byte is recorded. A `JavaScriptFunction` asks for microphone permission and a `Switch` gates everything on the answer; a `Javascript2` node owns the recorder itself and accumulates chunks; a second one runs the seconds counter; a third converts the finished `Blob` into the shape `NewDbModelProperties` can store. ⚠️ Permission is asynchronous and revocable, which is why the gate is a node and not an assumption — a recorder started before the user has answered produces silence rather than an error. The preview player is a Custom HTML node because an `<audio>` element with a blob URL is the shortest honest way to play back something that has no file yet.

**Record video from the camera and store the result**

The same shape as the audio recorder and worth reading beside it, because what the two have in common is the part that generalises: ask for the device, gate every control on the answer, let one `Javascript2` node own the `MediaRecorder`, and convert the finished `Blob` before anything tries to store it. Video adds the preview problem — you need a live `<video>` element while recording and a playable one afterwards — which is why a Custom HTML node holds the player rather than an `Image`. ⚠️ `getUserMedia` requires a secure origin: this works on `localhost` and over HTTPS and fails on a plain-HTTP deploy, which is a deployment fault that presents as a permission one.

## Related nodes

[Update Record](./set-db-model-properties.md), [Delete Record](./delete-db-model-properties.md), [Record](../cloud-services/db-model2.md), [Query Records](../cloud-services/db-collection2.md)

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

```ts title="packages/nodegx-node-spec/src/nodes/create-record.ts"
/**
 * Create Record (`NewDbModelProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/newdbmodelpropertiesnode.ts` on 2026-10-02 (NSP-014 s22), with
 * the mixins in dbmodelcrudbase.ts: `addBaseInfo` and `addModelId` with OUTPUTS ONLY (record-base.ts — no `Id` or
 * `Id Source` input: :173-175), `addInputProperties` and `addAccessControl` (record-write.ts).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` (:65-72 → :117-165) is checked at the press — a falsy Class fails that press
 * at once, `No class name specified` (:123-124, dbmodelcrudbase.ts :244-254) — and otherwise joins the frame's batch
 * (:125). At the frame's end ONE operation answers the whole batch (:127-130): the data is the Source Object Id's
 * record's data (create-on-read; none when it is blank) with the property ports written over it (:132-136); a Backend
 * the project does not have is the not-configured sentence (:140-141); otherwise the node hands its backend
 * `create({ collection: <Class>, data, acl: <the rules' ACL>, upsertOn: <Upsert On> })` (:143-149; world.ts BACKEND,
 * R9). Success: the record the backend handed back becomes a record in the registry under its `objectId` — its class
 * the Class as it is when the answer lands (:154 reads it then), every other key but `ACL` written onto it (cloudstore.js `_fromJSON` :407-422) — `Id` is its id, and every
 * press is Done (:150-159). Failure: Error is the backend's message, or `Failed to insert.` (:160-162), and every press
 * is Failure. A press while an earlier create is still out makes a second call. Every failure carries
 * `record/storage-op-failed`.
 *
 * NOT GRADED HERE, named:
 *   - the success's schema conversions (`_deserializeJSON` with the Class's schema: Date, Pointer, File, GeoPoint, a
 *     list of objects becoming an array of records) — the world's answers carry plain values, which it writes as handed;
 *   - the adapter's own refusals (an Upsert On a backend that cannot upsert, a create answered with no record): under R9
 *     they are a backend's answers — a world scripts them as `{ error }`;
 *   - the success's `create` event on the store (the contract's event surface) — a graph will see it;
 *   - Source Object Id resolving against `nodeScope.modelScope || Model` (:134) — one scope per play;
 *   - a project with NO backend configured at all (row C33, fixed in P109 ISL-029: the wire refuses with its sentence and
 *     sends nothing; graded by the runtime's isl-029-no-backend-configured test).
 */

import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import { discoverRecordPort, NO_BACKEND_MESSAGE, recordCrudInputs, NO_CLASS_MESSAGE, onRecordPort, RECORD_CANDIDATES, RECORD_ERROR_OUTPUT, RECORD_FAILURE_CODE, RECORD_ID_OUTPUT, RECORD_ID_STATE, type RecordIdState } from './record-base';
import { ACCESS_CONTROL_INPUT, aclFor, aclInputs, aclRefusal, discoverWritePort, recordFieldInputs, dones, failures, onWritePort, RECORD_WRITE_STATE, WRITE_CANDIDATES, type RecordWriteState } from './record-write';
import { sameList } from '../world';

type CreateRecordState = RecordIdState &
  RecordWriteState & {
    /** `_internal.sourceObjectId` (:79-82) — raw, a record handed in becoming its id */
    sourceObjectId: unknown;
    /** `_internal.upsertOn` (:106-108) — trimmed, `undefined` unless a non-blank string */
    upsertOn: string | undefined;
    /** dbmodelcrudbase.ts :196-205 `hasScheduledStorageInsert` */
    scheduled: boolean;
    /** :125 — the presses the frame's batch holds */
    presses: number;
    /** every create made, by the spec's call id: how many presses its answer settles */
    calls: Readonly<Record<string, number>>;
    nextCall: number;
  };

/** The backends a sequence plays with: at once (weighted), late, refused with and without a message, silent, a project with two, a user signed in on the active one, on the other one only (v4), and on the legacy store only (v4: nobody to the rules). */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { objectId: 'n1', title: 'from the backend' } } }] },
  { answers: [{ answer: { ok: { objectId: 'n1' } } }], sessions: { main: { objectId: 'u1' } } },
  { backends: ['main', 'other'], answers: [{ answer: { ok: { objectId: 'n2', version: 1 } }, after: 1 }], sessions: { other: { objectId: 'u3' } } },
  { answers: [{ answer: { ok: { objectId: 'm1', ACL: { u1: { read: true } }, n: 2 } }, after: 100 }], sessions: { main: { objectId: 'u1' } } },
  { answers: [{ answer: { ok: { objectId: 'n1' } } }], user: 'u9' },
  { answers: [{ answer: { error: 'Forbidden' } }] },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'Duplicate value' } }, { match: { collection: 'Lesson' }, answer: { ok: { objectId: 'n3' } }, after: 1 }, { answer: { error: '' } }] }
];

export const CreateRecord = defineNode({
  type: 'NewDbModelProperties',
  // v2 (P109 ISL-027, row C49 ruled "Compare the list's contents"): an answer's list with the same contents as the one the record
  // holds is not written again (cloudstore.js `_fromJSON`), so it is no change; v1 wrote the new array and the record store's `!==`
  // called it changed.
  // v3 (P109 ISL-029, row C35 ruled "Refuse the save and say why"): a rule set to Role that names no role fails the create
  // with ACL_ROLE_MISSING and sends nothing; v2 sent the key `role:undefined`.
  // v4 (P109 ISL-029, row D24 ruled "Ask the record's own backend"): the access rules' signed-in user is the one signed in on
  // the backend the create goes to (its session); v3 read the legacy store's, so a Log In there was nobody to the rules.
  version: 4,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/newdbmodelpropertiesnode.ts; dbmodelcrudbase.ts; cloudstore.js _fromJSON',
  needs: ['backend', 'registry'],
  worldPool: {
    backends: BACKENDS,
    registries: [{ models: { m1: { title: 'old', n: 1 } } }, { models: { m1: { title: 'old', n: 1 } } }, {}]
  },

  state: { ...RECORD_ID_STATE, ...RECORD_WRITE_STATE, sourceObjectId: undefined, upsertOn: undefined, scheduled: false, presses: 0, calls: {}, nextCall: 1 } as CreateRecordState,
  // dbmodelcrudbase.ts :156-161 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :65-72
    store: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Creates a record in the chosen Class from the property inputs and sends it to the backend' },
    // :73-83 — a wire only, stored raw (a record becomes its id)
    sourceObjectId: {
      type: 'string',
      coerce: 'none',
      displayName: 'Source Object Id',
      group: 'General',
      description: 'Id of an existing record whose properties seed the new one before the property inputs are applied over them; leave blank to start empty',
      examples: ['m1', 'm1', 'nobody', '', null]
    },
    // :99-109
    upsertOn: {
      type: 'string',
      coerce: 'none',
      displayName: 'Upsert On',
      group: 'General',
      description: 'Name of a unique-indexed property. When a record already holds this value the write updates that record instead of creating a second one. Leave empty to always create.',
      examples: ['slug', ' slug ', '', '  ']
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
    // :79-82
    sourceObjectId: (_s, v, _i, w) => ({ says: 'always: read by the next create — the record whose data the new one starts from, the property inputs written over it (a record handed in, by its id)', set: { sourceObjectId: w.registry.isRecord(v) ? v.getId() : v }, send: [] }),
    // :106-108
    upsertOn: (_s, v) => ({ says: 'always: read by the next create — the field that makes it update a record already holding that value (blank, none)', set: { upsertOn: typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined }, send: [] }),
    // dbmodelcrudbase.ts :842-844
    accessControl: (_s, v) => ({ says: 'always: read by the next call — the access rules sent with the record', set: { accessControlRules: v }, send: [] }),
    // :123-125 — the pre-flight at the press, then one batch per frame
    store: (s) => {
      if (!s.collectionId) return { says: 'no Class: refused at once, and Error says so', set: { error: NO_CLASS_MESSAGE }, send: ['error'], outcome: 'failure', error: RECORD_FAILURE_CODE };
      return {
        says: 'otherwise it joins the frame\'s batch: at the end of the frame one create answers every press — Id is the new record\'s, and Done for each; or Error and Failure for each (no backend, or the backend refuses)',
        set: { presses: s.presses + 1, scheduled: true },
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
    // :127-164 — the frame's one create
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const n = s.presses;
      const done = { scheduled: false, presses: 0 };
      // :132-136 — Object.assign({}, <the source record's data>, <the property ports>)
      const source = s.sourceObjectId ? w.registry.model(s.sourceObjectId).data : {};
      const data = Object.assign({}, source, s.inputValues);
      const refused = aclRefusal(s); // v3 (C35) — rules that cannot be sent refuse the create
      if (refused !== undefined) return { set: { ...done, error: refused }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
      const backend = w.backendFor(s.backendId); // :140-141, dbmodelcrudbase.ts :283-301
      if (backend === undefined) {
        return { set: { ...done, error: NO_BACKEND_MESSAGE(s.backendId) }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
      }
      const id = 'create:' + s.nextCall;
      return {
        set: { ...done, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 },
        send: [],
        // :143-149
        backend: { id, op: 'create', backend, args: { collection: s.collectionId, data, acl: aclFor(s, w.backendUser(backend)), upsertOn: s.upsertOn } }
      };
    },
    world: {
      backend: (s, _i, answer, w) => {
        const n = s.calls[answer.id] ?? 0;
        if ('ok' in answer) {
          // :154 → cloudstore.js _fromJSON :407-422 — the record under the answer's objectId, its class the Class AS IT IS NOW
          // (`internal.collectionId`, read at the answer — not the one the call carried), every key but objectId and ACL written
          const item = answer.ok as Record<string, unknown>;
          const m = w.registry.model(item.objectId);
          m._class = s.collectionId;
          for (const key in item) {
            if (key === 'objectId' || key === 'ACL') continue;
            if (Array.isArray(item[key]) && sameList(m.get(key), item[key] as unknown[])) continue; // v2, C49
            m.set(key, item[key]);
          }
          // :157-158 — `setModel` flags Id, then the outcome
          return { set: { bound: m.getId() }, send: ['id'], outcomes: dones(n) };
        }
        return { set: { error: answer.error || 'Failed to insert.' }, send: ['error'], outcomes: failures(n, RECORD_FAILURE_CODE) };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
