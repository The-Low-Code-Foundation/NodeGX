/**
 * BYOB + admin route families.
 *
 * BYOB (`/api/:table`) is the existing local-backend REST surface the BYOB
 * nodes and the Data Browser speak — moved from the in-editor
 * `LocalBackendServer.js`, with one fix: the old handlers `await`ed the
 * adapter's callback-style methods (which return undefined), so they could
 * never actually answer with data. They now go through IStorageFacade.
 * Responses stay storage-shaped (no Parse `__type` envelopes) — that is the
 * shape these clients have always been written against.
 *
 * Admin (`/admin/*`, `/executions*`) is the supervisor-facing surface the
 * editor's BackendManager proxies its IPC handlers to. It is what replaces the
 * in-process `server.getAdapter()` reach-ins.
 *
 * @module nodegx-backend/server/byob-admin
 */

import type * as http from 'http';

import { whenTargetGoesProblems, type IStorageFacade, type StorageSeries, type WhenTargetGoes } from '@noodl/backend-contract';
import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { WorkflowRunner } from '../workflow/WorkflowRunner';
import type { RequestContext } from './HttpServer';
import { assertSeriesWrite } from './series-door';
import { seriesProblem } from '@noodl/runtime/src/api/adapters/series';
import type { ClpOp } from '../security/model';
import type {
  StorageCheckDecl,
  StorageCheckStatus,
  StorageColumn,
  StorageIndexStatus,
  StorageSupabaseExportOptions
} from '@noodl/backend-contract';
import { validateAclShape } from '../security/model';
import { isVisibleAccountColumn, accountWriteRefusal } from '../users/accountColumns';
import { bundleWiringProblems } from '../workflow/bundleWiring';
import { declaredFunctionsIn, type FunctionDeclaration } from '../workflow/functionDeclarations';

/** P109 ISL-040: SB-016's rule for functions arriving after start (`SecurityState.undeclaredOnDeploy`). */
export type DeployGate = (arriving: FunctionDeclaration[]) => { refused: boolean; message: string } | null;

/** The four columns every record carries; never a person's to drop. */
const SYSTEM_FIELDS: readonly string[] = ['objectId', 'createdAt', 'updatedAt', 'ACL'];

/**
 * BMG-003: the engines' two sentences for "a NOT NULL column added over rows
 * with nothing to fill it" — SQLite's at the DDL, PostgreSQL's at the queue —
 * as one of ours, or null for any other error.
 */
function requiredNeedsDefault(e: unknown, table: string, column: StorageColumn | undefined): HttpError | null {
  const message = e instanceof Error ? e.message : String(e);
  if (!/Cannot add a NOT NULL column with default value NULL|contains null values/.test(message)) return null;
  const name = column && column.name ? `"${column.name}"` : 'a required field';
  return new HttpError(
    400,
    `${name} can be required here only with a value for the records "${table}" already has: each of them needs one. ` +
      'Say what they get (fillExisting — once, not a default), or add it as optional.',
    142,
    { reason: 'required-needs-default', collection: table, field: column ? column.name : undefined }
  );
}

/** Whether a declared check reads this column (BMG-003 — the drop refusal). */
/** P116 ONT-003 — `{ description }` when it is words, `{}` otherwise: absent on the wire, never empty. */
function describedAs(value: unknown): { description?: string } {
  return typeof value === 'string' && value.trim() ? { description: value.trim() } : {};
}

function checkReads(rule: StorageCheckDecl, column: string): boolean {
  if ('exactlyOne' in rule) return rule.exactlyOne.includes(column);
  if ('allOrNone' in rule) return rule.allOrNone.includes(column);
  return rule.field === column;
}
import { summariseModelCalls } from '../execution/modelCost';
import { executionKind, isExecutionKind } from '../execution/kind';
import {
  checkViolationToHttp,
  createErrorToHttp,
  HttpError,
  readJSONBody,
  sendJSON,
  splitCapped,
  stillLinkedToHttp,
  notWhileToHttp,
  uniqueViolationToHttp
} from './http-util';

function parseJSON(value: string | undefined, name: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError(400, `Invalid ${name} parameter`);
  }
}

/**
 * SPR-001/F84 — a write through `/api/:table` may set `ACL`, so it has to be
 * shape-checked here too.
 *
 * `stampCreate` has validated the create path since BAK-003 and `classPut`
 * validates the Parse-wire update, but this route — the one the Data Browser
 * writes through — did not. `{"ACL": {"someone": 5}}` was stored verbatim, and
 * a mis-shaped ACL is not inert: `canAccessRecord` matches on
 * `entry[access] === true`, so a nonsense entry silently means *nobody*.
 * Now that F84 puts an editable ACL cell in front of people, a typo there must
 * come back as a 400 the panel can show, not as a row that has quietly
 * disappeared for every caller.
 *
 * `null`/`undefined` stay legal — that is how an ACL is cleared.
 */
/**
 * BMG-004 — what the BYOB door sends for a `_User` row. Measured before this
 * existed: `GET /api/_User` handed the scrypt hash to the browser (the `/classes`
 * door has always stripped it, `AdapterFacade.toWire`), and a `password` column
 * — which only a BYOB write could have created, in plain text — came back as
 * written. Neither is shown to anybody, admin or not.
 */
function forWire<T>(table: string, record: T): T {
  if (table !== '_User' || !record || typeof record !== 'object') return record;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (isVisibleAccountColumn(key)) out[key] = value;
  }
  return out as T;
}

/**
 * BMG-004 — a `_User` write that would store a password as text, or write the
 * backend's own `_` columns. Refused rather than hashed here: the admin user
 * routes are the door that hashes, revokes sessions on a change and audits it,
 * and a second door doing half of that is how the two drift.
 */
function assertAccountWrite(table: string, data: Record<string, unknown> | undefined | null): void {
  if (table !== '_User' || !data) return;
  for (const key of Object.keys(data)) {
    // P109 ISL-040: the admin-only flags too (`adminAccess`, `disabled`, `emailVerified`), not only `_` columns and the password.
    const refusal = accountWriteRefusal(key, '/api/_User');
    if (refusal) throw new HttpError(400, refusal);
  }
}

