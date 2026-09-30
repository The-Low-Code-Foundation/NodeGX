/**
 * THE ONE ADMIN CLIENT AND THE ONE REFUSAL RULE (TASK-L183 §2).
 *
 * setup-backend.mjs (the demo world) and setup-production.mjs (a real client's
 * backend) both write rows into a backend, and both must refuse a backend that
 * already holds any (L67: the accident worth preventing is pointing a setup
 * tool at the live one). Two copies of that rule is how one of them gets a
 * collection the other forgot, so it lives here.
 *
 * `call` goes through the admin door (Bearer <admin credential>); `data` goes
 * through the data door with the master key, which is what creating a `_User`
 * with no password needs.
 */
export function adminClient(backend, token) {
  const BACKEND = String(backend).replace(/\/$/, '');
  async function call(method, path, body, { admin = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (admin) headers.Authorization = `Bearer ${token}`;
    else headers['X-Parse-Master-Key'] = token;
    const res = await fetch(BACKEND + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`);
    return json;
  }
  const data = (method, path, body) => call(method, path, body, { admin: false });

  async function countOf(collection) {
    try {
      const r = await data('GET', `/classes/${encodeURIComponent(collection)}?limit=0&count=1`);
      return r.count || 0;
    } catch (e) {
      // A collection that does not exist yet holds nothing.
      if (/→ 404/.test(e.message)) return 0;
      throw e;
    }
  }

  /** Every collection the schema declares, plus `_User`, with its row count. */
  async function counts(schema) {
    const out = {};
    for (const t of schema.tables) out[t.name] = await countOf(t.name);
    out._User = await countOf('_User');
    return out;
  }

  /** Throws unless every collection in the schema, and `_User`, is empty. */
  async function refuseOccupied(schema, tool) {
    const c = await counts(schema);
    const occupied = Object.entries(c).filter(([, n]) => n > 0).map(([name, n]) => `${name} (${n})`);
    if (occupied.length) {
      const err = new Error(
        `${tool}: REFUSED — this backend already holds rows: ${occupied.join(', ')}. ` +
          'Point it at a fresh data directory; this tool never writes over a backend that has data.'
      );
      err.refused = true;
      throw err;
    }
  }

  /** The schema read back: every table, column and index the file declares must be there. */
  async function assertSchema(schema) {
    const { diff } = await call('POST', '/admin/schema/diff', { source: { tables: schema.tables } });
    const missing = [
      ...diff.tables.added.map((t) => `table ${t.name}`),
      ...diff.tables.changed.flatMap((c) => [
        ...c.addedColumns.map((col) => `column ${c.name}.${col.name}`),
        ...(c.indexChange ? [`indexes on ${c.name}`] : [])
      ])
    ];
    if (missing.length) throw new Error(`the backend does not hold what schema.json declares: ${missing.join(', ')}`);
  }

  return { call, data, countOf, counts, refuseOccupied, assertSchema };
}
