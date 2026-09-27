/**
 * BRG-005 AC5 / BRG-D5 — do the three SQLite user functions cross, and does
 * anything need PostGIS?
 *
 * BRG-005 §3.2 left this as the one item marked **unverified**: *"BRG-D5 is
 * unverified: measure whether a bare `POINT` answers these before assuming
 * PostGIS is optional."* This file is that measurement, and it is a comparison
 * rather than a set of expected values written by hand: every case runs the
 * SQLite adapter's own JavaScript (`sqlFunctions.ts` — the answer the built-in
 * backend gives today) and the PostgreSQL expression (`postgres/geo.ts`) over
 * the same point, and asserts they agree.
 *
 * An expected-value table would have graded my arithmetic. This grades the
 * port.
 *
 * 🔴 Skipped when no PostgreSQL is reachable — BRG-004 §5.4's hole, which
 * BRG-006 closes. `NODEGX_PG_TEST_URL=postgres://…` points it elsewhere.
 */

const { execFileSync } = require('child_process');

const { distanceKm, pointInPolygon, regexpMatch } = require('../../src/api/adapters/local-sql/sqlFunctions');
const {
  distanceKmSql,
  pointInPolygonSql,
  polygonLiteral,
  regexpSql,
  toAreRegex
} = require('../../src/api/adapters/postgres/geo');
const { PgConnectionPool } = require('../../src/api/adapters/postgres/pool');

const PG_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';

let reachable = false;
try {
  execFileSync('psql', ['-qtAX', '-d', PG_URL, '-c', 'SELECT 1'], { stdio: 'ignore' });
  reachable = true;
} catch (e) {
  reachable = false;
}
const suite = reachable ? describe : describe.skip;

/** A GeoPoint as the adapter stores it. */
const point = (latitude, longitude) => ({ __type: 'GeoPoint', latitude, longitude });

const LONDON = point(51.5074, -0.1278);
const PARIS = point(48.8566, 2.3522);
const SYDNEY = point(-33.8688, 151.2093);
const ANTIPODE_OF_LONDON = point(-51.5074, 179.8722);