function assertAclShape(data: Record<string, unknown> | undefined | null): void {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'ACL')) return;
  const error = validateAclShape(data.ACL);
  if (error) throw new HttpError(400, `Invalid ACL: ${error}`, 123);
}

/**
 * One table as `/admin/schema` describes it. `columns` is `unknown[]` because
 * the SchemaManager it comes from is untyped JS in `@noodl/runtime` — that part
 * is PLAT-003's, not this task's — but the envelope around it is knowable and
 * is what every consumer actually indexes into.
 */
export interface SchemaTable {
  name: string;
  columns: unknown[];
  createdAt: string | null;
  /**
   * FED-002 — every declared index and whether SQLite has it, plus anything
   * built that nothing declares. Absent (not empty) on an adapter too old to
   * answer, which is a different fact from "this collection has no indexes".
   */
  indexes?: StorageIndexStatus[];
  /** HLT-016 — every declared check and whether it is enforced. Absent on an adapter too old to answer. */
  checks?: StorageCheckStatus[];
  /** P116 ONT-003 — the collection's description, when it was created with one. */
  description?: string;
}

/** `GET /admin/schema` and `GET /api/_schema`. */
export interface SchemaResponse {
  tables: SchemaTable[];
}

/** `GET /admin/schema/:table`. */
export interface TableSchemaResponse {
  name: string;
  columns: unknown[];
  /** FED-002 — see {@link SchemaTable.indexes}. */
  indexes?: StorageIndexStatus[];
  /** HLT-016 — see {@link SchemaTable.checks}. */
  checks?: StorageCheckStatus[];
  /** P116 ONT-003 — see {@link SchemaTable.description}. */
  description?: string;
}

/** `POST /admin/schema` — one of the five mutation actions. */
export interface SchemaMutationResponse {
  success: boolean;
  action: 'createTable' | 'addColumn' | 'renameColumn' | 'renameTable' | 'describeTable' | 'setWhenTargetGoes' | 'setSeries' | 'changeColumnType' | 'deleteTable' | 'setIndexes' | 'setChecks' | 'dropColumn';
  table: string;
  /** Present on createTable / deleteTable: whether the DDL actually ran. */
  created?: boolean;
  deleted?: boolean;
  /** BMG-003 — dropColumn: whether the column was there to drop. */
  dropped?: boolean;
  /** P116 ONT-007 — renameTable: the collection's name now (`table` is the name it had). */
  renamedTo?: string;
  column?: string;
  // ── changeColumnType (AAQ-002) ────────────────────────────────────────────
  /** Whether the column's type actually moved (false when it already matched). */
  changed?: boolean;
  /** The type it had before. */
  from?: string;
  /** Whether stored values had to be converted, rather than metadata alone. */
  rebuilt?: boolean;
  /** How many non-null values went through `CAST`, and so could have been lost. */
  convertedValues?: number;
  // ── setIndexes (FED-002) ──────────────────────────────────────────────────
  //
  // Prefixed, because `created` was already taken by createTable and means a
  // boolean there. Two fields a wire-reader has to tell apart by the action
  // they arrived with is exactly the drift PLAT-004 keeps finding.
  /** Derived names of the indexes this push created (a changed one is here, not in `indexesDropped`). */
  indexesCreated?: string[];
  /** Derived names it dropped — a declaration that is gone from the list. */
  indexesDropped?: string[];
  /** Already built in exactly this shape, so nothing was done to them. */
  indexesKept?: string[];
  /** Every declared index on the collection afterwards, and whether it is built. */
  indexes?: StorageIndexStatus[];
  // ── setChecks (HLT-016) ───────────────────────────────────────────────────
  checksCreated?: string[];
  checksDropped?: string[];
  checksKept?: string[];
  /** Every declared check on the collection afterwards, and whether it is enforced. */
  checks?: StorageCheckStatus[];
}

/**
 * What `GET /admin/schema-export` hands the Supabase generator (BRG-004).
 *
 * Both fields come from OUTSIDE this route — the live security config from the
 * service, the claim name from the caller — because both are facts the
 * generator would otherwise have to invent, and inventing them is what BRG-D1
 * was.
 */
export interface SchemaExportOptions {
  security?: StorageSupabaseExportOptions['security'];
  /** The JWT claim carrying the NodeGX `_User` objectId. No default. */
  userIdClaim?: string;
}


/** P116 R10 — 400 in words for a `whenTargetGoes` the backend could never keep (`targetGoes.ts`). */
function refuseUnkeptLinkRules(table: string, columns: StorageColumn[]): void {
  const problems = whenTargetGoesProblems(table, columns);
  if (problems.length) throw new HttpError(400, problems.join(' '));
}
export class ByobAdminRoutes {
  private readonly facade: IStorageFacade;
  private readonly executions: ExecutionHistory;
  private readonly getRunner: () => WorkflowRunner | null;

  constructor(facade: IStorageFacade, executions: ExecutionHistory, getRunner: () => WorkflowRunner | null) {
    this.facade = facade;
    this.executions = executions;
    this.getRunner = getRunner;
  }

  // ==========================================================================
  // BYOB: /api/:table
  // ==========================================================================

  async query(ctx: RequestContext): Promise<void> {
    const query = ctx.query;
    const options = {
      where: parseJSON(query.where, 'where'),
      sort: parseJSON(query.sort, 'sort') as unknown as string[] | undefined,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
      skip: query.skip ? parseInt(query.skip, 10) : 0,
      count: query.count === '1' || query.count === 'true',
      acl: ctx.acl('read')
    };
    const result = await this.facade.rawQuery(ctx.params.table, options);
    const { results, count } = result;
    // PRD-001: the same header the Parse routes set. The BYOB body is ours and
    // could have carried it; it does not, so there is one answer to "was this
    // capped?" rather than two that can drift (see `splitCapped`).
    sendJSON(
      ctx.res,
      200,
      { results: results.map((r) => forWire(ctx.params.table, r)), count: count !== undefined ? count : results.length },
      splitCapped(result).headers
    );
  }

  async fetch(ctx: RequestContext): Promise<void> {
    try {
      const record = await this.facade.rawFetch(ctx.params.table, ctx.params.id, ctx.acl('read'));
      sendJSON(ctx.res, 200, forWire(ctx.params.table, record));
    } catch {
      throw new HttpError(404, 'Record not found');
    }
  }

