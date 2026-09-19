/**
 * BRG-005 — PostgreSQL errors, in the words the rest of the backend already reads.
 *
 * `QueryBuilder.uniqueConstraintProblem` decodes SQLite's `UNIQUE constraint
 * failed: Item.guid` so the HTTP layer can answer 409 without knowing an
 * engine's wording, and `LocalSQLAdapter.search` recognises `no such table` to
 * say "search is not enabled". Neither of those readers should learn a second
 * vocabulary — the promise is that the backend above the adapter does not
 * change — so the translation happens here, once, on the way out of `pg`.
 *
 * Everything not listed passes through untouched: an unfamiliar error is still
 * a loud one, and rewording it would only hide which engine said it.
 *
 * @module adapters/postgres/errors
 */

/** The fields `pg` puts on a `DatabaseError`, as far as this module reads them. */
interface PgErrorLike extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

/** SQLSTATE codes this module recognises. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_UNDEFINED_TABLE = '42P01';
export const PG_UNDEFINED_COLUMN = '42703';

/**
 * `Key (tenant, email)=(t1, x@example.com) already exists.` → `['tenant', 'email']`.
 * PostgreSQL quotes an identifier in `detail` only when it has to (`"objectId"`),
 * so the quotes are stripped where present.
 */
export function uniqueViolationColumns(detail: string | undefined): string[] | null {
  const m = /^Key \((.+?)\)=\(/.exec(String(detail || ''));
  if (!m) return null;
  return m[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
}

/**
 * Translate one error from `pg` into the SQLite-shaped message its readers
 * expect. Returns the same object when there is nothing to translate.
 *
 * The translated error keeps `code` (the SQLSTATE) and `cause` (the original),
 * so a reader that wants PostgreSQL's own words can still get them.
 */
export function translatePgError(e: unknown): Error {
  if (!(e instanceof Error)) return new Error(String(e));
  const pe = e as PgErrorLike;

  if (pe.code === PG_UNIQUE_VIOLATION) {
    const cols = uniqueViolationColumns(pe.detail) || (pe.constraint ? [pe.constraint] : ['?']);
    const table = pe.table || '?';
    const out = new Error(`UNIQUE constraint failed: ${cols.map((c) => `${table}.${c}`).join(', ')}`) as PgErrorLike & {
      cause?: unknown;
    };
    out.code = pe.code;
    out.cause = e;
    return out;
  }

  if (pe.code === PG_UNDEFINED_TABLE) {
    // `relation "Foo" does not exist` → `no such table: Foo`
    const m = /relation "([^"]+)" does not exist/.exec(pe.message);
    const out = new Error(`no such table: ${m ? m[1] : '?'}`) as PgErrorLike & { cause?: unknown };
    out.code = pe.code;
    out.cause = e;
    return out;
  }

  return e;
}
