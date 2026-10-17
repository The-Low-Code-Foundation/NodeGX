---
title: "Subscribe To Changes"
---
Fires signals when another client creates, updates or deletes a record in a backend class.

Subscribe To Changes holds a live connection to the selected backend and reports what changes in one class. It does not query and it holds no list: when the server pushes a change it publishes the row on `changedRecord`, its key on `changedRecordId` and the kind on `changedEvent`, then fires `created`, `updated` or `deleted` and always `changed`. The transport is chosen from the backend's type and hidden — Server-Sent Events on the built-in NodeGX backend and on PocketBase, a WebSocket on Directus, Parse LiveQuery where one is running — so the ports mean the same thing whichever backend the project uses. It is on as soon as you pick a class: `enabled` defaults to true and the Backend picker defaults to the project's active backend (and is hidden entirely when there is only one). When a backend cannot push at all, the node does not go quiet — `realtimeError` carries a sentence saying why and `realtimeFailure` fires.

## When to use it

When something in the app should react to a change another user made, without owning a query — 'any change to orders, refresh the badge', 'a new message arrived, play a sound'. If you already have a Query Records node and want its `items` to stay current, turn on that node's own Subscribe To Changes checkbox instead of adding this one: it re-runs the query, which this node deliberately does not. For a socket you control yourself — a third-party feed, device telemetry, an LLM stream from someone else's API — use the WebSocket or SSE node; those are raw transports with no backend awareness. This node is client-only: it is inert during server-side rendering and subscribes in the browser after hydration, and it is not available in cloud functions at all (a function is one request and is torn down when it answers).

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `SubscribeToChanges` |
| Available in | browser |
| SSR compatibility | client-only — A realtime subscription cannot be opened during a server render and would hold one connection per request; the node subscribes in the browser after hydration. |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `enabled` | Boolean | `true` | Hold the subscription open. Turn it off to stop receiving changes without deleting the node — the connection is closed and Subscribed goes false. On by default: this node has nothing else to do |

### What each input does

**Enabled** (`enabled`)

- a change (on is anything truthy): at the frame's end the subscription held is closed — Subscribed and Realtime Status sent when one was held — and, on, with a Class and a Backend the project has, a new one is opened: Realtime Status is connecting, then whatever the backend tells
- the value it already holds: nothing — the subscription stays as it is

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `changedEvent` | String | — | create, update, delete, init or resync |
| `changedRecord` | Object | — | The record the change was about. ⚠️ Null on a delete against Directus, which sends only the key — use Changed Record Id, which every backend fills |
| `changedRecordId` | String | — | The id of the changed record, always a string — even where the backend's primary key is an integer |
| `changedRecords` | Array | — | Every record in the change frame; some backends batch |
| `realtimeStatus` | String | — | connecting, subscribed, interrupted or stopped. Four states rather than a boolean, because "connecting for the first time" and "dropped and retrying" want different things on screen |
| `subscribed` | Boolean | — | True while the backend has confirmed the subscription and is delivering changes |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Any of the three, and also the backend saying the view may be stale after a reconnect — the one to react to if you do not care which happened |
| `created` | Signal | — | Another client created a record in this collection |
| `deleted` | Signal | — | Another client deleted a record from this collection |
| `updated` | Signal | — | Another client updated a record in this collection |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `realtimeError` | Object | — | The last realtime failure, with a code and whether retrying can help; null until one happens |
| `realtimeFailure` | Signal | — | Fires when a subscription cannot connect, is rejected, or has been given up on |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Every input but "enabled" is discovered at runtime. "backendId" is a dropdown of the project's backends, defaulting to "_active_" and omitted entirely when the project has only one; "collectionName" is a dropdown of the selected backend's introspected classes; "visualFilter" is a query-filter editor built from that class's schema, and each filter value bound to a port mints one "qp-&lt;name>" input. An authoring tool should set "collectionName" (and "backendId" only when the project has more than one backend); the outputs are all static.

## Ports at runtime

Only `enabled` is a static input. `backendId`, `collectionName`, `visualFilter` and one `qp-<name>` port per filter value bound to a port are all generated from the project's backend metadata and the selected class's schema, and are pushed to the editor per instance. An authoring tool should set `collectionName`, and `backendId` only when the project has more than one backend. Every output is static and always present — the Realtime ports are never gated on whether the selected backend can push, because a capability that disappears from the panel when the picker moves is worse than one that says why it cannot connect.

