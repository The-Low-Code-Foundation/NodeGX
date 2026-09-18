/**
 * LocalSQLAdapter — a record created with its own objectId (P90 SYN-003)
 *
 * Before this, `create()` generated a UUID, and `buildInsert` spread the
 * caller's data over it — so a caller-sent `objectId` was the one WRITTEN,
 * while `create()` read the row back by the generated one. The row existed and
 * `success` was handed `null`: over `/classes` that became a 500 on
 * `record.objectId`, over `/api` a 201 with an empty body, and the change event
 * carried `null` to realtime and the DB-change triggers. A second create with
 * the same id was SQLite's raw `UNIQUE constraint failed`.
 *
 * The decision pinned here: a valid caller id is kept, a taken one is refused
 * and the first record is untouched, a malformed one is refused before anything
 * — table, column or row — is written, and no id means a generated one, as
 * before. The HTTP half (201 / 409 / 400 at both doors) is
 * `nodegx-backend/tests/syn003-client-object-id.test.ts`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const LocalSQLAdapter = require('../../src/api/adapters/local-sql/LocalSQLAdapter');
const QueryBuilder = require('../../src/api/adapters/local-sql/QueryBuilder');
const { resolveEngine } = require('../../src/api/adapters/local-sql');

const realEngine = resolveEngine();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function call(adapter, method, options) {
  return new Promise((resolve, reject) => {
    adapter[method]({
      ...options,
      success: (...args) => resolve(args[0]),
      error: (msg) => reject(new Error(String(msg)))
    });
  });
}

describe('LocalSQLAdapter — a record created with its own objectId (SYN-003)', () => {
  let tmpDir;
  let adapter;

  const rowCount = (collection) => adapter.db.prepare(`SELECT COUNT(*) AS n FROM "${collection}"`).get().n;
  const tableExists = (collection) =>
    Boolean(adapter.db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(collection));

  beforeAll(async () => {
    if (!realEngine) throw new Error('No SQLite engine available — these tests require node:sqlite');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syn003-'));
    adapter = new LocalSQLAdapter(path.join(tmpDir, 'syn003.db'));
    await adapter.connect();
  });

  afterAll(() => {
    if (adapter) adapter.disconnect && adapter.disconnect();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('NEGATIVE CONTROL: a create with no objectId gets a generated one, and it reads back', async () => {
    const created = await call(adapter, 'create', { collection: 'Task', data: { title: 'generated' } });
    expect(created.objectId).toMatch(UUID);
    const fetched = await call(adapter, 'fetch', { collection: 'Task', objectId: created.objectId });
    expect(fetched.title).toBe('generated');
  });

  it('a create that sends its own objectId returns the record under that id', async () => {
    const before = rowCount('Task');
    const created = await call(adapter, 'create', {
      collection: 'Task',
      data: { objectId: 'client-made-1', title: 'A' }
    });

    expect(created).not.toBeNull();
    expect(created.objectId).toBe('client-made-1');
    expect(created.title).toBe('A');

    const fetched = await call(adapter, 'fetch', { collection: 'Task', objectId: 'client-made-1' });
    expect(fetched.title).toBe('A');
    expect(rowCount('Task')).toBe(before + 1);
  });

  it('the change event names the id that was written, and carries the record', async () => {
    const emit = jest.spyOn(adapter, '_emitChange');
    try {
      await call(adapter, 'create', { collection: 'Task', data: { objectId: 'client-made-2', title: 'B' } });
      const event = emit.mock.calls.map((c) => c[0]).find((e) => e.type === 'create');
      expect(event.id).toBe('client-made-2');
      expect(event.object).toEqual(expect.objectContaining({ objectId: 'client-made-2', title: 'B' }));
    } finally {
      emit.mockRestore();
    }
  });

  it('a second create with a taken objectId is refused, and the first record is unchanged', async () => {
    const before = rowCount('Task');
    await expect(
      call(adapter, 'create', { collection: 'Task', data: { objectId: 'client-made-1', title: 'overwrite?' } })
    ).rejects.toThrow(/already used/);

    const fetched = await call(adapter, 'fetch', { collection: 'Task', objectId: 'client-made-1' });
    expect(fetched.title).toBe('A');
    expect(rowCount('Task')).toBe(before);
  });

  it('the refusal is one the HTTP layer can recognise without reading SQLite', async () => {
    const message = await call(adapter, 'create', { collection: 'Task', data: { objectId: 'client-made-1' } }).then(
      () => '',
      (e) => e.message
    );
    expect(QueryBuilder.clientObjectIdProblem(message)).toBe('taken');
    expect(message).not.toMatch(/UNIQUE constraint/);
  });

  it('a null objectId is treated as absent', async () => {
    const created = await call(adapter, 'create', { collection: 'Task', data: { objectId: null, title: 'nulled' } });
    expect(created.objectId).toMatch(UUID);
  });

  describe('an objectId that cannot be used is refused before anything is written', () => {
    it.each([
      ['a number', 42],
      ['an empty string', ''],
      ['a slash', 'has/slash'],
      ['a space', 'has space'],
      ['129 characters', 'x'.repeat(129)],
      ['an object', { id: 'x' }]
    ])('%s', async (_name, objectId) => {
      const before = rowCount('Task');
      const message = await call(adapter, 'create', { collection: 'Task', data: { objectId, title: 'bad' } }).then(
        () => '',
        (e) => e.message
      );
      expect(QueryBuilder.clientObjectIdProblem(message)).toBe('invalid');
      expect(rowCount('Task')).toBe(before);
    });

    it('including the table and columns a first write would have created', async () => {
      await expect(
        call(adapter, 'create', { collection: 'NeverMade', data: { objectId: 'has/slash', title: 'bad' } })
      ).rejects.toThrow(/objectId/);
      expect(tableExists('NeverMade')).toBe(false);
    });

    it('NEGATIVE CONTROL: the longest and most punctuated id the rule allows is kept', async () => {
      const id = 'Aa0_-'.repeat(25) + 'Zz9';
      expect(id).toHaveLength(128);
      const created = await call(adapter, 'create', { collection: 'Task', data: { objectId: id } });
      expect(created.objectId).toBe(id);
    });
  });
});

describe('QueryBuilder.buildInsert — the id it is given is the id it writes (SYN-003)', () => {
  it('whatever objectId the data carries', () => {
    const { sql, params } = QueryBuilder.buildInsert(
      { collection: 'Task', data: { objectId: 'from-data', title: 'x' } },
      'given'
    );
    expect(sql.match(/"objectId"/g)).toHaveLength(1);
    expect(params).toContain('given');
    expect(params).not.toContain('from-data');
  });
});
