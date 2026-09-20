/**
 * Parse-wire data routes — the subset the runtime clients actually emit
 * (`cloudstore.js`; sessions live in ./users.ts, functions in the HttpServer
 * against the WorkflowRunner):
 *
 *   POST   /classes/:c            query (body._method === 'GET'), create, or upsert
 *   GET    /classes/:c            query via query-string (count calls)
 *   GET    /classes/:c/:id        fetch (include=)
 *   PUT    /classes/:c/:id        save / Increment / AddRelation / RemoveRelation
 *   DELETE /classes/:c/:id        delete
 *   GET    /aggregate/:c          group aggregates + distinct
 *   GET    /config                { params } — filtered per caller (FH-018)
 *
 * Explicitly NOT implemented (the clients never call them): live queries, push,
 * GraphQL, client schema management.
 *
 * BAK-003: collection-level permission gates run in the HttpServer dispatcher
 * before these handlers; the handlers apply the ROW level by passing the
 * caller's acl context (ctx.acl) into every facade call, and accept the
 * client-supplied ACL field the Create/Set Record nodes emit (WF-004 used to
 * strip it). Row-level denials answer 404/101, indistinguishable from a
 * missing row.
 *
 * @module nodegx-backend/server/parse-wire
 */

import type { IStorageFacade, StorageQueryOptions as QueryOptions } from '@noodl/backend-contract';
import type { RequestContext } from './HttpServer';
import { validateAclShape } from '../security/model';
import {
  cappedHeaders,
  createErrorToHttp,
  HttpError,
  readJSONBody,
  sendJSON,
  splitCapped,
  uniqueViolationToHttp
} from './http-util';

/**
 * FED-002 — the upsert header: `X-NodeGX-Upsert: <field>` on a create.
 *
 * A header rather than a body key or a query param because it is a property of
 * the REQUEST, not of the record: everything in the body is stored, and a
 * `__upsertOn` key in there would be a field a caller could not name. Node's
 * header names arrive lower-cased.
 */
const UPSERT_HEADER = 'x-nodegx-upsert';

/** One request header, trimmed, or '' — Node lower-cases the names it parses. */
function headerValue(ctx: RequestContext, name: string): string {
  const raw = ctx.req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
}

function parseJSONParam(value: string | undefined, name: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError(400, `Invalid ${name} parameter`);
  }
}

/** Map the wire query fields (from body or query-string) to adapter options. */
/**
 * FED-005 exports this: the MCP `_find` tool takes `where`/`order`/`limit`/
 * `skip`, which is this function's input shape, and a second reading of what
 * those four words mean is a second answer to "does `order` accept a comma
 * list?".
 */
