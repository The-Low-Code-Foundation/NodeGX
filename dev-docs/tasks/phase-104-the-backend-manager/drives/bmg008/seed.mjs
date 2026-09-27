// Seed the LOCKED throwaway backend for BMG-008: a Pet collection to watch (AC5). The function and the workflow
// definition are files run.sh puts in the data dir before the backend starts.
const BASE = process.env.BASE || 'http://127.0.0.1:8697';
const TOKEN = process.env.TOKEN || 't0k';
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
const fns = await admin('GET', '/admin/permissions/functions');
console.log('functions:', (fns && fns.functions || []).map((f) => f.name + (f.deployed ? '' : ' (not deployed)')).join(', ') || 'none');
const wfs = await admin('GET', '/admin/workflow-defs');
console.log('workflows:', (wfs && wfs.workflows || []).map((w) => w.name || w.id).join(', ') || 'none');
console.log('seeded.');
