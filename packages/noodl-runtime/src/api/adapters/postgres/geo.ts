/**
 * BRG-005 AC5 / BRG-D5 — the three SQLite user functions, as PostgreSQL SQL.
 *
 * SQLite has no REGEXP and no geometry, so BCN-003 gave the built-in backend
 * all three by calling back into JavaScript (`sqlFunctions.ts`). PostgreSQL
 * cannot call back into this process, so each has to become an expression the
 * server evaluates. This module is the whole of that translation.
 *
 * ## BRG-D5, answered: **PostGIS is not required, and must not be.**
 *
 * The scoping note said *"`earthdistance`/PostGIS, `ST_Contains`"* and BRG-005
 * §3.2 marked it unverified. Measured on PostgreSQL 16.11 (Homebrew), reading
 * `pg_available_extensions`: `cube` 1.5 and `earthdistance` 1.2 are available
 * and **not installed**; `postgis` **is not even available** — it is a separate
 * package on this platform, and on several managed providers it is a paid tier
 * or absent.
 *
 * So "a bridge you can cross" cannot depend on it. Both geo operators below are
 * written in **core PostgreSQL only** — `radians`, `sin`, `cos`, `asin`,
 * `sqrt`, and the built-in `polygon @> point` containment operator, none of
 * which needs `CREATE EXTENSION`, and therefore none of which needs an operator
 * to have superuser on their database.
 *
 * `postgres.geo.test.js` grades every expression here against the JavaScript
 * the SQLite adapter runs, on the same points, and the agreement is the
 * evidence for AC5 rather than this paragraph.
 *
 * ## How the point is stored, which is why these read JSONB and not POINT
 *
 * A GeoPoint is its Parse tagged object, JSON-encoded. BRG-004 already
 * corrected `POSTGRES_TYPE_MAP.GeoPoint` from `POINT` to `JSONB` for that
 * reason (`SchemaManager.ts:252-265`): a `POINT` column was one the app could
 * not read back. These expressions therefore read `->> 'latitude'` and
 * `->> 'longitude'` out of the JSONB and build the geometry per row.
 *
 * ⚠️ **None of the three can use an index**, exactly as on SQLite. That is not
 * a regression introduced here, it is the same cost the descriptor already
 * states out loud — but it is a `degraded` declaration rather than a silence.
 *
 * @module adapters/postgres/geo
 */

import { EARTH_RADIUS_KM } from '../local-sql/sqlFunctions';

/**
 * Kilometres, by the same haversine the SQLite adapter computes in JavaScript
 * (`sqlFunctions.distanceKm`) — including its `asin(min(1, sqrt(a)))` clamp,
 * which stops a rounding error above 1 from producing NaN at the antipode.
 *
 * 🔴 **The Earth radius is imported, not repeated.** It is `6371.0088`, not
 * `6371` — `sqlFunctions.ts` calls it *"the value Parse's
 * `$maxDistanceInRadians` is defined against"*, and `QueryBuilder.ts:411` uses
 * the same constant to turn radians into kilometres. Writing `6371` here (which
 * the first draft did) is a constant difference of 1.4 parts per million: nine
 * metres at the antipode, and a `$maxDistanceInRadians` filter that answers
 * differently depending on which database is behind the app.
 *
 * `postgres.geo.test.js` is what found it — by running the JavaScript beside
 * the SQL rather than against a table of distances this file's author had
 * worked out, which would have graded the arithmetic and agreed with itself.
 *
 * Returns SQL NULL when the stored point is missing or malformed, because a
 * NULL comparison is false and such a row must be excluded — the same reading
 * the JavaScript gives by returning `null`.
 *
 * 🔴 **Three bind markers, and the centre latitude is two of them.** The
 * haversine needs the centre latitude in both the `dLat` term and the
 * `cos(lat1)cos(lat2)` term, and a positional marker binds one value each. So
 * the contract is `[centreLat, centreLat, centreLon]`, in that order — not the
 * `[centreLat, centreLon]` that `QueryBuilder` pushes for
 * `SQL_DISTANCE_KM(col, ?, ?)` today.
 *
 * That difference is the reason the dialect seam belongs INSIDE `QueryBuilder`,
 * where the parameters are pushed, and not at the driver boundary where the SQL
 * is already built: an expression whose marker count differs from SQLite's
 * cannot be swapped in after the fact. {@link toPgQuery} throws on the mismatch
 * rather than letting PostgreSQL report it as a protocol error.
 *
 * @param col - the already-escaped JSONB column reference
 * @returns a SQL expression with three `?` markers, in the order
 *   `centreLat, centreLat, centreLon`
 */
