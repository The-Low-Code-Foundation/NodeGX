/**
 * BRG-005 AC2 — every way PostgreSQL does not behave like the built-in backend,
 * **declared**, with the reason and the spec that measured it.
 *
 * *"An undeclared divergence is an AC1 failure"* (BRG-005 AC2), and BRG-003
 * §3.4's sentence is the rule this file is written to: *declared divergence,
 * not silent divergence.* The vocabulary is `capabilities.ts`'s four states —
 * `supported | degraded | unsupported | conditional` — and the shape that the
 * conformance suite consumes is `ConformanceDeclaration` (keyed by case id, for
 * the reason its docstring gives: a conformance case is not a node the editor
 * can grey out). Both are mirrored structurally here rather than imported,
 * because this package sits below the contract; the conformance spec assigns
 * {@link POSTGRES_CONFORMANCE_DECLARATION} to the contract's type, which is the
 * compile-time check that the two shapes still agree.
 *
 * Two kinds of entry, and the difference is the whole file:
 *
 * - **`supported`** — a place the two engines *would* have disagreed, and the
 *   translation was measured to make them agree. Recorded so the next reader
 *   knows it was a decision, not luck, and knows which spec to re-run.
 * - **`degraded` / `unsupported`** — a place they still disagree. `degraded`
 *   returns the correct rows and may differ otherwise; `unsupported` refuses
 *   loudly. There is no third state, and silence is not one of them.
 *
 * @module adapters/postgres/divergences
 */

/** Mirrors `backend-contract/capabilities.ts` `CapabilityState`. */
export type DivergenceState = 'supported' | 'degraded' | 'unsupported' | 'conditional';

export interface Divergence {
  /** Stable id, `<area>/<name>`. */
  id: string;
  state: DivergenceState;
  /** The reason, in one paragraph a reader can act on. */
  reason: string;
  /** The spec that measured it — re-run this before believing the entry. */
  evidence: string;
  /** Conformance case ids this entry declares (only meaningful for `degraded`/`unsupported`/`conditional`). */
  cases?: readonly string[];
}

const SEARCH_CASES = [
  'records/search-finds-a-row-by-its-text',
  'records/search-composes-with-a-structured-where',
  'acl/search-returns-only-visible-rows'
] as const;

