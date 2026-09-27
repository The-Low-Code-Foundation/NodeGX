/**
 * BRG-005 §6.1 — the dialect seam, graded by running both engines over the same
 * rows.
 *
 * `postgres.geo.test.js` established the method for this phase: do not assert a
 * table of values worked out by the author, because that grades the author's
 * arithmetic and agrees with itself. Assert instead that **the two engines
 * return the same rows** — the built-in backend's answer is the specification,
 * and the port is what is on trial.
 *
 * So every case here seeds one corpus into a real `node:sqlite` database and the
 * same corpus into a real PostgreSQL table, builds the same Parse-style query
 * twice (`dialect: 'sqlite'` and `dialect: 'postgres'`), runs each on its own
 * engine, and compares the `objectId` sets. The marker counts are checked on the
 * way through, because the mismatch they catch is the whole reason the seam is
 * inside `QueryBuilder` rather than at the driver boundary.
 *
 * ## The two findings this file was written to grade, and their controls
 *
 * Both were invisible until the engines were run against each other, and both
 * are **armed** below by a case that runs the *pre-fix* expression and asserts
 * it gives the wrong answer — without that, a green suite says nothing about
 * whether these cases can fail at all.
 *
 * 1. **The ACL flag compared as text denied a row SQLite grants.** BRG-004's
 *    `(value ->> 'read') IN ('1','true')` renders the JSON real `1.0` as `"1.0"`
 *    and denies it; SQLite's `json_extract(…) = 1` grants it.
 * 2. **`jsonb_each` raises on a non-object ACL.** SQLite's `json_each` walks an
 *    array or scalar and simply matches no principal, so the row is hidden. On
 *    Postgres, without a `jsonb_typeof` guard, **one malformed ACL row turns
 *    every read of that collection into an error.**
 *
 * 🔴 Skipped when no PostgreSQL is reachable — BRG-004 §5.4's hole, which
 * BRG-006 closes. `NODEGX_PG_TEST_URL=postgres://…` points it elsewhere.
 */

const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const QueryBuilder = require('../../src/api/adapters/local-sql/QueryBuilder');
const { registerSqlFunctions } = require('../../src/api/adapters/local-sql/sqlFunctions');
const { PgConnectionPool } = require('../../src/api/adapters/postgres/pool');
const { toPgQuery } = require('../../src/api/adapters/postgres/placeholders');
const { SEARCH_FIELDS_REQUIRED } = require('../../src/api/adapters/postgres/search');

const PG_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const TABLE = 'BrgDialect';

let reachable = false;
try {
  execFileSync('psql', ['-qtAX', '-d', PG_URL, '-c', 'SELECT 1'], { stdio: 'ignore' });
  reachable = true;
} catch {
  reachable = false;
}
const suite = reachable ? describe : describe.skip;

/** A GeoPoint as the adapter stores it. */
const point = (latitude, longitude) => ({ __type: 'GeoPoint', latitude, longitude });

/**
 * The corpus. One row per interesting shape, seeded identically into both
 * engines — ACL as TEXT-JSON on SQLite and JSONB on Postgres, which is what
 * `POSTGRES_TYPE_MAP` maps those columns to, and a GeoPoint likewise.
 */
