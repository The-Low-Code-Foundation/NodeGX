// Plays each person's day in the terminal (a check while building; it changes no data).
import fs from 'node:fs';
import { backend, openProject } from '@nodegx/backend-kit';
import { makeWorld, listPeople, playDay, handedSteps } from '../lib/day.mjs';

const [, , appDir, url, tokenFile, only] = process.argv;
const be = backend(url, fs.readFileSync(tokenFile, 'utf8').trim());
const project = openProject(appDir);
const world = makeWorld(be);
for (const p of await listPeople(world)) {
  if (only && !p.email.includes(only)) continue;
  const day = await playDay({ be, project, world, personId: p.id });
  console.log(`\n=== ${day.person.name} (${day.person.groups}) may call: ${day.tools.join(', ')}`);
  for (const pg of day.pages) {
    console.log(`${pg.n}. ${pg.title} ${pg.url}  ← ${pg.arrivedBy}${pg.signedIn ? '' : ' [not signed in]'}`);
    for (const t of pg.touches) console.log(`     ${t.kind} ${t.fn ?? t.table}${t.inside ? ' (in ' + t.inside + ')' : ''} on ${t.why}: ${t.status} ${t.why && t.status !== 'ran' && t.status !== 'read' ? '' : ''}${t.items?.length ? '→ ' + t.items.map((i) => i.table + ':' + i.label).join(', ') : ''}${t.value !== undefined ? ' answer=' + JSON.stringify(t.value) : ''}${t.status !== 'ran' && t.status !== 'read' ? ' — ' + (t.why ?? '') : ''}${t.filter ? ' filter: ' + t.filter : ''}`);
    for (const s of pg.sentOn) console.log(`     → sent on to ${s.title} by ${s.by}`);
    for (const o of pg.offers) console.log(`     (could) ${o.how} — ${o.touches}; allowed: ${o.allowed}`);
    for (const n of pg.notes) console.log(`     note: ${n}`);
  }
  console.log('handed:', JSON.stringify(handedSteps(day)));
}
