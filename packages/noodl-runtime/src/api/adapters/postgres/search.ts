/**
 * BRG-005 AC6 — FTS5 as `tsvector`, and the four places the two engines do not
 * agree.
 *
 * The built-in backend's search (BAK-008) is an FTS5 **shadow table**:
 * `<collection>_fts`, kept in step by three triggers, joined on `rowid`, matched
 * with `MATCH`, ranked with `bm25()` and excerpted with `snippet()`. PostgreSQL
 * has none of those four things, so this is the one translation in BRG-005 that
 * is a **declared `degraded` capability** rather than an equivalence:
 *
 * | | SQLite (FTS5) | PostgreSQL |
 * |---|---|---|
 * | where the index lives | a shadow table + 3 triggers | an expression over the row's own columns |
 * | matching | `MATCH` over quoted literal tokens | `plainto_tsquery` |
 * | ranking | `bm25()`, **lower is better** | `ts_rank_cd`, **higher is better** |
 * | excerpt | `snippet(…, '<mark>', '</mark>', '…', 24)` | `ts_headline(…)` |
 *
 * **What is asserted is the row set; what is declared as different is the
 * order.** AC6 says exactly that, and it is the honest line: two ranking
 * functions with different normalisation cannot be made to agree by choosing
 * better arguments, and pretending otherwise is the failure mode this phase is
 * about.
 *
 * ## Why `'simple'` and not `'english'`
 *
 * FTS5's default `unicode61` tokenizer **does not stem** and removes no
 * stopwords: it folds case and splits on non-word characters. PostgreSQL's
 * `'simple'` configuration does the same. `'english'` would stem ("running" →
 * "run") and drop stopwords, which reads like an improvement and is in fact a
 * **different row set** — a search that matches rows the built-in backend does
 * not. Matching row sets is the criterion, so `'simple'` is the choice, and a
 * stemming configuration is an operator's decision to make knowingly, later.
 *
 * ## Why `plainto_tsquery` and not `websearch_to_tsquery`
 *
 * `toFts5MatchQuery` exists because FTS5's query syntax is not a search box: it
 * wraps every whitespace-separated chunk in its own quoted literal so that `-`,
 * `:`, `*` and `"` in a user's phrase mean themselves rather than operators, and
 * multiple words stay an order-insensitive implicit AND. `websearch_to_tsquery`
 * reintroduces exactly what that wrapping removed — a leading `-` becomes NOT,
 * quotes become a phrase — so it would answer a different question for the same
 * typed text. `plainto_tsquery` treats the whole input as literal terms ANDed
 * together, which is what the SQLite side means.
 *
 * 🔴 **So the Postgres path binds the RAW term, never `toFts5MatchQuery`'s
 * output.** Passing the FTS5 string would bind literal `"` characters into the
 * tsquery — not an error, just a needless mismatch — and is the easy mistake
 * here precisely because the two builders otherwise look symmetrical.
 *
 * ## The index, said out loud
 *
 * ⚠️ The `tsvector` is computed per row at query time, so this is a sequential
 * scan: correct rows, and no index. A generated `tsvector` column with a GIN
 * index is the operator-facing answer and it belongs with `PgSchemaManager`
 * (§6.2), which is the only thing here that knows what the table's columns are.
 * The expression below is written so that adding one later does not change the
 * rows this returns — `to_tsvector('simple', <same text>)` is what such a column
 * would hold.
 *
 * @module adapters/postgres/search
 */

/**
 * The text-search configuration, as SQL. See the module note: `'simple'` is
 * chosen because it matches FTS5's tokenizer, not because it is the plainest
 * name in the list.
 */
export const SEARCH_CONFIG = "'simple'";

/**
 * The query side, with one bind marker for the raw user term.
 *
 * Used three times in a search SELECT — the rank, the headline and the
 * predicate — which is **three markers for one search term**, where the SQLite
 * statement has one. That is the third marker-count difference in this adapter
 * and, like the other two, the reason the dialect choice cannot be made after
 * the SQL is built.
 */
export const SEARCH_TSQUERY = `plainto_tsquery(${SEARCH_CONFIG}, ?)`;

/**
 * The searchable document: the indexed columns, cast to text and concatenated.
 *
 * `coalesce(…, '')` on each because `NULL || ' ' || 'x'` is NULL in SQL — one
 * unset column would otherwise erase the whole document for that row, which is
 * a row silently missing from every search rather than an error.
 *
 * `::text` because the indexed field need not be a `TEXT` column: BRG-004 maps
 * `Number` to `NUMERIC` and `Object`/`Array` to `JSONB`, and `to_tsvector` takes
 * text. FTS5's shadow table stores everything as text for the same reason.
 *
 * @param escapedCols - column references, already escaped and qualified by the
 *   caller. They are passed in rather than escaped here so this module never
 *   needs `escapeColumn` from `QueryBuilder`, which imports this one.
 */
export function searchTextSql(escapedCols: readonly string[]): string {
  return `(${escapedCols.map((c) => `coalesce(${c}::text, '')`).join(" || ' ' || ")})`;
}

/** The same document as a `tsvector`, for `@@` and `ts_rank_cd`. */
export function searchVectorSql(escapedCols: readonly string[]): string {
  return `to_tsvector(${SEARCH_CONFIG}, ${searchTextSql(escapedCols)})`;
}

/** The message the builder refuses with when the Postgres path has no field list. */
export const SEARCH_FIELDS_REQUIRED =
  'Search on Postgres needs the indexed fields: there is no FTS5 shadow table to read them from. ' +
  'Pass `fields` on the search options. Refusing rather than searching a field list nobody chose.';
