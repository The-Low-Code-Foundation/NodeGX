// Read-only look at the backend and the app (used while building; changes nothing).
import fs from 'node:fs';
import { backend, openProject, readFacts } from '@nodegx/backend-kit';

const [, , appDir, url, tokenFile] = process.argv;
const be = backend(url, fs.readFileSync(tokenFile, 'utf8').trim());
const project = openProject(appDir);
const f = await readFacts({ be, project });
const out = {
  backend: f.backend,
  problems: f.problems,
  tables: f.tables.map((t) => ({ name: t.name, rows: t.rows, cols: t.columns.map((c) => c.name + ':' + c.type + (c.targetClass ? '->' + c.targetClass : '')).join(' '), keys: t.keys, people: t.people, notOnBackend: t.notOnBackend })),
  functions: f.functions.map((x) => ({ name: x.name, asks: x.asks, touches: x.touches, call: x.call, deployed: x.deployed, steps: x.steps })),
  screens: f.screens,
  calls: f.calls.map((c) => `${c.screen} ${c.inside ?? ''} -> ${c.fn} on ${c.trigger.words}`),
  uses: f.uses.map((u) => `${u.screen} ${u.inside ?? ''} ${u.how} ${u.table} on ${u.trigger.words}`),
  config: f.config,
  roles: f.roles,
  people: f.people,
  triggers: f.triggers
};
console.log(JSON.stringify(out, null, 1));
