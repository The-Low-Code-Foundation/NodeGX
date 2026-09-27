// Seed the LOCKED throwaway backend for BMG-002: Person and Tag to point at, a Task collection with
// every column type, twelve Tasks that split every filter, two people and an `editors` role.
const BASE = process.env.BASE || 'http://127.0.0.1:8697';
const TOKEN = process.env.TOKEN || 't0k';
async function call(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...headers, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (res.status >= 400) console.log('  !', method, path, res.status, (json && (json.error || json.message)) || text.slice(0, 120));
  return json;
}
const admin = (method, path, body) => call(method, path, body, { authorization: 'Bearer ' + TOKEN });
console.log('seed →', BASE);
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Person', columns: [{ name: 'name', type: 'String' }, { name: 'email', type: 'String' }] });
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Tag', columns: [{ name: 'label', type: 'String' }] });
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Task', columns: [
  { name: 'title', type: 'String' },
  { name: 'n', type: 'Number' },
  { name: 'done', type: 'Boolean' },
  { name: 'due', type: 'Date' },
  { name: 'owner', type: 'Pointer', targetClass: 'Person' },
  { name: 'tags', type: 'Array' },
  { name: 'meta', type: 'Object' },
  { name: 'at', type: 'GeoPoint' },
  { name: 'doc', type: 'File' },
  { name: 'labels', type: 'Relation', targetClass: 'Tag' }
] });
const people = [];
for (const [name, email] of [['Ann Archer', 'ann@example.com'], ['Bob Baker', 'bob@example.com']]) people.push((await admin('POST', '/api/Person', { name, email })).objectId);
for (const label of ['urgent', 'home', 'work']) await admin('POST', '/api/Tag', { label });
const now = new Date();
const day = (o) => ({ __type: 'Date', iso: new Date(now.getFullYear(), now.getMonth(), now.getDate() + o, 12).toISOString() });
const ptr = (i) => ({ __type: 'Pointer', className: 'Person', objectId: people[i] });
const tasks = [
  { title: 'open the shop', n: 1, done: false, due: day(0), owner: ptr(0), tags: ['red'] },
  { title: 'open a bank account', n: 3, done: true, due: day(-2), owner: ptr(1), tags: ['blue', 'red'] },
  { title: 'call the plumber', n: 5, done: false, due: day(-5), owner: ptr(0) },
  { title: 'buy paint', n: 7, done: true, due: day(-9), tags: ['redwood'] },
  { title: 'reopen ticket', n: 9, due: day(-20), owner: ptr(1) },
  { title: 'file taxes', n: 2, done: false, due: day(-40) },
  { title: 'Open day', n: 4, done: true, due: day(3), owner: ptr(0) },
  { title: 'walk dog', n: 6 },
  { title: 'write report', n: 8, done: false, due: day(-1), owner: ptr(1), tags: [] },
  { title: 'plan trip', n: 10, done: true, due: day(-3) },
  { title: 'fix bike', done: false, due: day(-6) },
  { title: '', n: 0, due: day(-8) }
];
for (const t of tasks) await admin('POST', '/api/Task', t);
for (const [username, email] of [['ann', 'ann@example.com'], ['bob', 'bob@example.com']]) await admin('POST', '/admin/users', { username, email, password: 'secret-pw-' + username });
await admin('POST', '/admin/roles', { name: 'editors' });
console.log('seeded. people:', people.join(', '));
