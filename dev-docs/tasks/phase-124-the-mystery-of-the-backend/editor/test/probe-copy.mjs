// Probe the copy backend: every tool the staff member is offered, with its arguments and words,
// and what a few read-only ones answer. Copies only.
import { freePort, stop, makeCopy, startBackend, adminClient, seedWorld } from './copies.mjs';

const c = makeCopy(undefined, 'probe');
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
const admin = adminClient(base, c.token);
const asPerson = async (userId, body) => {
  const k = await (await fetch(base + '/admin/keys', { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'view-as-probe', scopes: ['functions:*'], actsAsUserId: userId }) })).json();
  try {
    const out = [];
    for (const b of body) {
      const r = await fetch(base + '/mcp', { method: 'POST', headers: { Authorization: `Bearer ${k.secret}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify(b) });
      out.push(await r.json());
    }
    return out;
  } finally {
    await admin(`/admin/keys/${k.objectId}`, { method: 'DELETE' });
  }
};
try {
  seedWorld(c, base);
  const { users } = await admin('/admin/users?limit=200');
  for (const u of users) console.log(u.objectId.slice(0, 8), u.username, u.email, u.firstName, u.lastName, u.roles);
  const staff = users.find((u) => u.roles.includes('staff'));
  const [list] = await asPerson(staff.objectId, [{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]);
  for (const t of list.result.tools) console.log(`\n${t.name} [${(t.inputSchema.required ?? []).join(',')}] ${t.description}`);
  const marie = users.find((u) => /marie/.test(u.email ?? ''));
  const calls = process.argv.slice(2);
  const who = calls[0] === 'staff' ? staff : marie;
  const res = await asPerson(who.objectId, calls.slice(1).map((c, i) => {
    const [name, a] = c.split('=');
    return { jsonrpc: '2.0', id: i, method: 'tools/call', params: { name, arguments: a ? JSON.parse(a) : {} } };
  }));
  for (const r of res) console.log('\n==', JSON.stringify(r).slice(0, 1500));
  const conv = await admin('/api/Conversation?limit=5');
  console.log('\nConversation rows', JSON.stringify(conv).slice(0, 800));
  const one = await fetch(`${base}/api/Conversation/${conv.results[0].objectId}`, { headers: { Authorization: `Bearer ${c.token}` } });
  console.log('one row', one.status, (await one.text()).slice(0, 300));
} finally {
  await stop(be);
}