## Patterns

- `changed` → a Query Records node's `Do`: the same live-list effect as that node's own checkbox, but with the subscription visible on the canvas as a thing that exists.
- `created` → a notification or a sound, without re-fetching anything — this node publishes the new row on `changedRecord` already.
- `changedRecordId` → a Delete Record or a Set Variable: the one output that is filled on every backend and every event type.
- `subscribed` → an indicator's visibility, and `realtimeError` → an error Text: an outage becomes something a user can see rather than a screen that has quietly stopped updating.

## Watch out for

- Adding this beside a Query Records node whose `items` you want kept current. Turn on that node's Subscribe To Changes instead — it re-runs the query, which this node does not.
- Reading `changedRecord` on a delete. Directus sends the key only, so it is null there; use `changedRecordId`.
- Expecting the Filter to narrow anything on PocketBase, Directus or Parse. It reaches a server on the built-in NodeGX backend only, and is deliberately not applied on the client.
- Polling with a Timer on a backend that can push. Subscribe and react to `changed`.
- Assuming silence means 'no changes'. Read `realtimeStatus` and `realtimeError` — Supabase has no transport at all and says so.

## Examples

**Reacting to what another user changed, without owning the query**

**Subscribe To Changes** watches one class on the selected backend and fires signals when anything in it changes — no query, no list, no configuration beyond the class. Here it does the two things it is for at once: `changed` re-runs a Query Records node so the list on screen stays current, and `created` drives a 'new order' notice off `changedRecord`, which the subscription already carries so nothing has to be fetched to show it. `subscribed` drives a live indicator, so a dropped connection is visible rather than a screen that has quietly stopped updating. Against the built-in backend this needs no Backend setting at all: the picker defaults to the project's active backend and is not even shown when there is only one.

## Related nodes

[Query Records](./db-collection2.md), [WebSocket](../data/net-noodl-web-socket.md), [Server-Sent Events](../data/net-noodl-sse.md), [Record](./db-model2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)

### Starting state

```json
{
  "queryParameters": {},
  "scheduled": false,
  "nextSub": 1
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/subscribe-to-changes.ts"
/**
 * Subscribe To Changes (`SubscribeToChanges`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/subscribetochanges.ts` on 2026-10-03 (NSP-014 s33), with the realtime
 * layer it calls (`api/backends/realtime`: index.ts, RealtimeSubscription.ts) read for the seam, not specced.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: every input this node reads — Enabled, Class, Backend, Filter, a filter's parameters —
 * RECONFIGURES it at the frame's end (`scheduleReconfigure`, :392-400: one per frame however many arrive) when its value
 * really changed (v2, row C55 ruled "Ignore repeated values" — `valueDidChange`: an object never compares equal; v1
 * reconfigured at every write, the same value included). Reconfiguring (:402-452)
 * first TEARS DOWN (:454-464): the subscription held is disposed, and a status held is cleared — Subscribed and Realtime
 * Status sent. Then, unless Enabled is `false` (`!== false`, :323-325 — untouched is on) and there is a Class (truthy,
 * :406-407), it resolves the Backend: none is the not-configured error (:413-421); otherwise it subscribes — `{ collection,
 * where, primaryKey }` (:437-444) — and reads the new subscription's status, `connecting` (:451). What the subscription
 * tells lands as it is told (world.ts REALTIME):
 *   a STATUS (:515-523) — Realtime Status is it; `subscribed` also clears a held error (Realtime Error sent);
 *   a CHANGE (:482-513) — Change Type, Changed Record (the first record, only when the records are complete), Changed
 *     Records (all of them, only when complete) and Changed Record Id (the first id) are sent; `init` pulses nothing, a
 *     create / update / delete its signal and then Records Changed, anything else (`resync`) Records Changed alone;
 *   an ERROR (:532-537) — Realtime Error is it, Realtime Failure pulses (and the runtime error bus hears
 *     `subscribe-to-changes/realtime-failed`, outside the trace).
 * The error is NOT cleared by a teardown: it stays until a later subscription says `subscribed`.
 *
 * THE FILTER (:369-390): absent, no `where`; otherwise `QueryUtils.convertVisualFilter` — the neutral filter lowered to the
 * Parse dialect for the legacy store's backend type (record-match.ts `toNeutral` / `lowerToParse`, the same two lowerings
 * Query Records and Filter Records use). A filter the translator REFUSES (it throws — `pointsTo` with no class schema) is
 * warned to the editor and the subscription opens UNFILTERED (:378-388).
 *
 * NOT GRADED HERE, named:
 *   - `realtimeSupportFor` (:427-435): every backend a play has is a REST one (world.ts BACKEND) whose realtime is
 *     supported, so the unsupported sentence (Supabase, a custom backend) is never reached — world.ts REALTIME.
 *   - the primary key (:473-480): the schema's when the backend's class has one, else the wire's convention — no play's
 *     backend has a class schema and none is the Parse wire, so it is `id` here.
 *   - `resolveRelatedClasses` inside `convertVisualFilter` (queryutils.ts :177-195): reads the record store for a
 *     `relatedTo` with no class — no filter here relates records.
 *   - the editor warning for a refused filter (:383-387) — no editor connection in a play — and the error bus (outside
 *     the trace, as every runtime error is).
 *   - `_onNodeDeleted` (:539-542): the teardown on deletion; no play deletes a node.
 *   - `updatePorts` (:586-643): the editor's ports — which inputs are DRAWN; the runtime accepts any (:554-582).
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';
import type { BackendScript, RealtimeScriptEvent } from '../world';
import { valueDidChange } from './condition';
import { backendPickerPort, classPicker, selectedClass } from './record-base';
import { filterParameterNames, lowerToParse, toNeutral } from './record-match';

