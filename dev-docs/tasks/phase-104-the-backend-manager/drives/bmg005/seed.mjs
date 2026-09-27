// Seed the LOCKED throwaway backend for BMG-005: Pet and Order to name, five people (only ann's name contains "an"),
// an `editors` role nobody is in yet, sign-in links on, and mail to the local sink.
const BASE = process.env.BASE || 'http://127.0.0.1:8697';
const TOKEN = process.env.TOKEN || 't0k';
const SMTP_PORT = Number(process.env.SMTP_PORT || 2526);
async function admin(method, path, body) {
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
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
await admin('POST', '/admin/schema', { action: 'createTable', table: 'Order', columns: [{ name: 'total', type: 'Number' }] });
// Oldest first: the list is newest-first, so ann is made LAST and is the first row an "an" search answers anyway.
for (const [username, email] of [['eve', 'eve@example.com'], ['dave', 'dave@example.com'], ['cat', 'cat@example.com'], ['bob', 'bob@example.com'], ['ann', 'ann@example.com']]) {
  await admin('POST', '/admin/users', { username, email, password: 'secret-pw-' + username });
}
await admin('POST', '/admin/roles', { name: 'editors', description: 'People who change the catalogue' });
await admin('POST', '/admin/roles', { name: 'billing' });
await admin('PUT', '/admin/email/config', { baseUrl: BASE, enabled: true, smtp: { host: '127.0.0.1', port: SMTP_PORT, secure: false }, fromAddress: 'noreply@drive.test' });
await admin('PUT', '/admin/auth', { magicLink: { enabled: true, ttlMinutes: 15, allowSignup: false } });
console.log('seeded.');
