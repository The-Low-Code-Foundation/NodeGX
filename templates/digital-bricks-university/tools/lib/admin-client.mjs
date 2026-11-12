/**
 * THE ADMIN CLIENT (copied in shape from digital-bricks-training/tools/lib/admin-client.mjs).
 *
 * `call` goes through the admin door (Bearer <admin credential>); `data` goes
 * through the data door with the master key (the same credential), which is what
 * creating a `_User` with no password and reading closed collections need.
 * `as(session)` is the data door as a signed-in user: what the security gate uses.
 */
export function adminClient(backend, token) {
  const BACKEND = String(backend).replace(/\/$/, '');

  async function raw(method, path, { body, headers = {} } = {}) {
    const h = { ...headers };
    let payload;
    if (body !== undefined) {
      if (body instanceof Uint8Array) payload = body;
      else {
        h['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }
    const res = await fetch(BACKEND + path, { method, headers: h, body: payload });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, json, text, headers: res.headers };
  }

  async function strict(method, path, opts) {
    const r = await raw(method, path, opts);
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${r.text.slice(0, 400)}`);
    return r.json;
  }

  const call = (method, path, body) => strict(method, path, { body, headers: { Authorization: `Bearer ${token}` } });
  const data = (method, path, body) => strict(method, path, { body, headers: { 'X-Parse-Master-Key': token } });
  /** As a user: never throws, so a check can read the status it was refused with. */
  const as = (session, method, path, body, headers = {}) =>
    raw(method, path, { body, headers: session ? { 'X-Parse-Session-Token': session, ...headers } : headers });

  async function countOf(collection) {
    const r = await raw('GET', `/classes/${encodeURIComponent(collection)}?limit=0&count=1`, { headers: { 'X-Parse-Master-Key': token } });
    if (r.status === 404) return 0;
    if (!r.ok) throw new Error(`count ${collection} → ${r.status} ${r.text.slice(0, 200)}`);
    return r.json.count || 0;
  }

  /** Every row of a collection, through the master key. */
  async function all(collection, where) {
    const w = where ? `&where=${encodeURIComponent(JSON.stringify(where))}` : '';
    return (await data('GET', `/classes/${encodeURIComponent(collection)}?limit=1000${w}`)).results;
  }

  /** Throws unless every collection in the schema, and `_User`, is empty. */
  async function refuseOccupied(schema, tool) {
    const names = [...schema.tables.map((t) => t.name), '_User'];
    const occupied = [];
    for (const n of names) {
      const c = await countOf(n);
      if (c) occupied.push(`${n} (${c})`);
    }
    if (occupied.length) {
      throw new Error(`${tool}: REFUSED — this backend already holds rows: ${occupied.join(', ')}. Point it at a fresh data directory (tools/reset-demo.mjs makes one).`);
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

  /** A session for a user, minted with the master key (no passwords in this app: DBU-02 signs in by email). */
  async function sessionFor(userId, label = 'tool') {
    const sessionToken = `dbu-${label}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const row = await data('POST', '/classes/_Session', { sessionToken, userId });
    return { token: sessionToken, id: row.objectId };
  }
  const endSession = (s) => data('DELETE', `/classes/_Session/${s.id}`);

  return { raw, call, data, as, countOf, all, refuseOccupied, assertSchema, sessionFor, endSession };
}
