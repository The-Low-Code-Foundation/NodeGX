/**
 * SchemaManager's declared checks — P99 HLT-016's index half, `checks` (C1–C5).
 *
 * Against a real SQLite on a temp file: the checks are triggers, and the only
 * honest reading of a trigger is SQLite refusing a row. The shapes are the
 * Digital Bricks Training product's own CHECK constraints
 * (`digital-bricks-training/drizzle/*.sql`): an assignment scoped to a learner
 * OR a cohort, an anchor whose kind and id are set together, a target from 1
 * to 10.
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

function insert(db, row) {
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO "Assignment" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  ).run(...keys.map((k) => row[k]));
}

function count(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM "Assignment"').get().n;
}

function triggers(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name")
    .all()
    .map((r) => r.name);
}

/** A fresh object per call — `createTable` keeps the object it is given (see the partial-index spec). */
const assignment = (extra = {}) => ({
  name: 'Assignment',
  columns: [
    { name: 'learnerId', type: 'String' },
    { name: 'cohortId', type: 'String' },
    { name: 'anchorKind', type: 'String' },
    { name: 'anchorId', type: 'String' },
    { name: 'target', type: 'Number' },
    { name: 'title', type: 'String' }
  ],
  ...extra
});

const ONE_SCOPE = { exactlyOne: ['learnerId', 'cohortId'] };
const ANCHOR = { allOrNone: ['anchorKind', 'anchorId'] };
const TARGET = { field: 'target', min: 1, max: 10 };
const REFUSED = /^CHECK constraint failed: Assignment\.chk_Assignment_/;

