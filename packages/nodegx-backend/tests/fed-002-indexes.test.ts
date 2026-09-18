/**
 * A collection declares its indexes — FED-002 (phase 96).
 *
 * The drive for all seven acceptance criteria, over HTTP against a real service
 * on a real database, per phase 96 README §7 rule 4. The adapter-level
 * semantics (what SQLite ends up holding, what a refused push leaves behind)
 * are pinned beside the code that emits the SQL, in
 * `noodl-runtime/test/adapters/SchemaManager.indexes.test.js`; what is graded
 * HERE is the thing a person actually does — push a schema, write the same item
 * twice, and get one row.
 *
 * 🔴 **Two readings, deliberately, of every claim about an index.** The HTTP
 * surface's `indexes` array is derived from `PRAGMA index_list`, so asserting
 * only on it would be asserting that the derivation is self-consistent. Every
 * structural claim is therefore ALSO read straight off the database file
 * through a second, read-only connection — the artefact, not the report.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { SchemaMutationResponse, TableSchemaResponse } from '../src/server/byob-admin';
import type { AuditQueryResult } from '../src/ops/audit';

import { adminHeaders, ParseQueryResult, ParseRecord, request } from './helpers/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const localSql = require('@noodl/runtime/src/api/adapters/local-sql');

jest.setTimeout(60000);

/** One index as `PRAGMA index_list` reports it, read off the file itself. */
interface RawIndex {
  name: string;
  unique: boolean;
  fields: string[];
  desc: boolean;
}

/** What `POST /admin/import/:collection` answers with. */
interface ImportReportLike {
  total: number;
  created: number;
  applied: boolean;
  rejected: unknown[];
  error?: string;
}

interface UpsertAnswer {
  objectId?: string;
  createdAt?: string;
  updatedAt?: string;
  upsert?: 'created' | 'updated';
  error?: string;
  code?: number;
  field?: string;
  value?: unknown;
  duplicates?: number;
  samples?: unknown[][];
}

