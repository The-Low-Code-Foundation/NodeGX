/**
 * SchemaManager's partial indexes — P99 HLT-016's index half, `where` (W1–W5, W7).
 *
 * Against a real SQLite on a temp file, for the reason its FED-002 sibling
 * (`SchemaManager.indexes.test.js`) gives: every answer that matters here comes
 * from SQLite itself — a partial unique index refusing one row and admitting
 * another, `PRAGMA index_list` reporting `partial`, and a second manager
 * reading back what the first one built.
 *
 * The shapes are the Digital Bricks Training product's own
 * (`digital-bricks-training/drizzle/*.sql`): one pinned lesson per (learner,
 * concept), one evaluation per (programme, kind) for four kinds, one rating per
 * (dimension, session) where there is a session.
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

function indexNames(db, table) {
  return db
    .prepare(`PRAGMA index_list("${table}")`)
    .all()
    .filter((r) => r.origin !== 'pk')
    .map((r) => r.name)
    .sort();
}

function insert(db, table, row) {
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
  ).run(...keys.map((k) => row[k]));
}

function count(db, table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n;
}

/**
 * 🔴 A function, never a shared constant. `SchemaManager.createTable` caches
 * the object it is GIVEN, and a later `reconcileIndexes` writes `indexes` onto
 * it — so a constant passed to one test's `createTable` carried that test's
 * indexes into the next test's table. Measured: "two spellings" then W1 alone
 * failed W1; the full order hid it because W5 happened to reconcile to `[]`.
 */
const lesson = (extra = {}) => ({
  name: 'Lesson',
  columns: [
    { name: 'learnerId', type: 'String' },
    { name: 'conceptId', type: 'String' },
    { name: 'pinned', type: 'Boolean' },
    { name: 'kind', type: 'String' },
    { name: 'sessionId', type: 'String' },
    { name: 'position', type: 'Number' },
    { name: 'removedAt', type: 'Date' }
  ],
  ...extra
});

const ONE_PINNED = { fields: ['learnerId', 'conceptId'], unique: true, where: { pinned: true } };

