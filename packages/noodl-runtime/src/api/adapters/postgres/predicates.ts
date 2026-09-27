/**
 * BRG-005 §6.1 — the two predicates the dialect seam needs, and the one place
 * the ACL translation is written.
 *
 * `geo.ts` holds the three expressions that replace SQLite user functions.
 * This module holds the two that replace SQLite **JSON operators** inside
 * `QueryBuilder`: the row-level ACL check and the `$within` box. They are here
 * rather than inline in the builder for one reason that is not tidiness —
 * **the ACL predicate already existed twice.**
 *
 * `SchemaManager._aclPredicate` (BRG-004) emits the same check as PostgreSQL
 * row-level-security policy text, and `QueryBuilder.buildAclPredicate` emits it
 * as a bound WHERE clause. Two copies of one translation drift, and when this
 * module was written they already had: they disagreed about a JSON real. So
 * both now call {@link aclFlagTest}, and the divergence below is fixed in one
 * place instead of being fixed in the one that happened to be read.
 *
 * @module adapters/postgres/predicates
 */

/**
 * Does this ACL entry grant `access`?
 *
 * 🔴 **The comparison is `jsonb`, not text, and that is the whole point.**
 * BRG-004 wrote it as `(value ->> 'read') IN ('1', 'true')` — extract the flag
 * as text and compare the spelling. Measured against the SQLite predicate it
 * translates (`json_extract(value, '$.read') = 1`) over all eight spellings the
 * flag appears in, that form is right seven times and **wrong on a JSON real**:
 *
 * | stored flag | SQLite `= 1` | `->> IN ('1','true')` | `-> IN (…::jsonb)` |
 * |---|---|---|---|
 * | `true` / `1` | grants | grants | grants |
 * | **`1.0`** | **grants** | 🔴 **denies** | grants |
 * | `false` / `0` / `"yes"` / `null` / absent | denies | denies | denies |
 *
 * `->>` renders `1.0` as the text `"1.0"`, which is neither `'1'` nor `'true'`,
 * so the row is denied — where SQLite's numeric `= 1` grants it. Comparing as
 * `jsonb` agrees on all eight, because PostgreSQL normalises JSON numerics and
 * `'1.0'::jsonb = '1'::jsonb` is true. A silent denial is the worst shape this
 * predicate can fail in: the app shows a user fewer of their own rows and
 * nothing reports an error.
 *
 * `JSON.stringify` cannot emit `1.0`, so the flag only arrives that way through
 * some other door — a hand-written fixture, a migration, another language's
 * writer. That is exactly the population BRG-004's own docstring says the
 * predicate exists to serve: *"a policy that works on the data that exists
 * rather than the data it expected."*
 *
 * @param valueExpr - SQL for the entry's value (e.g. `_acl.value`)
 * @param access - the access being tested
 * @returns a SQL boolean expression, no bind markers
 */
export function aclFlagTest(valueExpr: string, access: 'read' | 'write'): string {
  return `(${valueExpr} -> '${access}') IN ('true'::jsonb, '1'::jsonb)`;
}

/**
 * The row-level ACL predicate, in PostgreSQL, saying what
 * `QueryBuilder.buildAclPredicate` says in SQLite: a row with no ACL is public
 * (Parse semantics), and a row with one qualifies when an entry whose key is
 * one of the caller's principals grants the access asked for.
 *
 * 🔴 **`jsonb_each` RAISES on a non-object, and the guard is not defensive
 * tidiness.** Measured: `jsonb_each('[1,2]'::jsonb)` is
 * `ERROR: cannot call jsonb_each on a non-object`, and an error inside a
 * `WHERE` clause fails the whole statement. SQLite's `json_each` walks an array
 * or a scalar quite happily, hands back keys that are integers or NULL, and no
 * principal string matches them — so the row is simply **not visible**.
 *
 * So one row whose ACL was written as an array by a cloud function would, on
 * Postgres, turn every read of that collection into a 500, where the built-in
 * backend merely hides that row. `jsonb_typeof(…) = 'object'` reproduces
 * SQLite's answer exactly: not an object, not visible, no error. Graded against
 * `json_each` over the same five shapes.
 *
 * This is the same finding as `geo.ts`'s malformed GeoPoint, in a second place
 * — PostgreSQL raises where SQLite coerces, and a raise inside `WHERE` is not a
 * narrower result, it is no result at all.
 *
 * @param aclCol - SQL for the ACL column, already escaped and qualified
 * @param keyList - SQL for the principal-key list — bind markers (`?, ?`) from
 *   `QueryBuilder`, or literal/`current_setting(…)` text from the RLS generator
 * @param access - the access being tested
 * @param alias - the lateral alias for the unrolled entry (`_acl`, `_acl_entry`)
 * @param sep - what to put between the clauses; the RLS generator passes
 *   newline-plus-indent so the emitted policy stays readable in a `.sql` file
 * @returns a SQL boolean expression carrying however many markers `keyList` did
 */
export function aclPredicateSql(
  aclCol: string,
  keyList: string,
  access: 'read' | 'write',
  alias = '_acl',
  sep = ' '
): string {
  return (
    `(${aclCol} IS NULL OR (jsonb_typeof(${aclCol}) = 'object' AND EXISTS (${sep}` +
    `SELECT 1 FROM jsonb_each(${aclCol}) AS ${alias}${sep}` +
    `WHERE ${alias}.key IN (${keyList})${sep}` +
    `AND ${aclFlagTest(`${alias}.value`, access)})))`
  );
}

/**
 * `$within: {$box: […]}` — the only geo operator that is a pair of ordinary
 * range comparisons rather than a user function, which is why it lives here and
 * not in `geo.ts`.
 *
 * SQLite reads the stored point with `json_extract(col, '$.latitude')`;
 * PostgreSQL reads it out of JSONB and casts. The cast is what needs the guard:
 * `('north')::double precision` raises, so a malformed coordinate would fail
 * the statement instead of excluding its row (`geo.ts` §2 measured this first,
 * on the haversine). With the guard, a malformed or missing point yields
 * `FALSE` — which is what SQLite's `NULL BETWEEN …` gives the row: not matched.
 *
 * **Four markers, in the same order as SQLite's** — `minLat, maxLat, minLon,
 * maxLon` — so this one operator *could* have been swapped at the driver
 * boundary. It is here anyway, beside the three that cannot be (the haversine
 * needs the centre latitude twice), because a seam that covers some of the
 * translation and leaves the rest somewhere else is the harder thing to read.
 *
 * @param col - the already-escaped JSONB column reference
 * @returns a SQL boolean expression with four `?` markers
 */
export function withinBoxSql(col: string): string {
  const lat = `(${col} ->> 'latitude')::double precision`;
  const lon = `(${col} ->> 'longitude')::double precision`;
  return (
    `(CASE WHEN jsonb_typeof(${col} -> 'latitude') = 'number' ` +
    `AND jsonb_typeof(${col} -> 'longitude') = 'number' ` +
    `THEN ${lat} BETWEEN ? AND ? AND ${lon} BETWEEN ? AND ? ` +
    `ELSE FALSE END)`
  );
}