suite('BRG-005 AC5 — geo and regex, measured against the JavaScript they replace', () => {
  let pool;

  beforeAll(async () => {
    pool = new PgConnectionPool({ url: PG_URL, max: 2, label: 'geo-probe' });
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  /** Evaluate a geo expression over one stored point, as the adapter would. */
  async function evalOverPoint(sqlFor, stored, params) {
    // `?::jsonb` stands in for the row's JSONB column; BRG-004 corrected
    // POSTGRES_TYPE_MAP.GeoPoint from POINT to JSONB for this reason.
    const expr = sqlFor('$COL$');
    const rows = await pool.query(
      `SELECT ${expr.split('$COL$').join('(?::jsonb)')} AS v`,
      interleave(expr, stored, params)
    );
    return rows[0].v;
  }

  /**
   * Build the parameter list for an expression whose column reference has been
   * replaced by a `?::jsonb`: every column occurrence takes one parameter, in
   * the order the markers appear.
   */
  function interleave(expr, stored, params) {
    const json = stored === null ? null : JSON.stringify(stored);
    const out = [];
    let pi = 0;
    // Walk the expression, emitting the stored point for each $COL$ and the
    // next caller parameter for each ?.
    const tokens = expr.split(/(\$COL\$|\?)/);
    for (const t of tokens) {
      if (t === '$COL$') out.push(json);
      else if (t === '?') out.push(params[pi++]);
    }
    if (pi !== params.length) throw new Error(`spec harness: ${params.length} params supplied, ${pi} consumed`);
    return out;
  }

  describe('BRG-D5 — no extension is required', () => {
    it('PostGIS is not installed, and the expressions do not ask for it', async () => {
      const rows = await pool.query(
        "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'earthdistance', 'cube')"
      );
      // The reading that makes the design decision: this is a stock server with
      // no geo extension, and everything below it still answers.
      expect(rows.map((r) => r.extname).sort()).toEqual([]);
    });
  });

  describe('distance', () => {
    const CASES = [
      ['London to Paris', LONDON, PARIS],
      ['London to Sydney', LONDON, SYDNEY],
      ['a point to itself', PARIS, PARIS],
      ['the antipode — where the sqrt clamp matters', LONDON, ANTIPODE_OF_LONDON]
    ];

    it.each(CASES)('%s agrees with the JavaScript to the millimetre', async (_name, stored, centre) => {
      const js = distanceKm(JSON.stringify(stored), centre.latitude, centre.longitude);
      const pg = await evalOverPoint(distanceKmSql, stored, [centre.latitude, centre.latitude, centre.longitude]);
      expect(typeof js).toBe('number');
      // Millimetres, not metres, and the tightness is the point. The first
      // draft of geo.ts hardcoded an Earth radius of 6371 where sqlFunctions.ts
      // uses 6371.0088, and that showed up here as a CONSTANT 1.4 ppm offset —
      // 0.5 m over London-Paris, 23 m over London-Sydney. A "within a metre"
      // tolerance would have passed the short case and hidden it.
      expect(Number(pg)).toBeCloseTo(js, 6);
    });

    it('carries the same Earth radius, rather than a second copy of it', async () => {
      // The residual above is float64 noise only while ONE constant feeds both
      // sides. This asserts that directly, so the day somebody writes a literal
      // into either file, a test says which two numbers disagree.
      const { EARTH_RADIUS_KM } = require('../../src/api/adapters/local-sql/sqlFunctions');
      expect(EARTH_RADIUS_KM).toBe(6371.0088);
      expect(distanceKmSql('"c"')).toContain(String(EARTH_RADIUS_KM));
    });

    it('is NULL for a malformed point on both sides, so the row is excluded either way', async () => {
      const broken = { __type: 'GeoPoint', latitude: 'north' };
      expect(distanceKm(JSON.stringify(broken), 0, 0)).toBeNull();
      const pg = await evalOverPoint(distanceKmSql, broken, [0, 0, 0]);
      expect(pg).toBeNull();
    });
  });

  describe('point in polygon', () => {
    // A square around central London, in (latitude, longitude).
    const SQUARE = [point(51.4, -0.3), point(51.6, -0.3), point(51.6, 0.1), point(51.4, 0.1)];

    const CASES = [
      ['a point inside', LONDON, SQUARE],
      ['a point outside', PARIS, SQUARE],
      ['a point far outside', SYDNEY, SQUARE]
    ];

    it.each(CASES)('%s agrees with the ray cast', async (_name, stored, ring) => {
      const js = pointInPolygon(JSON.stringify(stored), JSON.stringify(ring));
      const literal = polygonLiteral(ring);
      expect(literal).not.toBeNull();
      const pg = await evalOverPoint(pointInPolygonSql, stored, [literal]);
      expect(pg).toBe(js === 1);
    });

    it('refuses a ring with fewer than three vertices, as the JavaScript does', () => {
      expect(polygonLiteral([point(0, 0), point(1, 1)])).toBeNull();
      expect(pointInPolygon(JSON.stringify(LONDON), JSON.stringify([point(0, 0), point(1, 1)]))).toBe(0);
    });

    it('agrees on the south and west edges, where the ray cast says inside', async () => {
      // Measured, not assumed. The first draft of this file asserted that the
      // ray cast calls an edge OUTSIDE and PostgreSQL calls it inside — a
      // divergence invented from the implementation's comment ("a point exactly
      // on an edge is deliberately not special-cased") rather than run. Ray
      // casting is half-open: two of the four edges come out inside.
      for (const onEdge of [point(51.4, -0.1), point(51.5, -0.3)]) {
        expect(pointInPolygon(JSON.stringify(onEdge), JSON.stringify(SQUARE))).toBe(1);
        expect(await evalOverPoint(pointInPolygonSql, onEdge, [polygonLiteral(SQUARE)])).toBe(true);
      }
    });

    it('DECLARED DIVERGENCE — the north and east edges, where the half-open ray cast says outside', async () => {
      // This is the real one, and it is one-sided: the ray cast's convention
      // makes the far edges exclusive, PostgreSQL's `@>` treats every boundary
      // as inside. Parse does not define the boundary, so neither is wrong —
      // but a row sitting exactly on the north edge of a filter polygon is in
      // the answer on Postgres and not on SQLite.
      //
      // Declared `degraded` with this as the reason (AC2/AC6), and asserted in
      // BOTH directions so the day either side changes its convention the test
      // names which one moved.
      for (const onEdge of [point(51.6, -0.1), point(51.5, 0.1), point(51.6, 0.1)]) {
        expect(pointInPolygon(JSON.stringify(onEdge), JSON.stringify(SQUARE))).toBe(0);
        expect(await evalOverPoint(pointInPolygonSql, onEdge, [polygonLiteral(SQUARE)])).toBe(true);
      }
    });
  });

  describe('regex', () => {
    const CASES = [
      ['an anchor', 'Ada Lovelace', '^Ada', ''],
      ['an anchored full match that should fail', 'Ada Lovelace', '^Ada$', ''],
      ['a character class', 'room 101', '[0-9]+', ''],
      ['a shorthand class', 'room 101', '\\d+', ''],
      ['alternation', 'grey', 'gr(a|e)y', ''],
      ['a quantifier that should not match', 'aaa', '^b+$', ''],
      ['case-insensitive via $options', 'ADA', '^ada$', 'i'],
      ['case-SENSITIVE without it', 'ADA', '^ada$', '']
    ];

    it.each(CASES)('%s agrees with JavaScript RegExp', async (_name, value, pattern, flags) => {
      const js = regexpMatch(pattern, flags, value) === 1;
      // `?::text`, not a bare `?`: in the adapter the column reference carries a
      // type, and a bare parameter in `$1 IS NOT NULL` gives the planner
      // nothing to infer from ("could not determine data type of parameter $1").
      // That error is the server's and is identical on any driver — it was very
      // nearly recorded as a driver difference in §4.2.
      const expr = regexpSql('?::text', flags);
      // Two markers when flags include 'm' (the embedded option is a literal,
      // not a marker), one column marker and one pattern marker otherwise.
      // The expression references the column twice (a NULL guard and the
      // match), and a positional marker binds one value each.
      const rows = await pool.query(`SELECT ${expr} AS v`, [value, value, toAreRegex(pattern)]);
      expect(rows[0].v).toBe(js);
    });

    it('is false for a NULL value on both sides', async () => {
      expect(regexpMatch('^a', '', null)).toBe(0);
      const rows = await pool.query(`SELECT ${regexpSql('?::text', '')} AS v`, [null, null, '^a']);
      expect(rows[0].v).toBe(false);
    });

    // --- what was MEASURED, replacing what was assumed ---------------------
    //
    // The first draft of this file asserted that PostgreSQL throws on
    // lookbehind. It does not — ARE has lookahead AND lookbehind, and both
    // agree with JavaScript. Two of the three divergences below were found by
    // probing the server; none was predictable from the documentation of
    // either engine.

    it.each([
      ['lookahead', 'foobar', 'foo(?=bar)'],
      ['lookbehind — ARE has it, contrary to the first draft of this file', 'room', '(?<=ro)om'],
      ['a lazy quantifier', 'aaa', '^a+?$'],
      ['a backreference', 'abab', '(ab)\\1']
    ])('%s agrees', async (_name, value, pattern) => {
      const js = regexpMatch(pattern, '', value) === 1;
      const rows = await pool.query(`SELECT ${regexpSql('?::text', '')} AS v`, [value, value, toAreRegex(pattern)]);
      expect(rows[0].v).toBe(js);
    });

    it('🔴 \\b is a word boundary in JavaScript and a BACKSPACE in ARE — translated, not declared', async () => {
      // The silent-wrong-rows case, and the reason toAreRegex exists. Both arms
      // are asserted: the untranslated pattern is WRONG on the server, and the
      // translated one is right. Without the first arm this test would pass
      // even if ARE had meant the same thing all along, and would be grading
      // nothing.
      const value = 'cat sat';
      const pattern = '\\bsat\\b';
      expect(regexpMatch(pattern, '', value)).toBe(1);

      const untranslated = await pool.query(`SELECT ${regexpSql('?::text', '')} AS v`, [value, value, pattern]);
      expect(untranslated[0].v).toBe(false); // the defect, measured

      const translated = await pool.query(
        `SELECT ${regexpSql('?::text', '')} AS v`,
        [value, value, toAreRegex(pattern)]
      );
      expect(translated[0].v).toBe(true); // the fix, measured
      expect(toAreRegex(pattern)).toBe('\\ysat\\y');
    });

    it('leaves \\b alone inside a character class, where both engines mean backspace', () => {
      expect(toAreRegex('[\\b]')).toBe('[\\b]');
      expect(toAreRegex('a[\\b]\\bz')).toBe('a[\\b]\\yz');
      // An escaped backslash must not be read as the start of an escape.
      expect(toAreRegex('\\\\b')).toBe('\\\\b');
    });

    it.each([
      ['a named group', '(?<n>ro)om'],
      ['a Unicode property escape', '\\p{L}+']
    ])('DECLARED DIVERGENCE — %s raises on PostgreSQL rather than answering wrongly', async (_name, pattern) => {
      // Left to raise on purpose. sqlFunctions.compile lets an invalid pattern
      // throw for the same stated reason, so both engines fail loudly — they
      // merely disagree about which patterns qualify, and THAT is the declared
      // divergence (AC2).
      await expect(
        pool.query(`SELECT ${regexpSql('?::text', '')} AS v`, ['room', 'room', toAreRegex(pattern)])
      ).rejects.toThrow(/invalid regular expression/);
    });
  });
});