export function toQueryOptions(src: Record<string, unknown>): QueryOptions {
  const options: QueryOptions = {};
  if (src.where !== undefined) {
    options.where =
      typeof src.where === 'string' ? parseJSONParam(src.where as string, 'where') : (src.where as Record<string, unknown>);
  }
  if (src.limit !== undefined) options.limit = parseInt(String(src.limit), 10);
  if (src.skip !== undefined) options.skip = parseInt(String(src.skip), 10);
  if (src.order !== undefined && src.order !== null && src.order !== '') {
    options.sort = String(src.order)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (src.keys !== undefined && src.keys !== null && src.keys !== '') {
    options.select = String(src.keys)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (src.include !== undefined && src.include !== null && src.include !== '') {
    options.include = String(src.include)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (src.count !== undefined && src.count !== null && String(src.count) !== '0' && src.count !== false) {
    options.count = true;
  }
  return options;
}

/** True when a PUT body is an operator update (`__op` values). */
function extractOps(body: Record<string, unknown>): {
  increments: Record<string, number>;
  addRelations: { key: string; targetObjectId: string }[];
  removeRelations: { key: string; targetObjectId: string }[];
  plain: Record<string, unknown>;
} {
  const increments: Record<string, number> = {};
  const addRelations: { key: string; targetObjectId: string }[] = [];
  const removeRelations: { key: string; targetObjectId: string }[] = [];
  const plain: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    const op = value && typeof value === 'object' ? (value as Record<string, unknown>).__op : undefined;
    if (op === 'Increment') {
      increments[key] = Number((value as Record<string, unknown>).amount) || 0;
    } else if (op === 'AddRelation' || op === 'RemoveRelation') {
      const objects = ((value as Record<string, unknown>).objects as Record<string, unknown>[]) || [];
      for (const obj of objects) {
        const entry = { key, targetObjectId: String(obj.objectId) };
        (op === 'AddRelation' ? addRelations : removeRelations).push(entry);
      }
    } else {
      plain[key] = value;
    }
  }

  return { increments, addRelations, removeRelations, plain };
}

/**
 * A `config-params.json` entry that declares its own visibility, rather than a
 * bare value that is visible to everyone.
 *
 *     { "welcome": "hi",
 *       "stripeKey": { "value": "sk_live_…", "masterKeyOnly": true } }
 *
 * Only an object that *explicitly carries the flag key* is a wrapper — an
 * ordinary object param such as `{"theme":{"value":1}}` is left alone, because
 * guessing would silently rewrite someone's data. `secret` is accepted as a
 * synonym of `masterKeyOnly`: the flag name comes from Parse, the word people
 * reach for does not.
 */
function visibilityFlag(value: unknown): { secret: boolean; value: unknown } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const hasFlag =
    Object.prototype.hasOwnProperty.call(entry, 'masterKeyOnly') ||
    Object.prototype.hasOwnProperty.call(entry, 'secret');
  if (!hasFlag) return null;
  return { secret: entry.masterKeyOnly === true || entry.secret === true, value: entry.value };
}

/**
 * FH-018 — what `GET /config` is allowed to say to *this* caller.
 *
 * Parse excluded `masterKeyOnly` params from the public `/config` response and
 * we did not: the handler used to take only `res`, so it could not filter even
 * in principle. `privileged` is `principal.kind === 'admin'` — the master key
 * and the admin bearer token both resolve there, which is what a cloud function
 * presents (`_noodl_cloudservices.masterKey`).
 *
 * Fail-closed on purpose: an entry that declares itself secret is *omitted*, not
 * blanked, so an unprivileged caller cannot even learn the key exists. There is
 * no dev-open escape hatch here; the dispatcher's `devOpenActive` relaxes the
 * route gate, never this.
 */
export function visibleConfigParams(
  raw: Record<string, unknown>,
  privileged: boolean
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const marked = visibilityFlag(value);
    if (!marked) {
      out[key] = value;
      continue;
    }
    if (marked.secret && !privileged) continue;
    out[key] = marked.value;
  }
  return out;
}

export class ParseWireRoutes {
  private readonly facade: IStorageFacade;
  private readonly getConfigParams: () => Record<string, unknown>;

  constructor(facade: IStorageFacade, getConfigParams: () => Record<string, unknown>) {
    this.facade = facade;
    this.getConfigParams = getConfigParams;
  }

  /** POST /classes/:collection — Parse's query-tunnelling or a create. */
  async classesPost(ctx: RequestContext): Promise<void> {
    const collection = ctx.params.collection;
    // The dispatcher pre-read the body to resolve the operation (find vs create).
    const body = ctx.body || {};

    if (body._method === 'GET') {
      const options = toQueryOptions(body);
      options.acl = ctx.acl('read');
      // BAK-008: a non-empty `search` switches this from a plain query to an
      // FTS5-ranked search (still ANDed with `where`/ACL). `find` CLP already
      // gates this branch (see HttpServer's byBody->'find' resolution), so
      // search inherits the same collection-level permission as a query.
      const searchTerm = typeof body.search === 'string' ? body.search.trim() : '';
      let result;
      if (searchTerm) {
        try {
          result = await this.facade.wireSearch(collection, { ...options, search: searchTerm });
        } catch (e) {
          // "Search is not enabled for ..." (LocalSQLAdapter) is a caller
          // mistake, not a server fault — a clear 400 beats a generic 500.
          throw new HttpError(400, e instanceof Error ? e.message : String(e));
        }
      } else {
        result = await this.facade.wireQuery(collection, options);
      }
      // PRD-001: a capped page says so in a header, and the annotation never
      // reaches the Parse body.
      const capped = splitCapped(result);
      sendJSON(ctx.res, 200, capped.body, capped.headers);
      return;
    }

    delete body._method;

    // FED-002: `X-NodeGX-Upsert: <field>` turns this create into "make sure
    // there is exactly one row with this value". It is checked before anything
    // is stamped, because the update half must not have a create's ACL applied
    // over the owner the row already has.
    const upsertOn = headerValue(ctx, UPSERT_HEADER);
    if (upsertOn) {
      await this.classesUpsert(ctx, collection, body, upsertOn);
      return;
    }

    // Client-supplied ACLs are accepted (the Create Record node's Access
    // Control Rules emit them). stampCreate validates the shape and applies
    // owner + template ACL per the collection's creator-owns setting.
    ctx.stampCreate(collection, body);
    let record: Record<string, unknown>;
    try {
      record = await this.facade.rawCreate(collection, body);
    } catch (e) {
      throw createErrorToHttp(e, body);
    }
    // Parse's create response: objectId + createdAt only. The client merges its
    // own data over this — returning wire-typed fields here would leak `__type`
    // envelopes into model data un-deserialized (create responses skip
    // _deserializeJSON on the client).
    sendJSON(ctx.res, 201, { objectId: record.objectId, createdAt: record.createdAt });
  }

