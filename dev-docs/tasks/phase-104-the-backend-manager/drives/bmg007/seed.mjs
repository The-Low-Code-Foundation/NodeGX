// Seed the LOCKED throwaway backend for BMG-007: two collections, ann and bob, a Pet each (creator-owns),
// one key made the old way (classes:read) so the list has a row to Edit, and a schedule trigger.
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
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [
  { name: 'name', type: 'String', required: true }, { name: 'age', type: 'Number' }, { name: 'isGood', type: 'Boolean' } ] });
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Toy', columns: [ { name: 'label', type: 'String' }, { name: 'price', type: 'Number' } ] });
const ann = await call('POST', '/users', { username: 'ann', email: 'ann@example.com', password: 'secret-pw-1' });
const bob = await call('POST', '/users', { username: 'bob', email: 'bob@example.com', password: 'secret-pw-2' });
const idOf = (u) => (u && (u.objectId || (u.user && u.user.objectId))) || null;
const tokenOf = (u) => (u && (u.sessionToken || (u.user && u.user.sessionToken))) || null;
async function asUser(u, name, body) {
  let token = tokenOf(u);
  if (!token) { const login = await call('POST', '/login', { username: name, password: name === 'ann' ? 'secret-pw-1' : 'secret-pw-2' }); token = tokenOf(login); }
  return call('POST', '/api/Pet', body, { 'x-parse-session-token': token });
}
await asUser(ann, 'ann', { name: 'Milo', age: 7, isGood: true });
await asUser(bob, 'bob', { name: 'Rex', age: 3, isGood: false });
await admin('POST', '/api/Toy', { label: 'Ball', price: 4.5 });
await admin('POST', '/admin/keys', { name: 'reporting', scopes: ['classes:read'] });
await admin('POST', '/admin/triggers', { type: 'schedule', name: 'nightly-cleanup', enabled: true, target: { kind: 'function', name: 'cleanup' }, schedule: { cron: '0 3 * * *', missedFirePolicy: 'skip' } });
console.log('seeded. ann:', idOf(ann), 'bob:', idOf(bob));
