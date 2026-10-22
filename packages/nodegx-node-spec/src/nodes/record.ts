/**
 * Record (`DbModel2`) — read from `packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts` on 2026-10-02
 * (NSP-014 s23), with cloudstore.js `_fromJSON` (:407-422), run-on-value-change.ts and foreachitem.ts beside it.
 * Its own file, not the crudbase's mixins: the node is the Object node's backend twin (object.ts), and shares
 * with the Record write family (record-base.ts) only the Class / Backend ports and the failure code.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: a Record node is a WINDOW onto one shared record that a Fetch reads from the
 * backend. `Id` names it (:247-275): a record handed in becomes its id, a PLAIN OBJECT handed in is turned into a
 * record first (`Model.create`: named by its `id` field, anonymous — a guid draw — without one, every other field
 * written); when the id CHANGED and the `Id` checkbox is on (DEF-046) the node binds — an EMPTY id (`undefined`,
 * `null`, `''`) binds nothing and re-sends `Id` (:310-314, :326), any other reaches the record of that name, create-on-read
 * (:316), sends `Id` and every property output the record already holds, and pulses `Fetched` (:320-343) — and when no
 * record of that name was held (v5), binds it quietly, reads it at the frame end under the Fetch key, and pulses `Fetched` on
 * the answer (no outcome; a failure is said on Error); otherwise only `Id` is re-sent (:273). `Id Source` = `From repeater` binds the
 * enclosing Repeater's item at the frame end (:292-296); a node outside one binds NOTHING (foreachitem.ts).
 *
 * FETCH (:394-458): one token per press; ONE read per frame for any number of presses (`scheduleOnce`). At the
 * frame end: an Id that is `undefined`, `null` or `''` fails the batch `Missing Id.` (:411-414 — the binding's own
 * empty test; v4, row D22: v3 asked the backend for the record "null"); a Backend the project does not have, the not-configured sentence (:419-425); otherwise the node hands
 * its backend `fetch({ collection: <Class>, objectId: <the Id input> })` (:428-430; world.ts BACKEND, R9) — no Class
 * check: a Fetch with no Class asks for `collection: undefined` (the write family's pre-flight is not this node's).
 * The answer settles its batch. Success (:431-452): the record handed back is written into the registry under ITS
 * `objectId` (`_fromJSON`: class = the Class as it is when the answer lands, every key but `objectId` and `ACL` `set`
 * — a key that differs notifies the record's watchers, THIS node among them when it is already bound to that record);
 * the node binds that record, sends `Id` and the property outputs the answer named, pulses `Fetched`, then every
 * press is Done. Failure: Error is the backend's message, or `Failed to fetch.` (:454-456), and every press is
 * Failure with `record/storage-op-failed`. Error is never cleared. A Fetch while an earlier one is out is a second
 * call.
 *
 * WATCHING (:136-145): every write of a key on the bound record — by a fetch's answer or by any other holder — when
 * the `Record properties` checkbox is on re-sends `prop-<key>` and pulses `<key> Changed` if the node has that
 * property output, and pulses `Changed` for any key.
 *
 * THE PROPERTY OUTPUTS (NSP-020 s82, §6.3): what the EDITOR draws is the Class's columns from the project's schema, one
 * `prop-<field>` and one `<field> Changed` each (dbmodelnode2.ts `updatePorts` :548-571 → record-ports.ts
 * `recordFieldPorts` :170-201), then a `prop-<name>` for every name a WIRE touches — a parameter, a wire in, or a wire
 * out (`recordWiredFieldPorts` :260-345, "the wire is the declaration"). What exists AT PLAY is only what a wire
 * registered (`registerOutputIfNeeded` :474-486, called from nodescope.ts :150), and every send is gated on it —
 * `if (this.hasOutput('prop-' + key))` (:140-142, :340, :448). The schema is never read at play. So this spec's
 * `derived.outputs(params, context)` reads `context.schema` and the wire fields; handed the play's context (the wires
 * only), it is exactly the runtime's list, and the reducers ask `world.hasOutput` where the runtime asks `hasOutput`.
 * A scenario names the wires under `wiredOutputs`; a generated sequence draws them from `outputCandidates`
 * (`title` and `n`, the two fields every world here holds). The `prop-<field>` INPUTS the runtime accepts
 * (`registerInputIfNeeded` :514-516) hold a value read by nothing (`scheduleStore` is dead, :460-471) — discovered, inert.
 *
 * NOT GRADED HERE, named:
 *   - the success's schema conversions (`_deserializeJSON` with the Class's schema: Date, Pointer, File, GeoPoint,
 *     a list of objects becoming an array of records, a nested object becoming an anonymous record) — the world's
 *     answers carry plain values, which `_deserializeJSON` hands back as they are;
 *   - an answer with no `objectId` (`Model.get(undefined)` — an anonymous record): a backend's fetch always names it;
 *   - the success's `fetch` event on the store (the contract's event surface) — Query Records hears it;
 *   - the error-channel report of a From-repeater miss (foreachitem.ts) — not a port;
 *   - row C37 (NSP-014 §6.8): `<field> Changed` is offered by the editor (`includeChangedSignals`, :560) and never
 *     registered — `registerOutputIfNeeded` handles `prop-` only (:478-480), as C11 on the Object node. This spec
 *     states the pulse; the runtime's silence is a known row.
 */