describe('SchemaManager — partial indexes (HLT-016 `where`)', () => {
  let dir;
  let ctx;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt016-partial-'));
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

  it('W2: one pinned row per (learner, concept); unpinned rows are not counted', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson({ indexes: [ONE_PINNED] }));

    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', conceptId: 'C', pinned: 0 });
    insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', conceptId: 'C', pinned: 0 });
    insert(db, 'Lesson', { objectId: 'c', learnerId: 'L', conceptId: 'C', pinned: 1 });
    expect(() => insert(db, 'Lesson', { objectId: 'd', learnerId: 'L', conceptId: 'C', pinned: 1 })).toThrow(
      /UNIQUE constraint failed/
    );
    // Unpin, then pin another: the guarantee follows the row, not the history.
    db.prepare('UPDATE "Lesson" SET "pinned" = 0 WHERE "objectId" = ?').run('c');
    db.prepare('UPDATE "Lesson" SET "pinned" = 1 WHERE "objectId" = ?').run('a');
    expect(count(db, 'Lesson')).toBe(3);
  });

  it('W2 control: the same declaration WITHOUT `where` refuses the second unpinned row', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson({ indexes: [{ fields: ['learnerId', 'conceptId'], unique: true }] }));

    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', conceptId: 'C', pinned: 0 });
    expect(() => insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', conceptId: 'C', pinned: 0 })).toThrow(
      /UNIQUE constraint failed/
    );
  });

  it('`in` and `exists` build, and hold only where they say', () => {
    const { sm, db } = ctx;
    sm.createTable(
      lesson({
        indexes: [
          {
            fields: ['learnerId', 'kind'],
            unique: true,
            where: { kind: { in: ['initial', 'mid', 'final', 'impact'] } }
          },
          { fields: ['conceptId', 'sessionId'], unique: true, where: { sessionId: { exists: true } } }
        ]
      })
    );

    // `in`: two drafts are fine, two initials are not.
    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', kind: 'draft' });
    insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', kind: 'draft' });
    insert(db, 'Lesson', { objectId: 'c', learnerId: 'L', kind: 'initial' });
    expect(() => insert(db, 'Lesson', { objectId: 'd', learnerId: 'L', kind: 'initial' })).toThrow(/UNIQUE/);

    // `exists`: one rating per (concept, session) where there IS a session.
    insert(db, 'Lesson', { objectId: 'e', conceptId: 'C', sessionId: 'S' });
    expect(() => insert(db, 'Lesson', { objectId: 'f', conceptId: 'C', sessionId: 'S' })).toThrow(/UNIQUE/);
  });

  it('W3: a restarted manager reads it back as built and declared, and a re-push keeps it', () => {
    ctx.sm.createTable(lesson({ indexes: [ONE_PINNED] }));
    ctx.db.close();

    ctx = open(dir);
    const status = ctx.sm.indexStatus('Lesson');
    expect(status).toHaveLength(1);
    expect(status[0]).toMatchObject({ unique: true, built: true, declared: true, where: { pinned: true } });
    expect(status[0].name).toMatch(/^idx_Lesson_learnerId_conceptId_w[0-9a-f]{8}$/);

    const report = ctx.sm.reconcileIndexes('Lesson', [ONE_PINNED]);
    expect(report).toMatchObject({ created: [], dropped: [], kept: [status[0].name] });
  });

  it('W4: a partial and a full index on the same fields are two indexes; removing one drops only it', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson());
    const full = { fields: ['learnerId', 'conceptId'] };
    const first = sm.reconcileIndexes('Lesson', [full, ONE_PINNED]);
    expect(first.created).toHaveLength(2);
    expect(new Set(first.created).size).toBe(2);

    const second = sm.reconcileIndexes('Lesson', [ONE_PINNED]);
    expect(second.dropped).toEqual(['idx_Lesson_learnerId_conceptId']);
    expect(second.kept).toEqual([first.created[1]]);
    expect(indexNames(db, 'Lesson')).toContain(first.created[1]);
    expect(indexNames(db, 'Lesson')).not.toContain('idx_Lesson_learnerId_conceptId');
  });

  it('two spellings of one predicate are one index', () => {
    const { sm } = ctx;
    sm.createTable(lesson());
    const a = sm.reconcileIndexes('Lesson', [
      { fields: ['learnerId'], unique: true, where: { pinned: true, kind: { in: ['b', 'a', 'a'] } } }
    ]);
    const b = sm.reconcileIndexes('Lesson', [
      { fields: ['learnerId'], unique: true, where: { kind: { in: ['a', 'b'] }, pinned: true } }
    ]);
    expect(b.kept).toEqual(a.created);
  });

  it('W5: duplicates outside the predicate do not refuse the push; duplicates inside it do, and nothing changes', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson());
    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', conceptId: 'C', pinned: 0 });
    insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', conceptId: 'C', pinned: 0 });
    insert(db, 'Lesson', { objectId: 'c', learnerId: 'L', conceptId: 'C', pinned: 1 });

    // Outside the predicate: accepted. (The pre-check without the WHERE would
    // have counted (L, C) three times and refused a push the index accepts.)
    expect(sm.reconcileIndexes('Lesson', [ONE_PINNED]).created).toHaveLength(1);
    sm.reconcileIndexes('Lesson', []);

    insert(db, 'Lesson', { objectId: 'd', learnerId: 'L', conceptId: 'C', pinned: 1 });
    const before = indexNames(db, 'Lesson');
    let thrown;
    try {
      sm.reconcileIndexes('Lesson', [{ fields: ['kind'] }, ONE_PINNED]);
    } catch (e) {
      thrown = e;
    }
    expect(thrown && thrown.code).toBe('INDEX_DUPLICATES');
    expect(thrown.duplicates).toBe(1);
    expect(thrown.message).toMatch(/where pinned = true/);
    expect(indexNames(db, 'Lesson')).toEqual(before);
    expect(count(db, 'Lesson')).toBe(4);
  });

  it('W1: every malformed predicate is refused by name, before any DDL', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson());
    const before = indexNames(db, 'Lesson');
    const refuse = (where, pattern) =>
      expect(() => sm.reconcileIndexes('Lesson', [{ fields: ['learnerId'], unique: true, where }])).toThrow(pattern);

    refuse({}, /one to 4 properties/);
    refuse([], /must be an object/);
    refuse('pinned = 1', /must be an object/);
    refuse({ a: true, b: true, c: true, d: true, e: true }, /one to 4 properties/);
    refuse({ pinned: { eq: true } }, /not an object with "eq"/);
    refuse({ pinned: { exists: 'yes' } }, /exists must be true or false/);
    refuse({ kind: { in: [] } }, /one to 20 values/);
    refuse({ kind: { in: ['a', 1] } }, /not a mix/);
    refuse({ kind: null }, /expected true\/false/);
    refuse({ position: Infinity }, /finite/);
    refuse({ nope: true }, /no such property/);
    refuse({ pinned: 'yes' }, /"pinned" with "yes", a String, but "pinned" is a Boolean/);
    refuse({ kind: 3 }, /a Number, but "kind" is a String/);
    refuse({ removedAt: '2026-01-01' }, /"removedAt" is a Date/);
    refuse({ 'kind; DROP': true }, /not a valid property name/);

    expect(indexNames(db, 'Lesson')).toEqual(before);
    expect(sm.indexStatus('Lesson')).toEqual([]);
  });

  it('`exists` applies to any type — the soft-removed row is the product’s case', () => {
    const { sm, db } = ctx;
    sm.createTable(
      lesson({
        indexes: [{ fields: ['learnerId', 'position'], unique: true, where: { removedAt: { exists: false } } }]
      })
    );
    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', position: 1, removedAt: '2026-09-01T00:00:00Z' });
    insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', position: 1 });
    expect(() => insert(db, 'Lesson', { objectId: 'c', learnerId: 'L', position: 1 })).toThrow(/UNIQUE/);
  });

  it('a string value is a literal, never SQL', () => {
    const { sm, db } = ctx;
    sm.createTable(lesson());
    const evil = 'x\'); DROP TABLE "Lesson"; --';
    sm.reconcileIndexes('Lesson', [{ fields: ['learnerId'], unique: true, where: { kind: evil } }]);
    insert(db, 'Lesson', { objectId: 'a', learnerId: 'L', kind: evil });
    expect(() => insert(db, 'Lesson', { objectId: 'b', learnerId: 'L', kind: evil })).toThrow(/UNIQUE/);
    insert(db, 'Lesson', { objectId: 'c', learnerId: 'L', kind: 'x' });
    expect(count(db, 'Lesson')).toBe(2);
  });

  it('W7: the PostgreSQL export emits the WHERE, under the same derived name', () => {
    const { sm } = ctx;
    sm.createTable(lesson({ indexes: [ONE_PINNED, { fields: ['kind'], where: { kind: { in: ['a', 'b'] } } }] }));
    const sql = sm.generatePostgresSQL();
    const name = sm.indexStatus('Lesson')[0].name;
    expect(sql).toContain(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON "Lesson" ("learnerId", "conceptId") WHERE "pinned" = TRUE;`
    );
    expect(sql).toMatch(/ON "Lesson" \("kind"\) WHERE "kind" IN \('a', 'b'\);/);
  });
});