export function distanceKmSql(col: string): string {
  const lat = `(${col} ->> 'latitude')::double precision`;
  const lon = `(${col} ->> 'longitude')::double precision`;
  const haversine =
    `2 * ${EARTH_RADIUS_KM} * asin(least(1, sqrt(` +
    `power(sin(radians(? - ${lat}) / 2), 2) + ` +
    `cos(radians(${lat})) * cos(radians(?)) * ` +
    `power(sin(radians(? - ${lon}) / 2), 2)` +
    `)))`;

  // 🔴 The guard is not defensive tidiness — it is the difference between
  // excluding one bad row and failing the whole query. `('north')::double
  // precision` RAISES on PostgreSQL ("invalid input syntax for type double
  // precision"), and an error inside a WHERE clause takes the statement down.
  // So a single GeoPoint that a cloud function wrote as a string would make
  // every distance query on that collection 500, where SQLite's
  // `coordinates()` returns null and the row is simply not in the answer.
  //
  // Found by `postgres.geo.test.js`, which runs the JavaScript beside the SQL
  // over the same malformed point. The unguarded form passed every well-formed
  // case first.
  return (
    `(CASE WHEN jsonb_typeof(${col} -> 'latitude') = 'number' ` +
    `AND jsonb_typeof(${col} -> 'longitude') = 'number' ` +
    `THEN ${haversine} ELSE NULL END)`
  );
}

/**
 * Is the stored point inside the polygon?
 *
 * `polygon @> point` — core PostgreSQL, no extension. The polygon literal is
 * built by the caller from the same `[{latitude, longitude}, …]` array the
 * SQLite side receives, in **(latitude, longitude)** order, and the point is
 * built in that same order, so containment is tested in one consistent plane.
 * Which axis is "x" never matters as long as both sides agree, and the spec
 * asserts that against the JavaScript ray-cast rather than assuming it.
 *
 * 🔴 **A point exactly on an edge is where the two differ, and it is declared.**
 * `sqlFunctions.pointInPolygon` counts ray crossings and does not special-case
 * an edge; PostgreSQL's `@>` treats the boundary as inside. Neither is wrong —
 * Parse does not define it — but they are not the same answer, so it is
 * `degraded` with this as the reason rather than a case that fails on a
 * Tuesday.
 *
 * @param col - the already-escaped JSONB column reference
 * @returns a SQL expression with one `?` marker: the polygon literal
 */
export function pointInPolygonSql(col: string): string {
  const lat = `(${col} ->> 'latitude')::double precision`;
  const lon = `(${col} ->> 'longitude')::double precision`;
  // Same guard, same reason as {@link distanceKmSql}: a malformed coordinate
  // must exclude its row, not raise and take the query with it.
  return (
    `(jsonb_typeof(${col} -> 'latitude') = 'number' ` +
    `AND jsonb_typeof(${col} -> 'longitude') = 'number' ` +
    `AND ?::polygon @> point(${lat}, ${lon}))`
  );
}

/**
 * A `[{latitude, longitude}, …]` ring as a PostgreSQL polygon literal.
 *
 * Built here rather than in SQL because `polygon(text)` needs the literal, and
 * building it from JSONB per row would be both slower and a second place for
 * the axis order to disagree.
 *
 * @returns `((lat1,lon1),(lat2,lon2),…)`, or null when the ring is unusable —
 *   fewer than three usable vertices, matching `pointInPolygon`'s `return 0`.
 */