import type { ChangeEvent, OutputDecl, ValueInputDecl, ValueType, WorldView } from '../spec';
import { defineNode, said } from '../spec';
import type { BackendScript, WorldScript } from '../world';
import { valueDidChange } from './condition';
import { emptyId, runOnChange } from './data-base';
import { backendPickerPort, changedSignal, classPickerPort, discoverRecordPort, NO_BACKEND_MESSAGE, onRecordPort, RECORD_CANDIDATES, RECORD_FAILURE_CODE, recordFieldPort, recordWiredFieldNames, selectedClass, shownFields } from './record-base';
import { sameList } from '../world';

/** The two fields every world here holds — what a generated sequence may WIRE (`outputCandidates`), not a stand-in for a schema (s82). */
export const RECORD_FIELDS = ['title', 'n'] as const;

/** :413 */
export const MISSING_ID_MESSAGE = 'Missing Id.';

/** `read`: v5, the read a bind of an unheld record schedules (the `Fetch` key, `readOnBind`) — with no Class and no press, it only pulses Fetched. */
type Job = 'bind' | 'fetch' | 'read';

type RecordState = {
  /** `_internal.modelId` — the raw input, a record or object handed in become its id (:253-263) */
  modelId: unknown;
  /** `_internal.model`, by its id (`undefined` = none bound) */
  bound: unknown;
  idSource: unknown;
  repeaterComponent: unknown;
  /** `_internal.collectionId` — the Class (:297-299) */
  collectionId: unknown;
  /** `_internal.backendId` (:504-506) */
  backendId: unknown;
  /** `_internal.error` (:376) */
  error: string | undefined;
  /** the frame's scheduled callbacks, in order (`bindToRepeaterItem`, `scheduleOnce('Fetch')`) */
  jobs: readonly Job[];
  /** `hasScheduledFetch` */
  fetchScheduled: boolean;
  /** `pendingFetch.length` — the presses the frame's batch holds (:402-403) */
  presses: number;
  /** every fetch made, by the spec's call id: how many presses its answer settles */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'failure' as const, error: RECORD_FAILURE_CODE }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'done' as const }));

/**
 * The property output (:474-481, `userOutputGetter` :522-525 — `get(name, { resolve: true })`): typed by its column when the
 * schema has one (record-ports.ts `recordPortType` :205-219), `*` for a name only a wire declares (:336-340).
 */
function propertyOutput(p: string, type: ValueType = '*'): OutputDecl<RecordState> {
  return {
    type,
    displayName: p,
    group: 'Properties',
    description: 'The ' + p + ' property of the bound record',
    from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get(p, { resolve: true }) : undefined)
  };
}

/** :514-516 — a `prop-` input is accepted and held by `userInputSetter`, read by nothing. */
function propertyInput(p: string): ValueInputDecl {
  return { type: '*', coerce: 'none', displayName: p, group: 'Properties', description: 'Held and read by nothing: a Record is written by Update Record', examples: ['v', 1] };
}

/** Only the keys a patch CHANGES (NSP-013 s11: a spread-everything `set` makes drop-set mutants meaningless). */
function changes(before: Readonly<RecordState>, after: RecordState, keys: ReadonlyArray<keyof RecordState>): Partial<RecordState> {
  const out: Partial<RecordState> = {};
  for (const k of keys) if (!Object.is(before[k], after[k])) (out as Record<string, unknown>)[k] = after[k];
  return out;
}

