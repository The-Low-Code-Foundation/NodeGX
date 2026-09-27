// Seed the throwaway backend so every page has rows. Idempotent enough to re-run.
const BASE = process.env.BASE || 'http://127.0.0.1:8697';
const TOKEN = process.env.TOKEN || 't0k';
async function api(method, path, body) {
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
await api('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [
  { name: 'name', type: 'String', required: true }, { name: 'age', type: 'Number' }, { name: 'isGood', type: 'Boolean' },
  { name: 'born', type: 'Date' }, { name: 'tags', type: 'Array' }, { name: 'owner', type: 'Pointer', targetClass: '_User' } ] });
await api('POST', '/admin/schema', { action: 'createTable', table: 'Toy', columns: [ { name: 'label', type: 'String' }, { name: 'price', type: 'Number' } ] });
await api('POST', '/admin/schema', { action: 'setIndexes', table: 'Pet', indexes: [{ fields: ['name'], unique: true }] });
const ann = await api('POST', '/users', { username: 'ann', email: 'ann@example.com', password: 'secret-pw-1' });
const bob = await api('POST', '/users', { username: 'bob', email: 'bob@example.com', password: 'secret-pw-2' });
const annId = (ann && (ann.objectId || (ann.user && ann.user.objectId))) || null;
await api('POST', '/admin/roles', { name: 'staff' });
await api('POST', '/admin/roles', { name: 'owners' });
if (annId) await api('POST', '/admin/roles/staff/users', { userId: annId });
await api('POST', '/api/Pet', { name: 'Milo', age: 7, isGood: true, born: { __type: 'Date', iso: '2019-03-04T09:30:00.000Z' }, tags: ['small', 'brown'], ...(annId ? { owner: { __type: 'Pointer', className: '_User', objectId: annId } } : {}) });
await api('POST', '/api/Pet', { name: 'Rex', age: 3, isGood: false, tags: ['big'] });
await api('POST', '/api/Toy', { label: 'Ball', price: 4.5 });
await api('PUT', '/admin/permissions/collections/Pet', { permissions: { find: 'public', create: 'role:staff' }, creatorOwns: true });
await api('POST', '/admin/keys', { name: 'reporting', scopes: ['classes:read'] });
const trig = await api('POST', '/admin/triggers', { type: 'schedule', name: 'nightly-cleanup', enabled: true, target: { kind: 'function', name: 'cleanup' }, schedule: { cron: '0 3 * * *', missedFirePolicy: 'skip' } });
const trigId = trig && trig.trigger && trig.trigger.id;
if (trigId) await api('POST', '/admin/triggers/' + encodeURIComponent(trigId) + '/fire', {});
await api('POST', '/admin/triggers', { type: 'webhook', name: 'incoming-order', enabled: false, target: { kind: 'function', name: 'order' }, webhook: { path: 'orders' } });
console.log('seeded. users:', annId, bob && (bob.objectId || (bob.user && bob.user.objectId)), 'trigger:', trigId);
