// HST-006 §8: boots Fixture C's backend in the Worker's Durable Object, FRESH, and gives it what the MCP gave the
// local one (fixtures/c-campus.mcp-log.jsonl): the project's rules (nodegx.security.json → security.json), the owner
// role, the two accounts in .accounts.json, the owner in the role, and the two readers with their local ids (so Ada's
// link is the same link). Then reads the rules back the way a stranger would, signed out.
//
//   node seed-campus.mjs <worker-address>        (the run key is read from .run-key)
//
// ⚠️ FRESH wipes the object's storage: every record on this Worker is gone. Say so before running it on a live app.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base.startsWith('http')) {
  console.error('usage: node seed-campus.mjs <worker-address>');
  process.exit(2);
}
const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const key = readFileSync(here('.run-key'), 'utf8').trim();
const fixture = here('../fixtures/c-campus/');
const accounts = JSON.parse(readFileSync(fixture + '.accounts.json', 'utf8'));
const security = readFileSync(fixture + 'nodegx.security.json');
const READERS = [
  { objectId: '6f468bbd-4091-48c8-90a1-9232f4753a90', name: 'Ada', email: 'ada@example.com' },
  { objectId: '5151bc1b-a0d2-4c94-92c2-971fa212dd6f', name: 'Grace', email: 'grace@example.com' }
];

async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}
const say = (what, r) => console.log(`${String(r.status).padEnd(4)} ${what}`);
const must = (what, r, ok = (s) => s < 300) => {
  say(what, r);
  if (!ok(r.status)) throw new Error(`${what}: ${r.status} ${r.text.slice(0, 400)}`);
  return r;
};

const boot = must('boot (fresh) with the project\'s rules', await call('POST', `/__hst/boot?key=${key}`, {
  name: 'campus',
  fresh: true,
  options: {},
  files: { 'security.json': security.toString('base64') }
}));
console.log(`     data dir: ${Object.keys(boot.json.files).sort().join(', ')}`);
const files = must('read the data dir', await call('GET', `/__hst/files?key=${key}`)).json.files;
const admin = { authorization: `Bearer ${JSON.parse(Buffer.from(files['secrets.json'], 'base64').toString()).adminToken}` };

must('role owner', await call('POST', '/admin/roles', { name: 'owner' }, admin));
const ids = {};
for (const [who, a] of Object.entries(accounts)) {
  ids[who] = must(`sign up ${who}`, await call('POST', '/users', { username: a.username, email: a.email, password: a.password })).json.objectId;
}
must('owner into the role', await call('POST', '/admin/roles/owner/users', { userId: ids.owner }, admin));
const shape = (collection, columns, records) =>
  JSON.stringify({ format: 'nodegx-collection', version: 1, collection, schema: { columns }, count: records.length, records });
const S = (name) => ({ name, type: 'String' });
const imp = must('import the two readers', await call('POST', '/admin/import/Reader', { format: 'json', content: shape('Reader', [S('name'), S('email')], READERS) }, admin));
console.log(`     ${JSON.stringify(imp.json)}`);
const ans = await call('POST', '/admin/import/Answer', { format: 'json', content: shape('Answer', [S('readerId'), S('readerName'), S('choice')], []) }, admin);
say('declare Answer (no rows)', ans);
console.log(`     ${ans.text.slice(0, 300)}`);

console.log('\nThe rules, read signed out:');
const h = { 'x-parse-application-id': 'campus' };
say(`get Ada by her id (public) → ${JSON.stringify((await call('GET', `/classes/Reader/${READERS[0].objectId}`, undefined, h)).json)}`, { status: '' });
for (const [what, path] of [['list the readers', '/classes/Reader'], ['list the answers', '/classes/Answer'], ['an answer by id', '/classes/Answer/x']]) {
  const r = await call('GET', path, undefined, h);
  say(`${what} → ${r.text.slice(0, 160)}`, r);
}
console.log(`\nAda's link: ${base}/home?id=${READERS[0].objectId}`);
