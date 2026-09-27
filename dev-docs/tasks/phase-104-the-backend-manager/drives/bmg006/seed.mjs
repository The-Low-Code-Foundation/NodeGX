// Seed the LOCKED throwaway backend for BMG-006: Pet and Order, ann and bob (no roles yet), roles editors and
// billing, and one Pet ("Rex") created BY bob so creator-owns gives it a private ACL — the record Try-as tests against.
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
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Order', columns: [{ name: 'total', type: 'Number' }] });
for (const [username, email] of [['bob', 'bob@example.com'], ['ann', 'ann@example.com']]) {
  await admin('POST', '/admin/users', { username, email, password: 'secret-pw-' + username });
}
await admin('POST', '/admin/roles', { name: 'editors', description: 'People who change the catalogue' });
await admin('POST', '/admin/roles', { name: 'billing' });
// bob signs in and creates Rex: creator-owns stamps his private ACL on it. Pet.create is role:editors, so bob
// joins editors for the one write, then leaves.
const bobId = (await admin('GET', '/admin/users?q=bob')).users[0].objectId;
await admin('POST', '/admin/roles/editors/users', { userId: bobId });
const session = await call('POST', '/login', { username: 'bob', password: 'secret-pw-bob' });
const rex = await call('POST', '/classes/Pet', { name: 'Rex' }, { 'x-parse-session-token': session.sessionToken });
console.log('Rex', rex && rex.objectId, 'ACL', JSON.stringify((await admin('GET', '/classes/Pet/' + rex.objectId)).ACL));
await admin('DELETE', '/admin/roles/editors/users/' + bobId);
console.log('seeded.');