const REALTIME = 'Realtime';

type SubscribeToChangesState = {
  /** `_internal.name` — the Class (:332-336) */
  name: unknown;
  /** `_internal.backendId` (:567-572) */
  backendId: unknown;
  /** `_internal.enabled` as the author left it — `undefined` until Enabled is written (:122-127) */
  enabled: boolean | undefined;
  /** `_internal.visualFilter` (:338-341) */
  visualFilter: unknown;
  /** `_internal.queryParameters` (:343-348), by bare name */
  queryParameters: Readonly<Record<string, unknown>>;
  /** `_internal.reconfigureScheduled` (:393-400) */
  scheduled: boolean;
  /** the spec's id of the subscription held (`_internal.subscription`), `undefined` when none */
  sub: string | undefined;
  nextSub: number;
  /** `_internal.realtimeStatus` */
  status: string | undefined;
  /** `_internal.realtimeError` */
  error: unknown;
  /** `_internal.realtimeEvent` */
  event: unknown;
  /** `_internal.changedRecord` / `changedRecords` / `changedRecordId` */
  record: unknown;
  records: unknown;
  recordId: unknown;
};

/** The ports `registerInputIfNeeded` gives a setter (:557-573); any other name is accepted and read by nothing (:575-581). */
const FILTERS: readonly unknown[] = [
  { type: 'and', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }] },
  { type: 'and', conditions: [{ field: 'n', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'qp-min' }] },
  // refused by the translator: `pointsTo` with no class schema (record-match.ts `lowerToParse`) — the subscription opens unfiltered
  { type: 'and', conditions: [{ field: 'owner', operator: 'pointsTo', valueSource: 'static', value: 'u1' }] },
  { type: 'and', conditions: [] },
  { combinator: 'and', rules: [{ property: 'title', operator: 'equal to', input: 'min' }] }
];