describe('SchemaManager — declared checks (HLT-016 `checks`)', () => {
  let dir;
  let ctx;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt016-checks-'));
    ctx = open(dir);
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* already closed */
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('C2: exactly one scope — neither and both are refused, on insert and on update', () => {
    const { sm, db } = ctx;
    sm.createTable(assignment({ checks: [ONE_SCOPE] }));

    insert(db, { objectId: 'a', learnerId: 'L' });
    insert(db, { objectId: 'b', cohortId: 'C' });
    expect(() => insert(db, { objectId: 'c' })).toThrow(REFUSED);
    expect(() => insert(db, { objectId: 'd', learnerId: 'L', cohortId: 'C' })).toThrow(REFUSED);
    expect(() => db.prepare('UPDATE "Assignment" SET "cohortId" = ? WHERE "objectId" = ?').run('C', 'a')).toThrow(
      REFUSED
    );
    expect(db.prepare('SELECT "cohortId" FROM "Assignment" WHERE "objectId" = ?').get('a').cohortId).toBeNull();
    // An update that keeps the rule is fine, including one that moves the scope.
    db.prepare('UPDATE "Assignment" SET "learnerId" = NULL, "cohortId" = ? WHERE "objectId" = ?').run('C2', 'a');
    expect(count(db)).toBe(2);
  });

  it('C2: all-or-none and a range, where a NULL in the range passes as SQL’s CHECK does', () => {
    const { sm, db } = ctx;
    sm.createTable(assignment({ checks: [ANCHOR, TARGET] }));

    insert(db, { objectId: 'a' });
    insert(db, { objectId: 'b', anchorKind: 'session', anchorId: 's1', target: 1 });
    insert(db, { objectId: 'c', target: 10 });
    expect(() => insert(db, { objectId: 'd', anchorKind: 'session' })).toThrow(
      /chk_Assignment_all_anchorKind_anchorId/
    );
    expect(() => insert(db, { objectId: 'e', target: 0 })).toThrow(/chk_Assignment_range_target/);
    expect(() => insert(db, { objectId: 'f', target: 11 })).toThrow(/chk_Assignment_range_target/);
    expect(count(db)).toBe(3);
  });

  it('C3: a check the rows already break is refused with the count, and nothing changes', () => {
    const { sm, db } = ctx;
    sm.createTable(assignment());
    insert(db, { objectId: 'a', learnerId: 'L' });
    insert(db, { objectId: 'b' });
    insert(db, { objectId: 'c', learnerId: 'L', cohortId: 'C' });

    let thrown;
    try {
      sm.reconcileChecks('Assignment', [TARGET, ONE_SCOPE]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.code).toBe('CHECK_VIOLATIONS');
    expect(thrown.violations).toBe(2);
    expect(thrown.message).toMatch(/exactly one of learnerId, cohortId is set.*2 rows already break it/);
    // The good check beside it was not applied either.
    expect(triggers(db)).toEqual([]);
    expect(sm.checkStatus('Assignment')).toEqual([]);
    expect(count(db)).toBe(3);
  });

  it('C4: a restarted manager reads it back as enforced, a re-push keeps it, and removing it removes enforcement', () => {
    ctx.sm.createTable(assignment({ checks: [ONE_SCOPE, TARGET] }));
    ctx.db.close();

    ctx = open(dir);
    const status = ctx.sm.checkStatus('Assignment');
    expect(status.map((s) => [s.name, s.built, s.declared])).toEqual([
      ['chk_Assignment_one_learnerId_cohortId', true, true],
      ['chk_Assignment_range_target', true, true]
    ]);
    expect(status[1].description).toBe('target is between 1 and 10');

    expect(ctx.sm.reconcileChecks('Assignment', [ONE_SCOPE, TARGET])).toMatchObject({
      created: [],
      dropped: [],
      kept: ['chk_Assignment_one_learnerId_cohortId', 'chk_Assignment_range_target']
    });

    const removed = ctx.sm.reconcileChecks('Assignment', [TARGET]);
    expect(removed.dropped).toEqual(['chk_Assignment_one_learnerId_cohortId']);
    insert(ctx.db, { objectId: 'x' });
    expect(() => insert(ctx.db, { objectId: 'y', target: 99 })).toThrow(REFUSED);
  });

  it('changing a range’s bounds rebuilds it under the same name, and re-counts the rows', () => {
    const { sm, db } = ctx;
    sm.createTable(assignment({ checks: [TARGET] }));
    insert(db, { objectId: 'a', learnerId: 'L', target: 8 });

    expect(() => sm.reconcileChecks('Assignment', [{ field: 'target', min: 1, max: 5 }])).toThrow(
      /1 row already breaks it/
    );
    const widened = sm.reconcileChecks('Assignment', [{ field: 'target', min: 1, max: 20 }]);
    expect(widened.created).toEqual(['chk_Assignment_range_target']);
    insert(db, { objectId: 'b', target: 15 });
    expect(() => insert(db, { objectId: 'c', target: 21 })).toThrow(REFUSED);
  });

  it('C1: every malformed check is refused by name, before any DDL', () => {
    const { sm, db } = ctx;
    sm.createTable(assignment());
    const refuse = (checks, pattern) => expect(() => sm.reconcileChecks('Assignment', checks)).toThrow(pattern);

    refuse({}, /must be an array/);
    refuse(['x'], /must be an object/);
    refuse([{}], /expected \{ "exactlyOne"/);
    refuse([{ atLeastOne: ['learnerId', 'cohortId'] }], /not an object with "atLeastOne"/);
    refuse([{ exactlyOne: ['learnerId'] }], /2 to 4 property names/);
    refuse([{ exactlyOne: ['a', 'b', 'c', 'd', 'e'] }], /2 to 4 property names/);
    refuse([{ exactlyOne: ['learnerId', 'learnerId'] }], /same property twice/);
    refuse([{ exactlyOne: ['learnerId', 'cohortId'], allOrNone: ['a', 'b'] }], /takes no other keys/);
    refuse([{ exactlyOne: ['learnerId', 'nope'] }], /no such property/);
    refuse([{ field: 'target' }], /needs "min", "max" or both/);
    refuse([{ field: 'target', min: 5, max: 1 }], /min 5 is above max 1/);
    refuse([{ field: 'target', min: 'one' }], /finite number/);
    refuse([{ field: 'target', min: 1, step: 2 }], /unknown key "step"/);
    refuse([{ field: 'title', min: 1 }], /needs "title" to be a Number, and it is a String/);
    refuse([{ field: 'x; DROP', min: 1 }], /not a valid property name/);
    refuse([TARGET, { field: 'target', max: 3 }], /twice/);

    expect(triggers(db)).toEqual([]);
    expect(sm.checkStatus('Assignment')).toEqual([]);
  });

  it('C5: the PostgreSQL export emits each check as a CHECK constraint under the same name', () => {
    const { sm } = ctx;
    sm.createTable(assignment({ checks: [ONE_SCOPE, TARGET] }));
    const sql = sm.generatePostgresSQL();
    expect(sql).toContain(
      'CONSTRAINT "chk_Assignment_one_learnerId_cohortId" CHECK (((CASE WHEN "learnerId" IS NULL THEN 0 ELSE 1 END) + ' +
        '(CASE WHEN "cohortId" IS NULL THEN 0 ELSE 1 END)) = 1)'
    );
    expect(sql).toContain('CONSTRAINT "chk_Assignment_range_target" CHECK (("target" >= 1 AND "target" <= 10))');
  });
});

/**
 * BMG-003 — the four single-field shapes the Schema page's field options
 * declare: a Choice, a max length, looks-like, whole numbers only. Same
 * triggers, same vocabulary; graded the only honest way, by SQLite refusing.
 */
describe('SchemaManager — the BMG-003 field rules', () => {
  let dir;
  let ctx;

  const product = (extra = {}) => ({
    name: 'Product',
    columns: [
      { name: 'status', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'contact', type: 'String' },
      { name: 'site', type: 'String' },
      { name: 'qty', type: 'Number' },
      { name: 'size', type: 'Number' }
    ],
    ...extra
  });
  const put = (db, row) => {
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO "Product" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(
      ...keys.map((k) => row[k])
    );
  };
  const rows = (db) => db.prepare('SELECT COUNT(*) AS n FROM "Product"').get().n;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg003-checks-'));
    ctx = open(dir);
  });
  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* closed */
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a Choice admits its values and NULL, refuses anything else, and is named and described', () => {
    const { sm, db } = ctx;
    sm.createTable(product({ checks: [{ field: 'status', oneOf: ['open', 'closed'] }] }));
    put(db, { objectId: 'a', status: 'open' });
    put(db, { objectId: 'b', status: 'closed' });
    put(db, { objectId: 'c' });
    expect(() => put(db, { objectId: 'd', status: 'other' })).toThrow(/chk_Product_oneof_status/);
    expect(() => put(db, { objectId: 'e', status: 'Open' })).toThrow(/chk_Product_oneof_status/);
    expect(() => db.prepare('UPDATE "Product" SET "status" = ? WHERE "objectId" = ?').run('other', 'a')).toThrow(/chk_Product_oneof_status/);
    expect(rows(db)).toBe(3);
    const status = sm.checkStatus('Product');
    expect(status).toEqual([
      { name: 'chk_Product_oneof_status', rule: { field: 'status', oneOf: ['open', 'closed'] }, description: 'status is one of open, closed', built: true, declared: true }
    ]);
  });

  it('a Choice of numbers works on a Number, and a Choice of words is refused on one', () => {
    const { sm, db } = ctx;
    sm.createTable(product({ checks: [{ field: 'size', oneOf: [1, 2, 3] }] }));
    put(db, { objectId: 'a', size: 2 });
    expect(() => put(db, { objectId: 'b', size: 4 })).toThrow(/chk_Product_oneof_size/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'qty', oneOf: ['a', 'b'] }])).toThrow(/needs "qty" to be a String/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'name', oneOf: [1, 2] }])).toThrow(/needs "name" to be a Number/);
  });

  it('a max length counts characters; looks-like email and web address are LIKE shapes; whole refuses a fraction', () => {
    const { sm, db } = ctx;
    sm.createTable(
      product({
        checks: [
          { field: 'name', maxLength: 5 },
          { field: 'contact', looksLike: 'email' },
          { field: 'site', looksLike: 'url' },
          { field: 'qty', whole: true }
        ]
      })
    );
    put(db, { objectId: 'a', name: 'ab', contact: 'a@b.co', site: 'https://x.y', qty: 3 });
    put(db, { objectId: 'b', name: 'héllo', site: 'http://x', qty: -2 });
    expect(() => put(db, { objectId: 'c', name: 'toolong' })).toThrow(/chk_Product_maxlen_name/);
    expect(() => put(db, { objectId: 'd', contact: 'nope' })).toThrow(/chk_Product_looks_contact/);
    expect(() => put(db, { objectId: 'e', contact: 'a b@c.de' })).toThrow(/chk_Product_looks_contact/);
    expect(() => put(db, { objectId: 'f', site: 'ftp://x' })).toThrow(/chk_Product_looks_site/);
    expect(() => put(db, { objectId: 'g', qty: 2.5 })).toThrow(/chk_Product_whole_qty/);
    expect(rows(db)).toBe(2);
    expect(sm.checkStatus('Product').map((c) => c.description)).toEqual([
      'name is at most 5 characters',
      'contact looks like an email address',
      'site looks like a web address',
      'qty is a whole number'
    ]);
  });

  it('refuses the shapes that say nothing or two things', () => {
    const { sm } = ctx;
    sm.createTable(product());
    expect(() => sm.reconcileChecks('Product', [{ field: 'status', oneOf: [] }])).toThrow(/oneOf must list 1 to 100 values/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'status', oneOf: ['a', 1] }])).toThrow(/mixes text and numbers/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'status', oneOf: ['a', 'a'] }])).toThrow(/twice/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'name', maxLength: 0 }])).toThrow(/whole number of at least 1/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'name', looksLike: 'phone' }])).toThrow(/looksLike must be one of email, url/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'qty', whole: false }])).toThrow(/whole can only be true/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'qty', whole: true, max: 3 }])).toThrow(/takes no other keys/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'name', whole: true }])).toThrow(/needs "name" to be a Number/);
    expect(() => sm.reconcileChecks('Product', [{ field: 'qty', maxLength: 3 }])).toThrow(/needs "qty" to be a String/);
  });

  it('a Choice the rows already break is refused with the count', () => {
    const { sm, db } = ctx;
    sm.createTable(product());
    put(db, { objectId: 'a', status: 'open' });
    put(db, { objectId: 'b', status: 'weird' });
    let thrown;
    try {
      sm.reconcileChecks('Product', [{ field: 'status', oneOf: ['open', 'closed'] }]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.code).toBe('CHECK_VIOLATIONS');
    expect(thrown.violations).toBe(1);
    expect(sm.checkStatus('Product')).toEqual([]);
  });
});

describe('BMG-003 — a column added after the collection was read has its declared type', () => {
  it('declaredProperties is memoised by object identity, so the manager hands out a fresh object after addColumn', () => {
    const { declaredProperties } = require('../../src/api/adapters/local-sql/schemaCommon');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmg003-fresh-'));
    const { sm, db } = open(dir);
    try {
      sm.createTable({ name: 'Pet', columns: [{ name: 'name', type: 'String' }] });
      // A read derives (and memoises) the map, as `_rowToRecord` does on every row.
      expect(Object.keys(declaredProperties(sm.getTableSchema('Pet')))).toEqual(['name']);
      sm.addColumn('Pet', { name: 'email', type: 'String' });
      expect(declaredProperties(sm.getTableSchema('Pet')).email).toEqual({ type: 'String', targetClass: undefined, required: undefined });
      // Which is what lets a rule land on the new column without a restart.
      sm.reconcileChecks('Pet', [{ field: 'email', maxLength: 80 }]);
      expect(sm.checkStatus('Pet').map((c) => c.description)).toEqual(['email is at most 80 characters']);
      sm.dropColumn('Pet', 'name');
      expect(Object.keys(declaredProperties(sm.getTableSchema('Pet')))).toEqual(['email']);
    } finally {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
