// The three person questions through the editor's own server, on a copy with the app's whole world.
// Prints a short summary of each answer. Copies only.
import { createEditor, serve } from '../server.mjs';
import { freePort, stop, makeCopy, startBackend, seedWorld } from './copies.mjs';

const c = makeCopy(undefined, 'views');
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
try {
  seedWorld(c, base);
  const editor = createEditor({ project: c.copy, backend: base, token: c.token });
  const server = await serve(editor, 0);
  const ed = `http://127.0.0.1:${server.address().port}`;
  const post = (p, b) => fetch(ed + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
  const { people } = await (await fetch(ed + '/api/people')).json();
  console.log(people.map((p) => `${p.name} ${p.roles} ${p.learnerId}`).join(' | '));
  const marie = people.find((p) => /Marie/.test(p.name));
  const r = await post('/api/as/reach', { person: marie.id });
  console.log('reach tools', r.tools?.map((t) => t.name).join(','), 'direct any', Object.values(r.direct ?? {}).some((d) => d.find.allowed), r.error ?? '');
  const s = await post('/api/as/screen', { person: marie.id, screen: 'Pages/Course' });
  if (s.error) console.log('screen error', s.error);
  for (const call of s.calls ?? []) console.log(' ', call.fn, call.status, call.why ?? '', call.value ? JSON.stringify(call.value).slice(0, 120) : '');
  const sl = await post('/api/as/screen', { person: marie.id, screen: 'Pages/Lesson' });
  for (const call of [...(sl.extra ?? []), ...(sl.calls ?? [])]) console.log(' L', call.fn, call.status, call.why ?? '', JSON.stringify(call.args ?? {}), call.value ? JSON.stringify(call.value).slice(0, 100) : '');
  const { rows } = await (await fetch(ed + '/api/rows?table=Conversation')).json();
  console.log('rows', rows);
  const t0 = Date.now();
  const rr = await post('/api/record-reach', { table: 'Conversation', objectId: rows.find((x) => x.key === 'conv-l-marie').objectId });
  if (rr.error) console.log('reach error', rr.error);
  console.log('record reach in', Date.now() - t0, 'ms; candidates', rr.candidates);
  for (const p of rr.people ?? []) console.log('  ', p.person.name.padEnd(18), p.reaches ? 'REACHES via ' + p.via.join(',') : 'no', '|', p.results.map((x) => `${x.fn}:${x.status}${x.found ? '!' : ''}`).join(' '));
  const runs = await (await fetch(ed + '/api/runs')).json();
  console.log('runs', runs.total, 'by map', runs.runs.filter((x) => x.byMap).length, runs.runs[0]);
  const keys = await (await fetch(base + '/admin/keys', { headers: { Authorization: `Bearer ${c.token}` } })).json();
  console.log('keys left', keys.keys?.length);
  server.close();
} finally {
  await stop(be);
}
