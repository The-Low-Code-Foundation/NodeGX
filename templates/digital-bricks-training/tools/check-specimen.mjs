#!/usr/bin/env node
/**
 * THE SPECIMEN IS THE LESSON FIXTURE, BYTE FOR BYTE (TASK-L171 decision 9).
 *
 * Pages/Palette draws every section kind once from `Data/Specimen lesson`, a
 * Static Data node, because a kit's showcase must not depend on who is signed
 * in. That makes it the one copy of lesson data left in the graph, beside the
 * copy in backend/fixtures/lesson.json the seed is built from. Two copies drift
 * unless something says they may not; this is that.
 *
 * Byte for byte, not parsed-equal: a reformatted copy is a copy somebody edited.
 *
 * Run: node tools/check-specimen.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureText } from './lib/fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const nodes = JSON.parse(readFileSync(join(here, '..', 'components', 'Data', 'Specimen lesson', 'nodes.json'), 'utf8')).nodes;
const data = nodes.filter((n) => n.type === 'Static Data');
const fail = (m) => {
  console.error(`check-specimen: FAILED — ${m}`);
  process.exit(1);
};
if (data.length !== 1) fail(`Data/Specimen lesson holds ${data.length} Static Data nodes, expected exactly 1`);
const specimen = data[0].parameters.json;
const fixture = fixtureText('lesson');
if (specimen !== fixture) {
  let i = 0;
  while (i < specimen.length && specimen[i] === fixture[i]) i++;
  fail(`the specimen and backend/fixtures/lesson.json differ from byte ${i}: …${JSON.stringify(specimen.slice(i, i + 60))} vs …${JSON.stringify(fixture.slice(i, i + 60))}`);
}
// And nothing that renders a LEARNER's lesson may read the specimen.
const pages = ['Pages/Lesson', 'Pages/Course'];
for (const p of pages) {
  const n = JSON.parse(readFileSync(join(here, '..', 'components', ...p.split('/'), 'nodes.json'), 'utf8')).nodes;
  if (n.some((x) => x.type === '/Data/Specimen lesson')) fail(`${p} places Data/Specimen lesson — a learner's page reads Data/Lesson, never the specimen`);
}
console.log(`check-specimen: OK — the specimen equals backend/fixtures/lesson.json (${fixture.length} bytes), and no learner page places it.`);