  /**
   * FED-002 §3.3 — the whole dedupe story: `Parse Feed` → `for-each` →
   * `Create Record (upsertOn: id)` writes each item once however many times the
   * schedule fires and however many people follow the source.
   *
   * Four things this deliberately does NOT do:
   *
   *  - **It does not accept any field.** The named field must be covered by a
   *    single-field UNIQUE index that is actually built. Without one, "the row
   *    that already has this value" is not a single row, and an upsert over a
   *    non-unique column is a silent data-loser: it would update an arbitrary
   *    one of the matches and leave the rest. That is AC3's 400.
   *  - **It does not widen access.** The request is gated as a `create` by the
   *    dispatcher; the update half asks for `update` as well, here, because it
   *    can update a row. A caller with create and no update gets a 403 rather
   *    than an update it was not entitled to make.
   *  - **It does not read past the ACL.** The lookup runs with the caller's
   *    WRITE predicate, so a row it may not write is a row it does not find —
   *    and the create that follows then hits the unique index and answers 409,
   *    which is the same answer it would get without the header. No existence
   *    oracle appears.
   *  - **It does not trust the gap.** Between the lookup and the insert another
   *    writer can land the same value; the index catches it, and the retry
   *    turns that into the update it was always going to be. One retry, not a
   *    loop: a second failure is a real conflict and is answered as one.
   */
  private async classesUpsert(
    ctx: RequestContext,
    collection: string,
    body: Record<string, unknown>,
    field: string
  ): Promise<void> {
    this.assertUpsertable(collection, field);

    const value = body[field];
    if (value === undefined || value === null) {
      throw new HttpError(
        400,
        `X-NodeGX-Upsert names "${field}", but this record has no value for it. ` +
          'A record with nothing in the unique field cannot be matched against the rows already there.'
      );
    }
    if (typeof value === 'object') {
      throw new HttpError(400, `X-NodeGX-Upsert: "${field}" must hold a plain value, not an object or array.`);
    }

    // The update half of the operation is an update, and is gated as one.
    ctx.checkData(collection, 'update');

    const existing = await this.findByUnique(ctx, collection, field, value);
    if (existing) {
      await this.upsertUpdate(ctx, collection, existing, body);
      return;
    }

    ctx.stampCreate(collection, body);
    let record: Record<string, unknown>;
    try {
      record = await this.facade.rawCreate(collection, body);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const conflict = uniqueViolationToHttp(message, body);
      if (!conflict) throw createErrorToHttp(e, body);

      // Lost the race. The row exists now; if it is one this caller may write,
      // the request is the update it asked for. If it is not, the 409 stands.
      const raced = await this.findByUnique(ctx, collection, field, value);
      if (!raced) throw conflict;
      await this.upsertUpdate(ctx, collection, raced, body);
      return;
    }
    sendJSON(ctx.res, 201, { objectId: record.objectId, createdAt: record.createdAt, upsert: 'created' });
  }

  /**
   * The row this upsert targets, or null. Runs with the caller's WRITE
   * predicate — see `classesUpsert`'s third note.
   *
   * @private
   */
  private async findByUnique(
    ctx: RequestContext,
    collection: string,
    field: string,
    value: unknown
  ): Promise<Record<string, unknown> | null> {
    const { results } = await this.facade.rawQuery(collection, {
      where: { [field]: value },
      limit: 1,
      acl: ctx.acl('write')
    });
    return results && results.length > 0 ? results[0] : null;
  }

