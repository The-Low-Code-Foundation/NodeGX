/**
 * A partial unique index, over HTTP, on SQLite and on PostgreSQL — P99 HLT-016's index half (`where`).
 *
 * What a person does: push a collection whose unique index holds only where a predicate does
 * (`{ "pinned": true }`), write rows on both sides of it, restart, push again. The adapter-level
 * half (what SQLite holds, the refusals by name) is `noodl-runtime/test/adapters/
 * SchemaManager.partialIndexes.test.js`; the conformance case is
 * `schema/a-partial-unique-index-holds-only-where-it-says`.
 *
 * 🔴 The PostgreSQL half is skipped only when no PostgreSQL is reachable, like its BRG-005
 * siblings. It carries the one reading SQLite cannot: before this row a refused push answered
 * 200 on PostgreSQL, because the schema queue's failure was consumed by the push's own AUDIT
 * write (which never throws) and the person never heard of it.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { StorageIndexDecl } from '@noodl/backend-contract';

import { diffSchema, type SchemaSnapshot } from '../src/backup/schema-migrate';
import { BackendService } from '../src/service';
import { adminHeaders, get, post } from './helpers/http';

jest.setTimeout(120000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';

function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}

let pgReachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  pgReachable = true;
} catch {
  pgReachable = false;
}

const COLUMNS = [
  { name: 'learner', type: 'String' },
  { name: 'concept', type: 'String' },
  { name: 'pinned', type: 'Boolean' },
  { name: 'guid', type: 'String' },
  { name: 'live', type: 'Boolean' }
];
const ONE_PINNED = { fields: ['learner', 'concept'], unique: true, where: { pinned: true } };

interface IndexRow {
  name: string;
  built: boolean;
  declared: boolean;
  where?: Record<string, unknown>;
}

/** A response body: read field by field, and every field is asserted on, never trusted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;

function engineSuite(engine: 'sqlite' | 'postgres', storageUrl: () => string | null) {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let previousEnv: string | undefined;

  const start = async () => {
    service = new BackendService({ dataDir, port: 0, backendId: `hlt016w_${engine}`, backendName: 'HLT-016' });
    base = (await service.start()).listen.url;
  };
  const admin = (body: unknown) => post<Body>(base, '/admin/schema', body, adminHeaders(dataDir));
  const create = (collection: string, row: unknown, headers: Record<string, string> = {}) =>
    post<Body>(base, `/classes/${collection}`, row, { ...adminHeaders(dataDir), ...headers });
  const count = async (collection: string) =>
    (await get<{ count: number }>(base, `/classes/${collection}?count=1&limit=0`, adminHeaders(dataDir))).json.count;
  const indexes = async (collection: string) =>
    (await get<{ indexes: IndexRow[] }>(base, `/admin/schema/${collection}`, adminHeaders(dataDir))).json.indexes;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `hlt016w-${engine}-`));
    previousEnv = process.env.NODEGX_STORAGE_URL;
    const url = storageUrl();
    if (url) process.env.NODEGX_STORAGE_URL = url;
    else delete process.env.NODEGX_STORAGE_URL;
    await start();
  });

  afterAll(async () => {
    try {
      await service.stop();
    } catch {
      /* already stopped */
    }
    if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = previousEnv;
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('W2: one pinned row per (learner, concept); any number unpinned', async () => {
    expect(
      (await admin({ action: 'createTable', table: 'Lesson', columns: COLUMNS, indexes: [ONE_PINNED] })).status
    ).toBe(200);
    expect((await create('Lesson', { learner: 'L', concept: 'C', pinned: false })).status).toBe(201);
    expect((await create('Lesson', { learner: 'L', concept: 'C', pinned: false })).status).toBe(201);
    expect((await create('Lesson', { learner: 'L', concept: 'C', pinned: true })).status).toBe(201);
    const second = await create('Lesson', { learner: 'L', concept: 'C', pinned: true });
    expect(second.status).toBe(409);
    expect(second.json.code).toBe(137);
    expect(await count('Lesson')).toBe(3);
  });

  it('W2 control: the same declaration without `where` refuses the second UNPINNED row', async () => {
    await admin({
      action: 'createTable',
      table: 'LessonFull',
      columns: COLUMNS,
      indexes: [{ fields: ['learner', 'concept'], unique: true }]
    });
    expect((await create('LessonFull', { learner: 'L', concept: 'C', pinned: false })).status).toBe(201);
    expect((await create('LessonFull', { learner: 'L', concept: 'C', pinned: false })).status).toBe(409);
  });

  it('W4: a partial and a full index on the same fields are two indexes', async () => {
    const both = await admin({
      action: 'setIndexes',
      table: 'LessonFull',
      indexes: [{ fields: ['learner', 'concept'], unique: true }, ONE_PINNED]
    });
    expect(both.json.indexesKept).toEqual(['idx_LessonFull_learner_concept']);
    expect(both.json.indexesCreated).toEqual([expect.stringMatching(/^idx_LessonFull_learner_concept_w[0-9a-f]{8}$/)]);
    const only = await admin({ action: 'setIndexes', table: 'LessonFull', indexes: [ONE_PINNED] });
    expect(only.json.indexesDropped).toEqual(['idx_LessonFull_learner_concept']);
    expect(only.json.indexesKept).toEqual(both.json.indexesCreated);
  });

  it('W6: a partial unique index is not upsert cover; a full one beside it is', async () => {
    const partial = { fields: ['guid'], unique: true, where: { live: true } };
    await admin({ action: 'createTable', table: 'Feed', columns: COLUMNS, indexes: [partial] });
    const refused = await create('Feed', { guid: 'g1', live: true }, { 'x-nodegx-upsert': 'guid' });
    expect(refused.status).toBe(400);
    expect(refused.json.error).toMatch(/only on the rows a partial index covers/);
    await admin({ action: 'setIndexes', table: 'Feed', indexes: [partial, { fields: ['guid'], unique: true }] });
    expect((await create('Feed', { guid: 'g1', live: true }, { 'x-nodegx-upsert': 'guid' })).status).toBe(201);
  });

  it('W5: a push the rows already violate is REFUSED to the person who pushed, and changes nothing', async () => {
    await admin({ action: 'createTable', table: 'Dup', columns: COLUMNS });
    for (const pinned of [false, false, true, true]) await create('Dup', { learner: 'L', concept: 'C', pinned });
    const refused = await admin({ action: 'setIndexes', table: 'Dup', indexes: [ONE_PINNED] });
    expect(refused.status).toBe(409);
    expect(refused.json.code).toBe(137);
    expect(await indexes('Dup')).toEqual([]);
    // The next write is the person's own, and it is not handed someone else's failure.
    expect((await create('Dup', { learner: 'X', concept: 'Y', pinned: false })).status).toBe(201);
    expect(await count('Dup')).toBe(5);
  });

  it('W3: after a restart it reads back built and declared, a re-push keeps it, and it still holds', async () => {
    await service.stop();
    await start();
    const [row] = await indexes('Lesson');
    expect(row).toMatchObject({ built: true, declared: true, where: { pinned: true } });
    const repush = await admin({ action: 'setIndexes', table: 'Lesson', indexes: [ONE_PINNED] });
    expect(repush.json).toMatchObject({ indexesCreated: [], indexesDropped: [], indexesKept: [row.name] });
    expect((await create('Lesson', { learner: 'L', concept: 'C', pinned: true })).status).toBe(409);
    expect((await create('Lesson', { learner: 'L', concept: 'C', pinned: false })).status).toBe(201);
  });
}