/** One frame's pulses in the order the runtime sends them (spec.ts `pulses`): declared, or `{ derived }`. */
type Reaction = { pulses: Array<'changed' | 'fetched' | { derived: string }> };

/** :136-145 onModelChangedCallback — this node's reaction to a write of `key` on its bound record, written beside the write (registry.ts: a node never hears its own write). */
function react(st: RecordState, w: WorldView, key: string, on: boolean, r: Reaction): void {
  if (!on) return;
  if (w.hasOutput('prop-' + key)) w.send('prop-' + key, st); // :140 — at the flag, where the node has the port
  if (w.hasOutput('changed-' + key)) r.pulses.push({ derived: 'changed-' + key }); // :142
  r.pulses.push('changed'); // :144
}

/** :320-343 setModel — swap the subscription; send Id and the property outputs the record holds; pulse Fetched (unless `announce` is false: v5, a bind that reads first). */
function setModel(st: RecordState, w: WorldView, id: unknown, r: Reaction, announce = true): void {
  if (st.bound !== undefined) w.unwatch({ model: st.bound }); // :321-324
  st.bound = id;
  w.send('id', st); // :326
  if (id === undefined) return; // :334
  w.watch({ model: id }); // :336
  for (const key of Object.keys(w.registry.model(id).data)) if (w.hasOutput('prop-' + key)) w.send('prop-' + key, st); // :339-341
  if (announce) r.pulses.push('fetched'); // :342
}

/**
 * :310-318 setModelID — an empty id binds nothing; a name reaches its record (create-on-read). v5 (P112-OWN026-RECORDBYIDMEMORY):
 * a record nothing in the registry held is bound quietly and read at the frame's end — the `Fetch` key (`scheduleOnce`), so a
 * press in the same frame shares that read — and Fetched fires on the answer; a held record binds and pulses Fetched as before.
 */
function setModelID(st: RecordState, w: WorldView, id: unknown, r: Reaction): void {
  if (emptyId(id)) {
    setModel(st, w, undefined, r);
    return;
  }
  const held = w.registry.modelExists(id);
  setModel(st, w, w.registry.model(id).getId(), r, held);
  if (!held && !st.fetchScheduled) {
    st.fetchScheduled = true;
    st.jobs = [...st.jobs, 'read'];
  }
}

