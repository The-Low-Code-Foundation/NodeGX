#!/usr/bin/env node
/**
 * PUT THE DEMO WORLD INTO AN EMPTY, RUNNING BACKEND (DBU-01).
 *
 *   node tools/setup-backend.mjs [--backend <url>] [--token <admin>]
 *
 * Usually run by reset-demo.mjs, which also starts the backend and deploys the
 * functions. In order:
 *   1. REFUSE a backend that holds any user or any row in our tables.
 *   2. Apply backend/schema.json.
 *   3. Replace the security policy with nodegx.security.json, and read it back;
 *      set the file limits (50 MB, no SVG; DBU-06).
 *   4. Create the roles, the users (no passwords: DBU-02 signs in by email) and
 *      their roles.
 *   5. Upload each fixture file PRIVATELY, AS ITS OWNER (a session minted for
 *      them), so `_Files.owner` is the learner, exactly as a real hand-in.
 *   6. Import the rows (admin import keeps objectId and createdAt).
 *   7. Read the schema back.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adminClient } from './lib/admin-client.mjs';
import { BACKEND, readJson, token } from './lib/local.mjs';
import { FILES_DIR, buildWorld, resolveRows } from './lib/seed.mjs';

const schema = readJson('backend', 'schema.json');
const policy = readJson('nodegx.security.json');
const api = adminClient(BACKEND, token());
const { call, data } = api;

try {
  await api.refuseOccupied(schema, 'setup-backend');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

// 2. Schema
const applied = await call('POST', '/admin/schema/apply', { source: { tables: schema.tables } });
const skipped = (applied.result && applied.result.skipped) || [];
if (skipped.length) throw new Error(`schema apply skipped: ${skipped.join('; ')}`);

// 3. Policy, read back: "applied" is a claim, the backend's answer is the evidence.
await call('PUT', '/admin/permissions', policy);
const live = (await call('GET', '/admin/permissions')).config;
if (JSON.stringify(live) !== JSON.stringify(policy)) {
  throw new Error(`the live policy is not nodegx.security.json after PUT:\n${JSON.stringify(live, null, 2)}`);
}

// 3b. File limits (DBU-06): hand-ins up to 50 MB (the spec's limit; an upload is held whole in memory, PLATFORM.md
// feature 1), and no SVG, which runs as a page when opened on its own (defect D2) and nobody needs to hand in.
// handIn checks the size and kind again: this is the door, that is the gate.
const FILE_LIMITS = { maxUploadBytes: 50 * 1024 * 1024, contentTypes: { allowList: null, denyList: ['image/svg+xml'] } };
await call('PUT', '/admin/files/config', FILE_LIMITS);
const fileConfig = await call('GET', '/admin/files/config');
const limits = fileConfig.config || fileConfig;
if (limits.maxUploadBytes !== FILE_LIMITS.maxUploadBytes || !(limits.contentTypes?.denyList || []).includes('image/svg+xml')) {
  throw new Error(`the file limits did not hold after PUT: ${JSON.stringify(limits).slice(0, 300)}`);
}

// 4. Roles and users
const world = buildWorld(new Date());
const roleNames = [...new Set(world.users.flatMap((u) => u.roles))];
for (const name of roleNames) await call('POST', '/admin/roles', { name });
const userIds = new Map();
for (const u of world.users) {
  const created = await data('POST', '/classes/_User', u.fields);
  userIds.set(u.key, created.objectId);
  for (const role of u.roles) await call('POST', `/admin/roles/${encodeURIComponent(role)}/users`, { userId: created.objectId });
}

// 5. Files, each uploaded once, by its owner
const stored = new Map();
for (const f of world.files) {
  if (stored.has(`@${f.fixture}`)) continue;
  const session = await api.sessionFor(userIds.get(f.owner), 'upload');
  const bytes = new Uint8Array(readFileSync(join(FILES_DIR, f.fixture)));
  const r = await api.as(session.token, 'POST', `/files/${encodeURIComponent(f.fixture)}`, bytes, { 'X-NodeGX-File-Private': 'true' });
  await api.endSession(session);
  if (r.status !== 201 || !r.json.name) throw new Error(`upload ${f.fixture} as ${f.owner} → ${r.status} ${r.text.slice(0, 200)}`);
  stored.set(`@${f.fixture}`, r.json.name);
}

// 6. Rows
const imported = {};
for (const [collection, list] of Object.entries(world.rows)) {
  if (!list.length) continue;
  const rows = resolveRows(list, { userId: (k) => userIds.get(k), storedName: (n) => stored.get(n) });
  const report = await call('POST', `/admin/import/${encodeURIComponent(collection)}`, { format: 'json', content: JSON.stringify(rows), dryRun: false });
  if (report.rejected && report.rejected.length) throw new Error(`${collection}: ${report.rejected.length} row(s) rejected — ${JSON.stringify(report.rejected.slice(0, 3))}`);
  if (report.created !== rows.length) throw new Error(`${collection}: created ${report.created} of ${rows.length}`);
  imported[collection] = report.created;
}

// 7. Read back
await api.assertSchema(schema);

const total = Object.values(imported).reduce((a, b) => a + b, 0);
console.log(
  `setup-backend: ${schema.tables.length} tables; policy read back; ${world.users.length} users (${roleNames.join(', ')}); ` +
    `${stored.size} private file(s); ${total} rows (${Object.entries(imported).map(([c, n]) => `${c} ${n}`).join(', ')}).`
);
