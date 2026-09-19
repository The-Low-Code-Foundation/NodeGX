/**
 * BRG-005 AC4 / R5 — `NODEGX_STORAGE_URL`, read once and refused by name.
 *
 * R5 (README §4): *"Postgres only, and say so. MySQL, libsql and Turso each look
 * like 'one more adapter' and each doubles the conformance matrix."* The ruling
 * is enforced at the one place a URL enters the service: anything that is not
 * `postgres://` or `postgresql://` is refused with the scheme it was given and
 * the sentence that says it is not coming — not "unsupported", which reads as
 * "not yet".
 *
 * @module adapters/postgres/storageUrl
 */

/** Refused: the scheme, and why. `code` is what a caller matches on. */
export class StorageUrlError extends Error {
  code: string;
  scheme: string | null;

  constructor(message: string, scheme: string | null) {
    super(message);
    this.name = 'StorageUrlError';
    this.code = 'STORAGE_URL_REFUSED';
    this.scheme = scheme;
  }
}

/** What a parsed, accepted URL carries — the redacted form is for logs and `/health`. */
export interface ParsedStorageUrl {
  url: string;
  scheme: 'postgres' | 'postgresql';
  host: string | null;
  database: string | null;
  /** The URL with any password replaced, safe to print. */
  redacted: string;
}

/** The schemes people will try, and the sentence each one gets. */
const REFUSED_BY_NAME: Record<string, string> = {
  mysql: 'MySQL',
  mysql2: 'MySQL',
  mariadb: 'MariaDB',
  libsql: 'libsql',
  turso: 'Turso',
  d1: 'Cloudflare D1',
  mongodb: 'MongoDB',
  'mongodb+srv': 'MongoDB',
  mssql: 'SQL Server',
  sqlserver: 'SQL Server',
  cockroachdb: 'CockroachDB',
  sqlite: 'SQLite-by-URL',
  file: 'a file URL'
};

/**
 * Accept a PostgreSQL URL or refuse the scheme by name.
 *
 * @throws StorageUrlError for anything that is not PostgreSQL.
 */
export function parseStorageUrl(raw: string): ParsedStorageUrl {
  const text = String(raw || '').trim();
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(text);
  if (!m) {
    throw new StorageUrlError(
      `NODEGX_STORAGE_URL is not a URL: ${JSON.stringify(text)}. Expected postgres://user:password@host:5432/database, ` +
        'or leave it unset to use the built-in SQLite backend.',
      null
    );
  }
  const scheme = m[1].toLowerCase();

  if (scheme !== 'postgres' && scheme !== 'postgresql') {
    const named = REFUSED_BY_NAME[scheme];
    const what = named ? `${named} (${scheme}://)` : `the scheme "${scheme}://"`;
    const sqliteHint =
      scheme === 'sqlite' || scheme === 'file'
        ? ' The built-in SQLite backend is selected by leaving NODEGX_STORAGE_URL unset; it is not addressed by URL.'
        : '';
    throw new StorageUrlError(
      `NODEGX_STORAGE_URL points at ${what}, which this backend does not support. The bridge is PostgreSQL only ` +
        '(postgres:// or postgresql://) — phase 97 R5 — and MySQL, libsql, Turso and D1 are out of scope and not ' +
        `described as coming.${sqliteHint}`,
      scheme
    );
  }

  let host: string | null = null;
  let database: string | null = null;
  let redacted = text;
  try {
    const u = new URL(text);
    host = u.host || null;
    database = u.pathname && u.pathname !== '/' ? decodeURIComponent(u.pathname.slice(1)) : null;
    if (u.password) {
      u.password = '***';
      redacted = u.toString();
    }
  } catch {
    // `pg` parses its own connection strings more leniently than WHATWG URL;
    // an unparseable-but-accepted URL is handed through and redacted by regex.
    redacted = text.replace(/(:\/\/[^:/@]*:)[^@]*@/, '$1***@');
  }

  return { url: text, scheme, host, database, redacted };
}
