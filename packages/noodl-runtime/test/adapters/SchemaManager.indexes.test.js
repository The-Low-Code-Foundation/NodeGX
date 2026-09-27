/**
 * SchemaManager's declared indexes — FED-002 (phase 96).
 *
 * The HTTP drive is `nodegx-backend/tests/fed-002-indexes.test.ts`, and it is
 * the one that grades the acceptance criteria. What is graded HERE is the half
 * the wire cannot see: what SQLite actually ends up holding.
 *
 * Run against a **real** engine on a temp file for the same reason
 * `changeColumnType`'s spec is: every interesting answer comes from SQLite
 * itself — `PRAGMA index_list` reporting `origin`, a unique index refusing a
 * second row, `index_xinfo` reporting `desc` — and a mock would have to be
 * taught each of those, which is a mock of the thing under test.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEngine, SchemaManager } = require('../../src/api/adapters/local-sql');

const engine = resolveEngine();

function freshManager() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fed002-indexes-'));
  const db = engine.open(path.join(dir, 'test.db'));
  const sm = new SchemaManager(db);
  sm.ensureSchemaTable();
  return { sm, db, dir };
}

/**
 * Every index SQLite holds on a table, the two built-ins included — the raw
 * reading, not `indexStatus`'s filtered one.
 *
 * `sqlite_autoindex_<table>_1` is dropped: it is the implicit index behind
 * `objectId TEXT PRIMARY KEY`, it has `origin: 'pk'`, and nothing in FED-002
 * creates, drops or may touch it. It is filtered HERE rather than asserted
 * away in ten places, and `builtIndexes` filters it for the same reason.
 */
function indexNames(db, table) {
  return db
    .prepare(`PRAGMA index_list("${table}")`)
    .all()
    .filter((r) => r.origin !== 'pk')
    .map((r) => r.name)
    .sort();
}

const ITEM = {
  name: 'Item',
  columns: [
    { name: 'id', type: 'String' },
    { name: 'sourceId', type: 'String' },
    { name: 'published', type: 'Date' },
    { name: 'title', type: 'String' }
  ]
};

function insert(db, table, row) {
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  ).run(...keys.map((k) => row[k]));
}

