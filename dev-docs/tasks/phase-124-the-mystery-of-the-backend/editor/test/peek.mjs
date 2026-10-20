// Prints what the map reads from a project folder, in short. Read-only.
import fs from 'node:fs';
import { openProject, analyseProject } from '../lib/project.mjs';

const dir = process.argv[2] ?? '../training';
const schema = JSON.parse(fs.readFileSync(`${dir}/backend/schema.json`, 'utf8'));
const names = (schema.tables ?? schema.classes ?? Object.keys(schema)).map((t) => (typeof t === 'string' ? t : t.name ?? t.className));
const a = analyseProject(openProject(dir), names);
for (const f of a.functions) console.log(f.name.padEnd(20), f.touches.map((t) => `${t.table}:${t.hows.join('/')}${t.via.length ? '(' + t.via.join(',') + ')' : ''}`).join('  '));
console.log('helpers', a.helpers.map((h) => h.name + '→' + h.touches.map((t) => t.table + ':' + t.hows).join(',')).join(' | '));
console.log('screens', a.screens.join(', '));
for (const c of a.calls) console.log('  ', c.screen, c.inside ?? '', '→', c.fn, '·', c.trigger.words);
