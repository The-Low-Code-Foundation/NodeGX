/**
 * What the Record family shares (Create / Update / Delete Record, Add / Remove Record Relation) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/dbmodelcrudbase.ts` on 2026-10-02 (NSP-014 s21): the
 * mixins `addBaseInfo` (:119-470) and `addModelId` (:471-656), as the five nodes compose them. This file is
 * their spec-side twin; each node's spec supplies what its own runtime file supplies.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE BACKEND (world.ts BACKEND, R9): a Record node talks to a backend through the backend contract's
 * operations (`delete({ collection, objectId })`, …) — the spec states the operation, never the wire. Its
 * `Backend` input (a dynamic port, :186-194, stored raw) is resolved when the operation goes out (:283-301,
 * `CloudStore.forBackend`): a backend the project does not have FAILS the batch with a sentence naming the
 * input's value (:294-297) and makes no call.
 *
 * THE FAILURE FUNNEL (:324-335, `setError`): `Error` is set and sent FIRST, then every invocation of the
 * batch reports `failure` with the family's one code, `record/storage-op-failed` (:88). Error is never
 * cleared — "kept after a later attempt succeeds" (:166).
 *
 * THE PRE-FLIGHT (:244-254, `checkWarningsBeforeCloudOp`), at the PRESS, before the frame-end deferral: a
 * falsy Class (`collectionName`, a dynamic port stored raw by `setCollectionID`, :593-596) fails THAT press
 * at once — `No class name specified` — and it joins no batch. A Class cleared after the press and before
 * the frame end is not re-checked: the operation goes out with it (measured s21, probe P11).
 *
 * THE RECORD (:471-656, `addModelId`), as the Object family binds one (object-crud-base.ts): `Id` binds the
 * record of that name the moment it arrives — a record handed in becomes its id (:550), an EMPTY id
 * (`undefined`, `null`, `''`) binds nothing (:622-625), anything else reaches its record create-on-read
 * (:627) — and `Id` is re-sent (:630-633); the `Id` output reads the bound record's id, else the raw input
 * (:567). `Id Source` = `From repeater` binds the enclosing Repeater's item at the frame end (:520, :579-583);
 * a node outside one binds NOTHING (foreachitem.ts) — then a press fails `Missing Record Id` while `Id` still
 * shows the raw input (measured s21, probe P13).
 */

import type { BackendField, InputDecl, PortContext, SignalOutputDecl, ValueInputDecl, ValueType, WorldView } from '../spec';
import { emptyId, errorOutput } from './data-base';

/** :88 — the one code every Record-family failure reports. */
export const RECORD_FAILURE_CODE = 'record/storage-op-failed';

/** :249 */
export const NO_CLASS_MESSAGE = 'No class name specified';

/** :294-297 — `${this._internal.backendId}`, the input's value through a template literal. */
export const NO_BACKEND_MESSAGE = (backendId: unknown) => `The backend this node is set to ("${String(backendId)}") is not configured in this project.`;

/** What every Record node's state holds of the record it binds (`addModelId`). */
export type RecordIdState = {
  /** `_internal.modelId` — the raw input, after a record handed in became its id (:550-551) */
  modelId: unknown;
  /** the bound record's id — `_internal.model.getId()`; `undefined` when nothing is bound */
  bound: string | undefined;
  /** `_internal.idSource` — `undefined` until written (a declared default never runs its setter) */
  idSource: unknown;
  /** `_internal.repeaterComponent` (:534) */
  repeaterComponent: unknown;
  /** `_internal.collectionId` — the Class (:594) */
  collectionId: unknown;
  /** `_internal.backendId` — the Backend (:192) */
  backendId: unknown;
  /** `_internal.error` (:325) */
  error: string | undefined;
};

export const RECORD_ID_STATE: RecordIdState = { modelId: undefined, bound: undefined, idSource: undefined, repeaterComponent: undefined, collectionId: undefined, backendId: undefined, error: undefined };

