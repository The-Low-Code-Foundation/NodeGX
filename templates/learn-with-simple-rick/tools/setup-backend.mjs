#!/usr/bin/env node
/**
 * PUT LEARN WITH SIMPLE RICK INTO AN EMPTY BACKEND (P119 SRK-003).
 *
 *   node tools/setup-backend.mjs --backend <url> --token <admin credential> --rick <Rick's email>
 *
 *   1. Refuse a backend that already holds a user or a Learner: this is for a fresh data
 *      directory, never the live one.
 *   2. The collections: `backend/schema.json`, one `POST /admin/schema` body each. That file is
 *      the projection of `docs/world/` (what Richard said about his world), byte for byte;
 *      `packages/nodegx-backend/tests/srk-003-policy.test.ts` fails the day they differ.
 *   3. The policy: `nodegx.security.json` (`PUT /admin/permissions`).
 *   4. The `staff` role, and Rick's account in it. No password: he signs in with a code.
 *   5. Sign-in by a six-digit code, ten minutes, and no sign-up: an address with no account
 *      gets no mail and no account (SRK-001). Magic links off: a link from a phone's mail app
 *      opens the browser, not the installed app.
 *   6. Read the collections back.
 *
 * Learners are added by Rick (the addLearner function), never by this tool.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient, argsOf } from './admin-client.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = argsOf(process.argv);
const BACKEND = arg('backend');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const RICK = String(arg('rick') || '').trim().toLowerCase();
if (!BACKEND || !TOKEN || !RICK) {
  console.error('setup-backend: pass --backend <url> --token <admin credential> --rick <email>.');
  process.exit(2);
}

const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));
const policy = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.security.json'), 'utf8'));
const { call } = adminClient(BACKEND, TOKEN);

// 1. Refuse a backend that is not empty.
const users = await call('GET', '/admin/users');
const tables = (await call('GET', '/admin/schema')).tables || [];
if ((users.total || 0) > 0 || tables.some((t) => t.name === 'Learner')) {
  console.error('setup-backend: REFUSED — this backend already has users or a Learner collection. Point it at a fresh data directory.');
  process.exit(1);
}

// 2. The collections, in the projection's order (a link's target comes first).
for (const body of schema) await call('POST', '/admin/schema', body);

// 3. The policy.
await call('PUT', '/admin/permissions', policy);

// 4. Rick.
await call('POST', '/admin/roles', { name: 'staff' });
const rick = await call('POST', '/admin/users', { username: RICK, email: RICK, roles: ['staff'] });

// 5. Sign-in.
await call('PUT', '/admin/auth', {
  emailCode: { enabled: true, allowSignup: false, ttlMinutes: 10 },
  magicLink: { enabled: false }
});

// 6. Read back.
const after = new Set(((await call('GET', '/admin/schema')).tables || []).map((t) => t.name));
const missing = schema.map((b) => b.table).filter((name) => !after.has(name));
if (missing.length) throw new Error(`setup-backend: the backend does not hold ${missing.join(', ')}`);

console.log(`setup-backend: ${schema.length} collections, the policy, role staff with ${RICK} (${rick.objectId}), sign-in by code with sign-up off.`);