/** The backends a sequence plays with: at once (weighted — a read reaches a call rarely), the same values, late, another record, refused with and without a message, silent, a project with two. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { objectId: 'r1', title: 'from the backend', n: 2 } } }] },
  { answers: [{ answer: { ok: { objectId: 'r1', title: 'from the backend', n: 2 } } }] },
  { answers: [{ answer: { ok: { objectId: 'r1', title: 'old', n: 1, other: 'x' } } }] },
  { backends: ['main', 'other'], answers: [{ answer: { ok: { objectId: 'r1', title: 'late' } }, after: 1 }] },
  { answers: [{ answer: { ok: { objectId: 'r2', n: 7, ACL: { '*': { read: true } } } }, after: 100 }] },
  { answers: [{ answer: { error: 'Forbidden' } }] },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'No record with id r1 in Lesson.' } }, { match: { collection: 'Lesson' }, answer: { ok: { objectId: 'r1', title: 'lesson' } }, after: 1 }, { answer: { error: '' } }] }
];

const REGISTRIES: ReadonlyArray<NonNullable<WorldScript['registry']>> = [{ models: { r1: { title: 'old', n: 1 } } }, { models: { r1: { title: 'old', n: 1 } } }, {}];

export const RecordNode = defineNode({
  type: 'DbModel2',
  // v2 (P109 ISL-027, row C37 ruled "Make them fire"): `<field> Changed` fires on the runtime now, so its ORDER
  // is graded for the first time. The runtime's listener sends each field's Changed and then Changed for every
  // key a write moves, one key at a time (dbmodelnode2.ts onModelChangedCallback); v1 queued every
  // `<field> Changed` of a frame ahead of every Changed and Fetched, an order nothing had observed.
  // v3 (P109 ISL-027, row C49 ruled "Compare the list's contents"): an answer's list with the same contents as the one the record
  // holds is not written again (cloudstore.js `_fromJSON`), so it is no change; v2 wrote the new array and the record store's `!==`
  // called it changed.
  // v4 (P109 ISL-029, row D22 ruled "Say 'Missing Id.'"): a Fetch with a null Id fails `Missing Id.` and asks nothing, the
  // binding's own empty test; v3 handed the backend `objectId: null`.
  // v5 (P112-OWN026-RECORDBYIDMEMORY): an Id naming a record nothing in memory holds reads it from the backend at the frame's
  // end (no outcome: a bind is not an invocation; a failure is said on Error), and Fetched waits for the answer. v4 bound the
  // empty record create-on-read made and pulsed Fetched over it: a page opened by its own URL showed nothing.
  version: 5,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts; cloudstore.js _fromJSON',
  needs: ['backend', 'registry', 'random'],
  worldPool: { backends: BACKENDS, registries: REGISTRIES },

  state: {
    modelId: undefined,
    bound: undefined,
    idSource: undefined,
    repeaterComponent: undefined,
    collectionId: undefined,
    backendId: undefined,
    error: undefined,
    jobs: [],
    fetchScheduled: false,
    presses: 0,
    calls: {},
    nextCall: 1
  } as RecordState,
  // :197-200 outcomeOutputs({ done, failure }) — no Unchanged: a Fetch always re-reads (:186-196)
  outcomes: ['done', 'failure'],

  inputs: {
    // :212-226
    idSource: {
      type: 'enum',
      enums: ['explicit', 'foreach'],
      default: 'explicit',
      coerce: 'none',
      editOnly: true,
      displayName: 'Id Source',
      group: 'General',
      description: 'Whether the record is named by Id or taken from the repeater this node sits inside'
    },
    // :234-246
    repeaterComponent: {
      when: (p) => p.idSource === 'foreach',
      type: 'component',
      coerce: 'none',
      displayName: 'Repeater Component',
      group: 'General',
      description: 'Which repeater to take the current item from when nesting makes the nearest one ambiguous; leave blank for the nearest, and ignored unless Id Source is From repeater',
      examples: ['Row', '']
    },
    // :247-276
    modelId: {
      when: (p) => p.idSource === 'explicit' || p.idSource === undefined,
      type: 'string',
      coerce: 'none',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the record to read; ignored unless Id Source is Specify explicitly',
      examples: ['r1', 'r1', 'r1', 'r2', 'zz', '', null, { id: 'r1', title: 'local' }, { title: 'anon' }]
    },
    // :277-285
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description:
        'Re-reads the record from the backend now, replacing the copy held in memory. This is additional to Id rebinding on change and to changes being announced; untick either under Run On Value Change to stop it'
    },
    // :125-129 runOnValueChange: inputs ['modelId'], sources [record]
    'runOnChange-modelId': runOnChange('Id'),
    'runOnChange-record': runOnChange('Record properties')
  },

  outputs: {
    // :157-165
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the record this node is bound to, whether or not it has been read yet',
      from: (s) => (s.bound !== undefined ? s.bound : s.modelId)
    },
    // :166-179
    fetched: {
      type: 'signal',
      displayName: 'Fetched',
      group: 'Events',
      description: 'Fires when the Id binds a record already in memory, when a record the Id names is first read from the backend, and when a Fetch finishes reading it; use Done to act on the answer to a Fetch'
    },
    // :180-185
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when a property of the bound record changes, including a change another node made' },
    // :201-209
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last read failed; empty until one does', from: (s) => s.error }
  }
}).on(
  {
    // :223-226
    idSource: (s, v) =>
      v === 'foreach'
        ? { says: "From repeater: at the frame's end it binds to the record of the row it sits in", set: { idSource: v, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept; the record stays bound until the next Id', set: { idSource: v, jobs: s.jobs }, send: [] },
    // :240-245
    repeaterComponent: (s, v) =>
      s.idSource === 'foreach'
        ? { says: "under From repeater: at the frame's end it binds to the record of that repeater's row (blank: the nearest)", set: { repeaterComponent: v || undefined, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept, and read only under From repeater', set: { repeaterComponent: v || undefined, jobs: s.jobs }, send: [] },
    // :250-275
    modelId: (s, value, i, w) => {
      const r: Reaction = { pulses: [] };
      let v: unknown = value;
      if (w.registry.isRecord(v)) v = v.getId(); // :253
      else if (typeof v === 'object' && v !== null) {
        // :262-263 — `Model.create` (model.ts :243-252): the record named by `id` (a guid draw without one), every other key `set`; a key
        // that differs on the record this node is bound to notifies its listener (:136-145), written here beside the write
        const data = v as Record<string, unknown>;
        const bound = s.bound !== undefined ? w.registry.model(s.bound) : undefined;
        const before = bound ? Object.fromEntries(Object.keys(data).map((k) => [k, bound.get(k)])) : {};
        const created = w.registry.create(v);
        v = created.getId();
        if (bound && created.getId() === s.bound) {
          for (const key of Object.keys(data)) if (key !== 'id' && before[key] !== data[key]) react(s as RecordState, w, key, i['runOnChange-record'], r);
        }
      }
      const previous = s.modelId; // :268
      if (valueDidChange(previous, v) && i['runOnChange-modelId']) {
        // :271 setModelID
        const st: RecordState = { ...s, modelId: v };
        setModelID(st, w, v, r);
        return said('a new Id, ticked under Run On Value Change: bound to that record now; Id and its properties follow, and an object handed writes its keys onto the record first', { set: changes(s, st, ['modelId', 'bound', 'jobs', 'fetchScheduled']), send: [], pulses: r.pulses });
      }
      return said('otherwise (the same Id, or unticked): Id is sent and the binding stays; an object handed still writes its keys onto the record it names', { set: Object.is(previous, v) ? {} : { modelId: v }, send: ['id'], pulses: r.pulses }); // :273
    },
    // :282-284 → :394-406 — a token per press, one read per frame
    fetch: (s) => ({ says: "always: the record is re-read from the backend at the frame's end, one read for the frame's presses; each answered when it returns", set: { presses: s.presses + 1, fetchScheduled: true, jobs: s.fetchScheduled ? s.jobs : [...s.jobs, 'fetch' as const] }, send: [], outcome: 'pending' })
  },
  {
    derived: {
      // NSP-020 s82 — what the editor draws (dbmodelnode2.ts updatePorts :548-571): the Backend picker with two or more
      // backends, then the Class dropdown from the schema; at play neither is in the context, and a write registers it (discover)
      inputs: (_params, context) => ({ ...backendPickerPort(context), collectionName: classPickerPort(context) }),
      // THE PROPERTY OUTPUTS: the Class's columns (record-ports.ts recordFieldPorts :170-201 — one `prop-` and one Changed each),
      // then `prop-` alone for every name a wire or a parameter declares and the schema does not (recordWiredFieldPorts :260-345)
      outputs: (params, context) => {
        const out: Record<string, OutputDecl<RecordState>> = {};
        for (const [field, decl] of shownFields(selectedClass(params, context), true)) {
          out['prop-' + field] = { ...propertyOutput(field), ...recordFieldPort(decl) } as OutputDecl<RecordState>;
          out['changed-' + field] = changedSignal(field);
        }
        for (const field of recordWiredFieldNames(params, context)) if (!('prop-' + field in out)) out['prop-' + field] = propertyOutput(field);
        return out;
      },
      needs: ['schema', 'backends', 'wired', 'wiredOutputs'],
      // :483-518 registerInputIfNeeded — the Class, the Backend, and any `prop-` name
      discover: (port) => discoverRecordPort(port) ?? (port.startsWith('prop-') ? propertyInput(port.slice('prop-'.length)) : undefined),
      candidates: [...RECORD_CANDIDATES, 'prop-title'],
      // :474-486 registerOutputIfNeeded — what a wire brings into being (nodescope.ts :150): a `prop-` getter, a `changed-` signal
      discoverOutput: (port) => (port.startsWith('prop-') ? propertyOutput(port.slice('prop-'.length)) : port.startsWith('changed-') ? changedSignal(port.slice('changed-'.length)) : undefined),
      outputCandidates: RECORD_FIELDS.flatMap((f) => ['prop-' + f, 'changed-' + f]),
      // :297-299 setCollectionID, :504-506 the Backend, :527-531 userInputSetter (held, read by nothing)
      on: (_s, port, v) => (port === 'collectionName' || port === 'backendId' ? onRecordPort(port, v) : { send: [] })
    },
    // the frame's scheduled callbacks, in order
    afterInputs: (s, _i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      const st: RecordState = { ...s };
      const r: Reaction = { pulses: [] };
      const send: Array<'error'> = [];
      const outcomes: Array<{ port: 'fetch'; outcome: 'done' | 'failure'; error?: string }> = [];
      let call: { id: string; op: string; backend: string; args: Record<string, unknown> } | undefined;
      for (const job of s.jobs) {
        if (job === 'bind') {
          setModel(st, w, undefined, r); // :292-296 — outside any Repeater nothing resolves
          continue;
        }
        // :408-409 — the batch, taken
        const n = st.presses;
        st.presses = 0;
        st.fetchScheduled = false;
        if (job === 'read' && n === 0 && !st.collectionId) {
          r.pulses.push('fetched'); // v5 readOnBind — nothing to read from, so the bind announces itself
          continue;
        }
        if (emptyId(st.modelId)) {
          st.error = MISSING_ID_MESSAGE; // :411-414 — and a null Id (v4, D22)
          send.push('error');
          outcomes.push(...failures(n));
          continue;
        }
        const backend = w.backendFor(st.backendId); // :419-425
        if (backend === undefined) {
          st.error = NO_BACKEND_MESSAGE(st.backendId);
          send.push('error');
          outcomes.push(...failures(n));
          continue;
        }
        // :428-430
        const id = 'fetch:' + st.nextCall++;
        call = { id, op: 'fetch', backend, args: { collection: st.collectionId, objectId: st.modelId } };
        st.calls = { ...st.calls, [id]: n };
      }
      st.jobs = [];
      const patch = {
        set: changes(s, st, ['bound', 'error', 'jobs', 'fetchScheduled', 'presses', 'calls', 'nextCall']),
        send,
        pulses: r.pulses,
        outcomes
      };
      return call ? { ...patch, backend: call } : patch;
    },
    world: {
      backend: (s, i, answer, w) => {
        const n = s.calls[answer.id] ?? 0;
        if (!('ok' in answer)) return { set: { error: answer.error || 'Failed to fetch.' }, send: ['error'], outcomes: failures(n) }; // :454-456
        // :432 → cloudstore.js _fromJSON :407-422 — the record under the answer's objectId, its class the Class AS IT IS
        // NOW, every key but objectId and ACL written; a write that differs on the record this node is ALREADY bound
        // to is heard by its listener (:136-145) — written here, beside the write
        const item = answer.ok as Record<string, unknown>;
        const st: RecordState = { ...s };
        const r: Reaction = { pulses: [] };
        const m = w.registry.model(item.objectId);
        const already = s.bound !== undefined && m.getId() === s.bound;
        m._class = s.collectionId;
        for (const key in item) {
          if (key === 'objectId' || key === 'ACL') continue;
          if (Array.isArray(item[key]) && sameList(m.get(key), item[key] as unknown[])) continue; // v3, C49
          const differs = m.get(key) !== item[key];
          m.set(key, item[key]);
          if (already && differs) react(st, w, key, i['runOnChange-record'], r);
        }
        // :433-441 — a different record: the subscription moves, quietly (no Fetched here — that comes below)
        if (!already) {
          if (s.bound !== undefined) w.unwatch({ model: s.bound });
          st.bound = m.getId();
          w.watch({ model: st.bound });
        }
        w.send('id', st); // :442
        for (const key in item) if (key !== 'objectId' && w.hasOutput('prop-' + key)) w.send('prop-' + key, st); // :444-449
        // :451-452 — Fetched, then the batch's outcome
        return { set: changes(s, st, ['bound']), send: [], pulses: [...r.pulses, 'fetched'], outcomes: dones(n) };
      },
      // :136-145 onModelChangedCallback — the bound record, any key, written by ANOTHER node
      change: (s, i, e: ChangeEvent, w) => {
        if (e.kind !== 'model' || e.id !== s.bound || !i['runOnChange-record']) return { send: [] };
        const key = String(e.name);
        return { sendDerived: w.hasOutput('prop-' + key) ? ['prop-' + key] : [], emitDerived: w.hasOutput('changed-' + key) ? ['changed-' + key] : [], emit: ['changed'], send: [] };
      }
    }
  }
);
