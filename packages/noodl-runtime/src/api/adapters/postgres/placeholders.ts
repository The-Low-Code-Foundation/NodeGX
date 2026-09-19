/**
 * BRG-005 — the placeholder boundary.
 *
 * `QueryBuilder` emits `BuiltQuery { sql: string; params: unknown[] }` with
 * SQLite's positional `?` markers (`QueryBuilder.ts:25-28`). `pg` wants
 * `query(text, values)` with PostgreSQL's numbered `$1 … $n`. That is the whole
 * difference, and it is mechanical.
 *
 * ## Why this is a translation at the driver boundary and not 22 edits upstream
 *
 * The alternative considered was threading a dialect object with a
 * `placeholder(i)` method through `QueryBuilder`, which emits `?` at 22 sites
 * across 1,230 lines. That is 22 chances to change the SQLite adapter's
 * behaviour while porting, in a file whose specs are the built-in backend's
 * only safety net — and it buys nothing, because the mapping is total and
 * order-preserving: the *n*th `?` binds `params[n-1]`, and so does the *n*th
 * `$n`. Rewriting once, here, leaves `QueryBuilder` byte-identical for SQLite
 * and puts the entire risk in one function with its own spec.
 *
 * ## What makes the rewrite safe, measured rather than assumed
 *
 * A naive `sql.replace(/\?/g, …)` is wrong in general SQL, because a `?` inside
 * a string literal is data. Measured at BRG-005 over `QueryBuilder.ts`: every
 * `?` it emits is a bind marker, and the only string literals it emits are the
 * JSON paths `'$.read'` / `'$.write'` and the `', '` joins — none contains a
 * `?`. So the naive form happens to be correct *today*.
 *
 * It is not written that way. This scanner skips single-quoted literals (with
 * SQL's doubled-quote escape), double-quoted identifiers, and dollar-quoted
 * bodies, because the thing that makes it wrong later is a `LIKE '%?%'` or a
 * regex literal landing in `QueryBuilder` a year from now — and that defect
 * would surface as *wrong rows on Postgres only*, which is the hardest kind to
 * find. The cost of not needing that vigilance is about forty lines.
 *
 * @module adapters/postgres/placeholders
 */

/** A query in the shape `pg`'s `query()` takes. */
export interface PgQuery {
  text: string;
  values: unknown[];
}

/**
 * Rewrite SQLite `?` bind markers to PostgreSQL `$1 … $n`.
 *
 * Markers are numbered left to right in the order they appear, which is the
 * order `QueryBuilder` pushes into `params`, so `values` is passed through
 * untouched.
 *
 * @param sql - SQL with `?` markers
 * @param params - the bind values, in marker order
 * @returns `{ text, values }` for `pg`
 * @throws when the marker count and the parameter count disagree — a mismatch
 *   is a builder defect, and PostgreSQL's own error for it ("bind message
 *   supplies 3 parameters, but prepared statement requires 4") names the
 *   protocol rather than the query, which is how an afternoon gets lost.
 */
export function toPgQuery(sql: string, params: readonly unknown[] = []): PgQuery {
  let out = '';
  let n = 0;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'") {
      // Single-quoted string literal; '' is an escaped quote, not a terminator.
      const end = scanQuoted(sql, i, "'");
      out += sql.slice(i, end);
      i = end;
      continue;
    }

    if (ch === '"') {
      // Double-quoted identifier; "" is an escaped quote. Every identifier
      // QueryBuilder emits is quoted this way (escapeTable/escapeColumn).
      const end = scanQuoted(sql, i, '"');
      out += sql.slice(i, end);
      i = end;
      continue;
    }

    if (ch === '$') {
      const tag = matchDollarTag(sql, i);
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? sql.length : close + tag.length;
        out += sql.slice(i, end);
        i = end;
        continue;
      }
    }

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl;
      out += sql.slice(i, end);
      i = end;
      continue;
    }

    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      const end = close === -1 ? sql.length : close + 2;
      out += sql.slice(i, end);
      i = end;
      continue;
    }

    if (ch === '?') {
      n += 1;
      out += `$${n}`;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  if (n !== params.length) {
    throw new Error(
      `placeholder/parameter mismatch: SQL has ${n} bind marker(s), ${params.length} parameter(s) supplied. ` +
        `This is a query-builder defect, not a database error. SQL: ${sql}`
    );
  }

  return { text: out, values: params as unknown[] };
}

/**
 * Index just past a quoted run starting at `start` (which must be the opening
 * quote). A doubled quote inside the run is an escaped quote and does not end
 * it. An unterminated run consumes to the end of the string rather than
 * throwing — this function's job is to not mistake data for a marker, and a
 * malformed statement is PostgreSQL's to reject with its own message.
 */
function scanQuoted(sql: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return sql.length;
}

/**
 * The dollar-quote tag opening at `i` (`$$` or `$tag$`), or null.
 *
 * Deliberately narrow: `$1` is a placeholder, not a tag, so a tag body must be
 * empty or a valid identifier. Without that check, a rewritten statement fed
 * back through this function would swallow itself from the first `$1` onward.
 */
function matchDollarTag(sql: string, i: number): string | null {
  const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
  return m ? m[0] : null;
}