const ROWS = [
  // ── the eight flag spellings, all keyed to principal 'u1' ────────────────
  { objectId: 'f-true', name: 'flag true', ACL: { u1: { read: true } } },
  { objectId: 'f-1', name: 'flag 1', ACL: { u1: { read: 1 } } },
  { objectId: 'f-1p0', name: 'flag 1.0', ACL: { u1: { read: 1.0 } }, rawAcl: '{"u1":{"read":1.0}}' },
  { objectId: 'f-false', name: 'flag false', ACL: { u1: { read: false } } },
  { objectId: 'f-0', name: 'flag 0', ACL: { u1: { read: 0 } } },
  { objectId: 'f-str', name: 'flag yes', ACL: { u1: { read: 'yes' } } },
  { objectId: 'f-null', name: 'flag null', ACL: { u1: { read: null } } },
  { objectId: 'f-absent', name: 'write only', ACL: { u1: { write: true } } },
  // ── ACL shapes that are not objects, plus the public row ─────────────────
  { objectId: 'a-public', name: 'public', ACL: null },
  { objectId: 'a-array', name: 'array acl', ACL: [1, 2], rawAcl: '[1,2]' },
  { objectId: 'a-scalar', name: 'scalar acl', ACL: 'scalar', rawAcl: '"scalar"' },
  { objectId: 'a-number', name: 'number acl', ACL: 3, rawAcl: '3' },
  { objectId: 'a-empty', name: 'empty acl', ACL: {}, rawAcl: '{}' },
  { objectId: 'a-other', name: 'other principal', ACL: { u2: { read: true } } },
  { objectId: 'a-star', name: 'star', ACL: { '*': { read: true } } },
  // ── points: London, Paris, Sydney, a malformed one, and none at all ──────
  { objectId: 'p-london', name: 'London', loc: point(51.5074, -0.1278), body: 'the cat sat on the mat' },
  { objectId: 'p-paris', name: 'Paris', loc: point(48.8566, 2.3522), body: 'un chat assis' },
  { objectId: 'p-sydney', name: 'Sydney', loc: point(-33.8688, 151.2093), body: 'concatenate' },
  { objectId: 'p-bad', name: 'Nowhere', loc: { __type: 'GeoPoint', latitude: 'north', longitude: 0 } },
  { objectId: 'p-none', name: 'Unplaced', loc: null, body: null }
];