  async create(ctx: RequestContext): Promise<void> {
    const data = await readJSONBody(ctx.req);
    assertAccountWrite(ctx.params.table, data);
    assertSeriesWrite(ctx.principal, this.facade.schemaManager, ctx.params.table, data);
    ctx.stampCreate(ctx.params.table, data);
    let record: Record<string, unknown>;
    try {
      record = await this.facade.rawCreate(ctx.params.table, data);
    } catch (e) {
      // FED-002: `data` is passed so a unique-index refusal can name the value
      // as well as the field. This is the door the Data Browser writes through,
      // and a 500 saying `UNIQUE constraint failed: Item.id` in a panel is not
      // something a person can act on.
      throw createErrorToHttp(e, data, this.facade.schemaManager);
    }
    sendJSON(ctx.res, 201, forWire(ctx.params.table, record));
  }

  async save(ctx: RequestContext): Promise<void> {
    const data = await readJSONBody(ctx.req);
    assertAclShape(data);
    assertAccountWrite(ctx.params.table, data);
    try {
      const record = await this.facade.rawSave(ctx.params.table, ctx.params.id, data, ctx.acl('write'));
      sendJSON(ctx.res, 200, forWire(ctx.params.table, record));
    } catch (e) {
      const settled = notWhileToHttp(e);
      if (settled) throw settled;
      // FED-002: an edit refused by a unique index is a conflict, not a missing
      // row — the same distinction `classPut` draws.
      const message = e instanceof Error ? e.message : String(e);
      const conflict = uniqueViolationToHttp(message, data);
      if (conflict) throw conflict;
      const broke = checkViolationToHttp(message, this.facade.schemaManager);
      if (broke) throw broke;
      throw new HttpError(404, 'Record not found');
    }
  }

  async delete(ctx: RequestContext): Promise<void> {
    // POL-014 slice 2. The adapter's DELETE only reports "Object not found" when
    // an ACL predicate is in play; an admin delete of a row that isn't there
    // removes nothing, throws nothing, and this route answered `{deleted: true}`
    // — which is how the Data Browser could accept a confirm, delete nothing and
    // show no error. `fetch` and `save` already 404 for a missing row; so does
    // this now, and for the same reason.
    // The probe is a `fetch` under the *write* ACL, not `existsSync`: it is the
    // same query `GET /api/:table/:id` runs, so it behaves identically in
    // ephemeral (mock-SQL) mode, and a row the caller may not write answers like
    // a missing one — which is the existence hiding the adapter already does.
    try {
      await this.facade.rawFetch(ctx.params.table, ctx.params.id, ctx.acl('write'));
    } catch {
      throw new HttpError(404, 'Record not found');
    }
    try {
      await this.facade.rawDelete(ctx.params.table, ctx.params.id, ctx.acl('write'));
    } catch (e) {
      // P116 R10: a link's `blocks` rule refusing is a 409 that says what links to it, not a 404.
      throw stillLinkedToHttp(e) || notWhileToHttp(e) || new HttpError(404, 'Record not found');
    }
    sendJSON(ctx.res, 200, { deleted: true, objectId: ctx.params.id });
  }

  async batch(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const operations = body.operations;
    if (!Array.isArray(operations)) {
      throw new HttpError(400, 'operations must be an array');
    }

    const results: unknown[] = [];
    for (const op of operations as Record<string, unknown>[]) {
      try {
        // Per-operation enforcement: the batch route can't be gated as a whole
        // (each op names its own collection and method).
        const collection = op.collection as string;
        const clpOp: ClpOp = op.method === 'create' ? 'create' : op.method === 'save' ? 'update' : 'delete';
        switch (op.method) {
          case 'create': {
            ctx.checkData(collection, clpOp);
            const data = (op.data as Record<string, unknown>) || {};
            assertAccountWrite(collection, data);
            assertSeriesWrite(ctx.principal, this.facade.schemaManager, collection, data);
            ctx.stampCreate(collection, data);
            results.push(forWire(collection, await this.facade.rawCreate(collection, data)));
            break;
          }
          case 'save':
            ctx.checkData(collection, clpOp);
            assertAclShape(op.data as Record<string, unknown>);
            assertAccountWrite(collection, op.data as Record<string, unknown>);
            await this.facade.rawSave(
              collection,
              op.objectId as string,
              op.data as Record<string, unknown>,
              ctx.acl('write', collection)
            );
            results.push({ success: true });
            break;
          case 'delete':
            ctx.checkData(collection, clpOp);
            await this.facade.rawDelete(collection, op.objectId as string, ctx.acl('write', collection));
            results.push({ deleted: true });
            break;
          default:
            results.push({ error: `Unknown method: ${String(op.method)}` });
        }
      } catch (e) {
        // P116 R10: a refused delete says why, in the shape the single-record door answers with.
        // P116 ONT-012: and so does a write an `onlyWhile` rule refused.
        const linked = stillLinkedToHttp(e) || notWhileToHttp(e);
        results.push(linked ? { error: linked.message, ...linked.extra } : { error: e instanceof Error ? e.message : String(e) });
      }
    }

    sendJSON(ctx.res, 200, { results });
  }

  // ==========================================================================
  // Schema: /api/_schema (BYOB-compat) + /admin/schema
  // ==========================================================================

  /**
   * `withAccounts` — BMG-004, `/admin/schema` only. `listTables()` leaves out
   * every `_`-prefixed table on purpose (the MCP tool surface and the Supabase
   * export both lean on that), so the accounts table was missing from the page
   * that is supposed to add fields to it. It is appended here, for the admin
   * listing, with the backend's own columns hidden — and NOT on the BYOB
   * `/api/_schema`, whose readers never asked for it.
   */
  getSchema(res: http.ServerResponse, withAccounts = false): void {
    const sm = this.facade.schemaManager;
    if (!sm) throw new HttpError(500, 'Schema manager not available');
    const tables: string[] = sm.listTables();
    const accounts = withAccounts ? sm.getTableSchema('_User') : null;
    const schemas: { name: string; columns?: unknown[]; createdAt?: string; description?: string }[] = sm.exportSchemas();
    sendJSON(res, 200, {
      tables: tables.map((name) => {
        const schema = schemas.find((s) => s.name === name);
        return {
          name,
          columns: schema?.columns || [],
          createdAt: schema?.createdAt || null,
          ...describedAs(schema?.description),
          ...this.indexesOf(name),
          ...this.checksOf(name)
        };
      }).concat(
        accounts
          ? [
              {
                name: '_User',
                columns: ((accounts.columns || []) as Array<{ name: string }>).filter((c) => isVisibleAccountColumn(c.name)),
                createdAt: null,
                ...this.indexesOf('_User'),
                ...this.checksOf('_User')
              }
            ]
          : []
      )
    } satisfies SchemaResponse);
  }

