#!/usr/bin/env node
// Records everything the backend map asks its server for, from a running copy of the training app's
// backend, so a public copy of the map can answer the same questions with no backend at all
// (nodegx.io/backend-map/). Every answer here is a real one: the map's own server code, run against
// the copy, as each person. Nothing is invented; the recording says when it was made.
//
//   node record.mjs --app <app folder> --backend <url> --token-file <file> --out <data dir>
//
// Recorded: the map, the people, every table's rows and the backend's dry runs for it, what each person
// (and someone not signed in) can reach, who sees how much, and every screen as every person.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { createEditor } = await import(path.join(here, '..', 'editor', 'server.mjs'));

const flag = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};
const app = flag('--app');
const backendUrl = flag('--backend');
const tokenFile = flag('--token-file');
const out = flag('--out');
if (!app || !backendUrl || !tokenFile || !out) {
  console.error('usage: node record.mjs --app <app folder> --backend <url> --token-file <file> --out <data dir>');
  process.exit(2);
}

const editor = createEditor({ project: path.resolve(app), backend: backendUrl, token: fs.readFileSync(tokenFile, 'utf8').split(/\r?\n/)[0].trim() });
await editor.views.sweep();
fs.rmSync(out, { recursive: true, force: true });
for (const d of ['rows', 'checks', 'reach', 'screen']) fs.mkdirSync(path.join(out, d), { recursive: true });
const write = (rel, data) => fs.writeFileSync(path.join(out, rel), typeof data === 'string' ? data : JSON.stringify(data));
const safe = (s) => String(s).replace(/[^A-Za-z0-9_-]+/g, '_');

const recordedAt = new Date().toISOString();
const map = await editor.buildMap();
// Where the copy ran on this laptop is nobody's business: the folder and the address go.
map.app.folder = path.basename(path.resolve(app));
map.backend = { ...map.backend, url: null, name: 'the training app’s backend', recordedAt };
map.audit = [];
write('map.json', map);

const people = await editor.views.people();
write('people.json', { people });
console.log(`map: ${map.tables.length} tables, ${map.functions.length} functions, ${people.length} people`);

for (const t of map.tables) {
  write(`rows/${safe(t.name)}.json`, { rows: await editor.rows(t.name) });
  write(`checks/${safe(t.name)}.json`, { checks: await editor.check(t.name) });
}
console.log(`rows and dry runs: ${map.tables.length} tables`);

const ndjson = async (fn) => {
  const lines = [];
  await fn((e) => lines.push(JSON.stringify(e)));
  return lines.join('\n') + '\n';
};
for (const p of [{ id: null, name: 'Someone not signed in' }, ...people]) {
  const text = await ndjson((emit) => editor.reachOf(p.id, emit));
  write(`reach/${p.id ? safe(p.id) : 'anonymous'}.ndjson`, text);
  const done = JSON.parse(text.trim().split('\n').pop());
  console.log(`reach: ${p.name}: ${done.summary?.reachedRows ?? '?'} of ${done.summary?.totalRows ?? '?'} rows`);
}
write('everyone.ndjson', await ndjson((emit) => editor.everyone(emit)));

let screens = 0;
for (const p of people) {
  for (const s of map.screens) {
    try {
      write(`screen/${safe(p.id)}__${safe(s)}.json`, await editor.views.screen(p.id, s));
    } catch (e) {
      write(`screen/${safe(p.id)}__${safe(s)}.json`, { error: e.message });
    }
    screens++;
  }
}
console.log(`screens: ${screens} (${people.length} people × ${map.screens.length} screens)`);
write('recorded.json', { recordedAt, tables: map.tables.length, people: people.length });
await editor.views.sweep();
console.log(`recorded at ${recordedAt} into ${out}`);
