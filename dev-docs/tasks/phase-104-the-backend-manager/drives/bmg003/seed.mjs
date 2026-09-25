// Seed the LOCKED throwaway backend for BMG-003: Owner and Tag (link targets), Empty (no records: AC5's disabled
// default), and Pet with two records (AC5's "needs a default here", AC4's counts).
const BASE = process.env.BASE || 'http://127.0.0.1:8697';
const TOKEN = process.env.TOKEN || 't0k';
async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { authorization: 'Bearer ' + TOKEN, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (res.status >= 400) console.log('  !', method, path, res.status, (json && (json.error || json.message)) || text.slice(0, 120));
  return json;
}
console.log('seed →', BASE);
await call('POST', '/admin/schema', { action: 'createTable', table: 'Owner', columns: [{ name: 'name', type: 'String' }] });
await call('POST', '/admin/schema', { action: 'createTable', table: 'Tag', columns: [{ name: 'label', type: 'String' }] });
await call('POST', '/admin/schema', { action: 'createTable', table: 'Empty', columns: [{ name: 'note', type: 'String' }] });
await call('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
await call('POST', '/api/Owner', { name: 'Ann' });
await call('POST', '/api/Pet', { name: 'Rex' });
await call('POST', '/api/Pet', { name: 'Tom' });
console.log('seeded.');
