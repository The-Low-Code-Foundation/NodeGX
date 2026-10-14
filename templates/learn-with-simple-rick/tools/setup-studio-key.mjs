#!/usr/bin/env node
/**
 * MINT THE KEY THE STUDIO PUBLISHES WITH (P119 SRK-003).
 *
 *   node tools/setup-studio-key.mjs --backend <url> --token <admin credential> --as <Rick's email>
 *
 * The studio (`~/vscode_projects/learn-with-simple-rick`, on Richard's Mac) reads a learner's
 * row, notes and alias table included, and publishes threads. This key:
 *
 *   - ACTS AS Rick (actsAsUserId), so it reads exactly what he reads and every rule is decided
 *     for him; it refuses an account that is not staff;
 *   - reads collections (`classes:read`) and calls only the functions the studio needs. It
 *     writes no row directly: the policy lets nobody, so that every write keeps its history row.
 *
 * The secret is printed once and stored nowhere but the studio's `.env`.
 */
import { adminClient, argsOf } from './admin-client.mjs';

export const SCOPES = ['classes:read', 'functions:publishThread', 'functions:appendMessages', 'functions:saveSession'];

const arg = argsOf(process.argv);
const BACKEND = arg('backend');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const AS = String(arg('as') || '').trim().toLowerCase();
if (!BACKEND || !TOKEN || !AS) {
  console.error('setup-studio-key: pass --backend <url> --token <admin credential> --as <Rick\'s email>.');
  process.exit(2);
}
const { call } = adminClient(BACKEND, TOKEN);
const found = ((await call('GET', `/admin/users?q=${encodeURIComponent(AS)}`)).users || []).filter(
  (u) => String(u.username).toLowerCase() === AS
);
if (found.length !== 1) {
  console.error(`setup-studio-key: there is no account for ${AS} on this backend. Nothing was minted.`);
  process.exit(1);
}
const user = found[0];
const staff = ((await call('GET', '/admin/roles')).roles || []).find((r) => r.name === 'staff');
if (!staff || !(staff.users || []).includes(user.objectId)) {
  console.error(`setup-studio-key: ${AS} is not staff, so a key acting as them would read nothing. Nothing was minted.`);
  process.exit(1);
}
const key = await call('POST', '/admin/keys', { name: 'The studio', scopes: SCOPES, actsAsUserId: user.objectId });
console.log(`Minted "${key.name}", acting as ${AS}. Put this in the studio's .env, once:\n\n  NODEGX_STUDIO_KEY=${key.secret}\n`);