/** :503-561 — the three inputs `addModelId` declares, in the catalog's words. */
export const RECORD_ID_INPUTS = {
  // :504-522
  idSource: {
    type: 'enum',
    enums: ['explicit', 'foreach'],
    default: 'explicit',
    coerce: 'none',
    editOnly: true,
    displayName: 'Id Source',
    group: 'General',
    description: 'Whether the record comes from the Id input or from the record the surrounding Repeater is on'
  },
  // :527-539
  repeaterComponent: {
    when: (p: Readonly<Record<string, unknown>>) => p.idSource === 'foreach',
    type: 'component',
    coerce: 'none',
    displayName: 'Repeater Component',
    group: 'General',
    description: 'Names which Repeater supplies the current record when Id Source is From repeater; leave blank to use the nearest enclosing one',
    examples: ['Row', '']
  },
  // :540-555
  modelId: {
    when: (p: Readonly<Record<string, unknown>>) => p.idSource === 'explicit' || p.idSource === undefined,
    type: 'string',
    coerce: 'none',
    displayName: 'Id',
    group: 'General',
    description: 'Id of the record this node acts on; a record itself is accepted here as well as its Id',
    examples: ['r1', 'r1', 'r1', 'r2', 'r2', 'm1', '', null] // weighted, as the Class is
  }
} as const;

/** :560-569 — the `Id` output */
export const RECORD_ID_OUTPUT = {
  type: 'string',
  displayName: 'Id',
  group: 'General',
  description: 'Id of the record this node last acted on, which on Create Record is the Id the backend assigned',
  from: (s: Readonly<RecordIdState>) => (s.bound !== undefined ? s.bound : s.modelId)
} as const;

/** :162-170 — the `Error` output */
export const RECORD_ERROR_OUTPUT = errorOutput('Why the most recent attempt failed, kept after a later attempt succeeds', (s: Readonly<RecordIdState>) => s.error);

/** record-ports.ts :130-140 — the Class dropdown; its values come from the backend's schema, so it is registered on first write (:634-640) and stored raw. */
const classPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName: 'Class', group: 'General', examples: ['Lesson', 'Lesson', 'Lesson', 'Note', 'Note', '', null] }); // weighted: a press reaches the backend only with a Class

/**
 * schema-ports.ts :546-571 — the Backend picker, in group General for this family (record-ports.ts :120); registered on
 * first write (:186-194) and stored raw. Edit-only (`allowEditOnly`, :564): what the panel can hold — `_active_`, an id the
 * project has, or one a saved project still names after the backend was removed (`nope`).
 */
