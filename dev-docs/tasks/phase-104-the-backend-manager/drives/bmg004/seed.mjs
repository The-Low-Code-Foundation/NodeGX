// Seed the LOCKED (signup: nobody) throwaway backend for BMG-004: three roles, three people made
// through /admin/users (the only door on this posture), ann signed in on two devices, bob on one.
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
  return { status: res.status, json };
}
const admin = (method, path, body) => call(method, path, body, { authorization: 'Bearer ' + TOKEN });
console.log('seed →', BASE);
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
for (const name of ['editors', 'billing', 'support']) await admin('POST', '/admin/roles', { name });
console.log('  the old page\'s door, POST /users:', (await call('POST', '/users', { username: 'x', password: 'p' })).status);
const ann = await admin('POST', '/admin/users', { username: 'ann', email: 'ann@example.com', password: 'secret-pw-1', roles: ['editors'] });
const bob = await admin('POST', '/admin/users', { username: 'bob', email: 'bob@example.com', password: 'secret-pw-2', roles: ['editors', 'billing'], emailVerified: true });
const cat = await admin('POST', '/admin/users', { username: 'cat', email: 'cat@example.org', password: 'secret-pw-3' });
for (let i = 0; i < 2; i++) await call('POST', '/login', { username: 'ann', password: 'secret-pw-1' });
await call('POST', '/login', { username: 'bob', password: 'secret-pw-2' });
console.log('seeded. ann:', ann.json && ann.json.objectId, 'bob:', bob.json && bob.json.objectId, 'cat:', cat.json && cat.json.objectId);
