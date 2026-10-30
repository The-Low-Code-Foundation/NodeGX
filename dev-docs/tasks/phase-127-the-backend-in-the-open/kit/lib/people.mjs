// Which columns name a person, and what an app knows about whoever is signed in, read from the backend's
// own tables (P127 BKO-003). Nothing here assumes one app: a column names a person when the schema says it
// points at the people (`_User`), or, as a fallback the map says it took, when its name says so.

const BY_NAME = /^(owner|ownerId|userId|createdBy)$|UserId$/;

/** A Pointer's id, or the id itself. */
export const idOf = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' && typeof v.objectId === 'string' ? v.objectId : null);

/** The columns of one table that name a person: `declared` when the schema points them at `_User`. */
export function personColumns(table) {
  return (table.columns ?? [])
    .filter((c) => c.name !== 'objectId' && (c.targetClass === '_User' || BY_NAME.test(c.name)))
    .map((c) => ({ name: c.name, declared: c.targetClass === '_User' }));
}

const singleKeys = (t) => (t.indexes ?? t.keys?.map((k) => ({ unique: true, fields: k })) ?? []).filter((i) => i.unique && i.fields.length === 1).map((i) => i.fields[0]);

/**
 * The tables with one row per person: a column naming the person that no two rows may share, and a key of
 * the row's own beside it. The training app's LearnerProfile (userId → learnerId) is one; an app with none
 * has none, and the map then knows only the person's own id.
 */
export function profileTables(tables) {
  const out = [];
  for (const t of tables) {
    if (t.name === '_User') continue;
    const keys = singleKeys(t);
    const who = personColumns(t).find((c) => keys.includes(c.name));
    const key = who && keys.find((k) => k !== who.name && k !== 'objectId');
    if (who && key) out.push({ table: t.name, person: who.name, key });
  }
  return out;
}

/** person id → { table, keys: { learnerId: 'l-marie' } }, from the profile tables' rows. */
export function profilesFrom(tables, rowsByTable) {
  const out = {};
  for (const p of profileTables(tables)) {
    for (const r of rowsByTable[p.table] ?? []) {
      const id = idOf(r[p.person]);
      if (id && typeof r[p.key] === 'string' && r[p.key]) (out[id] ??= { table: p.table, keys: {} }).keys[p.key] = r[p.key];
    }
  }
  return out;
}

/**
 * The same, asked of the backend: only the profile tables, and only tables the backend has. Asking it for a
 * table it lacks makes that table (P127-BKO003-PROFILEWRITE: the map used to make a LearnerProfile in every app).
 */
export async function profilesOf(be, schema) {
  const rowsByTable = {};
  for (const p of profileTables(schema.tables)) {
    try {
      rowsByTable[p.table] = (await be.get(`/api/${encodeURIComponent(p.table)}?limit=1000`)).results ?? [];
    } catch {
      /* the map still knows who they are */
    }
  }
  return profilesFrom(schema.tables, rowsByTable);
}

/** Every column name that, anywhere in the app, names a person or a person's profile key. */
export function personKeys(tables) {
  const out = new Set(['userId']);
  for (const t of tables) for (const c of personColumns(t)) out.add(c.name);
  for (const p of profileTables(tables)) out.add(p.key);
  return out;
}

/** What the app knows about whoever is signed in, before they have been shown anything: name → { value, from }. */
export function signedInContext(user, profile) {
  const out = { userId: { value: user.objectId, from: 'who is signed in' } };
  for (const [k, v] of Object.entries(profile?.keys ?? {})) out[k] = { value: v, from: `who is signed in (their ${profile.table} row)` };
  return out;
}
