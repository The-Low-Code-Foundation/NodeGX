// HST-014: Fixture C as the deploy COMMAND left it (`packages/nodegx-backend/cloudflare/deploy.mjs`), read over HTTP.
//
//   node check-campus-deploy.mjs <deployment folder> [--seed] [--answer] [--upload]
//
// The address and the admin credential come from the deployment's own `deployment.json`. Never prints a password or a
// token.
//   --seed    what a person does once the app is up, through the admin API and the app's own sign-up, NEVER a boot:
//             the two accounts (`c-campus/.accounts.json`), the owner into the role, Ada and Grace with their ids (so
//             Ada's link is the same link). Each step skips what is already there, so it is safe on a live app.
//   --answer  saves one answer for Ada, as her page does
//   --upload  the owner stores a small text file, read back signed out at its link (MUST 8); prints its path
//   --file <path>  a file uploaded before a redeploy must still open (AC2)
// Then MUST 1–6 and 8 as calls, and the four route families the spike's hand list hid behind the page (AC4).
// Exits 1 if any reading is not what MUST.md says.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node check-campus-deploy.mjs <deployment folder> [--seed] [--answer] [--upload]');
  process.exit(2);
}
const record = JSON.parse(readFileSync(join(dir, 'deployment.json'), 'utf8'));
const base = record.deploys.at(-1).url.replace(/\/$/, '');
const ADMIN = { authorization: `Bearer ${record.adminToken}` };
const accounts = JSON.parse(readFileSync(fileURLToPath(new URL('./c-campus/.accounts.json', import.meta.url)), 'utf8'));
const READERS = [
  { objectId: '6f468bbd-4091-48c8-90a1-9232f4753a90', name: 'Ada', email: 'ada@example.com' },
  { objectId: '5151bc1b-a0d2-4c94-92c2-971fa212dd6f', name: 'Grace', email: 'grace@example.com' }
];
const ADA = READERS[0].objectId;
const H = { 'content-type': 'application/json', 'x-parse-application-id': 'campus' };
let failed = 0;

