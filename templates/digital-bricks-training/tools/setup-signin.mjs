#!/usr/bin/env node
/**
 * TURN ON THE WAY IN (TASK-L171 §2): magic links, a redirect allow-list, SMTP.
 *
 * Separate from setup-backend.mjs on purpose. That tool refuses a backend that
 * already holds data, because it writes rows; this one writes CONFIGURATION,
 * which an operator changes on a live backend all the time (a new app origin, a
 * new relay), so it must be safe to re-run and it is.
 *
 *   1. PUT /admin/auth — magicLink { enabled: true, allowSignup: false }, and the
 *      redirect allow-list: the app origins a link may bring somebody back to.
 *      `allowSignup: false` is written out even though nodegx.security.json's
 *      `signup: "nobody"` already closes it, because this product has no public
 *      sign-up (L107/L122) and a config that says so in two places cannot be
 *      loosened by changing one of them.
 *   2. PUT /admin/email/config — the SMTP relay. For local development that is
 *      Mailpit (docs/START-HERE.md), and the drive reads the link out of its API.
 *      A template-side "print the link to the console" bypass is NOT built
 *      (L171's DO NOT): the backend's own posture is an SMTP sandbox.
 *   3. Read both back and fail unless the backend reports magic links READY.
 *      A 200 on a PUT is not evidence that mail will go out.
 *
 * An origin that is not on the allow-list does not fail loudly for the person
 * signing in: the backend sends NO mail and logs `auth.redirect-refused`, which
 * looks exactly like a mail that never came. So every origin the app is served
 * from goes here, comma-separated.
 *
 *   node tools/setup-signin.mjs --backend http://127.0.0.1:8577 --token <admin credential> \
 *     --app-origin http://127.0.0.1:8602 --smtp 127.0.0.1:1026 \
 *     --from no-reply@digitalbricks.example --from-name "Digital Bricks Training"
 */
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BACKEND = String(arg('backend', 'http://127.0.0.1:8577')).replace(/\/$/, '');
const TOKEN = arg('token', process.env.NODEGX_ADMIN_TOKEN);
const ORIGINS = String(arg('app-origin', '')).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
const SMTP = arg('smtp');
const FROM = arg('from', 'no-reply@example.test');
const FROM_NAME = arg('from-name', 'Digital Bricks Training');
const TTL = Number(arg('ttl-minutes', 15));

if (!TOKEN || ORIGINS.length === 0 || !SMTP) {
  console.error('setup-signin: --token, --app-origin and --smtp host:port are required.');
  process.exit(2);
}
const [host, portText] = SMTP.split(':');
const port = Number(portText);
if (!host || !Number.isFinite(port)) {
  console.error(`setup-signin: --smtp must be host:port, got "${SMTP}".`);
  process.exit(2);
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

await call('PUT', '/admin/auth', {
  magicLink: { enabled: true, allowSignup: false, ttlMinutes: TTL },
  redirectAllowList: ORIGINS
});
await call('PUT', '/admin/email/config', {
  enabled: true,
  smtp: { host, port, secure: false, username: '' },
  fromAddress: FROM,
  fromName: FROM_NAME
});

const auth = await call('GET', '/admin/auth');
const email = await call('GET', '/admin/email/config');
const policy = auth.policy || auth;
const problems = [];
const magic = policy.magicLink || (auth.config && auth.config.magicLink);
if (!magic || magic.enabled !== true) problems.push('magic links are not enabled');
if (magic && magic.allowSignup !== false) problems.push('magic links would create accounts (allowSignup is not false)');
const allow = policy.redirectAllowList || (auth.config && auth.config.redirectAllowList) || [];
for (const o of ORIGINS) if (!allow.includes(o)) problems.push(`origin ${o} is not on the redirect allow-list`);
if (auth.magicLinkReady === false) problems.push('the backend reports magic links NOT ready (magicLinkReady: false)');
const cfg = email.config || email;
if (!cfg.enabled || !cfg.smtp || cfg.smtp.host !== host || cfg.smtp.port !== port) problems.push('the SMTP relay did not read back as written');

if (problems.length) {
  console.error('setup-signin: FAILED —\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(
  `setup-signin: magic links on (${TTL} min, no sign-up), ${ORIGINS.length} origin(s) allowed [${ORIGINS.join(', ')}], ` +
    `mail through ${host}:${port} from ${FROM}` +
    (auth.magicLinkReady === true ? ', backend reports READY.' : '.')
);
