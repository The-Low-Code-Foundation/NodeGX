#!/usr/bin/env node
/**
 * A PRODUCTION BACKEND, READ BACK (TASK-L183 §5).
 *
 * The proof criterion 2 reads, and the check the cutover runs again. Everything
 * here is read from the RUNNING backend, never from the files that set it up:
 *
 *   - every collection holds exactly what production.json put there, and `_User`
 *     holds exactly ONE account, and that account holds `staff` — before L184 no
 *     learner exists; after it, pass --learners <n> to say how many are expected;
 *   - NO trace of the demo world: no `@example.test` address and none of
 *     seed.json's usernames, anywhere a row can hold one;
 *   - the live policy is nodegx.security.json exactly (a loosened rule on the box
 *     is caught here, not discovered), with sign-up `nobody`;
 *   - magic links are READY, `allowSignup` is false, and the redirect allow-list
 *     is EXACTLY the served origin(s) — an extra origin is somewhere a link can
 *     send somebody;
 *   - mail goes through a real relay (not a sandbox on localhost), and its
 *     `baseUrl` is the served origin — with it empty the backend falls back to
 *     its LOCAL address, and every sign-in link would point at 127.0.0.1 with
 *     every check on the page still green;
 *   - an anonymous client reading a collection is refused.
 *
 * Run: NODEGX_ADMIN_TOKEN=<admin> node tools/check-production.mjs --backend http://127.0.0.1:18691 \
 *        --app-origin https://training.digitalbricks.io [--learners 0] [--allow-sandbox]
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { adminClient } from './lib/admin-client.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || 'http://127.0.0.1:8577').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const ORIGINS = String(arg('app-origin') || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const LEARNERS = Number(arg('learners') || 0);
const ALLOW_SANDBOX = process.argv.includes('--allow-sandbox');
if (!TOKEN || ORIGINS.length === 0) {
  console.error('check-production: NODEGX_ADMIN_TOKEN (or --token) and --app-origin are required.');
  process.exit(2);
}

const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));
const policy = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.security.json'), 'utf8'));
const production = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'production.json'), 'utf8'));
const seed = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'seed.json'), 'utf8'));
const api = adminClient(BACKEND, TOKEN);

const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

// ── Counts ────────────────────────────────────────────────────────────────
/* Before L184 every collection but Concept is empty. After it a learner owns
   rows in several, so --learners says how many PEOPLE to expect and the per-
   collection zero is only asserted while it is 0. */
const counts = await api.counts(schema);
for (const t of schema.tables) {
  const expected = (production.rows[t.name] || []).length;
  if (t.name in production.rows) check(counts[t.name] === expected, `${t.name}: ${counts[t.name]} rows, production.json put ${expected}`);
  else if (LEARNERS === 0) check(counts[t.name] === 0, `${t.name}: ${counts[t.name]} rows in a backend nobody has been added to`);
}
check(counts._User === 1 + LEARNERS, `_User: ${counts._User} accounts, expected ${1 + LEARNERS} (one staff account and ${LEARNERS} learner(s))`);
if (LEARNERS > 0) check(counts.LearnerProfile === LEARNERS, `LearnerProfile: ${counts.LearnerProfile}, expected ${LEARNERS}`);

// ── Staff ─────────────────────────────────────────────────────────────────
const { roles = [] } = await api.call('GET', '/admin/roles');
const staff = roles.find((r) => r.name === 'staff');
check(!!staff, 'there is no staff role');
check(staff && staff.users.length >= 1, 'nobody holds the staff role, so nobody can open the roster');

// ── No trace of the demo world ────────────────────────────────────────────
/* Every row of every collection, and every account, as text: a fixture address or
   a seed username anywhere is the demo world leaking into a real client's backend. */
const seedNames = new Set(seed.users.map((u) => u.username));
const leaks = [];
const scan = (where, row) => {
  const text = JSON.stringify(row);
  if (/@example\.test\b/.test(text)) leaks.push(`${where}: an @example.test address`);
  for (const name of seedNames) if (text.includes(name)) leaks.push(`${where}: the seed's '${name}'`);
};
for (const name of [...schema.tables.map((t) => t.name), '_User']) {
  if (!counts[name]) continue;
  const { results = [] } = await api.data('GET', `/classes/${encodeURIComponent(name)}?limit=1000`);
  results.forEach((r) => scan(name, r));
}
for (const l of [...new Set(leaks)]) check(false, `demo world: ${l}`);

// ── Policy ────────────────────────────────────────────────────────────────
const live = await api.call('GET', '/admin/permissions');
const livePolicy = live.config || live.permissions || live;
for (const key of ['devOpen', 'defaults', 'collections', 'functions', 'files', 'signup']) {
  check(isDeepStrictEqual(livePolicy[key], policy[key]), `policy '${key}' on the backend differs from nodegx.security.json`);
}
check(livePolicy.signup === 'nobody', `sign-up is '${livePolicy.signup}', not 'nobody'`);

// ── The way in ────────────────────────────────────────────────────────────
const auth = await api.call('GET', '/admin/auth');
const cfg = auth.config || auth;
const magic = cfg.magicLink || {};
check(magic.enabled === true, 'magic links are not enabled');
check(magic.allowSignup === false, 'a magic link would create an account (allowSignup is not false)');
check(auth.magicLinkReady === true, 'the backend does not report magic links READY');
const allow = [...(cfg.redirectAllowList || [])].sort();
check(isDeepStrictEqual(allow, [...ORIGINS].sort()), `redirect allow-list is [${allow.join(', ')}], expected exactly [${ORIGINS.join(', ')}]`);

const email = await api.call('GET', '/admin/email/config');
const mail = email.config || email;
check(mail.enabled === true, 'mail is not enabled');
const host = (mail.smtp && mail.smtp.host) || '';
if (!ALLOW_SANDBOX) {
  check(!/^(127\.|localhost$|::1$|0\.0\.0\.0$)/.test(host), `mail goes to '${host}', a sandbox on this machine, not a relay`);
  check(!!(mail.smtp && mail.smtp.username), 'the relay has no username, so it is not an authenticated relay');
}
check(String(mail.baseUrl || '').replace(/\/$/, '') === ORIGINS[0], `mail baseUrl is '${mail.baseUrl || ''}', expected ${ORIGINS[0]} — sign-in links would point elsewhere`);

// ── Message mail (TASK-L187) ───────────────────────────────────────────────
// Names only: a function secret is never readable back, by design.
const secretNames = new Set(((await api.call('GET', '/admin/secrets')).secrets || []).map((x) => x.name));
check(secretNames.has('SITE_ORIGIN'), 'SITE_ORIGIN is not provisioned, so every link in a message email would fail to build — run tools/setup-mail.mjs');
check(secretNames.has('UNSUBSCRIBE_KEY'), 'UNSUBSCRIBE_KEY is not provisioned, so no message email can carry its one-click link — run tools/setup-mail.mjs');

// ── An anonymous client is refused ────────────────────────────────────────
const anon = await fetch(`${BACKEND}/classes/Concept?limit=1`);
check(anon.status >= 400, `an anonymous read of Concept answered ${anon.status}`);

if (failures.length) {
  console.error(`check-production: FAILED (${failures.length}) —\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log(
  `check-production: ${Object.values(counts).reduce((a, b) => a + b, 0)} rows, ${counts._User} account(s), ` +
    `policy as written, magic links ready for [${ORIGINS.join(', ')}] through ${host}, no trace of the demo world.`
);
