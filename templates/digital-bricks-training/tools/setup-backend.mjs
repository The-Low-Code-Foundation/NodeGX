#!/usr/bin/env node
/**
 * PUT THIS TEMPLATE'S DATA INTO A RUNNING LOCAL BACKEND (TASK-L169 §6).
 *
 * A NodeGX backend keeps a collection's schema in its own data directory, not
 * in the project, so a template that wants to be installable has to carry its
 * schema somewhere and apply it. This is that step, in order:
 *
 *   1. REFUSE a backend that already holds rows in any of our collections, or
 *      any user. L67's bootstrap rule: the accident worth preventing is pointing
 *      this at a live database, and the recovery from a half-applied run is a
 *      fresh data directory.
 *   2. Apply backend/schema.json (POST /admin/schema/apply).
 *   3. Replace the security policy with nodegx.security.json (PUT /admin/permissions).
 *   4. Create the `staff` role, then every user, then assign the staff users.
 *   5. Import seed.json, collection by collection (POST /admin/import/<C>), with
 *      usernames resolved to the objectIds just created. Admin import keeps
 *      createdAt/updatedAt, so the product's timestamps arrive as they were.
 *   6. Read the schema back (POST /admin/schema/diff) and fail if any table or
 *      index the file declares is missing — an apply's exit code is not evidence
 *      that the indexes exist (criterion 4).
 *
 * No user gets a password: this product has none (L122). Users are created with
 * the admin credential through /classes/_User, which does not require one.
 *
 * Run: node tools/setup-backend.mjs --backend http://127.0.0.1:8577 --token <admin credential>
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './lib/seed-resolve.mjs';
import { adminClient } from './lib/admin-client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || 'http://127.0.0.1:8577').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
if (!TOKEN) {
  console.error('setup-backend: pass --token <admin credential> (or NODEGX_ADMIN_TOKEN).');
  process.exit(2);
}

const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));
const policy = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.security.json'), 'utf8'));
const seed = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'seed.json'), 'utf8'));

// The admin client and the refusal are shared with setup-production.mjs
// (tools/lib/admin-client.mjs): one rule for "never write over a backend that
// has data", not two that can drift (TASK-L183 §2).
const api = adminClient(BACKEND, TOKEN);
const { call, data } = api;

// ── 1. Refuse a backend that is not empty ────────────────────────────────────
try {
  await api.refuseOccupied(schema, 'setup-backend');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// ── 2. Schema ────────────────────────────────────────────────────────────────
const applied = await call('POST', '/admin/schema/apply', { source: { tables: schema.tables } });
const skipped = (applied.result && applied.result.skipped) || [];
if (skipped.length) throw new Error(`schema apply skipped: ${skipped.join('; ')}`);

// ── 3. Policy ────────────────────────────────────────────────────────────────
await call('PUT', '/admin/permissions', policy);

// ── 4. Roles and users ───────────────────────────────────────────────────────
const roleNames = [...new Set(seed.users.flatMap((u) => u.roles || []))];
for (const name of roleNames) await call('POST', '/admin/roles', { name });
const userIdByName = new Map();
for (const u of seed.users) {
  const { fields, roles } = userFields(u);
  const created = await data('POST', '/classes/_User', fields);
  userIdByName.set(u.username, created.objectId);
  for (const role of roles) await call('POST', `/admin/roles/${encodeURIComponent(role)}/users`, { userId: created.objectId });
}
const userId = (username) => {
  const id = userIdByName.get(username);
  if (!id) throw new Error(`seed names a user '${username}' that seed.users does not create`);
  return id;
};

// ── 5. Rows ──────────────────────────────────────────────────────────────────
// The transformation itself lives in lib/seed-resolve.mjs — the ONE owner, which
// check-read-functions.mjs imports too, so its offline rows are the backend's rows.

const imported = {};
for (const [collection, list] of Object.entries(seed.rows)) {
  const rows = list.map((r) => resolveRow(collection, r, userId));
  const report = await call('POST', `/admin/import/${encodeURIComponent(collection)}`, {
    format: 'json',
    content: JSON.stringify(rows),
    dryRun: false
  });
  if (report.rejected && report.rejected.length) {
    throw new Error(`${collection}: ${report.rejected.length} row(s) rejected — ${JSON.stringify(report.rejected.slice(0, 3))}`);
  }
  if (report.created !== rows.length) throw new Error(`${collection}: created ${report.created} of ${rows.length}`);
  imported[collection] = report.created;
}

// ── 6. Read it back ──────────────────────────────────────────────────────────
await api.assertSchema(schema);

console.log(
  `setup-backend: ${schema.tables.length} collections, ${schema.tables.reduce((n, t) => n + t.indexes.length, 0)} indexes read back; ` +
    `${seed.users.length} users (${roleNames.map((r) => `role ${r}`).join(', ')}); ` +
    `${Object.values(imported).reduce((a, b) => a + b, 0)} rows in ${Object.keys(imported).length} collections.`
);