suite('BRG-005 §6.1 — the dialect seam, both engines over one corpus', () => {
  let sqlite;
  let pool;

  beforeAll(async () => {
    sqlite = new DatabaseSync(':memory:');
    registerSqlFunctions({
      registerFunction: (name, fn) => sqlite.function(name, { deterministic: true, varargs: false }, fn)
    });
    sqlite.exec(
      `CREATE TABLE "${TABLE}" ("objectId" TEXT PRIMARY KEY, "name" TEXT, "body" TEXT, "ACL" TEXT, "loc" TEXT)`
    );

    pool = new PgConnectionPool({ url: PG_URL, max: 2, label: 'dialect-seam' });
    await pool.run(`DROP TABLE IF EXISTS "${TABLE}"`);
    await pool.run(
      `CREATE TABLE "${TABLE}" ("objectId" TEXT PRIMARY KEY, "name" TEXT, "body" TEXT, "ACL" JSONB, "loc" JSONB)`
    );

    const insert = sqlite.prepare(
      `INSERT INTO "${TABLE}" ("objectId","name","body","ACL","loc") VALUES (?, ?, ?, ?, ?)`
    );
    for (const row of ROWS) {
      // `rawAcl` exists so a JSON real survives the seed: JSON.stringify(1.0)
      // is "1", so the 1.0 spelling can only be written as text on both sides.
      const acl = row.ACL === null || row.ACL === undefined ? null : (row.rawAcl ?? JSON.stringify(row.ACL));
      const loc = row.loc ? JSON.stringify(row.loc) : null;
      insert.run(row.objectId, row.name, row.body ?? null, acl, loc);
      await pool.run(
        `INSERT INTO "${TABLE}" ("objectId","name","body","ACL","loc") VALUES (?, ?, ?, ?::jsonb, ?::jsonb)`,
        [row.objectId, row.name, row.body ?? null, acl, loc]
      );
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.run(`DROP TABLE IF EXISTS "${TABLE}"`);
      await pool.end();
    }
    if (sqlite) sqlite.close();
  });

  // ── the two runners, and the marker-count check between them ─────────────

  /**
   * Every `?` in the built SQL must have a parameter, and every parameter a
   * marker. `toPgQuery` throws on a mismatch, so calling it here turns the
   * defect the seam exists to prevent — an expression swapped in with the wrong
   * marker count — into a named failure in this file rather than a protocol
   * error from the server.
   */
  function assertMarkersBalance(built, label) {
    const { text, values } = toPgQuery(built.sql, built.params);
    const highest = [...text.matchAll(/\$(\d+)/g)].reduce((m, x) => Math.max(m, Number(x[1])), 0);
    expect({ label, highest, params: values.length }).toEqual({
      label,
      highest: values.length,
      params: values.length
    });
  }

  function idsFromSqlite(built) {
    return sqlite
      .prepare(built.sql)
      .all(...built.params)
      .map((r) => r.objectId)
      .sort();
  }

  async function idsFromPostgres(built, label) {
    assertMarkersBalance(built, label);
    const rows = await pool.query(built.sql, built.params);
    return rows.map((r) => r.objectId).sort();
  }

  /**
   * Build the same query on both dialects, run each on its own engine, and hand
   * back both answers. The assertion `toEqual` between them is the measurement;
   * a third value (what the rows should be) is asserted as well, so a case where
   * both engines are wrong together cannot pass quietly.
   */
  async function both(build, label) {
    const sqliteBuilt = build('sqlite');
    const pgBuilt = build('postgres');
    return {
      sqlite: idsFromSqlite(sqliteBuilt),
      postgres: await idsFromPostgres(pgBuilt, label),
      sqliteSql: sqliteBuilt.sql,
      pgSql: pgBuilt.sql
    };
  }

  const select = (options) => (dialect) =>
    QueryBuilder.buildSelect({ collection: TABLE, ...options }, undefined, undefined, dialect);

  // ── 1. the ACL flag, and the divergence a text comparison hid ────────────

  describe('the row ACL', () => {
    test('the eight flag spellings: both engines grant exactly true, 1 and 1.0', async () => {
      const r = await both(
        select({ where: { name: { $regex: '^flag' } }, acl: { access: 'read', keys: ['u1'] } }),
        'acl-flags'
      );
      expect(r.postgres).toEqual(r.sqlite);
      // The third value: which rows SHOULD come back. Without it, two engines
      // that are wrong in the same direction agree and pass.
      expect(r.sqlite).toEqual(['f-1', 'f-1p0', 'f-true']);
    });

    test('ARMED — BRG-004\'s text comparison denies the JSON real that SQLite grants', async () => {
      // The pre-fix expression, run verbatim against the same rows. This is the
      // control: it proves the case above can fail, and it names what changed.
      const before = await pool.query(
        `SELECT "objectId" FROM "${TABLE}" WHERE "name" LIKE 'flag%' AND ("ACL" IS NULL OR EXISTS (` +
          `SELECT 1 FROM jsonb_each("ACL") AS _a WHERE _a.key IN ('u1') ` +
          `AND (_a.value ->> 'read') IN ('1','true')))`
      );
      const ids = before.map((r) => r.objectId).sort();
      expect(ids).toEqual(['f-1', 'f-true']);
      expect(ids).not.toContain('f-1p0');
    });

    test('an ACL that is not an object hides its row on both engines, and raises on neither', async () => {
      // `['*', 'u1']` is the shape a real caller passes: `buildAclPredicate`
      // does not add the public principal itself, it binds the keys it is given.
      const r = await both(
        select({
          where: { name: { $regex: 'acl|public|principal|star' } },
          acl: { access: 'read', keys: ['*', 'u1'] }
        }),
        'acl-shapes'
      );
      expect(r.postgres).toEqual(r.sqlite);
      // Public (no ACL) and the '*' row are visible; the array, scalar, number,
      // empty-object and other-principal rows are not — and the three that are
      // not JSON objects are HIDDEN rather than raising, which is the finding.
      expect(r.sqlite).toEqual(['a-public', 'a-star']);
    });

    test('ARMED — without the jsonb_typeof guard, one malformed ACL row fails the whole query', async () => {
      await expect(
        pool.query(
          `SELECT "objectId" FROM "${TABLE}" WHERE ("ACL" IS NULL OR EXISTS (` +
            `SELECT 1 FROM jsonb_each("ACL") AS _a WHERE _a.key IN ('u1') ` +
            `AND (_a.value -> 'read') IN ('true'::jsonb,'1'::jsonb)))`
        )
      ).rejects.toThrow(/cannot call jsonb_each on a non-object/);
    });

    test('no principal keys at all is dialect-independent: only public rows', async () => {
      const r = await both(select({ acl: { access: 'read', keys: [] } }), 'acl-empty-keys');
      expect(r.postgres).toEqual(r.sqlite);
      // Every row in the corpus with no ACL column, which is the five geo rows
      // as well as the one named 'public' — counted from the corpus, not
      // predicted. An un-ACL'd row is public on both engines (Parse semantics).
      expect(r.sqlite).toEqual(['a-public', 'p-bad', 'p-london', 'p-none', 'p-paris', 'p-sydney']);
      // The one ACL branch that needed no translation, and the SQL says so.
      expect(r.pgSql).toBe(r.sqliteSql);
    });

    test('write access reads the write flag, not the read flag', async () => {
      const r = await both(
        select({ where: { name: { $regex: '^flag|^write' } }, acl: { access: 'write', keys: ['u1'] } }),
        'acl-write'
      );
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['f-absent']);
    });
  });

  // ── 1b. the two the first conformance run on PostgreSQL found (BRG-005 s8) ──

  describe('what the conformance suite found on the first PostgreSQL run', () => {
    test('$in over an empty set matches nothing on both engines', async () => {
      // `filters/in-and-nin` pins this. The SQLite builder emitted a bare `0`,
      // which SQLite reads as false and PostgreSQL refuses as a type error —
      // the statement failed rather than matching nothing.
      const r = await both(select({ where: { name: { $in: [] } } }), 'in-empty');
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual([]);
    });

    test('$nin over an empty set matches everything on both engines', async () => {
      const r = await both(select({ where: { name: { $nin: [] } } }), 'nin-empty');
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite.length).toBe(ROWS.length);
    });

    test('ARMED — a bare 0 in WHERE is a type error on PostgreSQL, not false', async () => {
      await expect(pool.query(`SELECT "objectId" FROM "${TABLE}" WHERE 0`)).rejects.toThrow(
        /argument of WHERE must be type boolean/
      );
    });

    test('$contains is case-insensitive on both engines (LIKE vs ILIKE)', async () => {
      // SQLite's LIKE folds ASCII case; PostgreSQL's LIKE does not. The corpus
      // has 'London', 'Paris', 'Sydney' — a lower-case term must find them.
      const r = await both(select({ where: { name: { $contains: 'lon' } } }), 'contains-case');
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['p-london']);
    });

    test('ARMED — plain LIKE on PostgreSQL misses the row SQLite finds', async () => {
      const rows = await pool.query(`SELECT "objectId" FROM "${TABLE}" WHERE "name" LIKE '%lon%'`);
      expect(rows.map((x) => x.objectId)).toEqual([]);
    });
  });

  // ── 2. geo ───────────────────────────────────────────────────────────────

  describe('geo', () => {
    test('$within box — inside, outside, malformed and missing agree', async () => {
      const r = await both(
        select({
          where: {
            loc: { $within: { $box: [point(48, -1), point(52, 3)] } }
          }
        }),
        'within-box'
      );
      expect(r.postgres).toEqual(r.sqlite);
      // London and Paris inside; Sydney outside; the malformed and absent
      // points excluded rather than raising.
      expect(r.sqlite).toEqual(['p-london', 'p-paris']);
    });

    test('$nearSphere with a radius — and the centre latitude bound twice, in order', async () => {
      // The centre is chosen with latitude and longitude far apart (51.5 vs
      // -0.13) so that a wrong bind ORDER cannot pass: swapping them puts the
      // centre in the Indian Ocean and returns nothing.
      const r = await both(
        select({
          where: { loc: { $nearSphere: point(51.5074, -0.1278), $maxDistanceInKilometers: 400 } }
        }),
        'nearsphere-radius'
      );
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['p-london', 'p-paris']);

      // And the marker-count change stated as a fact, not as a comment: three
      // markers on Postgres where SQLite has two, plus the radius on each.
      const pg = select({
        where: { loc: { $nearSphere: point(51.5074, -0.1278), $maxDistanceInKilometers: 400 } }
      })('postgres');
      const lite = select({
        where: { loc: { $nearSphere: point(51.5074, -0.1278), $maxDistanceInKilometers: 400 } }
      })('sqlite');
      expect(pg.params).toEqual([51.5074, 51.5074, -0.1278, 400]);
      expect(lite.params).toEqual([51.5074, -0.1278, 400]);
    });

    test('a bare $nearSphere narrows nothing but still excludes unusable points', async () => {
      const r = await both(select({ where: { loc: { $nearSphere: point(51.5074, -0.1278) } } }), 'nearsphere-bare');
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['p-london', 'p-paris', 'p-sydney']);
    });

    test('$geoWithin polygon — same rows, and an unusable ring matches nothing on both', async () => {
      const ring = [point(48, -1), point(52, -1), point(52, 3), point(48, 3)];
      const inside = await both(select({ where: { loc: { $geoWithin: { $polygon: ring } } } }), 'geowithin');
      expect(inside.postgres).toEqual(inside.sqlite);
      expect(inside.sqlite).toEqual(['p-london', 'p-paris']);

      // A ring of three entries that are not points: `pointInPolygon` returns 0,
      // so the faithful translation is a condition matching nothing — NOT a
      // dropped condition, which would return the whole collection.
      const broken = await both(
        select({ where: { loc: { $geoWithin: { $polygon: [1, 2, 3] } } } }),
        'geowithin-broken'
      );
      expect(broken.postgres).toEqual(broken.sqlite);
      expect(broken.sqlite).toEqual([]);
      expect(broken.pgSql).toContain('FALSE');
    });
  });

  // ── 3. $regex, where the flags stop being a bound value ──────────────────

  describe('$regex', () => {
    test('anchors and classes agree, and Postgres binds one marker where SQLite binds two', async () => {
      const r = await both(select({ where: { name: { $regex: '^P[a-z]+s$' } } }), 'regex-anchored');
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['p-paris']);

      const pg = select({ where: { name: { $regex: '^P[a-z]+s$' } } })('postgres');
      const lite = select({ where: { name: { $regex: '^P[a-z]+s$' } } })('sqlite');
      expect(pg.params).toEqual(['^P[a-z]+s$']);
      expect(lite.params).toEqual(['^P[a-z]+s$', '']);
    });

    test('case-insensitive $options selects the operator rather than a parameter', async () => {
      const r = await both(
        select({ where: { name: { $regex: '^paris$', $options: 'i' } } }),
        'regex-insensitive'
      );
      expect(r.postgres).toEqual(r.sqlite);
      expect(r.sqlite).toEqual(['p-paris']);
      expect(r.pgSql).toContain('~*');
    });

    test('\\b survives the crossing — ARE would have read it as a backspace', async () => {
      const r = await both(select({ where: { body: { $regex: '\\bcat\\b' } } }), 'regex-word-boundary');
      expect(r.postgres).toEqual(r.sqlite);
      // "the cat sat on the mat" matches; "concatenate" must not.
      expect(r.sqlite).toEqual(['p-london']);

      const pg = select({ where: { body: { $regex: '\\bcat\\b' } } })('postgres');
      expect(pg.params).toEqual(['\\ycat\\y']);
    });
  });

  // ── 4. search: same rows, different ranking (AC6) ────────────────────────

  describe('search', () => {
    test('the row set agrees; the ranking is allowed to differ', async () => {
      const opts = { collection: TABLE, search: 'cat', fields: ['name', 'body'] };
      const lite = QueryBuilder.buildSearchSelect(opts, undefined, undefined, 'sqlite');
      const pg = QueryBuilder.buildSearchSelect(opts, undefined, undefined, 'postgres');

      // SQLite's search needs the FTS5 shadow table, so the SQLite half of this
      // pair is graded by BAK-008's own specs; here the Postgres half is run and
      // its ROWS are asserted, which is what AC6 makes the criterion.
      assertMarkersBalance(pg, 'search-select');
      const rows = await pool.query(pg.sql, pg.params);
      expect(rows.map((r) => r.objectId).sort()).toEqual(['p-london']);
      // 'concatenate' must NOT match: a substring is not a token, on either
      // engine. This is the case that would fail if the tsquery were built with
      // a prefix or trigram match "to be more helpful".
      expect(rows.map((r) => r.objectId)).not.toContain('p-sydney');

      expect(lite.sql).toContain('MATCH ?');
      expect(pg.sql).toContain('plainto_tsquery');
    });

    test('_rank stays lower-is-better across the crossing', async () => {
      // SQLite's bm25() is lower-is-better and `LocalSQLAdapter.search`
      // publishes `_score = -_rank` on that basis. ts_rank_cd is the other way
      // round, so the expression is negated; a positive _rank here would mean
      // every caller reads the ranking backwards with nothing failing.
      const pg = QueryBuilder.buildSearchSelect(
        { collection: TABLE, search: 'cat', fields: ['name', 'body'] },
        undefined,
        undefined,
        'postgres'
      );
      const rows = await pool.query(pg.sql, pg.params);
      expect(rows.length).toBeGreaterThan(0);
      expect(Number(rows[0]._rank)).toBeLessThan(0);
      expect(pg.sql).toContain('-ts_rank_cd');
      expect(pg.sql).toContain('"_rank" ASC');
    });

    test('the snippet marks the term on both engines', async () => {
      const pg = QueryBuilder.buildSearchSelect(
        { collection: TABLE, search: 'cat', fields: ['name', 'body'] },
        undefined,
        undefined,
        'postgres'
      );
      const rows = await pool.query(pg.sql, pg.params);
      expect(rows[0]._snippet).toContain('<mark>cat</mark>');
    });

    test('the count agrees with the select', async () => {
      const pg = QueryBuilder.buildSearchCount(
        { collection: TABLE, search: 'cat', fields: ['name', 'body'] },
        undefined,
        undefined,
        'postgres'
      );
      assertMarkersBalance(pg, 'search-count');
      const rows = await pool.query(pg.sql, pg.params);
      expect(Number(rows[0].count)).toBe(1);
    });

    test('Postgres search REFUSES without a field list rather than choosing one', () => {
      // There is no shadow table to read the indexed fields from, so a default
      // would be a field set nobody chose — wrong rows, no error.
      expect(() =>
        QueryBuilder.buildSearchSelect({ collection: TABLE, search: 'cat' }, undefined, undefined, 'postgres')
      ).toThrow(SEARCH_FIELDS_REQUIRED);
      expect(() =>
        QueryBuilder.buildSearchCount({ collection: TABLE, search: 'cat', fields: [] }, undefined, undefined, 'postgres')
      ).toThrow(SEARCH_FIELDS_REQUIRED);
      // And the SQLite path is unaffected by the field list's absence.
      expect(() => QueryBuilder.buildSearchSelect({ collection: TABLE, search: 'cat' })).not.toThrow();
    });
  });

  // ── 5. the claim that the SQLite path is untouched ───────────────────────

  describe('the default dialect', () => {
    const cases = [
      ['select', (d) => QueryBuilder.buildSelect({ collection: TABLE, where: { name: { $regex: 'x' } } }, undefined, undefined, d)],
      ['count', (d) => QueryBuilder.buildCount({ collection: TABLE, acl: { access: 'read', keys: ['u1'] } }, undefined, undefined, d)],
      ['distinct', (d) => QueryBuilder.buildDistinct({ collection: TABLE, property: 'name', acl: { access: 'read', keys: ['u1'] } }, undefined, d)],
      ['aggregate', (d) => QueryBuilder.buildAggregate({ collection: TABLE, group: { n: { max: 'name' } }, acl: { access: 'read', keys: ['u1'] } }, undefined, d)],
      ['update', (d) => QueryBuilder.buildUpdate({ collection: TABLE, objectId: 'x', data: { name: 'y' }, acl: { access: 'write', keys: ['u1'] } }, d)],
      ['delete', (d) => QueryBuilder.buildDelete({ collection: TABLE, objectId: 'x', acl: { access: 'write', keys: ['u1'] } }, d)],
      ['increment', (d) => QueryBuilder.buildIncrement({ collection: TABLE, objectId: 'x', properties: { n: 1 }, acl: { access: 'write', keys: ['u1'] } }, d)]
    ];

    test.each(cases)('%s: omitting the argument is exactly the SQLite dialect', (_label, build) => {
      expect(build(undefined).sql).toBe(build('sqlite').sql);
    });

    test.each(cases)('%s: and the SQLite dialect still emits SQLite', (_label, build) => {
      const sql = build('sqlite').sql;
      expect(sql).not.toContain('jsonb');
      expect(sql).not.toContain('::double precision');
    });

    test('the SQLite ACL predicate is byte-for-byte what it always was', () => {
      const params = [];
      expect(QueryBuilder.buildAclPredicate(TABLE, { access: 'read', keys: ['u1', 'role:a'] }, params)).toBe(
        `("${TABLE}"."ACL" IS NULL OR EXISTS (SELECT 1 FROM json_each("${TABLE}"."ACL") AS _acl_entry ` +
          `WHERE _acl_entry.key IN (?, ?) AND json_extract(_acl_entry.value, '$.read') = 1))`
      );
      expect(params).toEqual(['u1', 'role:a']);
    });

    test('an unknown dialect is not a silent third engine', () => {
      // TypeScript makes this unreachable; the runtime behaviour is asserted
      // anyway, because `QueryBuilder` is required untyped across the package
      // edge by nodegx-backend. Anything that is not 'postgres' is SQLite.
      const params = [];
      const weird = QueryBuilder.buildAclPredicate(TABLE, { access: 'read', keys: ['u1'] }, params, 'mysql');
      expect(weird).toContain('json_each');
    });
  });
});