describe('SchemaManager — declared indexes (FED-002)', () => {
  let ctx;

  beforeEach(() => {
    ctx = freshManager();
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* already closed */
    }
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it('creates a table with its declared indexes, and keeps the built-in pair', () => {
    const { sm, db } = ctx;
    sm.createTable({
      ...ITEM,
      indexes: [
        { fields: ['id'], unique: true },
        { fields: ['sourceId', 'published'] },
        { fields: ['published'], order: 'desc' }
      ]
    });

    expect(indexNames(db, 'Item')).toEqual([
      'idx_Item_createdAt',
      'idx_Item_id',
      'idx_Item_published',
      'idx_Item_sourceId_published',
      'idx_Item_updatedAt'
    ]);

    const list = db.prepare('PRAGMA index_list("Item")').all();
    expect(list.find((r) => r.name === 'idx_Item_id').unique).toBe(1);
    expect(list.find((r) => r.name === 'idx_Item_published').unique).toBe(0);

    // The order is not decoration: `published desc, limit 50` is the query the
    // feed's list actually runs, and an index built ASC does not serve it as a
    // covering ordered scan.
    const desc = db.prepare('PRAGMA index_xinfo("idx_Item_published")').all().filter((c) => c.key === 1);
    expect(desc.map((c) => [c.name, c.desc])).toEqual([['published', 1]]);
  });

  it('a unique declaration is enforced by SQLite, not by a check somewhere', () => {
    const { sm, db } = ctx;
    sm.createTable({ ...ITEM, indexes: [{ fields: ['id'], unique: true }] });

    insert(db, 'Item', { objectId: 'a', id: 'guid-1', title: 'First' });
    expect(() => insert(db, 'Item', { objectId: 'b', id: 'guid-1', title: 'Again' })).toThrow(
      /UNIQUE constraint failed/
    );

    // ⚠️ And two rows with NO id do NOT collide — SQLite treats NULLs as
    // distinct in a unique index. It is why `duplicateValues` excludes them:
    // a check built on GROUP BY alone would refuse a push the index accepts.
    insert(db, 'Item', { objectId: 'c', title: 'No id' });
    insert(db, 'Item', { objectId: 'd', title: 'Also no id' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM "Item"').get().n).toBe(3);
  });

  it('refuses a unique index over duplicate rows, changes nothing, and names the values', () => {
    const { sm, db } = ctx;
    sm.createTable(ITEM);
    insert(db, 'Item', { objectId: 'a', id: 'dup', title: 'One' });
    insert(db, 'Item', { objectId: 'b', id: 'dup', title: 'Two' });
    insert(db, 'Item', { objectId: 'c', id: 'other', title: 'Three' });
    insert(db, 'Item', { objectId: 'd', id: 'other', title: 'Four' });
    insert(db, 'Item', { objectId: 'e', title: 'No id at all' });

    let thrown;
    try {
      // The refused declaration is sent with a perfectly good one beside it, so
      // this also measures that the GOOD one is not applied — a refusal that
      // half-applied would be the worst of both.
      sm.reconcileIndexes('Item', [{ fields: ['sourceId'] }, { fields: ['id'], unique: true }]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeDefined();
    expect(thrown.code).toBe('INDEX_DUPLICATES');
    expect(thrown.duplicates).toBe(2);
    expect(thrown.samples).toEqual([['dup'], ['other']]);
    expect(thrown.message).toMatch(/no row was deleted/);

    // Nothing was created, nothing dropped, and every row is still there.
    expect(indexNames(db, 'Item')).toEqual(['idx_Item_createdAt', 'idx_Item_updatedAt']);
    expect(db.prepare('SELECT COUNT(*) AS n FROM "Item"').get().n).toBe(5);
    expect(sm.declaredIndexes('Item')).toEqual([]);
  });

  it('reconciles: drops what is gone, keeps what matches, rebuilds what changed', () => {
    const { sm, db } = ctx;
    sm.createTable({ ...ITEM, indexes: [{ fields: ['sourceId'] }, { fields: ['published'] }] });

    const report = sm.reconcileIndexes('Item', [
      { fields: ['sourceId'] },
      { fields: ['published'], order: 'desc' },
      { fields: ['title'] }
    ]);

    expect(report.kept).toEqual(['idx_Item_sourceId']);
    // `published` changed direction, so the index that was there is gone and a
    // different one stands in its place: it is reported as created, once.
    expect(report.created.sort()).toEqual(['idx_Item_published', 'idx_Item_title']);
    expect(report.dropped).toEqual([]);
    expect(
      db
        .prepare('PRAGMA index_xinfo("idx_Item_published")')
        .all()
        .filter((c) => c.key === 1)
        .map((c) => c.desc)
    ).toEqual([1]);

    const second = sm.reconcileIndexes('Item', [{ fields: ['sourceId'] }]);
    expect(second.dropped.sort()).toEqual(['idx_Item_published', 'idx_Item_title']);
    expect(indexNames(db, 'Item')).toEqual(['idx_Item_createdAt', 'idx_Item_sourceId', 'idx_Item_updatedAt']);
  });

  it('a re-run of the same declaration does nothing at all (idempotent)', () => {
    const { sm } = ctx;
    const decls = [{ fields: ['id'], unique: true }, { fields: ['published'], order: 'desc' }];
    sm.createTable({ ...ITEM, indexes: decls });

    const again = sm.reconcileIndexes('Item', decls);
    expect(again.created).toEqual([]);
    expect(again.dropped).toEqual([]);
    expect(again.kept.sort()).toEqual(['idx_Item_id', 'idx_Item_published']);
  });

  it('the declaration survives in _Schema, so a schema export carries it', () => {
    const { sm, db } = ctx;
    sm.createTable({ ...ITEM, indexes: [{ fields: ['id'], unique: true }] });

    // Read through a SECOND manager over the same file: the first one's cache
    // is not the thing being measured.
    const fresh = new SchemaManager(db);
    expect(fresh.declaredIndexes('Item')).toEqual([{ fields: ['id'], unique: true }]);
    expect(fresh.exportSchemas().find((s) => s.name === 'Item').indexes).toEqual([{ fields: ['id'], unique: true }]);
  });

  it('refuses to index a property the collection does not have', () => {
    const { sm } = ctx;
    sm.createTable(ITEM);
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['nope'] }])).toThrow(/has no such property/);
  });

  it('refuses to declare, or declare away, the built-in pair', () => {
    const { sm, db } = ctx;
    sm.createTable(ITEM);
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['createdAt'] }])).toThrow(/always indexed/);

    // And an empty declaration removes every declared index while leaving them.
    sm.reconcileIndexes('Item', [{ fields: ['title'] }]);
    sm.reconcileIndexes('Item', []);
    expect(indexNames(db, 'Item')).toEqual(['idx_Item_createdAt', 'idx_Item_updatedAt']);
  });

  it('refuses a mis-shaped declaration rather than quietly dropping it', () => {
    const { sm } = ctx;
    sm.createTable(ITEM);
    expect(() => sm.reconcileIndexes('Item', [{ fields: [] }])).toThrow(/one to four/);
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['id'], unqiue: true }])).toThrow(/unknown key "unqiue"/);
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['id'], order: 'up' }])).toThrow(/order/);
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['id'] }, { fields: ['id'], unique: true }])).toThrow(/twice/);
  });

  it('works INSIDE an open transaction — the case that would make an import fail', () => {
    // The reconcile uses a SAVEPOINT rather than BEGIN because `createTable`
    // is reachable from inside a transaction (an import ensures the collection's
    // shape, then writes every row in one). `BEGIN` there is "cannot start a
    // transaction within a transaction", and the whole write would roll back.
    const { sm, db } = ctx;
    db.exec('BEGIN');
    sm.createTable({ ...ITEM, indexes: [{ fields: ['id'], unique: true }] });
    insert(db, 'Item', { objectId: 'a', id: 'guid-1' });
    db.exec('COMMIT');

    expect(indexNames(db, 'Item')).toContain('idx_Item_id');
    expect(db.prepare('SELECT COUNT(*) AS n FROM "Item"').get().n).toBe(1);
  });

  it('a refusal inside an open transaction leaves the outer one usable', () => {
    const { sm, db } = ctx;
    sm.createTable(ITEM);
    insert(db, 'Item', { objectId: 'a', id: 'dup' });
    insert(db, 'Item', { objectId: 'b', id: 'dup' });

    db.exec('BEGIN');
    expect(() => sm.reconcileIndexes('Item', [{ fields: ['id'], unique: true }])).toThrow(/more than once/);
    // The savepoint rolled back, not the transaction: the caller's own work is
    // still there and it can still commit.
    insert(db, 'Item', { objectId: 'c', id: 'other' });
    db.exec('COMMIT');
    expect(db.prepare('SELECT COUNT(*) AS n FROM "Item"').get().n).toBe(3);
  });

  it('indexStatus reports drift: an index nothing declares is built and undeclared', () => {
    const { sm, db } = ctx;
    sm.createTable({ ...ITEM, indexes: [{ fields: ['id'], unique: true }] });
    db.exec('CREATE INDEX "idx_Item_title" ON "Item" ("title")');

    const status = sm.indexStatus('Item');
    expect(status).toEqual([
      { name: 'idx_Item_id', fields: ['id'], unique: true, order: 'asc', built: true, declared: true },
      { name: 'idx_Item_title', fields: ['title'], unique: false, order: 'asc', built: true, declared: false }
    ]);
  });
});

describe('QueryBuilder.uniqueConstraintProblem (FED-002)', () => {
  const { QueryBuilder } = require('../../src/api/adapters/local-sql');

  it('decodes what SQLite says, for one column and for several', () => {
    expect(QueryBuilder.uniqueConstraintProblem('UNIQUE constraint failed: Item.id')).toEqual({
      collection: 'Item',
      fields: ['id']
    });
    expect(QueryBuilder.uniqueConstraintProblem('UNIQUE constraint failed: Item.sourceId, Item.guid')).toEqual({
      collection: 'Item',
      fields: ['sourceId', 'guid']
    });
  });

  it('leaves the objectId refusal to the reading that already owns it', () => {
    // The PRIMARY KEY collision is SYN-003's `clientObjectIdTaken`, answered
    // with its own sentence. Two readings of one error would race.
    expect(QueryBuilder.uniqueConstraintProblem('UNIQUE constraint failed: Item.objectId')).toBeNull();
    expect(QueryBuilder.uniqueConstraintProblem('no such column: nope')).toBeNull();
    expect(QueryBuilder.uniqueConstraintProblem('')).toBeNull();
  });
});