  /**
   * Apply the create's payload to the row that already exists, and answer 200.
   *
   * `createdAt` comes back from the row rather than from the clock, because a
   * client merges this response over its own data: a create's answer that said
   * the record was made just now would move an item's date every poll.
   *
   * @private
   */
  private async upsertUpdate(
    ctx: RequestContext,
    collection: string,
    existing: Record<string, unknown>,
    body: Record<string, unknown>
  ): Promise<void> {
    const objectId = String(existing.objectId);
    const data: Record<string, unknown> = { ...body };
    delete data.objectId;
    delete data.createdAt;
    delete data.updatedAt;

    // An ACL the caller sent explicitly is applied (it is what the node's
    // Access Control Rules emit); one it did not send leaves the row's alone.
    // `stampCreate` is never run on this path — an owner stamped over an
    // existing row's ACL would quietly hand the record to whoever polled last.
    if (Object.prototype.hasOwnProperty.call(data, 'ACL')) {
      const aclError = validateAclShape(data.ACL);
      if (aclError) throw new HttpError(400, `Invalid ACL: ${aclError}`, 123);
      if (data.ACL === undefined || data.ACL === null) delete data.ACL;
    }

    let updated: Record<string, unknown> | null = null;
    try {
      updated = await this.facade.rawSave(collection, objectId, data, ctx.acl('write'));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const conflict = uniqueViolationToHttp(message, data);
      if (conflict) throw conflict;
      throw new HttpError(404, 'Object not found.', 101);
    }

    sendJSON(ctx.res, 200, {
      objectId,
      createdAt: existing.createdAt,
      updatedAt: (updated && updated.updatedAt) || new Date().toISOString(),
      upsert: 'updated'
    });
  }

  /**
   * AC3 — refuse an upsert on a field no unique index covers, and say why in
   * the sentence that tells the person what to declare.
   *
   * @private
   */
  private assertUpsertable(collection: string, field: string): void {
    const sm = this.facade.schemaManager;
    if (!sm || typeof sm.indexStatus !== 'function') {
      throw new HttpError(501, 'This backend cannot upsert: its adapter does not declare indexes.');
    }
    const covered = sm
      .indexStatus(collection)
      .some((i) => i.unique && i.built && i.fields.length === 1 && i.fields[0] === field);
    if (covered) return;

    throw new HttpError(
      400,
      `X-NodeGX-Upsert: "${field}" is not a unique-indexed property of "${collection}". ` +
        'An upsert needs one, because without it "the row that already has this value" may be several rows. ' +
        `Declare { "fields": ["${field}"], "unique": true } on the collection and push the schema first.`
    );
  }

  /** GET /classes/:collection — used by count() with where/limit/count params. */
  async classesGet(ctx: RequestContext): Promise<void> {
    const options = toQueryOptions(ctx.query);
    options.acl = ctx.acl('read');
    const result = await this.facade.wireQuery(ctx.params.collection, options);
    const { body, headers } = splitCapped(result);
    sendJSON(ctx.res, 200, body, headers);
  }

  /** GET /classes/:collection/:id */
  async classGet(ctx: RequestContext): Promise<void> {
    try {
      const record = await this.facade.wireFetch(
        ctx.params.collection,
        ctx.params.id,
        ctx.query.include,
        ctx.acl('read')
      );
      sendJSON(ctx.res, 200, record);
    } catch {
      // Missing and unreadable answer identically (existence hiding).
      throw new HttpError(404, 'Object not found.', 101);
    }
  }