const backendPort = (): ValueInputDecl => ({ type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', examples: ['_active_', 'main', 'other', 'nope'] });

/** The two dynamic ports every Record node registers on first write. */
export function discoverRecordPort(port: string): InputDecl | undefined {
  if (port === 'collectionName') return classPort();
  if (port === 'backendId') return backendPort();
  return undefined;
}

export const RECORD_CANDIDATES = ['collectionName', 'backendId'];

// ------------------------------------------------------------------------------------------------
// NSP-020 s82 — what the EDITOR draws for the family from the project (record-ports.ts, schema-ports.ts), as one pure
// function of `(params, context)`. At play the context has no `schema` and no `backends` (spec.ts `PlayContext`), so the
// same functions draw nothing here and the node has its params and its wires — which is what the runtime has.

/** record-ports.ts :78-81 — the two classes every Parse-wire project has whether or not it has been introspected, offered first. */
export const PARSE_SYSTEM_CLASSES = ['_User', '_Role'] as const;

/**
 * record-ports.ts :124-140 `recordClassPorts` → schema-ports.ts :616-650 `collectionPorts`: the Class dropdown — an enum of
 * the system classes the schema does not list, then every class of the schema, no placeholder entry, in group General.
 * Announced for EVERY Record node, with or without a schema (the hook runs at `nodeAdded`, dbmodelnode2.ts :548-571), so
 * it is derived whenever the editor asks; `classPort` above is what a write to it registers at play.
 */
export function classPickerPort(context: Readonly<PortContext>): ValueInputDecl {
  return classPicker(classPort(), context);
}

/** The same dropdown over a node's own `collectionName` decl (its words and its examples — what a sequence draws from). */
export function classPicker(base: ValueInputDecl, context: Readonly<PortContext>): ValueInputDecl {
  const classes = Object.keys(context.schema?.classes ?? {});
  // :126-131 — only on the Parse wire: "offering `_User` on a Directus backend would be a class that does not exist"
  const added = onParseWire(context) ? PARSE_SYSTEM_CLASSES.filter((c) => !classes.includes(c)) : [];
  const enums = [...added, ...classes];
  // the words are the added system classes' only: a class the schema lists shows its name, `_User` included
  const labels = Object.fromEntries(added.map((c) => [c, SYSTEM_CLASS_LABELS[c]]));
  return { ...base, type: 'enum', enums, editOnly: true, labels };
}

/** record-ports.ts :78-81 — the words the Class dropdown shows for the system classes; a schema class shows its name. */
const SYSTEM_CLASS_LABELS: Readonly<Record<string, string>> = { _User: 'User', _Role: 'Role' };

/**
 * schema-ports.ts :546-571 `backendPickerPorts` through record-ports.ts :119-121 (`hideWhenSingleBackend`, group General): the
 * Backend dropdown — `Active Backend` (`_active_`) then each backend by id, default `_active_` — drawn only when the project
 * has two or more backends (P107-S80-BACKENDPICKER). `backendPort` above is what a write to it registers at play.
 */
export function backendPickerPort(context: Readonly<PortContext>): Record<string, ValueInputDecl> {
  const backends = context.backends ?? [];
  if (backends.length <= 1) return {};
  const labels = Object.fromEntries([['_active_', 'Active Backend'], ...backends.map((b) => [b.id, b.name])]);
  return { backendId: { ...backendPort(), type: 'enum', enums: ['_active_', ...backends.map((b) => b.id)], default: '_active_', labels } };
}

/** The class the node's Class names, when the schema has it — record-ports.ts `recordSchemaContext` :84-99 `selectedCollection`. */
export function selectedClass(params: Readonly<Record<string, unknown>>, context: Readonly<PortContext>): { fields: Readonly<Record<string, BackendField>> } | undefined {
  return typeof params.collectionName === 'string' ? context.schema?.classes[params.collectionName] : undefined;
}

/**
 * The class's columns a port is drawn for, in order — schema-ports.ts :378 hides `ACL` ("access control, not data") and
 * `shouldShowField` :87-105 drops a hidden one; `skipRelations` is the Record node's `skipRelationColumns` (dbmodelnode2.ts
 * :562-564), the writes keep them.
 */
export function shownFields(klass: { fields: Readonly<Record<string, BackendField>> } | undefined, skipRelations: boolean): Array<[string, BackendField]> {
  return Object.entries(klass?.fields ?? {}).filter(([field, decl]) => field !== 'ACL' && !(skipRelations && decl.relation !== undefined));
}

/** record-ports.ts :147-149 `isParseWireContext` — the selected backend speaks the Parse wire: no type recorded, `parse` or `nodegx`. */
export function onParseWire(context: Readonly<PortContext>): boolean {
  const type = context.schema?.backendType;
  return type === undefined || type === 'parse' || type === 'nodegx';
}

/**
 * record-ports.ts :211-221 `recordPortType` — a Parse column's port type from `PARSE_PORT_TYPES` (:63-68): String, Number,
 * Boolean and Date keep theirs, and "anything not in the table has always produced `'*'`" — Object, Array, Pointer, a Relation.
 * A column with no Parse type (`enhanced`, P107-S85-RESTCOLTYPES) keeps the type schema-ports.ts `getEnhancedFieldType` gave it.
 */
export function recordFieldType(decl: BackendField): ValueType {
  if (decl.relation !== undefined) return '*';
  if (decl.enhanced) return decl.type;
  return decl.type === 'string' || decl.type === 'number' || decl.type === 'boolean' || decl.type === 'date' ? decl.type : '*';
}

/** A column's port as `recordPortType` announces it: its type and, for a select column, its choices (schema-ports.ts :126-133). */
export function recordFieldPort(decl: BackendField): { type: ValueType; enums?: readonly string[] } {
  const type = recordFieldType(decl);
  return type === 'enum' && decl.enums !== undefined ? { type, enums: decl.enums } : { type };
}

/**
 * P107-S101-JSFILTERVALUES (s102) — dbcollectionnode2.ts :1459-1487 and aggregatenode.js :635-662, the same lines in both: the
 * Javascript filter's variable ports, read from the SAVED script (an unset one draws none: the default query is not read). The
 * script with its comments removed by the hook's own strip, one `storageFilterValue-<name>` per `$name` in order of first
 * use, then javascriptnodeparser.js :333-338 — one per `Inputs.name` not already drawn. Each is `*` and connections only, in
 * group Filter Values; drawn, never driven (a play does not accept the name, `discover`). The parser's `Inputs["name"]` form
 * is announced with `plug: 'inputs'` (:341-346), a plug the editor never offers as an input, so it draws nothing here.
 */
export function filterValuePorts(script: unknown): Record<string, ValueInputDecl> {
  const out: Record<string, ValueInputDecl> = {};
  if (typeof script !== 'string' || !script) return out;
  const code = script.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  const names = (code.match(/\$[A-Za-z0-9]+/g) ?? []).map((v) => v.slice(1));
  for (const m of code.matchAll(/Inputs\.([A-Za-z0-9_]+)/g)) names.push(m[1]);
  for (const name of names)
    if (!('storageFilterValue-' + name in out)) out['storageFilterValue-' + name] = { type: '*', coerce: 'none', connectionsOnly: true, displayName: name, group: 'Filter Values', undriven: 'the Javascript filter is not in this spec (header)' };
  return out;
}

/**
 * dbmodelcrudbase.ts `_updatePorts` :373-385 — what the editor draws first for every CRUD node (Create / Update / Delete
 * Record, Add / Remove Record Relation): the Backend picker with two or more backends, then the Class dropdown. At play
 * the context has neither, and a write registers each (`discoverRecordPort`).
 */
export function recordCrudInputs(context: Readonly<PortContext>): Record<string, ValueInputDecl> {
  return { ...backendPickerPort(context), collectionName: classPickerPort(context) };
}

/**
 * record-ports.ts :260-285 `recordWiredFieldNames` — "the wire is the declaration" (P77 SBR-008): the field names a
 * `prop-<field>` PARAMETER or a wire INTO or OUT OF the node names, in first-seen order, each once.
 */
export function recordWiredFieldNames(params: Readonly<Record<string, unknown>>, context: Readonly<PortContext>): string[] {
  const names: string[] = [];
  const add = (port: string) => {
    if (!port.startsWith('prop-')) return;
    const field = port.slice('prop-'.length);
    if (field.length > 0 && !names.includes(field)) names.push(field);
  };
  for (const key of Object.keys(params)) add(key);
  for (const port of context.wired ?? []) add(port);
  for (const port of context.wiredOutputs ?? []) add(port);
  return names;
}

/** The `<field> Changed` signal beside a property output (record-ports.ts :189-197; dbmodelnode2.ts :478-480 registers it on a wire). */
export function changedSignal(field: string): SignalOutputDecl {
  return { type: 'signal', displayName: field + ' Changed', group: 'Events', description: 'Fires when the ' + field + ' property of the bound record changes' };
}

/** :593-596 setCollectionID, :190-193 the Backend setter — both stored raw. */
export function onRecordPort(port: string, value: unknown): { set: Partial<RecordIdState>; send: [] } {
  if (port === 'collectionName') return { set: { collectionId: value }, send: [] };
  return { set: { backendId: value }, send: [] };
}

/** :550-551 → setModelID :621-628 → setModel :630-633. `isRecord` / `model` are the registry's (world.ts REGISTRY). */
export function bindId(value: unknown, w: Pick<WorldView, 'registry'>): Partial<RecordIdState> {
  const v = w.registry.isRecord(value) ? value.getId() : value;
  if (emptyId(v)) return { modelId: v, bound: undefined };
  return { modelId: v, bound: w.registry.model(v).getId() };
}
