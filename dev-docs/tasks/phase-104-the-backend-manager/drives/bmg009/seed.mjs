// Seed the LOCKED throwaway backend for BMG-009: runs to find. A schedule trigger on the deployed function `hello`,
// fired once (a function run that names its trigger); Nightly digest run twice (two error runs); Ping once (success).
// The definitions and the function are files run.sh puts in the data dir before the backend starts.
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
const wfs = await admin('GET', '/admin/workflow-defs');
console.log('workflows:', (wfs && wfs.workflows || []).map((w) => w.name || w.id).join(', ') || 'none');
const trg = await admin('POST', '/admin/triggers', { name: 'Nightly hello', type: 'schedule', target: { kind: 'function', name: 'hello' }, schedule: { cron: '0 3 * * *', overlapPolicy: 'queue-one' }, enabled: true });
const triggerId = trg && trg.trigger && trg.trigger.id;
console.log('trigger:', triggerId);
if (triggerId) await admin('POST', '/admin/triggers/' + triggerId + '/fire', {});
for (let i = 0; i < 2; i++) await admin('POST', '/admin/workflow-defs/digest/run', { payload: { night: i } });
await admin('POST', '/admin/workflow-defs/ping/run', { payload: {} });
const runs = await admin('GET', '/executions?limit=20');
console.log('runs:', (runs || []).map((r) => r.workflowName + ':' + r.status + ':' + r.kind).join(', '));
console.log('seeded.');