function discover(port: string): InputDecl | undefined {
  if (port === 'collectionName') return { type: 'string', coerce: 'none', displayName: 'Class', group: 'General', description: 'The class to subscribe to', examples: ['Lesson', 'Lesson', 'Lesson', 'Note', '', undefined] };
  if (port === 'backendId') return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend to subscribe on', examples: ['_active_', 'main', 'other', 'nope', undefined] };
  if (port === 'visualFilter') return { type: 'object', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', description: 'The visual filter, evaluated by the server', examples: FILTERS };
  if (port.startsWith('qp-')) return { type: '*', coerce: 'none', displayName: port.slice('qp-'.length), group: 'Query Parameters', description: 'The value the filter reads for ' + port.slice('qp-'.length), examples: [1, 3, 'a', undefined] };
  // :575-581 — a port this node does not read
  return { type: '*', coerce: 'none', displayName: port, group: 'General', description: 'A port this node does not read', examples: [1, 'a'] };
}

/** :369-390 — the filter in the backend's dialect, or none; a refusal opens the subscription unfiltered. */
function subscriptionFilter(s: SubscribeToChangesState): Readonly<Record<string, unknown>> | undefined {
  if (s.visualFilter === undefined) return undefined;
  try {
    return lowerToParse(toNeutral(s.visualFilter, s.queryParameters, 'qp-'));
  } catch {
    return undefined;
  }
}

const STATUS_SENDS = ['subscribed', 'realtimeStatus'] as const;
const CHANGE_SENDS = ['changedEvent', 'changedRecord', 'changedRecords', 'changedRecordId'] as const;

const sub = (stream: RealtimeScriptEvent[]) => ({ match: { op: 'subscribe' }, answer: { stream } });
const created = { type: 'create', ids: ['r1'], records: [{ id: 'r1', title: 'a' }] };
const updated = { type: 'update', ids: ['r1'], records: [{ id: 'r1', title: 'b' }] };
const deletedKeyOnly = { type: 'delete', ids: ['r1'], records: [], recordsComplete: false };
const deletedWhole = { type: 'delete', ids: ['r2'], records: [{ id: 'r2', title: 'c' }] };
const batch = { type: 'create', ids: ['r3', 'r4'], records: [{ id: 'r3' }, { id: 'r4' }] };

/**
 * What a subscription tells, one entry at every doubling of the clock from 1 ms to 32 s after the subscribe — so an advance made
 * after any subscribe reaches some, whatever its size (Query Records' WRITES, s24). Measured s33: with hand-placed streams the
 * first draft reached `subscribed` in 5 sequences of 400 (two seeds), `interrupted` and `resync` in 1 — a later write tears the
 * subscription down before time passes.
 */
const TOLD_CYCLE: ReadonlyArray<Omit<RealtimeScriptEvent, 'at'>> = [
  { status: 'subscribed' },
  { change: created },
  { change: { type: 'init', ids: ['r0'], records: [{ id: 'r0' }] } },
  { change: updated },
  { change: deletedKeyOnly },
  { status: 'interrupted' },
  { error: { message: 'The realtime connection went down before it was confirmed (errored).', code: 'CONNECT_FAILED' } },
  { status: 'subscribed' },
  { change: { type: 'resync' } },
  { change: batch },
  { change: deletedWhole }
];
const told = (offset: number): RealtimeScriptEvent[] => Array.from({ length: 16 }, (_, k) => ({ at: 2 ** k, ...TOLD_CYCLE[(k + offset) % TOLD_CYCLE.length] }) as RealtimeScriptEvent);

/** The backends a sequence plays with: subscriptions that confirm and deliver (three phases of the cycle), a refusal, a fatal one, one that never answers, and a project with two backends. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [sub(told(0))] },
  { answers: [sub(told(3))] },
  { answers: [sub(told(6))] },
  { answers: [sub([{ at: 1, error: { message: 'Not authorised', code: 'AUTH_FAILED' } }, { at: 10, change: created }])] },
  { answers: [sub([{ at: 1, status: 'subscribed' }, { at: 30000, error: { message: 'No heartbeat', code: 'HEARTBEAT_MISSED', kind: 'fatal' } }])] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { op: 'subscribe', backend: 'other' }, answer: { stream: [{ at: 1, error: { message: 'Rejected', code: 'SUBSCRIPTION_REJECTED' } }] } }, sub(told(1))] }
];

export const SubscribeToChanges = defineNode({
  type: 'SubscribeToChanges',
  // v2 (P109 ISL-030, row C55 ruled "Ignore repeated values"): a write of the value a setting already holds does not
  // reconnect; v1 tore the subscription down and opened a new one at every write.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/subscribetochanges.ts; api/queryutils.ts',
  needs: ['backend'],
  worldPool: { backends: BACKENDS, advances: [0, 1, 1, 9, 10, 50, 100, 1000, 30000] },

  state: {
    name: undefined,
    backendId: undefined,
    enabled: undefined,
    visualFilter: undefined,
    queryParameters: {},
    scheduled: false,
    sub: undefined,
    nextSub: 1,
    status: undefined,
    error: undefined,
    event: undefined,
    record: undefined,
    records: undefined,
    recordId: undefined
  } as SubscribeToChangesState,

  inputs: {
    // :191-202 — `default: true` is the panel's; the setter is `!!value`
    enabled: {
      type: 'boolean',
      coerce: 'none',
      default: true,
      displayName: 'Enabled',
      group: 'General',
      description:
        'Hold the subscription open. Turn it off to stop receiving changes without deleting the node — the ' +
        'connection is closed and Subscribed goes false. On by default: this node has nothing else to do',
      examples: [true, false, false, 0, 'yes', undefined]
    }
  },

  outputs: {
    // :208-307 — each getter reads its field, with a fallback
    subscribed: { type: 'boolean', displayName: 'Subscribed', group: REALTIME, description: 'True while the backend has confirmed the subscription and is delivering changes', from: (s) => s.status === 'subscribed' },
    realtimeStatus: { type: 'string', displayName: 'Realtime Status', group: REALTIME, description: 'connecting, subscribed, interrupted or stopped. Four states rather than a boolean, because "connecting for the first time" and "dropped and retrying" want different things on screen', from: (s) => s.status || '' },
    realtimeError: { type: 'object', displayName: 'Realtime Error', group: REALTIME, description: 'The last realtime failure, with a code and whether retrying can help; null until one happens', from: (s) => s.error || null },
    realtimeFailure: { type: 'signal', displayName: 'Realtime Failure', group: REALTIME, description: 'Fires when a subscription cannot connect, is rejected, or has been given up on' },
    created: { type: 'signal', displayName: 'Record Created', group: REALTIME, description: 'Another client created a record in this collection' },
    updated: { type: 'signal', displayName: 'Record Updated', group: REALTIME, description: 'Another client updated a record in this collection' },
    deleted: { type: 'signal', displayName: 'Record Deleted', group: REALTIME, description: 'Another client deleted a record from this collection' },
    changed: { type: 'signal', displayName: 'Records Changed', group: REALTIME, description: 'Any of the three, and also the backend saying the view may be stale after a reconnect — the one to react to if you do not care which happened' },
    changedEvent: { type: 'string', displayName: 'Change Type', group: REALTIME, description: 'create, update, delete, init or resync', from: (s) => s.event || '' },
    changedRecord: { type: 'object', displayName: 'Changed Record', group: REALTIME, description: 'The record the change was about. ⚠️ Null on a delete against Directus, which sends only the key — use Changed Record Id, which every backend fills', from: (s) => s.record || null },
    changedRecords: { type: 'array', displayName: 'Changed Records', group: REALTIME, description: 'Every record in the change frame; some backends batch', from: (s) => s.records || [] },
    changedRecordId: { type: 'string', displayName: 'Changed Record Id', group: REALTIME, description: "The id of the changed record, always a string — even where the backend's primary key is an integer", from: (s) => s.recordId || '' }
  }
}).on(
  {
    // :327-330 — v2 (row C55 ruled "Ignore repeated values"): only a change reconnects
    enabled: (s, v) =>
      valueDidChange(s.enabled, !!v)
        ? {
            says: "a change (on is anything truthy): at the frame's end the subscription held is closed — Subscribed and Realtime Status sent when one was held — and, on, with a Class and a Backend the project has, a new one is opened: Realtime Status is connecting, then whatever the backend tells",
            set: { enabled: !!v, scheduled: true },
            send: []
          }
        : { says: 'the value it already holds: nothing — the subscription stays as it is', send: [] }
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (`updatePorts` :597-651): the Backend picker and the Class from the project, then
      // — once a Class is set — the Filter builder when the schema has that Class, and one `qp-` port per parameter the saved
      // filter names. At play there is no schema: the parameters alone, which the runtime registers on their first write
      inputs: (params, context) => {
        const out: Record<string, InputDecl> = { ...backendPickerPort(context), collectionName: classPicker(discover('collectionName') as ValueInputDecl, context) };
        if (params.collectionName === undefined) return out;
        if (selectedClass(params, context)) out.visualFilter = { ...(discover('visualFilter') as ValueInputDecl), type: 'query-filter', valuePortPrefix: 'qp-', filterBackend: true }; // :613-634
        if (params.visualFilter !== undefined) for (const name of filterParameterNames(params.visualFilter, 'qp-')) out['qp-' + name] = discover('qp-' + name)!; // :637-647
        return out;
      },
      needs: ['schema', 'backends'],
      discover,
      candidates: ['collectionName', 'backendId', 'visualFilter', 'qp-min', 'qp-other'],
      on: (s, port, v) => {
        // v2 (row C55 ruled "Ignore repeated values"): each setting reconnects only when it really changes (`valueDidChange` —
        // an object never compares equal); v1 reconnected at every write, the same value included
        if (port === 'collectionName') return valueDidChange(s.name, v) ? { set: { name: v, scheduled: true }, send: [] } : { send: [] };
        if (port === 'visualFilter') return valueDidChange(s.visualFilter, v) ? { set: { visualFilter: v, scheduled: true }, send: [] } : { send: [] };
        if (port === 'backendId') return valueDidChange(s.backendId, v) ? { set: { backendId: v, scheduled: true }, send: [] } : { send: [] };
        if (port.startsWith('qp-')) {
          const key = port.slice('qp-'.length);
          return valueDidChange(s.queryParameters[key], v) ? { set: { queryParameters: { ...s.queryParameters, [key]: v }, scheduled: true }, send: [] } : { send: [] };
        }
        return { send: [] }; // :575-581
      }
    },
    // :396-399 → :402-452 — the frame's one reconfigure
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      // :454-464 — the teardown
      const unsubscribe = s.sub !== undefined ? [s.sub] : [];
      const torn: Partial<SubscribeToChangesState> = s.sub !== undefined ? { scheduled: false, sub: undefined } : { scheduled: false };
      const send: string[] = [];
      if (s.status) {
        torn.status = undefined;
        send.push(...STATUS_SENDS);
      }
      const done = (patch: { set?: Partial<SubscribeToChangesState>; emit?: Array<'realtimeFailure'>; send?: string[]; subscribe?: { id: string; op: string; backend: string; args: Record<string, unknown> } }) => ({
        set: { ...torn, ...patch.set },
        send: [...new Set([...send, ...(patch.send ?? [])])] as never[],
        ...(patch.emit ? { emit: patch.emit } : {}),
        ...(unsubscribe.length > 0 ? { unsubscribe } : {}),
        ...(patch.subscribe ? { subscribe: patch.subscribe } : {})
      });
      if (s.enabled === false) return done({}); // :405
      if (!s.name) return done({}); // :406-407
      const backend = w.backendFor(s.backendId); // :413
      if (backend === undefined) {
        // :414-421 → :532-537
        const error = { message: `The backend this node is set to ("${(s.backendId as string) || '_active_'}") is not configured in this project.`, code: 'CAPABILITY_UNAVAILABLE', kind: 'fatal' };
        return done({ set: { error }, send: ['realtimeError'], emit: ['realtimeFailure'] });
      }
      // :437-444, then :451 — the new subscription's status, read off the handle
      const id = 'sub:' + s.nextSub;
      const where = subscriptionFilter(s);
      return done({
        set: { sub: id, nextSub: s.nextSub + 1, status: 'connecting' },
        send: [...STATUS_SENDS],
        subscribe: { id, op: 'subscribe', backend, args: { collection: s.name, where, primaryKey: 'id' } }
      });
    },
    world: {
      realtime: (s, _i, e) => {
        if ('status' in e) {
          // :515-523
          if (e.status === 'subscribed' && s.error) return { set: { status: e.status, error: null }, send: ['realtimeError', ...STATUS_SENDS] };
          return { set: { status: e.status }, send: [...STATUS_SENDS] };
        }
        if ('error' in e) {
          // :532-537
          return { set: { error: e.error }, send: ['realtimeError'], emit: ['realtimeFailure'] };
        }
        // :482-513
        const c = e.change;
        const set = {
          event: c.type,
          record: c.recordsComplete && c.records.length > 0 ? c.records[0] : null,
          records: c.recordsComplete ? c.records : [],
          recordId: c.ids.length > 0 ? c.ids[0] : ''
        };
        if (c.type === 'init') return { set, send: [...CHANGE_SENDS] };
        const signal = ({ create: 'created', update: 'updated', delete: 'deleted' } as const)[c.type as 'create' | 'update' | 'delete'];
        return { set, send: [...CHANGE_SENDS], emit: signal ? [signal, 'changed'] : ['changed'] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
