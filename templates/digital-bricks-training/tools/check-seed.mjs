#!/usr/bin/env node
/**
 * THE SEED, READ BACK FROM THE BACKEND (TASK-L169 criteria 3, 5, 6, 7).
 *
 * Two halves prove the fixtures reached the backend intact, and neither is
 * enough alone:
 *   - build-seed.mjs's tracker fails the build on any fixture field it cannot
 *     place, so nothing is DROPPED between a fixture and seed.json;
 *   - this reads every row back from the RUNNING backend (not from seed.json)
 *     and compares it with seed.json field by field, so nothing is lost or
 *     changed between seed.json and the database.
 * Reassembling the fixtures' derived fields (state, counts, lastActivity) is the
 * read functions' job and is proven in L170, not here.
 *
 * It also checks what the seed must NOT carry (criterion 7), that no client can
 * read a collection (criterion 5), and that nobody can sign up (criterion 6).
 *
 * Run: node tools/check-seed.mjs --backend http://127.0.0.1:8577 --token <admin credential>
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || 'http://127.0.0.1:8577').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
if (!TOKEN) {
  console.error('check-seed: pass --token <admin credential>.');
  process.exit(2);
}
const seed = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'seed.json'), 'utf8'));
const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

async function get(path, headers = {}) {
  const res = await fetch(BACKEND + path, { headers });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const master = { 'X-Parse-Master-Key': TOKEN };

// ── Criterion 7: nothing derived was stored ─────────────────────────────────
/* The names the fixtures use for DERIVED values. A seed row carrying one would
   make the read functions agree with the fixtures by construction. `position`
   is legitimate on three collections, where it is the product's own stored
   ORDER (a path step, a prep item, a dimension), and is excluded there by name. */
const DERIVED = ['state', 'stepsTotal', 'stepsComplete', 'lastActivity', 'awaitingReplySince', 'answered', 'evaluated', 'unread', 'read', 'createdByName', 'authorName'];
const POSITION_IS_STORED = new Set(['PathStep', 'SessionPrep', 'ProgrammeDimension', 'LearnerDeliverable']);
for (const [collection, rows] of Object.entries(seed.rows)) {
  for (const r of rows) {
    for (const k of DERIVED) check(!(k in r), `C7: ${collection} stores the derived field '${k}'`);
    if (!POSITION_IS_STORED.has(collection)) check(!('position' in r), `C7: ${collection} stores a derived 'position'`);
  }
}

// ── Criterion 3: every row round-trips through the backend ─────────────────
/* The seed names users by username; the backend holds their objectId. Map one
   to the other through _User, which is how setup-backend resolved them. */
const { body: userList } = await get('/classes/_User?limit=1000', master);
const usernameById = new Map((userList.results || []).map((u) => [u.objectId, u.username]));
check(usernameById.size === seed.users.length, `C3: ${usernameById.size} users in the backend, ${seed.users.length} in the seed`);
const UNRESOLVE = {
  LearnerProfile: ({ userId, ...r }) => ({ ...r, username: usernameById.get(userId) }),
  ConversationMessage: ({ authorUserId, ...r }) => ({ ...r, authorUsername: usernameById.get(authorUserId) })
};
/* The one known shape change, and it is the NodeGX `{}` defect's, not ours: an
   empty object is left off the row by setup-backend and reads back as null. That
   is accepted ONLY where the seed holds `{}` — a null anywhere else is a real
   difference. */
const isEmptyObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;
const keyOf = (collection) => schema.tables.find((t) => t.name === collection).indexes.find((i) => i.unique).fields;

let compared = 0;
for (const [collection, rows] of Object.entries(seed.rows)) {
  const { status, body } = await get(`/classes/${collection}?limit=1000`, master);
  check(status === 200, `C3: ${collection} answered ${status} to the master key`);
  const back = (body.results || []).map((r) => {
    const out = (UNRESOLVE[collection] || ((x) => x))(r);
    return out;
  });
  check(back.length === rows.length, `C3: ${collection} holds ${back.length} rows, the seed ${rows.length}`);
  const key = keyOf(collection);
  const id = (r) => key.map((k) => JSON.stringify(r[k])).join('|');
  const byKey = new Map(back.map((r) => [id(r), r]));
  for (const row of rows) {
    const got = byKey.get(id(row));
    if (!got) {
      failures.push(`C3: ${collection} ${id(row)} is not in the backend`);
      continue;
    }
    for (const [k, v] of Object.entries(row)) {
      compared++;
      const a = k === 'createdAt' || k === 'updatedAt' ? new Date(got[k]).toISOString() : got[k] == null && isEmptyObject(v) ? {} : got[k];
      if (JSON.stringify(a ?? null) !== JSON.stringify(v ?? null)) {
        failures.push(`C3: ${collection} ${id(row)}.${k} is ${JSON.stringify(a)} in the backend and ${JSON.stringify(v)} in the seed`);
      }
    }
  }
}

// ── Criterion 5: no client reads a collection ───────────────────────────────
/* Calibrated first: the master key reads the same collection, so a refusal
   below is a refusal and not a collection that does not exist. */
let refused = 0;
for (const t of schema.tables) {
  const asMaster = await get(`/classes/${t.name}?limit=1`, master);
  const asClient = await get(`/classes/${t.name}?limit=1`);
  const leaked = asClient.status === 200 && (asClient.body.results || []).length > 0;
  check(asMaster.status === 200 && (asMaster.body.results || []).length > 0, `C5: the master key cannot read ${t.name} — the refusal below would be blind`);
  check(!leaked, `C5: an anonymous client read ${t.name}`);
  if (!leaked) refused++;
}

// ── Criterion 6: nobody signs up ────────────────────────────────────────────
const signup = await fetch(BACKEND + '/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'stranger@example.test', password: 'a-long-enough-password', email: 'stranger@example.test' })
});
check(signup.status >= 400, `C6: a public sign-up was accepted (${signup.status})`);
const { body: after } = await get('/classes/_User?limit=1000', master);
check((after.results || []).length === seed.users.length, 'C6: a refused sign-up still created a user');

if (failures.length) {
  console.error(`check-seed: ${failures.length} failure(s)\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(
  `check-seed: OK — ${Object.values(seed.rows).reduce((n, r) => n + r.length, 0)} rows in ${Object.keys(seed.rows).length} collections ` +
    `round-tripped, ${compared} fields compared, 0 mismatches; ${refused}/${schema.tables.length} collections refused to an anonymous client ` +
    `(master calibrated); public sign-up refused (${signup.status}); nothing derived stored.`
);
