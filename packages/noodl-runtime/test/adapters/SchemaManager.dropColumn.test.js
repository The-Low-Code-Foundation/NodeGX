/**
 * SchemaManager.dropColumn — BMG-003 §3.3, against a real SQLite on a temp file.
 *
 * What a person does on the Schema page: take a field away. The column leaves
 * the table and the declaration, the other columns keep their values, a
 * Relation's junction table goes with it, and a column something declared still
 * reads (an index, a rule, full-text search) is refused by name — never dropped
 * along with the thing that read it.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEngine, SchemaManager } = require('../../src/api/adapters/local-sql');

const engine = resolveEngine();

function open(dir) {
  const db = engine.open(path.join(dir, 'test.db'));
  const sm = new SchemaManager(db);
  sm.ensureSchemaTable();
  return { sm, db };
}

const columnsOf = (db, table) => db.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name);
const tables = (db) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((r) => r.name);

const pet = () => ({
  name: 'Pet',
  columns: [
    { name: 'name', type: 'String' },
    { name: 'colour', type: 'String' },
    { name: 'age', type: 'Number' },
    { name: 'tags', type: 'Relation', targetClass: 'Tag' }
  ]
});

describe('SchemaManager.dropColumn (BMG-003)', () => {
  let dir;
  let ctx;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg003-drop-'));
    ctx = open(dir);
    ctx.sm.createTable({ name: 'Tag', columns: [{ name: 'label', type: 'String' }] });
    ctx.sm.createTable(pet());
    ctx.db.prepare('INSERT INTO "Pet" ("objectId", "name", "colour", "age") VALUES (?, ?, ?, ?)').run('p1', 'Rex', 'brown', 3);
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* closed */
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('removes the column from the table and the declaration, keeps the other values, and survives a reopen', () => {
    const { sm, db } = ctx;
    expect(sm.dropColumn('Pet', 'colour')).toBe(true);
    expect(columnsOf(db, 'Pet')).not.toContain('colour');
    expect(sm.getTableSchema('Pet').columns.map((c) => c.name)).toEqual(['name', 'age', 'tags']);
    expect(db.prepare('SELECT "name", "age" FROM "Pet" WHERE "objectId" = ?').get('p1')).toEqual({ name: 'Rex', age: 3 });
    db.close();
    ctx = open(dir);
    expect(ctx.sm.getTableSchema('Pet').columns.map((c) => c.name)).toEqual(['name', 'age', 'tags']);
    expect(columnsOf(ctx.db, 'Pet')).not.toContain('colour');
  });

  it('a Relation drops its junction table, and a column that is not there answers false', () => {
    const { sm, db } = ctx;
    sm.addRelation('Pet', 'p1', 'tags', 't1');
    expect(tables(db)).toContain('_Join_tags_Pet');
    expect(sm.dropColumn('Pet', 'tags')).toBe(true);
    expect(tables(db)).not.toContain('_Join_tags_Pet');
    expect(sm.getTableSchema('Pet').columns.map((c) => c.name)).toEqual(['name', 'colour', 'age']);
    expect(sm.dropColumn('Pet', 'nothing')).toBe(false);
  });

  it('refuses a system column and an unknown table', () => {
    const { sm } = ctx;
    expect(() => sm.dropColumn('Pet', 'objectId')).toThrow(/every record carries it/);
    expect(() => sm.dropColumn('Nope', 'x')).toThrow(/does not exist/);
  });

  it('refuses a column a declared index reads, naming the index, and drops nothing', () => {
    const { sm, db } = ctx;
    sm.reconcileIndexes('Pet', [{ fields: ['name'], unique: true }]);
    let thrown;
    try {
      sm.dropColumn('Pet', 'name');
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.code).toBe('COLUMN_IN_USE');
    expect(thrown.message).toMatch(/the index idx_Pet_name \(name\) reads it\. Drop that index first\./);
    expect(columnsOf(db, 'Pet')).toContain('name');
    expect(sm.indexStatus('Pet').map((i) => i.built)).toEqual([true]);
  });

  it('refuses a column a rule reads, in the rule’s words, and goes through once the rule is gone', () => {
    const { sm, db } = ctx;
    sm.reconcileChecks('Pet', [{ field: 'age', min: 0 }, { field: 'colour', oneOf: ['brown', 'black'] }]);
    expect(() => sm.dropColumn('Pet', 'colour')).toThrow(/the rule "colour is one of brown, black" reads it\. Remove that rule first\./);
    expect(() => sm.dropColumn('Pet', 'age')).toThrow(/the rule "age is at least 0" reads it/);
    expect(columnsOf(db, 'Pet')).toEqual(expect.arrayContaining(['colour', 'age']));
    sm.reconcileChecks('Pet', [{ field: 'age', min: 0 }]);
    expect(sm.dropColumn('Pet', 'colour')).toBe(true);
    expect(columnsOf(db, 'Pet')).not.toContain('colour');
  });

  it('refuses a column full-text search indexes, and drops one it does not', () => {
    const { sm, db } = ctx;
    sm.createSearchIndex('Pet', ['name']);
    expect(() => sm.dropColumn('Pet', 'name')).toThrow(/full-text search indexes it/);
    expect(sm.dropColumn('Pet', 'colour')).toBe(true);
    expect(columnsOf(db, 'Pet')).toEqual(expect.arrayContaining(['name', 'age']));
  });
});