export function polygonLiteral(vertices: unknown): string | null {
  let ring: unknown[];
  try {
    ring = typeof vertices === 'string' ? JSON.parse(vertices) : (vertices as unknown[]);
  } catch {
    return null;
  }
  if (!Array.isArray(ring) || ring.length < 3) return null;

  const points: string[] = [];
  for (const v of ring) {
    const p = v as { latitude?: unknown; longitude?: unknown } | null;
    if (!p || typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return null;
    if (Number.isNaN(p.latitude) || Number.isNaN(p.longitude)) return null;
    points.push(`(${p.latitude},${p.longitude})`);
  }
  return `(${points.join(',')})`;
}

/**
 * `$regex`, as PostgreSQL's own regular-expression operator.
 *
 * `sqlFunctions.regexpMatch` evaluates the pattern with JavaScript's `RegExp` —
 * the same engine the user's browser runs. PostgreSQL evaluates it with ARE
 * (advanced regular expressions). Measured, pattern by pattern, against the
 * live server (`postgres.geo.test.js`):
 *
 * | construct | agrees? |
 * |---|---|
 * | anchors, classes, `\d` `\w` `\s`, quantifiers, alternation, groups | ✅ |
 * | lazy quantifiers `+?`, backreferences `\1` | ✅ |
 * | lookahead `(?=…)` **and lookbehind `(?<=…)`** | ✅ — ARE has both |
 * | `\b` word boundary | 🔴 **silently different** — see below |
 * | named groups `(?<n>…)`, `\p{L}` | ❌ PostgreSQL raises |
 *
 * 🔴 **`\b` is the one that mattered, and it is translated rather than
 * declared.** In JavaScript `\b` is a word boundary; in ARE it is a
 * **backspace**. So `\bsat\b` against "cat sat" is `true` in the app today and
 * `false` on PostgreSQL — no error, no warning, just fewer rows. That is
 * precisely the defect class BCN-001 was opened to remove from this backend
 * ("our own backend succeeds and returns the wrong rows — worse than an
 * unsupported operator, because nothing fails"), and re-introducing it as the
 * price of portability would be the wrong trade.
 *
 * {@link toAreRegex} rewrites it to ARE's `\y` (and `\B` to `\Y`) before the
 * pattern is bound. Inside a character class it is left alone, because `[\b]`
 * is a backspace in JavaScript too.
 *
 * The two that raise are left to raise. `sqlFunctions.compile` lets an invalid
 * pattern throw on the stated ground that *"a filter the user wrote that cannot
 * be evaluated should say so, not quietly match nothing or everything"* — a
 * loud failure on both engines is the same contract, even where they disagree
 * about which patterns qualify. Declared, not silently narrowed.
 *
 * Flags: only `i` has an operator form (`~*`). `m` becomes ARE's embedded
 * `(?n)`; `s` (dot matches newline) is already PostgreSQL's default; `u` is
 * JavaScript-only and the server is UTF-8 throughout, so it is dropped rather
 * than approximated.
 *
 * @param col - the already-escaped column reference
 * @param flags - the `$options` string, as the sibling key carries it
 * @returns a SQL expression with one `?` marker for the pattern, and one
 *   reference to `col` per occurrence — the caller binds the pattern through
 *   {@link toAreRegex}
 */
export function regexpSql(col: string, flags: string): string {
  const set = new Set((flags || '').split(''));
  const operator = set.has('i') ? '~*' : '~';
  const embedded = set.has('m') ? "'(?n)' || " : '';
  return `(${col} IS NOT NULL AND ${col}::text ${operator} (${embedded}?))`;
}

/**
 * A JavaScript regular-expression source, as ARE reads it.
 *
 * Only `\b` and `\B` are rewritten, and only outside a character class. See
 * {@link regexpSql} for why this is a rewrite rather than a declaration.
 *
 * ⚠️ It is deliberately **not** a general JavaScript-to-ARE translator. Every
 * other construct measured either agrees or raises; inventing approximations
 * for the ones that raise would turn a loud failure into a quiet wrong answer,
 * which is the trade this whole module refuses.
 */
export function toAreRegex(pattern: string): string {
  let out = '';
  let inClass = false;
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === '\\') {
      const next = pattern[i + 1];
      if (!inClass && next === 'b') {
        out += '\\y'; // ARE: word boundary. JavaScript's \b means the same thing.
        i += 2;
        continue;
      }
      if (!inClass && next === 'B') {
        out += '\\Y'; // ARE: NOT a word boundary.
        i += 2;
        continue;
      }
      // Any other escape, including `\\` itself and `[\b]`'s backspace, is
      // copied whole — consuming both characters is what stops a `\\` from
      // being read as the start of an escape.
      out += pattern.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;

    out += ch;
    i += 1;
  }

  return out;
}
