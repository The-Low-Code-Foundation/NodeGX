#!/usr/bin/env node
/**
 * TURN ON THE WAY IN (DBU-02): magic links, no sign-up, the app's origin, mail, and where links point.
 *
 *   node tools/setup-signin.mjs [--backend <url>] [--token <admin>] \
 *     [--app-url http://127.0.0.1:8596] [--app-origin <extra origin>,...] \
 *     [--smtp 127.0.0.1:1028] [--from university@example.com] [--from-name "Digital Bricks University"] \
 *     [--mail-hold-seconds 300]
 *
 * Copied in shape from digital-bricks-training/tools/setup-signin.mjs. It writes CONFIGURATION, not rows,
 * so it is safe to re-run on a live backend (a new app origin, a new relay).
 *
 *   1. PUT /admin/auth: magicLink { enabled, allowSignup: false }, and the redirect allow-list (the app
 *      origins a link may bring somebody back to). `allowSignup: false` is said here as well as in
 *      nodegx.security.json (`signup: "nobody"`), so loosening one of them does not open sign-up.
 *   2. PUT /admin/email/config: the SMTP relay (Mailpit locally) and the sender.
 *   3. PUT /admin/secrets/appUrl: where the app lives, for links a FUNCTION writes into a mail
 *      (addLearner's welcome email). A function cannot know the app's address otherwise: the
 *      backend and the app are different origins locally (8595 and 8596).
 *   4. PUT /admin/secrets/unsubscribeKey (DBU-07): the key that signs the "stop these emails" link in a
 *      reply email. Made once per backend from random bytes and never overwritten, so links already
 *      mailed keep working. --mail-hold-seconds <n> sets mailHoldSeconds (default 300 when absent):
 *      only tools/check-mail.mjs lowers it, on its scratch backend.
 *   5. Read it all back and fail unless the backend reports magic links ready.
 *
 * An origin that is not on the allow-list does not fail loudly: the backend sends NO mail and logs
 * `auth.redirect-refused`, which looks exactly like a mail that never came. So every origin the app
 * is served from goes here. --app-url's origin always does.
 *
 * For a real relay later (DBU-12): --smtp host:587 --smtp-user <login> --smtp-key-file <path>
 * --base-url <public backend origin>. The key is read from a FILE, never argv (shell history, `ps`).
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { APP_URL, BACKEND, MAILPIT, arg, token } from './lib/local.mjs';

const TOKEN = token();
const ORIGINS = [...new Set([new URL(APP_URL).origin, ...String(arg('app-origin') || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)])];
const SMTP = arg('smtp') || process.env.DBU_SMTP || `127.0.0.1:${MAILPIT.smtpPort}`;
const FROM = arg('from') || 'university@example.com';
const FROM_NAME = arg('from-name') || 'Digital Bricks University';
const TTL = Number(arg('ttl-minutes') || 15);
const SMTP_USER = arg('smtp-user') || '';
const SMTP_KEY_FILE = arg('smtp-key-file');
const BASE_URL = String(arg('base-url') || '').replace(/\/$/, '');
const MAIL_HOLD = arg('mail-hold-seconds') ?? process.env.DBU_MAIL_HOLD_SECONDS;

const [host, portText] = SMTP.split(':');
const port = Number(portText);
if (!host || !Number.isFinite(port)) {
  console.error(`setup-signin: --smtp must be host:port, got "${SMTP}".`);
  process.exit(2);
}
let smtpKey = '';
if (SMTP_USER) {
  if (!SMTP_KEY_FILE) {
    console.error('setup-signin: --smtp-user needs --smtp-key-file <path> (the key is never taken on the command line).');
    process.exit(2);
  }
  smtpKey = readFileSync(SMTP_KEY_FILE, 'utf8').trim();
  if (!smtpKey) {
    console.error(`setup-signin: ${SMTP_KEY_FILE} is empty.`);
    process.exit(2);
  }
}

async function call(method, path, body) {
  const res = await fetch(BACKEND + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

await call('PUT', '/admin/auth', { magicLink: { enabled: true, allowSignup: false, ttlMinutes: TTL }, redirectAllowList: ORIGINS });
const emailConfig = { enabled: true, smtp: { host, port, secure: port === 465, username: SMTP_USER }, fromAddress: FROM, fromName: FROM_NAME };
if (BASE_URL) emailConfig.baseUrl = BASE_URL;
if (smtpKey) emailConfig.smtpPassword = smtpKey;
await call('PUT', '/admin/email/config', emailConfig);
await call('PUT', '/admin/secrets/appUrl', { value: APP_URL });
if (!JSON.stringify(await call('GET', '/admin/secrets')).includes('unsubscribeKey')) {
  await call('PUT', '/admin/secrets/unsubscribeKey', { value: randomBytes(32).toString('hex') });
}
if (MAIL_HOLD !== undefined) await call('PUT', '/admin/secrets/mailHoldSeconds', { value: String(Number(MAIL_HOLD)) });

// Read back: a 200 on a PUT is not evidence that mail will go out.
const auth = await call('GET', '/admin/auth');
const email = await call('GET', '/admin/email/config');
const secrets = await call('GET', '/admin/secrets');
const policy = auth.policy || auth;
const magic = policy.magicLink || (auth.config && auth.config.magicLink);
const allow = policy.redirectAllowList || (auth.config && auth.config.redirectAllowList) || [];
const cfg = email.config || email;
const secretNames = JSON.stringify(secrets);
const problems = [];
if (!magic || magic.enabled !== true) problems.push('magic links are not enabled');
if (magic && magic.allowSignup !== false) problems.push('magic links would create accounts (allowSignup is not false)');
for (const o of ORIGINS) if (!allow.includes(o)) problems.push(`origin ${o} is not on the redirect allow-list`);
if (auth.magicLinkReady === false) problems.push('the backend reports magic links NOT ready (magicLinkReady: false)');
if (!cfg.enabled || !cfg.smtp || cfg.smtp.host !== host || cfg.smtp.port !== port) problems.push('the SMTP relay did not read back as written');
if (BASE_URL && String(cfg.baseUrl || '').replace(/\/$/, '') !== BASE_URL) problems.push(`mail baseUrl reads back as '${cfg.baseUrl}', not ${BASE_URL}`);
if (!secretNames.includes('appUrl')) problems.push('the appUrl secret is not listed');
if (!secretNames.includes('unsubscribeKey')) problems.push('the unsubscribeKey secret is not listed');

if (problems.length) {
  console.error('setup-signin: FAILED\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(
  `setup-signin: magic links on (${TTL} min, no sign-up), allowed [${ORIGINS.join(', ')}], app at ${APP_URL}, ` +
    `mail through ${host}:${port} from ${FROM}${auth.magicLinkReady === true ? ', backend reports READY' : ''}.`
);
