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

import type { InputDecl, ValueInputDecl, WorldView } from '../spec';
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
    type: 'component',
    coerce: 'none',
    displayName: 'Repeater Component',
    group: 'General',
    description: 'Names which Repeater supplies the current record when Id Source is From repeater; leave blank to use the nearest enclosing one',
    examples: ['Row', '']
  },
  // :540-555
  modelId: {
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