async function req(method, path, body, headers = {}) {
  const t = Date.now();
  const res = await fetch(base + path, { method, headers: { ...H, ...headers }, body: body && JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, type: res.headers.get('content-type') || '', text, json, ms: Date.now() - t };
}
function check(what, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${what}${detail ? ` — ${detail}` : ''}`);
}
async function signIn(who) {
  const r = await req('POST', '/login', { username: accounts[who].username, password: accounts[who].password });
  return { status: r.status, token: r.json?.sessionToken, id: r.json?.objectId };
}

console.log(`${base} (deployed ${record.deploys.length}×)`);
if (process.argv.includes('--seed')) {
  for (const who of ['owner', 'other']) {
    if ((await signIn(who)).status === 200) {
      console.log(`  seed: ${who} already has an account`);
      continue;
    }
    const a = accounts[who];
    const r = await req('POST', '/users', { username: a.username, email: a.email, password: a.password });
    check(`seed: sign up ${who}`, r.status < 300, `${r.status}`);
  }
  const owner = await signIn('owner');
  const inRole = await req('POST', '/admin/roles/owner/users', { userId: owner.id }, ADMIN);
  check('seed: the owner into the role owner', inRole.status < 300, `${inRole.status}`);
  const there = await req('GET', `/classes/Reader/${ADA}`);
  if (there.status === 200) console.log('  seed: Ada and Grace are already there');
  else {
    const S = (name) => ({ name, type: 'String' });
    const content = JSON.stringify({ format: 'nodegx-collection', version: 1, collection: 'Reader', schema: { columns: [S('name'), S('email')] }, count: 2, records: READERS });
    const imp = await req('POST', '/admin/import/Reader', { format: 'json', content }, ADMIN);
    check('seed: Ada and Grace, with their ids', imp.status < 300, `${imp.status} ${imp.text.slice(0, 120)}`);
  }
}

const page = await req('GET', `/home?id=${ADA}`, undefined, { accept: 'text/html' });
check('MUST 1: Ada\'s link answers with the app', page.status === 200 && page.text.includes('noodl.deploy'), `${page.status} ${page.ms} ms`);
const cfg = await req('GET', '/nodegx-config.json');
check('the app is aimed at the address it was loaded from', cfg.json?.cloudservices?.endpoint === base, cfg.json?.cloudservices?.endpoint);
const engine = await req('GET', '/noodl.deploy.js');
check('the engine is the production one', engine.status === 200 && engine.text.length < 5e6, `${(engine.text.length / 1e6).toFixed(2)} MB`);
const hidden = await req('GET', '/.accounts.json');
check('the accounts file is not published', !hidden.text.includes('password'), `${hidden.status}`);
const ada = await req('GET', `/classes/Reader/${ADA}`);
check('MUST 1: the page reads Ada by her id, signed out', ada.status === 200 && ada.json?.name === 'Ada', `${ada.status} ${ada.ms} ms`);
if (process.argv.includes('--answer')) {
  const made = await req('POST', '/classes/Answer', { readerId: ADA, readerName: 'Ada', choice: 'Count me in' });
  check('MUST 2: Ada\'s answer is saved, signed out', made.status === 201, `${made.status} ${made.ms} ms`);
}
const bad = await req('GET', '/classes/Reader/nobody-has-this-id');
check('MUST 3: a made-up id finds nobody', bad.status === 404, `${bad.status}`);
const o = await signIn('owner');
const list = await req('GET', '/classes/Answer?order=-createdAt', undefined, { 'x-parse-session-token': o.token });
const names = (list.json?.results || []).map((a) => `${a.readerName}: ${a.choice}`);
check('MUST 4: the owner signs in and reads Ada\'s answer', list.status === 200 && names.some((n) => n.startsWith('Ada')), `${list.status}, ${names.length} answer(s)`);
const x = await signIn('other');
const refused = await req('GET', '/classes/Answer', undefined, { 'x-parse-session-token': x.token });
check('MUST 5: the second account is refused the answers', x.status === 200 && refused.status === 403 && !refused.text.includes('Ada'), `${x.status} → ${refused.status}`);
const out = await req('GET', '/classes/Answer');
check('MUST 6: signed out, the answers are refused', out.status === 403, `${out.status}`);

if (process.argv.includes('--upload')) {
  const body = `Campus open day, ${new Date().toISOString()}`;
  const up = await fetch(`${base}/files/open-day.txt`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-parse-application-id': 'campus', 'x-parse-session-token': o.token },
    body
  });
  const made = await up.json().catch(() => null);
  check('MUST 8: the owner uploads a file', up.status === 201 || up.status === 200, `${up.status}`);
  if (made?.url) {
    const url = made.url.startsWith('http') ? made.url : base + made.url;
    const back = await fetch(url);
    check('MUST 8: the file opens at its link, signed out', back.status === 200 && (await back.text()) === body, `${back.status}`);
    console.log(`  file: ${new URL(url).pathname}`);
  }
  const theirs = await fetch(`${base}/files/not-mine.txt`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-parse-application-id': 'campus', 'x-parse-session-token': x.token },
    body: 'x'
  });
  check('the second account may not upload (owner-only)', theirs.status === 403, `${theirs.status}`);
}

// AC2: a file uploaded before a redeploy still opens after it (`--file <path>`, printed by an earlier `--upload`).
const fileArg = process.argv.indexOf('--file');
if (fileArg > 0) {
  const kept = await fetch(base + process.argv[fileArg + 1]);
  check('AC2: the file uploaded before the redeploy still opens', kept.status === 200 && (await kept.text()).startsWith('Campus open day'), `${kept.status}`);
}

// AC4: the families the spike's hand list sent to the page. Each must be the backend's answer, never the app's HTML.
for (const family of ['mcp', 'metrics', 'apps', 'executions']) {
  const r = await req('GET', `/${family}`, undefined, { accept: 'text/html' });
  check(`AC4: GET /${family} is the backend's`, !r.text.includes('noodl.deploy'), `${r.status} ${r.type.split(';')[0]}`);
}
const host = await req('GET', '/__nodegx/route-families');
check('the host\'s own door is not reachable from outside', host.status === 404, `${host.status}`);
process.exit(failed ? 1 : 0);
