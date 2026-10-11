/**
 * SchemaManager.setRequired — P116-ONT-007-required.
 *
 * A field the records already have, made required (or optional again). SQLite
 * has no `ALTER COLUMN … SET NOT NULL`, and `ADD COLUMN … NOT NULL` needs a
 * default, so the table is rebuilt — and a rebuild is the place where things
 * built ON the table go quietly missing: the declared indexes, the check
 * triggers, a search index's triggers, and the rowids its external content is
 * keyed by. Real engine on a temp file; every one of those is read back after.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEngine, SchemaManager } = require('../../src/api/adapters/local-sql');

const engine = resolveEngine();

function freshManager() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont007-required-'));
  const db = engine.open(path.join(dir, 'test.db'));
  const sm = new SchemaManager(db);
  sm.ensureSchemaTable();
  return { sm, db, dir };
}

const insert = (db, row) =>
  db
    .prepare('INSERT INTO "Member" ("objectId", "name", "account", "status", "code") VALUES (?, ?, ?, ?, ?)')
    .run(row.objectId, row.name, row.account ?? null, row.status ?? null, row.code ?? null);

const notNull = (db, column) => db.prepare('PRAGMA table_info("Member")').all().find((c) => c.name === column).notnull;
const declared = (sm, column) => sm.getTableSchema('Member').columns.find((c) => c.name === column).required;

describe('SchemaManager.setRequired', () => {
  let ctx;

  beforeEach(() => {
    ctx = freshManager();
    ctx.sm.createTable({
      name: 'Member',
      columns: [
        { name: 'name', type: 'String' },
        { name: 'account', type: 'Pointer', targetClass: 'Account' },
        { name: 'status', type: 'String', defaultValue: 'new' },
        { name: 'code', type: 'String' },
        { name: 'tags', type: 'Relation', targetClass: 'Tag' }
      ]
    });
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch {
      /* already closed */
    }
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it('refuses while a record holds none, naming how many — and changes nothing, the table included', () => {
    const { sm, db } = ctx;
    insert(db, { objectId: 'a', name: 'Ada', account: 'acc1' });
    insert(db, { objectId: 'b', name: 'Bo' });
    insert(db, { objectId: 'c', name: 'Cy' });

    let thrown;
    try {
      sm.setRequired('Member', { account: true });
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.code).toBe('FIELD_EMPTY');
    expect(thrown.count).toBe(2);
    expect(thrown.message).toBe('Cannot make "account" required on "Member": 2 records have none. Give each of them one first, or keep it optional.');
    expect(declared(sm, 'account')).toBeUndefined();
    expect(notNull(db, 'account')).toBe(0);
    insert(db, { objectId: 'd', name: 'Di' }); // still accepted
  });

  it('once every record has one: NOT NULL and the declaration, every row and rowid kept, a new record without one refused', () => {
    const { sm, db } = ctx;
    insert(db, { objectId: 'a', name: 'Ada', account: 'acc1' });
    insert(db, { objectId: 'b', name: 'Bo', account: 'acc2', status: 'old' });
    db.prepare('DELETE FROM "Member" WHERE "objectId" = ?').run('a'); // a gap in the rowids
    insert(db, { objectId: 'c', name: 'Cy', account: 'acc1' });
    const before = db.prepare('SELECT rowid, * FROM "Member" ORDER BY rowid').all();

    expect(sm.setRequired('Member', { account: true })).toBe(true);

    expect(notNull(db, 'account')).toBe(1);
    expect(declared(sm, 'account')).toBe(true);
    expect(JSON.parse(db.prepare('SELECT "schema" FROM "_Schema" WHERE "name" = ?').get('Member').schema).columns.find((c) => c.name === 'account').required).toBe(true);
    expect(db.prepare('SELECT rowid, * FROM "Member" ORDER BY rowid').all()).toEqual(before);
    expect(() => insert(db, { objectId: 'd', name: 'Di' })).toThrow(/NOT NULL/);
    // The default is the column's, and survives the rebuild.
    db.prepare('INSERT INTO "Member" ("objectId", "name", "account") VALUES (?, ?, ?)').run('e', 'Ed', 'acc1');
    expect(db.prepare('SELECT "status" FROM "Member" WHERE "objectId" = ?').get('e').status).toBe('new');
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE '__nodegx_rebuild%'").all()).toEqual([]);
  });

  it('keeps what is built on the table: a declared unique index, a check, a search index and the two built-in indexes', () => {
    const { sm, db } = ctx;
    insert(db, { objectId: 'a', name: 'Ada Lovelace', account: 'acc1', status: 'new', code: 'X1' });
    insert(db, { objectId: 'b', name: 'Bo Diddley', account: 'acc2', status: 'old', code: 'X2' });
    sm.reconcileIndexes('Member', [{ fields: ['code'], unique: true }]);
    sm.reconcileChecks('Member', [{ field: 'status', oneOf: ['new', 'old'] }]);
    const searchable = sm.hasFts5Support();
    if (searchable) sm.rebuildSearchIndex('Member', ['name']);
    const builtBefore = db.prepare("SELECT type, name FROM sqlite_master WHERE tbl_name = 'Member' AND type IN ('index', 'trigger') ORDER BY name").all();

    expect(sm.setRequired('Member', { account: true, name: true })).toBe(true);

    expect(db.prepare("SELECT type, name FROM sqlite_master WHERE tbl_name = 'Member' AND type IN ('index', 'trigger') ORDER BY name").all()).toEqual(builtBefore);
    expect(sm.indexStatus('Member').every((i) => i.built)).toBe(true);
    expect(() => insert(db, { objectId: 'c', name: 'Cy', account: 'acc1', code: 'X1' })).toThrow(/UNIQUE/);
    expect(() => insert(db, { objectId: 'c', name: 'Cy', account: 'acc1', status: 'gone', code: 'X3' })).toThrow(/CHECK constraint failed/);
    if (searchable) {
      const hits = (term) => db.prepare('SELECT m."objectId" FROM "Member_fts" f JOIN "Member" m ON m.rowid = f.rowid WHERE "Member_fts" MATCH ? ORDER BY 1').all(term).map((r) => r.objectId);
      expect(hits('lovelace')).toEqual(['a']);
      insert(db, { objectId: 'c', name: 'Cy Twombly', account: 'acc1', code: 'X3' });
      expect(hits('twombly')).toEqual(['c']); // the insert trigger is back
    }
  });

  it('makes a field optional again, and reports nothing done when a field is already as asked', () => {
    const { sm, db } = ctx;
    insert(db, { objectId: 'a', name: 'Ada', account: 'acc1' });
    sm.setRequired('Member', { account: true });
    expect(sm.setRequired('Member', { account: true })).toBe(false);

    expect(sm.setRequired('Member', { account: false })).toBe(true);
    expect(notNull(db, 'account')).toBe(0);
    expect(declared(sm, 'account')).toBeUndefined();
    insert(db, { objectId: 'b', name: 'Bo' });
    expect(sm.setRequired('Member', { account: false })).toBe(false);
  });

  it('refuses in words what cannot be required, before anything changes', () => {
    const { sm } = ctx;
    expect(() => sm.setRequired('Member', { tags: true })).toThrow('"Member.tags" is a list of links, so it cannot be required');
    expect(() => sm.setRequired('Member', { objectId: true })).toThrow('"objectId" is set by the backend on every record');
    expect(() => sm.setRequired('Member', { nope: true })).toThrow('"Member" has no field "nope"');
    expect(() => sm.setRequired('Nobody', { name: true })).toThrow('There is no collection called "Nobody"');
    expect(() => sm.setRequired('Member', { name: 'yes' })).toThrow('say true (required) or false (optional)');
    sm.setWhenTargetGoes('Member', { account: 'stays-unlinked' });
    expect(() => sm.setRequired('Member', { account: true })).toThrow(/stays without one when its record goes/);
  });
});
