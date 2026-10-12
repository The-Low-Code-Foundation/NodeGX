#!/usr/bin/env node
/**
 * SET UP A BACKEND FOR REAL CLIENTS (TASK-L183 §2).
 *
 * The production counterpart of setup-backend.mjs, in the same order and with
 * the same refusal (tools/lib/admin-client.mjs owns both):
 *
 *   1. REFUSE a backend that holds any row in our collections or any user.
 *   2. Apply backend/schema.json, and read it back.
 *   3. Replace the security policy with nodegx.security.json, unchanged.
 *   4. Deploy the functions — by running deploy-functions.mjs itself, so there
 *      is one bundle builder and not two.
 *   5. Import backend/production.json: the concept titles, nothing about anybody.
 *   6. Create the `staff` role and ONE user, from --staff, holding it. No learner
 *      profile: a staff account holds no learner data (L102).
 *
 * It never reads seed.json. The demo world is invented people, and
 * check-production.mjs fails if any of them arrive.
 *
 * On nexus-1 this runs through an SSH tunnel to 127.0.0.1 (the admin door is
 * never served on the public name — hosting/README.md). The admin credential
 * comes from --token or NODEGX_ADMIN_TOKEN, never from a file in the project.
 *
 * Run: NODEGX_ADMIN_TOKEN=<admin> node tools/setup-production.mjs --backend http://127.0.0.1:18691 \
 *        --staff <address> [--first-name <given> --last-name <family>]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adminClient } from './lib/admin-client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || 'http://127.0.0.1:8577').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const STAFF = String(arg('staff') || '').trim().toLowerCase();
// A name only if one is given: never derived from the address (L106).
const FIRST = arg('first-name');
const LAST = arg('last-name');

if (!TOKEN) {
  console.error('setup-production: pass --token <admin credential> (or NODEGX_ADMIN_TOKEN).');
  process.exit(2);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(STAFF)) {
  console.error('setup-production: --staff <address> is required: the one person who can sign in at first.');
  process.exit(2);
}
if (/@example\.(test|com|org)$/.test(STAFF)) {
  console.error(`setup-production: ${STAFF} is a fixture address. A production backend's first account is a real person.`);
  process.exit(2);
}

const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));
const policy = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.security.json'), 'utf8'));
const production = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'production.json'), 'utf8'));
const api = adminClient(BACKEND, TOKEN);

try {
  // ── 1. Refuse ──────────────────────────────────────────────────────────────
  await api.refuseOccupied(schema, 'setup-production');

  // ── 2. Schema ──────────────────────────────────────────────────────────────
  const applied = await api.call('POST', '/admin/schema/apply', { source: { tables: schema.tables } });
  const skipped = (applied.result && applied.result.skipped) || [];
  if (skipped.length) throw new Error(`schema apply skipped: ${skipped.join('; ')}`);
  await api.assertSchema(schema);

  // ── 3. Policy ──────────────────────────────────────────────────────────────
  await api.call('PUT', '/admin/permissions', policy);

  // ── 4. Functions ───────────────────────────────────────────────────────────
  // The credential goes to the child through its environment, never its argv
  // (a command line is visible to every user on the machine through `ps`).
  const deployed = spawnSync(process.execPath, [join(here, 'deploy-functions.mjs'), '--backend', BACKEND], {
    encoding: 'utf8',
    env: { ...process.env, NODEGX_ADMIN_TOKEN: TOKEN }
  });
  if (deployed.status !== 0) throw new Error(`deploy-functions failed:\n${deployed.stderr || deployed.stdout}`);

  // ── 5. What production starts with ─────────────────────────────────────────
  const imported = {};
  for (const [collection, rows] of Object.entries(production.rows)) {
    const report = await api.call('POST', `/admin/import/${encodeURIComponent(collection)}`, {
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

  // ── 6. The one staff account ───────────────────────────────────────────────
  await api.call('POST', '/admin/roles', { name: 'staff' });
  const user = { username: STAFF, email: STAFF };
  if (FIRST) user.firstName = FIRST;
  if (LAST) user.lastName = LAST;
  const created = await api.data('POST', '/classes/_User', user);
  await api.call('POST', '/admin/roles/staff/users', { userId: created.objectId });

  console.log(
    `setup-production: ${schema.tables.length} collections read back; functions deployed; ` +
      Object.entries(imported).map(([c, n]) => `${n} ${c}`).join(', ') +
      `; one staff account (${STAFF}). Nothing else. Next: setup-signin.mjs, then check-production.mjs.`
  );
} catch (e) {
  console.error(e.refused ? e.message : `setup-production: FAILED — ${e.message}`);
  process.exit(1);
}