export const POSTGRES_DIVERGENCES: readonly Divergence[] = Object.freeze([
  // ── still different, declared ──────────────────────────────────────────────
  {
    id: 'search/ranking',
    state: 'degraded',
    reason:
      'FTS5 ranks with bm25() (lower is better); PostgreSQL ranks with ts_rank_cd (higher is better, different ' +
      'normalisation). The rows are the same and are asserted; the ORDER of a search result is not, and cannot be ' +
      'made to agree by choosing better arguments. `_rank` is negated on the way out so `_score` keeps its meaning.',
    evidence: 'noodl-runtime/test/adapters/QueryBuilder.dialect.test.js (search block); BRG-005 §5.5.3',
    cases: SEARCH_CASES
  },
  {
    id: 'search/no-materialised-index',
    state: 'degraded',
    reason:
      'The tsvector is computed per row at query time — correct rows, sequential scan. A generated column with a ' +
      'GIN index is the operator-facing fix and is owed by BRG-006; the expression is written so adding it changes ' +
      'no row set.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/search.ts (module note)'
  },
  {
    id: 'geo/polygon-boundary',
    state: 'degraded',
    reason:
      'The ray cast in sqlFunctions.pointInPolygon is half-open: a point ON the south or west edge is inside, on the ' +
      'north or east edge outside. PostgreSQL’s `polygon @> point` calls every edge inside. Interior and exterior ' +
      'points agree; only points exactly on the north/east boundary differ, and Parse does not define the boundary.',
    evidence: 'noodl-runtime/test/adapters/postgres.geo.test.js (boundary cases, asserted in both directions)'
  },
  {
    id: 'schema/served-from-a-per-process-model',
    state: 'degraded',
    reason:
      'IStorageSchema is synchronous and PostgreSQL is not. Readers answer from a model primed at connect() and kept ' +
      'current by this process’s own mutations; DDL is queued and every data-plane call waits on the queue first. ' +
      'Under R2 (“one app process, a real database behind it”) that is the truth; a second writer — the migrator run ' +
      'while the service is up, a psql session — is not seen until restart. De-synchronising the schema surface ' +
      '(BRG-D7) removes this entry.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/PgSchemaManager.ts (module note); brg-005-conformance-postgres.test.ts'
  },
  {
    id: 'schema/reconcile-cannot-precount-duplicates',
    state: 'degraded',
    reason:
      'The SQLite manager refuses a unique declaration over duplicate rows BEFORE touching the database and reports ' +
      'the count (FED-002 AC4). Here PostgreSQL refuses it atomically at the queue, and the refusal — code ' +
      'INDEX_DUPLICATES, PostgreSQL’s own detail — surfaces on the next data-plane call rather than from ' +
      'reconcileIndexes() itself. Nothing is changed and no row is deleted either way.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/PgSchemaManager.ts reconcileIndexes; brg-005-conformance-postgres.test.ts'
  },
  {
    id: 'relations/served-from-a-per-process-model',
    state: 'degraded',
    reason:
      'getRelatedIds / getRelationOwners are synchronous and on the authorization path (rolesForUser). They answer ' +
      'from an in-memory copy of every _Join_ table, primed at connect() and written through by addRelation / ' +
      'removeRelation. $relatedTo filters run in SQL against the real junction table. Same bound as the schema entry.',
    evidence: 'brg-005-conformance-postgres.test.ts (relations area)'
  },
  {
    id: 'adapter/synchronous-transaction',
    state: 'unsupported',
    reason:
      'IStorageAdapter.transaction(fn) is synchronous; a network database cannot serve it. It throws rather than ' +
      'running fn outside a transaction. The import path uses upsertBatch(), which is one real transaction.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/PostgresAdapter.ts transaction(); conformance/coverage.ts (uncovered)'
  },
  {
    id: 'schema/identifier-length',
    state: 'unsupported',
    reason:
      'PostgreSQL truncates identifiers longer than 63 bytes silently; a derived index name that long would exist ' +
      'under a name nothing derives. reconcileIndexes refuses the declaration by name instead.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/PgSchemaManager.ts PG_MAX_IDENTIFIER'
  },

  // ── would have differed; translated and measured to agree ─────────────────
  {
    id: 'acl/flag-compared-as-jsonb',
    state: 'supported',
    reason:
      'A flag stored as the JSON real 1.0 is granted by SQLite’s json_extract(...) = 1 and was DENIED by the text ' +
      'comparison BRG-004 first shipped. Compared as jsonb, all eight spellings agree.',
    evidence: 'QueryBuilder.dialect.test.js (eight flag spellings, with the pre-fix control); BRG-005 §5.5.1'
  },
  {
    id: 'acl/non-object-acl-hides-the-row',
    state: 'supported',
    reason:
      'jsonb_each RAISES on a non-object; an error inside WHERE fails the statement, so one malformed ACL row would ' +
      '500 every read of the collection. Guarded with jsonb_typeof = ’object’ so the row is hidden, as on SQLite.',
    evidence: 'QueryBuilder.dialect.test.js; SchemaManager.export.postgres.test.js (RLS path); BRG-005 §5.5.2'
  },
  {
    id: 'geo/earth-radius',
    state: 'supported',
    reason: 'The haversine imports EARTH_RADIUS_KM (6371.0088) rather than repeating 6371 — a constant 1.4 ppm otherwise.',
    evidence: 'postgres.geo.test.js (millimetre tolerance on the short case); BRG-005 §5.2'
  },
  {
    id: 'geo/malformed-point-excluded',
    state: 'supported',
    reason:
      '(’north’)::double precision raises on PostgreSQL where SQLite’s coordinates() returns null. Both geo ' +
      'expressions guard with jsonb_typeof = ’number’ so a malformed point excludes its row instead of failing the query.',
    evidence: 'postgres.geo.test.js; BRG-005 §5.2'
  },
  {
    id: 'filters/empty-in-set',
    state: 'supported',
    reason:
      '$in: [] emitted a bare 0 and $nin: [] a bare 1; both are booleans to SQLite and INTEGERs to PostgreSQL, where ' +
      '“argument of WHERE must be type boolean” fails the statement. The postgres dialect emits FALSE / TRUE.',
    evidence: 'QueryBuilder.dialect.test.js (empty-set cases); found by the first conformance run'
  },
  {
    id: 'filters/contains-is-case-insensitive',
    state: 'supported',
    reason:
      'SQLite’s LIKE is case-insensitive for ASCII; PostgreSQL’s is not. $contains and $text emit ILIKE on the ' +
      'postgres dialect so the same term matches the same rows.',
    evidence: 'QueryBuilder.dialect.test.js (contains case)'
  },
  {
    id: 'types/numeric-int8-timestamptz-parsers',
    state: 'supported',
    reason:
      'pg returns NUMERIC, BIGINT and COUNT(*) as strings and TIMESTAMPTZ as a Date; the built-in adapter returns ' +
      'numbers and ISO strings. The pool installs parsers so a row reads the same on both engines.',
    evidence: 'brg-005-conformance-postgres.test.ts (records area: scores compare with ===)'
  },
  {
    id: 'errors/unique-violation-wording',
    state: 'supported',
    reason:
      'PostgreSQL’s 23505 is rewritten as `UNIQUE constraint failed: T.col` so QueryBuilder.uniqueConstraintProblem ' +
      'and the HTTP 409 path read it unchanged; 42P01 as `no such table: T` for the same reason.',
    evidence: 'noodl-runtime/src/api/adapters/postgres/errors.ts; brg-005-conformance-postgres.test.ts (unique cases)'
  }
]);

/** The suite's declaration, derived from the register so the two cannot disagree. */
export const POSTGRES_CONFORMANCE_DECLARATION: {
  adapter: string;
  cases: Record<string, { state: 'unsupported' | 'degraded' | 'conditional'; reason: string }>;
} = {
  adapter: 'postgres (pg 8.x)',
  cases: Object.fromEntries(
    POSTGRES_DIVERGENCES.filter((d) => d.state !== 'supported' && d.cases).flatMap((d) =>
      (d.cases as readonly string[]).map((id) => [
        id,
        { state: d.state as 'unsupported' | 'degraded' | 'conditional', reason: `${d.id}: ${d.reason}` }
      ])
    )
  )
};