  /** PUT /classes/:collection/:id — save and/or __op updates. */
  async classPut(ctx: RequestContext): Promise<void> {
    const collection = ctx.params.collection;
    const objectId = ctx.params.id;
    const body = await readJSONBody(ctx.req);
    delete body.createdAt;
    delete body.updatedAt;
    delete body.objectId;
    // A client may set the ACL on rows it can write (Parse semantics; the Set
    // Record node's Access Control Rules emit this). Shape-validate it.
    const aclError = validateAclShape(body.ACL);
    if (aclError) throw new HttpError(400, `Invalid ACL: ${aclError}`, 123);
    if (body.ACL === undefined || body.ACL === null) delete body.ACL;

    const acl = ctx.acl('write');
    const { increments, addRelations, removeRelations, plain } = extractOps(body);

    // Relation-only updates never touch the row itself, so the write predicate
    // wouldn't run — assert writability explicitly before mutating junctions.
    if ((addRelations.length > 0 || removeRelations.length > 0) && acl) {
      try {
        await this.facade.rawFetch(collection, objectId, { ...acl, access: 'write' });
      } catch {
        throw new HttpError(404, 'Object not found.', 101);
      }
    }

    let updated: Record<string, unknown> | null = null;
    try {
      if (Object.keys(plain).length > 0) {
        updated = await this.facade.rawSave(collection, objectId, plain, acl);
      }
      if (Object.keys(increments).length > 0) {
        updated = await this.facade.rawIncrement(collection, objectId, increments, acl);
      }
    } catch (e) {
      // FED-002: an update refused by a unique index is a conflict, not a
      // missing row. Answering 404 here would tell a person their record had
      // vanished when what actually happened is that another one has the value.
      const conflict = uniqueViolationToHttp(e instanceof Error ? e.message : String(e), plain);
      if (conflict) throw conflict;
      throw new HttpError(404, 'Object not found.', 101);
    }
    for (const rel of addRelations) {
      await this.facade.addRelation(collection, objectId, rel.key, rel.targetObjectId);
    }
    for (const rel of removeRelations) {
      await this.facade.removeRelation(collection, objectId, rel.key, rel.targetObjectId);
    }

    const response: Record<string, unknown> = {
      updatedAt: (updated && updated.updatedAt) || new Date().toISOString()
    };
    // Parse echoes incremented counters (plain numbers) in the PUT response.
    if (updated) {
      for (const key of Object.keys(increments)) response[key] = updated[key];
    }
    sendJSON(ctx.res, 200, response);
  }

  /** DELETE /classes/:collection/:id */
  async classDelete(ctx: RequestContext): Promise<void> {
    try {
      await this.facade.rawDelete(ctx.params.collection, ctx.params.id, ctx.acl('write'));
    } catch {
      throw new HttpError(404, 'Object not found.', 101);
    }
    sendJSON(ctx.res, 200, {});
  }

  /**
   * GET /aggregate/:collection — the two shapes `cloudstore.js` emits:
   * `distinct=<prop>` and `group=`/`$group=` (+ `match=`/`$match=`) with
   * `$avg`/`$sum`/`$max`/`$min`/`$addToSet` accessors. Both are governed by
   * the `find` permission and the read ACL — they reveal exactly what find
   * reveals.
   *
   * PRD-006 — both shapes answer with a LIST rather than a page, so both are
   * bounded at `queries.maxLimit` in the facade and both say so with
   * `X-NodeGX-Result-Capped`. The body is unchanged either way: the wire format
   * is shared with clients we do not ship (`cloudstore.js`), so the signal
   * rides in headers, exactly as it does on `GET /classes/:collection`.
   */
  async aggregate(ctx: RequestContext): Promise<void> {
    const collection = ctx.params.collection;
    const query = ctx.query;
    const where = parseJSONParam(query.match || query.$match || query.where, 'match');
    const acl = ctx.acl('read');

    if (query.distinct) {
      const { values, cappedAt } = await this.facade.rawDistinct(
        collection,
        query.distinct,
        where,
        acl
      );
      sendJSON(ctx.res, 200, { results: values }, cappedHeaders(cappedAt));
      return;
    }

    const groupRaw = parseJSONParam(query.group || query.$group, 'group');
    if (!groupRaw) {
      throw new HttpError(400, 'Aggregate requires group or distinct');
    }

    // {$avg: '$field'} -> {avg: 'field'}; the group's _id/objectId key is
    // Parse-wire grouping noise our single-group aggregate ignores.
    const group: Record<string, Record<string, string>> = {};
    for (const [alias, accessor] of Object.entries(groupRaw)) {
      if (alias === '_id' || alias === 'objectId') continue;
      if (!accessor || typeof accessor !== 'object') continue;
      for (const [op, field] of Object.entries(accessor as Record<string, string>)) {
        const cleanOp = op.replace(/^\$/, '').replace(/^addToSet$/, 'distinct');
        group[alias] = { [cleanOp]: String(field).replace(/^\$/, '') };
      }
    }

    const { result, cappedAt } = await this.facade.rawAggregate(collection, group, where, acl);
    sendJSON(ctx.res, 200, { results: [result] }, cappedHeaders(cappedAt));
  }

  /**
   * GET /config — the params this caller is entitled to (FH-018).
   *
   * Takes the whole context, not just `res`, because the filter needs a
   * principal: see {@link visibleConfigParams}.
   */
  config(ctx: RequestContext): void {
    const params = visibleConfigParams(this.getConfigParams(), ctx.principal.kind === 'admin');
    sendJSON(ctx.res, 200, { params });
  }
}