/** The `Create Record` graph AC7 drives: request → node → response. */
function storeItemFunction(name: string, upsertOn?: string) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'id,title' },
        ports: [],
        children: []
      },
      {
        id: 'store',
        type: 'NewDbModelProperties',
        x: 0,
        y: 100,
        parameters: { collectionName: 'Item', ...(upsertOn ? { upsertOn } : {}) },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'objectId' },
        ports: [],
        children: []
      },
      {
        // Wired, and not optional: a function whose only wired path is the happy
        // one HANGS for the full timeout when the write is refused (CWF-018,
        // register R1 of this phase). AC2 over the node path is a REFUSAL, so
        // without this the negative arm would be a 40-second red that says
        // nothing about indexes.
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'error' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-id', targetId: 'store', targetPort: 'prop-id' },
      { sourceId: 'req', sourcePort: 'pm-title', targetId: 'store', targetPort: 'prop-title' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'store', targetPort: 'store' },
      { sourceId: 'store', sourcePort: 'id', targetId: 'res', targetPort: 'pm-objectId' },
      { sourceId: 'store', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'store', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'store', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

const ITEM_COLUMNS = [
  { name: 'id', type: 'String' },
  { name: 'sourceId', type: 'String' },
  { name: 'published', type: 'Date' },
  { name: 'title', type: 'String' }
];

/** The three declarations FED-002 §3.1 puts in front of a person, verbatim. */
const ITEM_INDEXES = [
  { fields: ['id'], unique: true },
  { fields: ['sourceId', 'published'] },
  { fields: ['published'], order: 'desc' }
];

describe('FED-002 — a collection declares its indexes', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let readDb: { prepare(sql: string): { all(...p: unknown[]): unknown[]; get(...p: unknown[]): unknown } };

  const req = <T = unknown>(method: string, pathName: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(base, method, pathName, { body, headers: { ...adminHeaders(dataDir), ...(headers || {}) } });

  const pushIndexes = (table: string, indexes: unknown) =>
    req<SchemaMutationResponse & UpsertAnswer>('POST', '/admin/schema', { action: 'setIndexes', table, indexes });

  /**
   * The database as SQLite holds it — a SECOND connection, opened read-only
   * beside the live service, so that every structural assertion below is a
   * reading of the artefact and not of the code that reports on it.
   */
  function rawIndexes(table: string): RawIndex[] {
    const list = readDb.prepare(`PRAGMA index_list("${table}")`).all() as Array<{
      name: string;
      unique: number;
      origin: string;
    }>;
    return list
      // `origin: 'pk'` is the implicit index behind `objectId TEXT PRIMARY KEY`.
      // Nothing in FED-002 creates it, drops it, or may touch it.
      .filter((r) => r.origin !== 'pk')
      .map((r) => {
        const cols = (
          readDb.prepare(`PRAGMA index_xinfo("${r.name}")`).all() as Array<{ name: string; desc: number; key: number }>
        ).filter((c) => c.key === 1);
        return {
          name: r.name,
          unique: r.unique === 1,
          fields: cols.map((c) => c.name),
          desc: cols.length > 0 && cols[0].desc === 1
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function rowCount(table: string): number {
    return (readDb.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get() as { n: number }).n;
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed002-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'items.workflow.json'),
      JSON.stringify({
        components: [storeItemFunction('storeItem', 'id'), storeItemFunction('storeItemNoUpsert')],
        settings: {},
        metadata: {}
      })
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'backend_fed002', backendName: 'FED-002' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.persistence.status.persistent).toBe(true);

    readDb = localSql.resolveEngine().open(path.join(dataDir, 'data', 'local.db'));
  });

  afterAll(async () => {
    try {
      (readDb as unknown as { close(): void }).close();
    } catch {
      /* already closed */
    }
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // AC1 — the declaration becomes three real indexes
  // ==========================================================================
  describe('AC1 — pushing a schema with three declarations', () => {
    it('creates the collection and its three indexes, with the derived names and unique correct', async () => {
      const pushed = await req<SchemaMutationResponse>('POST', '/admin/schema', {
        action: 'createTable',
        table: 'Item',
        columns: ITEM_COLUMNS,
        indexes: ITEM_INDEXES
      });

      expect(pushed.status).toBe(200);
      expect(pushed.json.created).toBe(true);
      expect((pushed.json.indexesCreated || []).sort()).toEqual([
        'idx_Item_id',
        'idx_Item_published',
        'idx_Item_sourceId_published'
      ]);

      // The artefact. Three declared indexes, the built-in pair still there.
      expect(rawIndexes('Item')).toEqual([
        { name: 'idx_Item_createdAt', unique: false, fields: ['createdAt'], desc: false },
        { name: 'idx_Item_id', unique: true, fields: ['id'], desc: false },
        { name: 'idx_Item_published', unique: false, fields: ['published'], desc: true },
        { name: 'idx_Item_sourceId_published', unique: false, fields: ['sourceId', 'published'], desc: false },
        { name: 'idx_Item_updatedAt', unique: false, fields: ['updatedAt'], desc: false }
      ]);
    });

    it('the schema surface reports each one, and whether it is built', async () => {
      const table = await req<TableSchemaResponse>('GET', '/admin/schema/Item');
      expect(table.status).toBe(200);
      expect(table.json.indexes).toEqual([
        { name: 'idx_Item_id', fields: ['id'], unique: true, order: 'asc', built: true, declared: true },
        {
          name: 'idx_Item_sourceId_published',
          fields: ['sourceId', 'published'],
          unique: false,
          order: 'asc',
          built: true,
          declared: true
        },
        { name: 'idx_Item_published', fields: ['published'], unique: false, order: 'desc', built: true, declared: true }
      ]);
    });

    it('pushing the same declaration again does nothing (a re-provision is not a rebuild)', async () => {
      const again = await pushIndexes('Item', ITEM_INDEXES);
      expect(again.status).toBe(200);
      expect(again.json.indexesCreated).toEqual([]);
      expect(again.json.indexesDropped).toEqual([]);
      expect((again.json.indexesKept || []).length).toBe(3);
    });
  });

  // ==========================================================================
  // AC2 — the same item twice
  // ==========================================================================
  describe('AC2 — two creates with the same id', () => {
    it('the first is created', async () => {
      const first = await req<ParseRecord>('POST', '/classes/Item', {
        id: 'guid-1',
        sourceId: 'feed-a',
        title: 'The first item',
        published: '2026-09-18T09:00:00.000Z'
      });
      expect(first.status).toBe(201);
      expect(first.json.objectId).toBeTruthy();
    });

    it('the second is a 409 naming the field and the value', async () => {
      const second = await req<UpsertAnswer>('POST', '/classes/Item', {
        id: 'guid-1',
        sourceId: 'feed-b',
        title: 'The same item, seen again'
      });

      expect(second.status).toBe(409);
      expect(second.json.code).toBe(137);
      expect(second.json.field).toBe('id');
      expect(second.json.value).toBe('guid-1');
      expect(second.json.error).toMatch(/already used/);
      expect(rowCount('Item')).toBe(1);
    });

    it('with X-NodeGX-Upsert it is a 200, and there is still one row', async () => {
      const upserted = await req<UpsertAnswer>(
        'POST',
        '/classes/Item',
        { id: 'guid-1', sourceId: 'feed-a', title: 'Now with a corrected title' },
        { 'X-NodeGX-Upsert': 'id' }
      );

      expect(upserted.status).toBe(200);
      expect(upserted.json.upsert).toBe('updated');
      expect(upserted.json.objectId).toBeTruthy();
      expect(rowCount('Item')).toBe(1);

      // It is an UPDATE, not a replace: the row kept its identity and its
      // createdAt, and took the new value. A feed that re-polls the same item
      // every fifteen minutes must not see its date move.
      const where = encodeURIComponent(JSON.stringify({ id: 'guid-1' }));
      const found = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      expect(found.json.results).toHaveLength(1);
      expect(found.json.results[0].title).toBe('Now with a corrected title');
      expect(found.json.results[0].objectId).toBe(upserted.json.objectId);
      expect(found.json.results[0].createdAt).toBe(upserted.json.createdAt);
    });

    it('an upsert whose value is new is an ordinary create, and says which it did', async () => {
      const created = await req<UpsertAnswer>(
        'POST',
        '/classes/Item',
        { id: 'guid-2', sourceId: 'feed-a', title: 'A second item' },
        { 'X-NodeGX-Upsert': 'id' }
      );
      expect(created.status).toBe(201);
      expect(created.json.upsert).toBe('created');
      expect(rowCount('Item')).toBe(2);
    });

    it('twenty concurrent upserts of one id leave exactly one row — the race the index closes', async () => {
      // The gap between "is it there?" and "insert" is the whole reason a
      // unique index exists rather than a query-then-insert in a function.
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          req<UpsertAnswer>(
            'POST',
            '/classes/Item',
            { id: 'guid-race', sourceId: 'feed-a', title: `attempt ${i}` },
            { 'X-NodeGX-Upsert': 'id' }
          )
        )
      );

      for (const r of results) expect([200, 201]).toContain(r.status);
      const where = encodeURIComponent(JSON.stringify({ id: 'guid-race' }));
      const found = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      expect(found.json.results).toHaveLength(1);
      // Exactly one of the twenty made the row; the rest updated it.
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    });
  });

  // ==========================================================================
  // AC3 — an upsert on a field no unique index covers
  // ==========================================================================
  describe('AC3 — upsert on a non-unique field', () => {
    it('is a 400 that names the rule and what to declare', async () => {
      const refused = await req<UpsertAnswer>(
        'POST',
        '/classes/Item',
        { id: 'guid-3', title: 'A title is not unique' },
        { 'X-NodeGX-Upsert': 'title' }
      );

      expect(refused.status).toBe(400);
      expect(refused.json.error).toMatch(/not a unique-indexed property of "Item"/);
      expect(refused.json.error).toMatch(/"fields": \["title"\], "unique": true/);
      // And it wrote nothing: a refused upsert is not a create with a warning.
      const where = encodeURIComponent(JSON.stringify({ id: 'guid-3' }));
      expect((await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`)).json.results).toEqual([]);
    });

    it('is also a 400 when the record has no value for the named field', async () => {
      const refused = await req<UpsertAnswer>(
        'POST',
        '/classes/Item',
        { sourceId: 'feed-a', title: 'No id at all' },
        { 'X-NodeGX-Upsert': 'id' }
      );
      expect(refused.status).toBe(400);
      expect(refused.json.error).toMatch(/has no value for it/);
    });
  });

  // ==========================================================================
  // AC4 — a unique declaration over duplicate rows
  // ==========================================================================
  describe('AC4 — a unique index pushed over a table that already holds duplicates', () => {
    let before: RawIndex[];

    beforeAll(async () => {
      await req<SchemaMutationResponse>('POST', '/admin/schema', {
        action: 'createTable',
        table: 'Legacy',
        columns: [
          { name: 'guid', type: 'String' },
          { name: 'title', type: 'String' }
        ],
        indexes: [{ fields: ['title'] }]
      });
      for (const row of [
        { guid: 'dup-a', title: 'One' },
        { guid: 'dup-a', title: 'Two' },
        { guid: 'dup-b', title: 'Three' },
        { guid: 'dup-b', title: 'Four' },
        { guid: 'unique-c', title: 'Five' }
      ]) {
        await req<ParseRecord>('POST', '/classes/Legacy', row);
      }
      before = rawIndexes('Legacy');
    });

    it('is refused with the duplicate count and the first offending values', async () => {
      const refused = await pushIndexes('Legacy', [{ fields: ['title'] }, { fields: ['guid'], unique: true }]);

      expect(refused.status).toBe(409);
      expect(refused.json.duplicates).toBe(2);
      expect(refused.json.samples).toEqual([['dup-a'], ['dup-b']]);
      expect(refused.json.error).toMatch(/no row was deleted/);
    });

    it('changed nothing: the same indexes, and every row still there', () => {
      expect(rawIndexes('Legacy')).toEqual(before);
      expect(rowCount('Legacy')).toBe(5);
    });

    it('the refused push is in the audit trail as a failure, with the numbers', async () => {
      const audit = await req<AuditQueryResult>('GET', '/admin/audit?action=schema.mutate&outcome=failure&limit=5');
      expect(audit.status).toBe(200);

      const entry = audit.json.entries.find(
        (e) => (e.detail as { indexesRefused?: { table?: string } })?.indexesRefused?.table === 'Legacy'
      );
      expect(entry).toBeDefined();
      expect(entry?.status).toBe(409);
      expect((entry?.detail as { indexesRefused: { duplicates: number } }).indexesRefused.duplicates).toBe(2);
    });

    it('and once the duplicates are gone the same push is accepted', async () => {
      const where = encodeURIComponent(JSON.stringify({ guid: 'dup-a' }));
      const dupes = await req<ParseQueryResult>('GET', `/classes/Legacy?where=${where}`);
      await req('DELETE', `/classes/Legacy/${dupes.json.results[0].objectId}`);
      const whereB = encodeURIComponent(JSON.stringify({ guid: 'dup-b' }));
      const dupesB = await req<ParseQueryResult>('GET', `/classes/Legacy?where=${whereB}`);
      await req('DELETE', `/classes/Legacy/${dupesB.json.results[0].objectId}`);

      const accepted = await pushIndexes('Legacy', [{ fields: ['title'] }, { fields: ['guid'], unique: true }]);
      expect(accepted.status).toBe(200);
      expect(accepted.json.indexesCreated).toEqual(['idx_Legacy_guid']);
      expect(rawIndexes('Legacy').find((i) => i.name === 'idx_Legacy_guid')?.unique).toBe(true);
    });
  });

  // ==========================================================================
  // AC6 — removing a declaration
  // ==========================================================================
  describe('AC6 — a declaration removed from the schema', () => {
    it('drops that index and leaves the built-in pair alone', async () => {
      const pushed = await pushIndexes('Legacy', [{ fields: ['guid'], unique: true }]);

      expect(pushed.status).toBe(200);
      expect(pushed.json.indexesDropped).toEqual(['idx_Legacy_title']);
      expect(rawIndexes('Legacy').map((i) => i.name)).toEqual([
        'idx_Legacy_createdAt',
        'idx_Legacy_guid',
        'idx_Legacy_updatedAt'
      ]);
    });

    it('an empty declaration removes every declared index, and still not the pair', async () => {
      const pushed = await pushIndexes('Legacy', []);
      expect(pushed.status).toBe(200);
      expect(pushed.json.indexesDropped).toEqual(['idx_Legacy_guid']);
      expect(rawIndexes('Legacy').map((i) => i.name)).toEqual(['idx_Legacy_createdAt', 'idx_Legacy_updatedAt']);
      expect(rowCount('Legacy')).toBe(3);
    });

    it('with the unique index gone, the duplicate it refused is writable again', async () => {
      // The point of the pair: the guarantee lives in the index, so removing the
      // index removes the guarantee — visibly, not silently.
      const again = await req<ParseRecord>('POST', '/classes/Legacy', { guid: 'unique-c', title: 'A second one' });
      expect(again.status).toBe(201);
      expect(rowCount('Legacy')).toBe(4);
    });
  });

  // ==========================================================================
  // The other write door: /api/:table, which is what the Data Browser uses
  // ==========================================================================
  describe('the BYOB route answers a unique refusal the same way', () => {
    it('409 with the field and the value, not a 500 with SQLite\'s wording', async () => {
      const refused = await req<UpsertAnswer>('POST', '/api/Item', { id: 'guid-1', title: 'Through the panel' });
      expect(refused.status).toBe(409);
      expect(refused.json.field).toBe('id');
      expect(refused.json.value).toBe('guid-1');
    });

    it('and an EDIT that would collide is a conflict, not a missing row', async () => {
      // On a collection whose unique property is NOT called `id` — see the spec
      // below for why that distinction is load-bearing.
      await req<SchemaMutationResponse>('POST', '/admin/schema', {
        action: 'createTable',
        table: 'Ticket',
        columns: [
          { name: 'code', type: 'String' },
          { name: 'holder', type: 'String' }
        ],
        indexes: [{ fields: ['code'], unique: true }]
      });
      await req<ParseRecord>('POST', '/classes/Ticket', { code: 'A-1', holder: 'Ada' });
      const second = await req<ParseRecord>('POST', '/classes/Ticket', { code: 'A-2', holder: 'Grace' });

      const refusedByob = await req<UpsertAnswer>('PUT', `/api/Ticket/${second.json.objectId}`, { code: 'A-1' });
      expect(refusedByob.status).toBe(409);
      expect(refusedByob.json.field).toBe('code');

      // The Parse-wire update door answers identically — a unique refusal there
      // used to read as `404 Object not found`, which tells a person their
      // record has vanished when another one simply has the value.
      const refusedParse = await req<UpsertAnswer>('PUT', `/classes/Ticket/${second.json.objectId}`, { code: 'A-1' });
      expect(refusedParse.status).toBe(409);
      expect(refusedParse.json.field).toBe('code');
    });

    /**
     * 🔴 R3, measured on the write path rather than the import path.
     *
     * `QueryBuilder.buildUpdate` deletes `data.id` as a protected field, the way
     * it deletes `createdAt` — so a property called `id` cannot be CHANGED by an
     * update at all: the request answers 200 and writes nothing but `updatedAt`.
     * Together with the import finding (`ensureImportShape` skips the same
     * name), the honest statement is: **`id` is reserved at the adapter layer —
     * it can be declared and written on create, and it can be matched on, but it
     * cannot be auto-created and it cannot be updated.**
     *
     * That is survivable for a feed, which writes an item's id once and then
     * upserts ON it, and it is exactly why FED-002's upsert never has to change
     * the match key. It is pinned here so the next person meets it as a
     * measurement instead of as a silent no-op.
     */
    it('R3: a property called `id` is silently unchangeable by an update', async () => {
      const where = encodeURIComponent(JSON.stringify({ id: 'guid-2' }));
      const target = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      const objectId = target.json.results[0].objectId;

      const answered = await req<UpsertAnswer>('PUT', `/api/Item/${objectId}`, { id: 'guid-1' });
      expect(answered.status).toBe(200);

      // Not a conflict, because nothing was written: the row still has its own
      // id, and the collision the unique index would have caught never happened.
      const after = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      expect(after.json.results).toHaveLength(1);
      expect(after.json.results[0].objectId).toBe(objectId);
      const stillOne = encodeURIComponent(JSON.stringify({ id: 'guid-1' }));
      expect((await req<ParseQueryResult>('GET', `/classes/Item?where=${stillOne}`)).json.results).toHaveLength(1);
    });
  });

  // ==========================================================================
  // AC5 — the query the index exists for
  // ==========================================================================
  describe('AC5 — twenty thousand rows, sorted by an indexed column', () => {
    const ROWS = 20000;
    let indexedMs: number;
    let controlMs: number;
    let plan: string;
    const imported: { item?: ImportReportLike; control?: ImportReportLike } = {};

    beforeAll(async () => {
      const rows = Array.from({ length: ROWS }, (_, i) => ({
        id: `bulk-${i}`,
        sourceId: `feed-${i % 50}`,
        title: `Item ${i}`,
        published: new Date(Date.UTC(2020, 0, 1) + i * 60000).toISOString()
      }));

      // 🔴 The control's columns are DECLARED, and they have to be: a column
      // called `id` is one of the five names the import's type inference skips
      // (`AdapterFacade.ensureImportShape`, and `LocalSQLAdapter.create`'s
      // auto-add beside it), so an import into a collection nothing declared
      // rolls back with `table Control has no column named id`. Filed as R3 in
      // the phase register — it is not FED-002's to fix, and it is exactly the
      // property a feed keys on.
      await req<SchemaMutationResponse>('POST', '/admin/schema', {
        action: 'createTable',
        table: 'Control',
        columns: ITEM_COLUMNS
      });

      // The control is the same rows in a collection with no declared index,
      // so it carries the built-in pair only.
      imported.item = (
        await req<ImportReportLike>('POST', '/admin/import/Item', { format: 'json', content: JSON.stringify(rows) })
      ).json;
      imported.control = (
        await req<ImportReportLike>('POST', '/admin/import/Control', { format: 'json', content: JSON.stringify(rows) })
      ).json;
    });

    it('imported both collections', () => {
      expect({ applied: imported.item?.applied, error: imported.item?.error }).toEqual({
        applied: true,
        error: undefined
      });
      expect({ applied: imported.control?.applied, error: imported.control?.error }).toEqual({
        applied: true,
        error: undefined
      });
      expect(rowCount('Item')).toBeGreaterThanOrEqual(ROWS);
      expect(rowCount('Control')).toBe(ROWS);
      expect(rawIndexes('Control').map((i) => i.name)).toEqual(['idx_Control_createdAt', 'idx_Control_updatedAt']);
    });

    it('SQLite uses the declared index for the ordering — the claim, not the clock', () => {
      // 🔴 This is the assertion that carries AC5. A duration is a statement
      // about the box the suite ran on; the query plan is a statement about the
      // index, and it is the one that stays true on a loaded machine.
      plan = (
        readDb
          .prepare('EXPLAIN QUERY PLAN SELECT * FROM "Item" ORDER BY "published" DESC LIMIT 50')
          .all() as Array<{ detail: string }>
      )
        .map((r) => r.detail)
        .join(' | ');
      expect(plan).toMatch(/idx_Item_published/);

      const controlPlan = (
        readDb
          .prepare('EXPLAIN QUERY PLAN SELECT * FROM "Control" ORDER BY "published" DESC LIMIT 50')
          .all() as Array<{ detail: string }>
      )
        .map((r) => r.detail)
        .join(' | ');
      expect(controlPlan).toMatch(/SCAN/);
    });

    it('answers in under 20 ms', () => {
      const time = (table: string) => {
        const stmt = readDb.prepare(`SELECT * FROM "${table}" ORDER BY "published" DESC LIMIT 50`);
        stmt.all(); // warm the page cache for both, so the pair is comparable
        const started = process.hrtime.bigint();
        const rows = stmt.all();
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        expect(rows).toHaveLength(50);
        return ms;
      };

      indexedMs = time('Item');
      controlMs = time('Control');

      // eslint-disable-next-line no-console
      console.log(
        `        AC5: ${ROWS} rows, ORDER BY published DESC LIMIT 50 — ` +
          `indexed ${indexedMs.toFixed(2)} ms, control (no index) ${controlMs.toFixed(2)} ms`
      );

      expect(indexedMs).toBeLessThan(20);
      // The control is reported, not asserted: SQLite may choose to scan, and
      // on a table this size a scan is not necessarily slow (FED-002 AC5).
      expect(controlMs).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // AC7 — the same thing through the node, not raw HTTP
  // ==========================================================================
  describe('AC7 — a cloud function using the Create Record node', () => {
    // A cloud function answers `{ result: { ...params } }` — the Response node's
    // envelope, not the params bare.
    const call = (fn: string, body: Record<string, unknown>) =>
      request<{ result: { objectId?: string; error?: string } }>(base, 'POST', `/functions/${fn}`, {
        body,
        headers: adminHeaders(dataDir)
      });

    it('writes the record the first time', async () => {
      const first = await call('storeItem', { id: 'node-guid', title: 'From the node' });
      expect(first.status).toBe(200);
      expect(first.json.result.error).toBeUndefined();
      expect(first.json.result.objectId).toBeTruthy();
    });

    it('a second call with the same id updates it — one row, through the node path', async () => {
      const second = await call('storeItem', { id: 'node-guid', title: 'From the node, again' });
      expect(second.status).toBe(200);
      expect(second.json.result.error).toBeUndefined();

      const where = encodeURIComponent(JSON.stringify({ id: 'node-guid' }));
      const found = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      expect(found.json.results).toHaveLength(1);
      expect(found.json.results[0].title).toBe('From the node, again');
    });

    it('NEGATIVE CONTROL: the same graph without Upsert On fails on the second write', async () => {
      // The port is what makes the difference, and this is the arm that shows
      // it: same node, same collection, same id, no `upsertOn`.
      const first = await call('storeItemNoUpsert', { id: 'node-guid-2', title: 'No upsert' });
      expect(first.json.result.error).toBeUndefined();

      const second = await call('storeItemNoUpsert', { id: 'node-guid-2', title: 'No upsert, again' });
      expect(second.json.result.error).toMatch(/already used/);
      expect(second.json.result.objectId).toBeUndefined();

      const where = encodeURIComponent(JSON.stringify({ id: 'node-guid-2' }));
      const found = await req<ParseQueryResult>('GET', `/classes/Item?where=${where}`);
      expect(found.json.results).toHaveLength(1);
      expect(found.json.results[0].title).toBe('No upsert');
    });
  });
});