  getTableSchema(res: http.ServerResponse, tableName: string): void {
    const sm = this.facade.schemaManager;
    if (!sm) throw new HttpError(500, 'Schema manager not available');
    const schema = sm.getTableSchema(tableName);
    if (!schema) throw new HttpError(404, `No such table: ${tableName}`);
    const columns = (schema.columns || []) as Array<{ name: string }>;
    sendJSON(res, 200, {
      name: tableName,
      columns: tableName === '_User' ? columns.filter((c) => isVisibleAccountColumn(c.name)) : columns,
      ...describedAs(schema.description),
      ...this.indexesOf(tableName),
      ...this.checksOf(tableName)
    } satisfies TableSchemaResponse);
  }

  /**
   * FED-002 — `{ indexes: [...] }` for a collection, or `{}` on an adapter that
   * cannot answer. The two are deliberately different on the wire: an empty
   * array says "this collection declares no indexes", and an absent key says
   * "this backend cannot tell you", which is what the dashboard has to render
   * differently.
   */
  private checksOf(tableName: string): { checks?: StorageCheckStatus[] } {
    const sm = this.facade.schemaManager;
    if (!sm || typeof sm.checkStatus !== 'function') return {};
    try {
      return { checks: sm.checkStatus(tableName) };
    } catch {
      return { checks: [] };
    }
  }

  private indexesOf(tableName: string): { indexes?: StorageIndexStatus[] } {
    const sm = this.facade.schemaManager;
    if (!sm || typeof sm.indexStatus !== 'function') return {};
    try {
      return { indexes: sm.indexStatus(tableName) };
    } catch {
      // A table listed by `_Schema` that no longer exists reads as no indexes,
      // not as a 500 on the whole schema listing.
      return { indexes: [] };
    }
  }

