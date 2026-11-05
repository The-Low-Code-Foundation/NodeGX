// HST-006 §8: Fixture C's MUST lines read over HTTP, the calls its page makes, against a Worker running it.
//   node check-campus.mjs <worker-address> [--answer]      --answer saves one answer for Ada first (as her page does)
// Prints one line per reading; exits 1 if any reading is not what MUST.md says. Never prints a password or a token.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || '').replace(/\/$/, '');
const answer = process.argv.includes('--answer');
const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const key = readFileSync(here('.run-key'), 'utf8').trim();
const accounts = JSON.parse(readFileSync(here('../fixtures/c-campus/.accounts.json'), 'utf8'));
const ADA = '6f468bbd-4091-48c8-90a1-9232f4753a90';
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
  return { status: r.status, token: r.json?.sessionToken };
}

const page = await req('GET', `/home?id=${ADA}`, undefined, { accept: 'text/html' });
check('Ada\'s link answers with the app', page.status === 200 && page.text.includes('noodl.deploy'), `${page.status} ${page.type} ${page.ms} ms`);
const owner = await req('GET', '/owner', undefined, { accept: 'text/html' });
check('/owner answers with the app', owner.status === 200 && owner.text.includes('noodl.deploy'), `${owner.status}`);
const engine = await req('GET', '/noodl.deploy.js');
check('the engine is the production one', engine.status === 200 && !engine.text.slice(-2000).includes('sourceMappingURL') /* the CSS loader's own code mentions one */, `${(engine.text.length / 1e6).toFixed(2)} MB`);
const cfg = await req('GET', '/nodegx-config.json');
check('the app is aimed at this Worker', cfg.json?.cloudservices?.endpoint?.startsWith('http'), cfg.json?.cloudservices?.endpoint);

const ada = await req('GET', `/classes/Reader/${ADA}`);
check('the page can read Ada by her id, signed out', ada.status === 200 && ada.json?.name === 'Ada', `${ada.status} ${ada.ms} ms`);
const bad = await req('GET', '/classes/Reader/nobody-has-this-id');
check('a made-up id finds nobody', bad.status === 404, `${bad.status}`);
if (answer) {
  const made = await req('POST', '/classes/Answer', { readerId: ADA, readerName: 'Ada', choice: 'Count me in' });
  check('Ada\'s answer is saved, signed out', made.status === 201, `${made.status} ${made.ms} ms`);
}
for (const [what, path] of [['the readers', '/classes/Reader'], ['the answers', '/classes/Answer']]) {
  const r = await req('GET', path);
  check(`signed out, listing ${what} is refused`, r.status === 403, `${r.status}`);
}

const o = await signIn('owner');
check('the owner signs in', o.status === 200 && !!o.token, `${o.status}`);
const list = await req('GET', '/classes/Answer?order=-createdAt', undefined, { 'x-parse-session-token': o.token });
const names = (list.json?.results || []).map((a) => `${a.readerName}: ${a.choice}`);
check('the owner reads the answers', list.status === 200 && names.some((n) => n.startsWith('Ada')), `${list.status}, ${names.length} answer(s): ${names.slice(0, 3).join('; ')}`);

const x = await signIn('other');
check('the second account signs in', x.status === 200 && !!x.token, `${x.status}`);
const refused = await req('GET', '/classes/Answer', undefined, { 'x-parse-session-token': x.token });
check('the second account is refused the answers', refused.status === 403 && !refused.text.includes('Ada'), `${refused.status}`);

const ledger = await req('GET', `/__hst/ledger?key=${key}`);
console.log(`restarts from storage: ${JSON.stringify(ledger.json?.restarts)}`);
process.exit(failed ? 1 : 0);