describe('HLT-016 W7 — a schema diff sees the predicate', () => {
  const table = (where?: StorageIndexDecl['where']): SchemaSnapshot => ({
    tables: [
      {
        name: 'Lesson',
        columns: [],
        indexes: [{ fields: ['learner', 'concept'], unique: true, ...(where ? { where } : {}) }]
      }
    ]
  });

  it('a changed predicate is a change; a partial index is not the full one', () => {
    expect(diffSchema(table({ pinned: true }), table({ pinned: false })).tables.changed).toHaveLength(1);
    expect(diffSchema(table({ pinned: true }), table()).tables.changed).toHaveLength(1);
  });

  it('two spellings of one predicate are not a change', () => {
    const a = table({ pinned: true, kind: 'x' });
    const b = table({ kind: 'x', pinned: true });
    expect(diffSchema(a, b).tables.changed).toEqual([]);
  });
});

describe('HLT-016 `where` — SQLite', () => {
  engineSuite('sqlite', () => null);
});

(pgReachable ? describe : describe.skip)('HLT-016 `where` — PostgreSQL', () => {
  const db = `nodegx_hlt016w_${process.pid}_${Date.now().toString(36)}`;
  beforeAll(() => psql(ADMIN_URL, `CREATE DATABASE "${db}"`));
  afterAll(() => {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${db}" WITH (FORCE)`);
    } catch {
      /* the name is unique per run */
    }
  });
  engineSuite('postgres', () => {
    const u = new URL(ADMIN_URL.replace(/^postgres:\/\/\//, 'postgres://localhost/'));
    u.pathname = `/${db}`;
    return ADMIN_URL.startsWith('postgres:///') ? `postgres:///${db}` : u.toString();
  });
});