  /**
   * `POST /admin/schema` — one of the six mutation actions.
   *
   * Takes the whole context since FED-002: a schema push has to be able to
   * ENRICH its audit entry (`ctx.audit`) with the index names it created or
   * dropped, which is §3.4's "the execution record of a schema push names the
   * indexes it created or dropped". The dispatcher still writes the entry;
   * handlers never create one.
   */
  async mutateSchema(ctx: RequestContext): Promise<void> {
    const req = ctx.req;
    const res = ctx.res;
    const body = await readJSONBody(req);
    const sm = this.facade.schemaManager;
    if (!sm) throw new HttpError(500, 'Schema manager not available');

    // Unvalidated wire values: the SchemaManager is the validator and throws.
    // Each conversion is written down here rather than the whole `sm` arriving
    // as `any`, which is how these five reads used to typecheck (PLAT-004).
    const table = body.table as string;
    switch (body.action) {
      case 'createTable': {
        // FED-002: `indexes` rides along with the columns, because that is how
        // a schema is pushed — one declaration per collection, not a table
        // created here and its unique constraints remembered somewhere else.
        // `createTable` is create-if-absent, so the reconcile runs afterwards
        // either way: a push against a table that already exists is exactly the
        // case where a declaration has CHANGED.
        // P116 ONT-003: a collection made from what a person said carries their sentence. It is
        // kept with the table's declaration on both engines and never interpreted; like the rest
        // of `createTable` it is written once — a changed description is ONT-007's migration (`describeTable`).
        const description = describedAs(body.description).description;
        // P116 R10: a link's "when it goes" rule that could never be kept is refused, not stored.
        refuseUnkeptLinkRules(table, (body.columns as StorageColumn[] | undefined) || []);
        // P116 ONT-015: so is a series that could not be handed out (no counter, a number column, …).
        for (const c of (body.columns as StorageColumn[] | undefined) || []) {
          const problem = seriesProblem(c.name, c.series, c.type);
          if (problem) throw new HttpError(400, problem);
        }
        const created = sm.createTable({
          name: table,
          columns: (body.columns as StorageColumn[] | undefined) || [],
          ...(description ? { description } : {})
        });
        // HLT-016: `checks` rides along the same way, and is applied first: a
        // push refused by its rows is refused before any index is built.
        const checkReport = body.checks === undefined ? null : await this.applyChecks(ctx, table, body.checks);
        const report = body.indexes === undefined ? null : await this.applyIndexes(ctx, table, body.indexes);
        sendJSON(res, 200, {
          success: true,
          action: 'createTable',
          created,
          table,
          ...(checkReport || {}),
          ...(report || {})
        } satisfies SchemaMutationResponse);
        return;
      }
      case 'setChecks': {
        const report = await this.applyChecks(ctx, table, body.checks);
        sendJSON(res, 200, { success: true, action: 'setChecks', table, ...report } satisfies SchemaMutationResponse);
        return;
      }
      case 'setIndexes': {
        const report = await this.applyIndexes(ctx, table, body.indexes);
        sendJSON(res, 200, {
          success: true,
          action: 'setIndexes',
          table,
          ...report
        } satisfies SchemaMutationResponse);
        return;
      }
      case 'addColumn':
        // BMG-003: a required column over rows needs a value for them on both
        // engines (SQLite refuses the DDL outright; PostgreSQL refuses it at the
        // queue) — R6: `column.fillExisting`, written once, never a default —
        // and either refusal is the person's to act on — so it is 400 in words,
        // and the queue is awaited here so it reaches the person who added the
        // field rather than whoever writes the next record.
        refuseUnkeptLinkRules(table, body.column ? [body.column as StorageColumn] : []);
        try {
          sm.addColumn(table, body.column as StorageColumn);
        } catch (e) {
          throw requiredNeedsDefault(e, table, body.column as StorageColumn) || new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        await this.awaitSchemaQueue(ctx, table, undefined, body.column as StorageColumn);
        sendJSON(res, 200, { success: true, action: 'addColumn', table } satisfies SchemaMutationResponse);
        return;
      case 'renameColumn':
        // P116-ONT-007-renamecolumn: refused like a drop. A rename that went through left a rule or an
        // index naming a field that is gone, still reported built, and the same declaration pushed again
        // was refused. A world migration takes them off first and puts them back after.
        this.refuseIfInUse(table, body.oldName as string, 'rename');
        try {
          sm.renameColumn(table, body.oldName as string, body.newName as string);
        } catch (e) {
          const err = e as { code?: string; message?: string };
          if (err && err.code === 'COLUMN_IN_USE') throw new HttpError(409, String(err.message));
          throw e;
        }
        sendJSON(res, 200, { success: true, action: 'renameColumn', table } satisfies SchemaMutationResponse);
        return;
      case 'renameTable': {
        // P116 ONT-007: a noun the person calls something else now. Optional on the interface,
        // like `deleteTable`. The adapter refuses while an index, a check or a search index is
        // built under the old name (`TABLE_IN_USE`, 409) — a world migration takes them off
        // first and puts them back after. Permission rules kept under the old name are NOT
        // moved here: the migration's reach names them (ONT-007 §6).
        if (typeof sm.renameTable !== 'function') {
          throw new HttpError(501, 'This adapter cannot rename a collection.');
        }
        const newName = body.newName as string;
        if (typeof newName !== 'string' || !newName) throw new HttpError(400, 'Say what the collection is called now (newName).');
        try {
          sm.renameTable(table, newName);
        } catch (e) {
          const err = e as { code?: string; message?: string };
          if (err && err.code === 'TABLE_IN_USE') throw new HttpError(409, String(err.message));
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        await this.awaitSchemaQueue(ctx, table);
        ctx.audit({ renamedTable: `${table} → ${newName}` });
        sendJSON(res, 200, { success: true, action: 'renameTable', table, renamedTo: newName } satisfies SchemaMutationResponse);
        return;
      }
      case 'describeTable': {
        // P116 ONT-007 s11: the words on a collection (and its fields), said again — a changed answer
        // that changes only what the store does not keep. Never interpreted; `_User` keeps the backend's.
        if (typeof sm.describeTable !== 'function') {
          throw new HttpError(501, 'This adapter cannot say again what a collection is.');
        }
        if (table.startsWith('_')) throw new HttpError(400, `"${table}" is one of the backend's own collections; its words are the backend's.`);
        const columns = body.columns === undefined ? {} : body.columns;
        if (!columns || typeof columns !== 'object' || Array.isArray(columns) || !Object.values(columns).every((v) => v === null || typeof v === 'string')) {
          throw new HttpError(400, 'Say each field\'s words as { "<field>": "<words>" } (null takes them away).');
        }
        if (body.description !== null && typeof body.description !== 'string') throw new HttpError(400, 'Say the collection\'s words as text (description), or null to take them away.');
        try {
          sm.describeTable(table, body.description as string | null, columns as Record<string, string | null>);
        } catch (e) {
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        await this.awaitSchemaQueue(ctx, table);
        ctx.audit({ describedTable: table, fields: Object.keys(columns) });
        sendJSON(res, 200, { success: true, action: 'describeTable', table } satisfies SchemaMutationResponse);
        return;
      }
      case 'setWhenTargetGoes': {
        // P116 R10: per link, what happens to a record when the one it points at goes — a changed
        // answer. Only the declaration changes here; every delete keeps it (`AdapterFacade.rawDelete`).
        if (typeof sm.setWhenTargetGoes !== 'function') {
          throw new HttpError(501, 'This adapter cannot say what happens to a link when its record goes.');
        }
        const columns = body.columns;
        if (!columns || typeof columns !== 'object' || Array.isArray(columns) || !Object.values(columns).every((v) => v === null || typeof v === 'string')) {
          throw new HttpError(400, 'Say each link\'s rule as { "<field>": "goes-too" | "stays-unlinked" | "blocks" } (null takes it away).');
        }
        const rules = columns as Record<string, WhenTargetGoes | null>;
        const now = sm.getTableSchema(table);
        if (!now) throw new HttpError(404, `No such table: ${table}`);
        refuseUnkeptLinkRules(
          table,
          (now.columns || []).filter((c) => rules[c.name]).map((c) => ({ ...c, whenTargetGoes: rules[c.name] as WhenTargetGoes }))
        );
        try {
          sm.setWhenTargetGoes(table, rules);
        } catch (e) {
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        await this.awaitSchemaQueue(ctx, table);
        ctx.audit({ setWhenTargetGoes: table, fields: Object.keys(rules) });
        sendJSON(res, 200, { success: true, action: 'setWhenTargetGoes', table } satisfies SchemaMutationResponse);
        return;
      }
      case 'setSeries': {
        // P116 ONT-015 §3.3: a series put on (or taken off) a field the collection has. Putting one numbers
        // the records holding none, in the order they were made, above the highest number held — in the store,
        // in one transaction (the counter must move with the numbers). A migration's step (ONT-007).
        if (typeof sm.setSeries !== 'function') throw new HttpError(501, 'This adapter cannot hand out numbers.');
        const columns = body.columns;
        if (!columns || typeof columns !== 'object' || Array.isArray(columns) || !Object.values(columns).every((v) => v === null || (!!v && typeof v === 'object' && !Array.isArray(v)))) {
          throw new HttpError(400, 'Say each field\'s series as { "<field>": { "format": "INV-{YYYY}-{####}", "restart"?, "gapFree"? } } (null takes it off).');
        }
        const now = sm.getTableSchema(table);
        if (!now) throw new HttpError(404, `No such table: ${table}`);
        const series = columns as Record<string, StorageSeries | null>;
        for (const [field, option] of Object.entries(series)) {
          const col = (now.columns || []).find((c) => c.name === field);
          if (!col) throw new HttpError(400, `"${table}" has no field "${field}"`);
          const problem = option === null ? null : seriesProblem(field, option, col.type);
          if (problem) throw new HttpError(400, problem);
        }
        try {
          sm.setSeries(table, series);
        } catch (e) {
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        await this.awaitSchemaQueue(ctx, table);
        ctx.audit({ setSeries: table, fields: Object.keys(series) });
        sendJSON(res, 200, { success: true, action: 'setSeries', table } satisfies SchemaMutationResponse);
        return;
      }
      case 'changeColumnType': {
        // AAQ-002. Optional on the interface (an older adapter predates it), so
        // its absence is a 501 rather than an `is not a function` at request time.
        if (typeof sm.changeColumnType !== 'function') {
          throw new HttpError(501, 'This adapter cannot change a column type.');
        }
        // BMG-003 §5: SQLite rebuilds a column by add-copy-DROP-rename, and a
        // DROP COLUMN fails on a column a trigger or an index reads; a check that
        // still parsed would then grade values of the wrong type anyway. Refuse
        // in words, naming what to take away first, rather than relay the engine.
        this.refuseIfInUse(table, body.column as string, 'change the type of');
        const result = sm.changeColumnType(table, body.column as string, body.type as string);
        sendJSON(res, 200, {
          success: true,
          action: 'changeColumnType',
          table,
          ...result
        } satisfies SchemaMutationResponse);
        return;
      }
      case 'dropColumn': {
        // BMG-003 §3.3. Optional on the interface, like `deleteTable`.
        if (typeof sm.dropColumn !== 'function') {
          throw new HttpError(501, 'This adapter cannot drop a column.');
        }
        const column = body.column as string;
        if (typeof column !== 'string' || !column) throw new HttpError(400, 'Say which column to drop.');
        if (SYSTEM_FIELDS.includes(column)) {
          throw new HttpError(400, `"${column}" is set by the backend on every record and cannot be dropped.`);
        }
        if (table === '_User' && !isVisibleAccountColumn(column)) {
          throw new HttpError(400, `"${column}" is one of the backend's own account fields and cannot be dropped.`);
        }
        if (table === '_User' && (column === 'username' || column === 'email')) {
          throw new HttpError(400, `"${column}" is how a person signs in and cannot be dropped.`);
        }
        this.refuseIfInUse(table, column, 'drop');
        let dropped: boolean;
        try {
          dropped = sm.dropColumn(table, column);
        } catch (e) {
          const err = e as { code?: string; message?: string };
          if (err && err.code === 'COLUMN_IN_USE') throw new HttpError(409, String(err.message));
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
        ctx.audit({ droppedColumn: `${table}.${column}` });
        sendJSON(res, 200, { success: true, action: 'dropColumn', table, column, dropped } satisfies SchemaMutationResponse);
        return;
      }
      case 'deleteTable': {
        // `deleteTable` is optional on the interface because `schema-migrate`
        // feature-detects it; here its absence is a real 501, not a crash.
        if (typeof sm.deleteTable !== 'function') {
          throw new HttpError(501, 'This adapter cannot delete tables.');
        }
        const deleted = sm.deleteTable(table);
        sendJSON(res, 200, { success: true, action: 'deleteTable', deleted, table } satisfies SchemaMutationResponse);
        return;
      }
      default:
        throw new HttpError(
          400,
          `Unknown schema action: ${String(body.action)}. Expected one of createTable, addColumn, ` +
            'renameColumn, renameTable, describeTable, setWhenTargetGoes, setSeries, changeColumnType, dropColumn, deleteTable, setIndexes, setChecks.'
        );
    }
  }

  /**
   * BMG-003 — a column a declared index (over it, or in its `where`), a check
   * or a search opt-in reads is refused for a drop, a rename or a type change,
   * naming what reads it (AC4). The
   * adapters refuse the same way; this is the sentence the page shows, and it
   * runs first so the two engines answer identically.
   *
   * @private
   */
  private refuseIfInUse(table: string, column: string, verb: string): void {
    const sm = this.facade.schemaManager;
    if (!sm) return;
    const indexes = typeof sm.indexStatus === 'function' ? sm.indexStatus(table) : [];
    const index = indexes.find((i) => i.declared !== false && ((i.fields || []).includes(column) || Object.keys(i.where || {}).includes(column)));
    if (index) {
      throw new HttpError(
        409,
        `Cannot ${verb} "${column}": the index ${index.name} (${(index.fields || []).join(', ')}${index.unique ? ', unique' : ''}) ` +
          'reads it. Drop that index first.'
      );
    }
    const checks = typeof sm.checkStatus === 'function' ? sm.checkStatus(table) : [];
    const check = checks.find((c) => c.declared && checkReads(c.rule, column));
    if (check) {
      throw new HttpError(409, `Cannot ${verb} "${column}": the rule "${check.description}" reads it. Remove that rule first.`);
    }
  }

  /**
   * P99 HLT-016 W5. On PostgreSQL a reconcile is QUEUED (BRG-005) and a refusal
   * surfaces on "the next data-plane call" — which, after a push, was always
   * the audit write for this very request. `AuditLog.record` never throws, so
   * the refusal was logged there and dropped: the push answered 200, the
   * person's next write succeeded, and the trail lost the entry. Waiting for
   * the queue here is what makes the refusal reach the person who pushed.
   *
   * @private
   */
  private async awaitSchemaQueue(ctx: RequestContext, table: string, described?: Map<string, string>, column?: StorageColumn): Promise<void> {
    const sm = this.facade.schemaManager;
    const barrier = (sm as { barrier?: () => Promise<void> } | undefined)?.barrier;
    if (typeof barrier !== 'function') return;
    try {
      await barrier.call(sm);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const needsDefault = column ? requiredNeedsDefault(e, table, column) : null;
      if (needsDefault) throw needsDefault;
      if (/UNIQUE constraint failed/.test(message)) {
        ctx.audit({ indexesRefused: { table, engine: 'postgres' } });
        throw new HttpError(
          409,
          `Cannot build the unique indexes declared for "${table}": rows already in it share a value ` +
            `(${message.replace(/^.*UNIQUE constraint failed: /, '')}). Nothing was changed and no row was deleted.`,
          137
        );
      }
      // The queued error names the operation first: `reconcileChecks("T") failed
      // on PostgreSQL: CHECK constraint failed: T.chk_…`.
      const m = /CHECK constraint failed: [A-Za-z0-9_]+\.(chk_[A-Za-z0-9_]+)/.exec(message);
      const check = m ? { check: m[1] } : null;
      if (check) {
        ctx.audit({ checksRefused: { table, engine: 'postgres', check: check.check } });
        // Read from what was pushed: by now the model has rolled the declaration back.
        const description = described?.get(check.check) ?? check.check;
        throw new HttpError(
          409,
          `Cannot require "${description}" on "${table}": rows already in it break it. ` +
            'Nothing was changed and no row was deleted.',
          142
        );
      }
      throw new HttpError(500, message);
    }
  }

  /**
   * HLT-016 — reconcile one collection's checks and report what happened. A
   * mis-shaped declaration is 400; rows that already break a new check are
   * 409 with the count (SQLite) or PostgreSQL's refusal (at the queue).
   *
   * @private
   */
  private async applyChecks(
    ctx: RequestContext,
    table: string,
    checks: unknown
  ): Promise<{ checksCreated: string[]; checksDropped: string[]; checksKept: string[]; checks: StorageCheckStatus[] }> {
    const sm = this.facade.schemaManager;
    if (!sm || typeof sm.reconcileChecks !== 'function') {
      throw new HttpError(501, 'This adapter cannot declare checks.');
    }
    let report;
    try {
      report = sm.reconcileChecks(table, checks);
    } catch (e) {
      const err = e as { code?: string; message?: string; violations?: number; check?: string };
      if (err && err.code === 'CHECK_VIOLATIONS') {
        ctx.audit({ checksRefused: { table, check: err.check, violations: err.violations } });
        throw new HttpError(409, String(err.message), 142, { violations: err.violations, check: err.check });
      }
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }
    const described = new Map((this.checksOf(table).checks || []).map((c) => [c.name, c.description]));
    await this.awaitSchemaQueue(ctx, table, described);
    ctx.audit({ checksCreated: report.created, checksDropped: report.dropped });
    return {
      checksCreated: report.created,
      checksDropped: report.dropped,
      checksKept: report.kept,
      checks: this.checksOf(table).checks || []
    };
  }

  /**
   * FED-002 — reconcile one collection's indexes and report what happened.
   *
   * Three refusals, each answered as the caller's mistake rather than a 500:
   * a mis-shaped declaration (400), an adapter that cannot do indexes at all
   * (501), and — the one that matters — a unique index the rows already in the
   * table would refuse (409, carrying the duplicate count and three of the
   * offending values). The last one changes nothing: no index is created, none
   * is dropped, and no row is deleted to make room.
   *
   * @private
   */
  private async applyIndexes(
    ctx: RequestContext,
    table: string,
    indexes: unknown
  ): Promise<{ indexesCreated: string[]; indexesDropped: string[]; indexesKept: string[]; indexes: StorageIndexStatus[] }> {
    const sm = this.facade.schemaManager;
    if (!sm || typeof sm.reconcileIndexes !== 'function') {
      throw new HttpError(501, 'This adapter cannot declare indexes.');
    }

    let report;
    try {
      report = sm.reconcileIndexes(table, indexes);
    } catch (e) {
      const err = e as { code?: string; message?: string; duplicates?: number; samples?: unknown[][] };
      if (err && err.code === 'INDEX_DUPLICATES') {
        // AC4. The push is REFUSED, and the audit entry says so with the
        // numbers — an operator who reads "refused" without them has to go and
        // find the duplicates themselves.
        ctx.audit({ indexesRefused: { table, duplicates: err.duplicates, samples: err.samples } });
        throw new HttpError(409, String(err.message), 137, {
          duplicates: err.duplicates,
          samples: err.samples
        });
      }
      throw new HttpError(400, e instanceof Error ? e.message : String(e));
    }

    await this.awaitSchemaQueue(ctx, table);

    ctx.audit({ indexesCreated: report.created, indexesDropped: report.dropped });
    return {
      indexesCreated: report.created,
      indexesDropped: report.dropped,
      indexesKept: report.kept,
      indexes: this.indexesOf(table).indexes || []
    };
  }

  exportSchema(res: http.ServerResponse, format: string, options?: SchemaExportOptions): void {
    const sm = this.facade.schemaManager;
    if (!sm) throw new HttpError(500, 'Schema manager not available');

    // BRG-001: both generators are OPTIONAL on `IStorageSchema` — they are a
    // migration concern that only the SQLite schema manager implements, and an
    // adapter without them must answer rather than crash. Same 501 the index
    // routes above give, for the same reason.
    //
    // BRG-004 repaired what they emit (relations, declared indexes, and the row
    // ACL translated into real policies). The part that shows up HERE is that
    // they now REFUSE: anything the export cannot carry across comes back as a
    // 409 naming the construct, rather than as SQL that looks fine.
    let content: string;
    try {
      if (format === 'postgres') {
        if (typeof sm.generatePostgresSQL !== 'function') {
          throw new HttpError(501, 'This adapter cannot export PostgreSQL schema.');
        }
        content = sm.generatePostgresSQL();
      } else if (format === 'supabase') {
        if (typeof sm.generateSupabaseSQL !== 'function') {
          throw new HttpError(501, 'This adapter cannot export Supabase schema.');
        }
        content = sm.generateSupabaseSQL({
          security: options && options.security,
          userIdClaim: options && options.userIdClaim
        });
      } else {
        content = JSON.stringify(sm.exportSchemas(), null, 2);
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      const err = e as { code?: string; message?: string; construct?: string; table?: string };
      if (err && err.code === 'CANNOT_CROSS') {
        // 409, the same answer a unique-index refusal gives: the request is
        // well-formed and the state of the data or the config is what refuses.
        // No Parse error code: 137 is `duplicate value` and this is not one.
        // `construct` is the machine-readable half — a carry report groups by
        // it, and a sentence cannot be grouped by.
        throw new HttpError(409, String(err.message), undefined, { construct: err.construct, table: err.table });
      }
      throw e;
    }


    sendJSON(res, 200, { format: format || 'json', content });
  }

  // ==========================================================================
  // Workflows: /admin/workflows*
  // ==========================================================================

  workflowStatus(res: http.ServerResponse): void {
    const runner = this.getRunner();
    sendJSON(res, 200, runner ? runner.getStatus() : { initialized: false, workflowCount: 0, functions: [] });
  }

  /**
   * `gate` (P109 ISL-040, P78-DBT-UNRULED): SB-016's rule for the functions this bundle declares, asked
   * before anything loads — refused on a public bind (409), a `warning` on loopback.
   */
  async updateWorkflow(req: http.IncomingMessage, res: http.ServerResponse, name: string, gate?: DeployGate): Promise<void> {
    const runner = this.getRunner();
    if (!runner) throw new HttpError(503, 'Workflows not initialized');
    const body = await readJSONBody(req);
    const verdict = gate ? gate(declaredFunctionsIn(body, name)) : null;
    // `success: false` too: the editor's and the MCP door's deploy clients read that field, not the status.
    if (verdict && verdict.refused) throw new HttpError(409, verdict.message, undefined, { success: false });
    // P109 ISL-042 (P78-DBT-BUNDLEWIRES): a bundle whose wires connect nothing is refused, and a wire into a
    // component port the component does not declare is named, before either reads as a 30-second hang.
    const wiring = bundleWiringProblems(body);
    if (wiring.refusals.length > 0) {
      throw new HttpError(400, `Not deployed: ${wiring.refusals.join(' ')}`, undefined, { success: false });
    }
    const result = await runner.loadWorkflow(name, body);
    const warnings = [...(verdict ? [verdict.message] : []), ...wiring.warnings];
    sendJSON(res, result.success ? 200 : 500, warnings.length ? { ...result, warning: warnings.join('\n\n') } : result);
  }

  async deleteWorkflow(res: http.ServerResponse, name: string): Promise<void> {
    const runner = this.getRunner();
    if (!runner) throw new HttpError(503, 'Workflows not initialized');
    const result = await runner.deleteWorkflow(name);
    sendJSON(res, result.success ? 200 : 500, result);
  }

  async reloadWorkflows(res: http.ServerResponse, gate?: () => ReturnType<DeployGate>): Promise<void> {
    const verdict = gate ? gate() : null;
    // `success: false` too: the editor's and the MCP door's deploy clients read that field, not the status.
    if (verdict && verdict.refused) throw new HttpError(409, verdict.message, undefined, { success: false });
    const runner = this.getRunner();
    if (!runner) throw new HttpError(503, 'Workflows not initialized');
    const result = await runner.reloadWorkflows();
    sendJSON(res, 200, verdict ? { ...result, warning: verdict.message } : result);
  }

  // ==========================================================================
  // Executions: /executions*
  // ==========================================================================

  /**
   * `GET /executions` — the list, filtered.
   *
   * BMG-009 added the Runs page's rows: `kind` (workflow / function / backup /
   * maintenance, derived from the record's metadata), `name` (contains),
   * `trigger` (the registered trigger that started it), `since` / `until`
   * (an instant, as ISO text or epoch ms; `startedAfter` / `startedBefore`
   * remain as the ms spelling) and `minDurationMs`. A parameter the route
   * cannot read is a 400 in words, not a silently unfiltered list. The answer
   * stays a BARE ARRAY (`admin-dashboard.test.ts` names that seam); the page
   * count rides the `X-Total-Count` header.
   */
  listExecutions(res: http.ServerResponse, query: Record<string, string>): void {
    if (query.kind && !isExecutionKind(query.kind)) {
      throw new HttpError(400, `"${query.kind}" is not a kind of run: workflow, function, backup or maintenance.`);
    }
    const q = {
      workflowId: query.workflowId || undefined,
      status: query.status || undefined,
      triggerType: query.triggerType || undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
      startedAfter: instantParam('since', query.since) ?? (query.startedAfter ? parseInt(query.startedAfter, 10) : undefined),
      startedBefore: instantParam('until', query.until) ?? (query.startedBefore ? parseInt(query.startedBefore, 10) : undefined),
      // PRD-002: `?capped=true` names the runs whose record hit a size bound.
      capped: query.capped === 'true' ? true : query.capped === 'false' ? false : undefined,
      kind: isExecutionKind(query.kind) ? query.kind : undefined,
      nameContains: query.name || undefined,
      triggerId: query.trigger || undefined,
      minDurationMs: query.minDurationMs ? numberParam('minDurationMs', query.minDurationMs) : undefined
    };
    const result = this.executions.list(q);
    /**
     * FED-003 §5.5 / FED-006 AC5 — the cost sentence on the LIST as well as on the row.
     *
     * §3.4's first screenshot is the execution list, and "which of these runs was expensive" is a
     * question a list can answer at a glance or not at all. The arithmetic is the same derivation
     * `getExecution` uses; a run that called no model gets no field, so the column is absent
     * rather than a page of zeros.
     */
    const decorated = result.map((row) => {
      const modelCost = summariseModelCalls((row as { metadata?: unknown }).metadata);
      const kind = executionKind((row as { metadata?: unknown }).metadata);
      return modelCost ? { ...row, kind, modelCost } : { ...row, kind };
    });
    sendJSON(res, 200, decorated, { 'X-Total-Count': String(this.executions.count(q)) });
  }

  getExecution(res: http.ServerResponse, id: string): void {
    const result = this.executions.get(id);
    if (!result) throw new HttpError(404, 'Execution not found');
    // FED-003 §3.4 — what the run spent on models, summed here rather than by each of the three
    // readers of this route. Derived, never stored: see `execution/modelCost.ts`.
    const modelCost = summariseModelCalls(result.metadata);
    const kind = executionKind(result.metadata);
    sendJSON(res, 200, modelCost ? { ...result, kind, modelCost } : { ...result, kind });
  }
}

/** `since` / `until`: epoch ms, or anything `Date.parse` reads. Absent → undefined; unreadable → 400. */
function instantParam(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const ms = Date.parse(raw);
  if (isNaN(ms)) throw new HttpError(400, `"${name}" must be a date or a time in milliseconds, not "${raw}".`);
  return ms;
}

function numberParam(name: string, raw: string): number {
  const n = Number(raw);
  if (raw.trim() === '' || isNaN(n) || n < 0) throw new HttpError(400, `"${name}" must be a number of milliseconds, not "${raw}".`);
  return n;
}
