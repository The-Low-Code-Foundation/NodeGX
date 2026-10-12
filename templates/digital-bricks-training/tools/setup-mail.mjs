#!/usr/bin/env node
/**
 * THE TWO VALUES A MESSAGE EMAIL NEEDS, PROVISIONED AS FUNCTION SECRETS (TASK-L187 §7).
 *
 *   NODEGX_ADMIN_TOKEN=<admin> node tools/setup-mail.mjs --backend <url> --site https://training.digitalbricks.io
 *
 * - SITE_ORIGIN: the address the site is served from, for every link in a message
 *   email (the thread, the learner's page, the unsubscribe link). A CONFIGURED value,
 *   never the request's own headers: those are caller-supplied, and these links go
 *   into mail somebody ELSE reads (requestOrigin.ts in NodeGX says the same).
 * - UNSUBSCRIBE_KEY: 32 random bytes that sign the one-click unsubscribe link.
 *   MINTED ONCE AND NEVER REPLACED BY DEFAULT: replacing it silently breaks every
 *   unsubscribe link already sitting in somebody's inbox — the product's L54 rule
 *   that an opt-out link must never stop working. `--rotate` replaces it, on purpose.
 *
 * Both go through NodeGX's admin route (`PUT /admin/secrets/:name`) into the
 * backend's `secrets.json`, where only a cloud function's Secret node can read
 * them. Nothing is printed but names. A value is never put on the command line.
 */
import { randomBytes } from 'node:crypto';
import { adminClient } from './lib/admin-client.mjs';

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : undefined; };
const backend = arg('backend');
const token = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const site = String(arg('site') || '').replace(/\/+$/, '');
const rotate = argv.includes('--rotate');
if (!backend || !token || !site) {
  console.error('usage: NODEGX_ADMIN_TOKEN=<admin> setup-mail.mjs --backend <url> --site <https://host> [--rotate]  (or --token)');
  process.exit(2);
}
if (!/^https?:\/\/[^/\s]+$/.test(site)) {
  console.error(`setup-mail: --site must be an origin (scheme and host, no path), not "${site}".`);
  process.exit(2);
}
const { call } = adminClient(backend, token);
const have = new Set(((await call('GET', '/admin/secrets')).secrets || []).map((s) => s.name));
await call('PUT', '/admin/secrets/SITE_ORIGIN', { value: site });
if (!have.has('UNSUBSCRIBE_KEY') || rotate) {
  await call('PUT', '/admin/secrets/UNSUBSCRIBE_KEY', { value: randomBytes(32).toString('hex') });
  console.log(`setup-mail: UNSUBSCRIBE_KEY ${have.has('UNSUBSCRIBE_KEY') ? 'ROTATED — every unsubscribe link already sent has stopped working' : 'minted'}.`);
} else {
  console.log('setup-mail: UNSUBSCRIBE_KEY already provisioned; left as it is (pass --rotate to replace it).');
}
const now = new Set(((await call('GET', '/admin/secrets')).secrets || []).map((s) => s.name));
for (const n of ['SITE_ORIGIN', 'UNSUBSCRIBE_KEY']) if (!now.has(n)) { console.error(`setup-mail: ${n} is not provisioned after writing it.`); process.exit(1); }
console.log(`setup-mail: SITE_ORIGIN = ${site}; both read back by name.`);
