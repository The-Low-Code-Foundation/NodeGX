#!/usr/bin/env node
/**
 * MINT THE KEY THE TRAINER'S CLAUDE CONNECTS WITH (TASK-L191).
 *
 *   node tools/setup-trainer-key.mjs --backend <url> --token <admin> --as <staff email> [--name <key name>]
 *
 * NodeGX's backend serves MCP at POST /mcp (FED-005): a Claude that connects
 * with an API key is offered exactly the tools that key may call, computed per
 * request from the same gates that enforce them. This mints ONE such key:
 *
 *   - BOUND to one staff account (actsAsUserId), so every function's
 *     `call: "role:staff"` rule is checked against that person, and a function
 *     runs with their session — the drafts record who saved them;
 *   - SCOPED to exactly the nine functions in SCOPES, and nothing else: no
 *     collection, no `roster`, no `learnerProgramme` (sprint 55 §5 — only what a
 *     lesson needs reaches the model), no learner function.
 *
 * It refuses an account that is not staff, because a key acting as anyone else
 * would be offered nothing and fail every call with no sentence saying why.
 *
 * THE SECRET IS PRINTED ONCE AND WRITTEN NOWHERE. The backend stores only a
 * hash; losing it means revoking the key (the API keys page) and minting another.
 * It goes in the person's own Claude configuration, never in this project.
 *
 * claude.ai on the web and mobile cannot use it: a custom connector there needs
 * OAuth, and NodeGX's /mcp takes a key (sprint 55 §4). Claude Code — in the
 * terminal, or the desktop app's Code tab — can.
 */
import { adminClient } from './lib/admin-client.mjs';

export const SCOPES = [
  'authoringGuide', 'learnersForLessons', 'lessonContext', 'saveLessonDraft', 'readLesson',
  'publishLesson', 'copyLesson', 'conceptList', 'setLearnerPath'
].map((f) => `functions:${f}`);

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || '').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const AS = String(arg('as') || '').trim().toLowerCase();
const NAME = arg('name') || `Trainer's Claude — ${AS}`;
if (!BACKEND || !TOKEN || !AS) {
  console.error('setup-trainer-key: pass --backend <url> --token <admin credential> --as <staff email>.');
  process.exit(2);
}

const { call, data } = adminClient(BACKEND, TOKEN);
const where = encodeURIComponent(JSON.stringify({ username: AS }));
const users = (await data('GET', `/classes/_User?where=${where}&limit=2`)).results || [];
if (users.length !== 1) {
  console.error(`setup-trainer-key: there is no account for ${AS} on this backend. Nothing was minted.`);
  process.exit(1);
}
const user = users[0];
const staff = ((await call('GET', '/admin/roles')).roles || []).find((r) => r.name === 'staff');
if (!staff || !(staff.users || []).includes(user.objectId)) {
  console.error(`setup-trainer-key: ${AS} is not staff, so a key acting as them would be offered no tools. Nothing was minted.`);
  process.exit(1);
}
const key = await call('POST', '/admin/keys', { name: NAME, scopes: SCOPES, actsAsUserId: user.objectId });
console.log(`Minted "${key.name}", acting as ${AS}, scoped to ${SCOPES.length} functions.`);
console.log('The secret is shown ONCE and stored nowhere. Add it to Claude Code with:\n');
console.log(`  claude mcp add --transport http dbt-training ${BACKEND}/mcp --header "Authorization: Bearer ${key.secret}"\n`);
console.log('Then ask your Claude to start with authoringGuide. To stop it, revoke the key on the backend\'s API keys page.');
