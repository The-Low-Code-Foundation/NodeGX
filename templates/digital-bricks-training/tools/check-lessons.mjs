#!/usr/bin/env node
/**
 * EVERY FIXTURE LESSON PASSES THE PRODUCT'S OWN GATE (TASK-L181).
 *
 *   node tools/check-lessons.mjs                 every lesson in backend/fixtures/lesson.json
 *   node tools/check-lessons.mjs <file.json>     one lesson object, or an array of them
 *
 * A lesson in this template is hand-authored, not generated, and until L181 there
 * was one of it, checked once by hand against the product's validateLessonOutput.
 * With one lesson per step a learner has reached, "checked once by hand" is not
 * a gate. This compiles validate.ts FROM THE PRODUCT'S SOURCE (DBT_REPO, as
 * check-dossier does), under the Digital Bricks pack, and runs every lesson
 * through it unmodified: the palette, the answer-capsule-first rule, the step
 * index (every section claimed exactly once), hook / landing / unlocks, and the
 * one artifact_challenge on the final step.
 *
 * It also holds three things the product's gate cannot know about a FIXTURE:
 *   - one lesson per concept, and each concept is on Sam's path, reached
 *     (complete or in progress) — a lesson for a locked step is a page nobody
 *     can honestly open;
 *   - every capture field is lowerCamelCase and unique across the lessons, so
 *     two lessons never write one fact;
 *   - no section id repeats across lessons (the kit keys on them).
 *
 * An absent product FAILS rather than passing by checking nothing.
 */
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture } from './lib/fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');
const VALIDATE = join(DBT_REPO, 'src', 'lib', 'server', 'lessons', 'validate.ts');
if (!existsSync(VALIDATE)) {
  console.error(`check-lessons: the product is not at ${DBT_REPO} — set DBT_REPO. Refusing to pass by checking nothing.`);
  process.exit(1);
}

const bundled = await build({
  stdin: { contents: `export { validateLessonOutput } from ${JSON.stringify(VALIDATE)};`, resolveDir: DBT_REPO, loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  jsx: 'automatic',
  define: { 'process.env.NEXT_PUBLIC_DOMAIN_PACK': '"loom"' },
  external: ['react', 'react-dom', 'next', 'next/*'],
});
const mod = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const { validateLessonOutput } = mod;

const arg = process.argv[2];
const lessons = arg ? [].concat(JSON.parse(readFileSync(arg, 'utf8'))) : fixture('lesson');
const failures = [];

const programme = fixture('programme')[0];
const reached = new Map(
  programme.entries.filter((e) => e.kind === 'lesson').map((e) => [e.conceptId || e.anchor, e.state])
);

const seenConcepts = new Set();
const seenFields = new Map();
const seenIds = new Map();
for (const lesson of lessons) {
  const tag = lesson.conceptId || '(no conceptId)';
  try {
    validateLessonOutput(lesson);
  } catch (e) {
    const issues = e.issues ? e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') : e.message;
    failures.push(`${tag}: the product's gate refused it — ${issues}`);
  }
  if (seenConcepts.has(tag)) failures.push(`${tag}: two lessons for one concept`);
  seenConcepts.add(tag);
  const state = reached.get(tag);
  if (!arg && state !== 'done' && state !== 'now') failures.push(`${tag}: not a step Sam has reached (state ${state ?? 'not on the path'})`);
  for (const s of lesson.sections || []) {
    if (seenIds.has(s.id) && seenIds.get(s.id) !== tag) failures.push(`${tag}: section id ${s.id} is also used by ${seenIds.get(s.id)}`);
    seenIds.set(s.id, tag);
    const field = s.kind === 'capture' ? s.field : s.kind === 'activity' ? s.capturesProjectFact?.field : null;
    if (!field) continue;
    if (!/^[a-z][a-zA-Z0-9]*$/.test(field)) failures.push(`${tag}: capture field "${field}" is not lowerCamelCase`);
    if (seenFields.has(field) && seenFields.get(field) !== tag) failures.push(`${tag}: capture field "${field}" is also written by ${seenFields.get(field)}`);
    seenFields.set(field, tag);
  }
}

// And the other direction: every step Sam has REACHED has its lesson, so every
// Review / Continue the timeline row draws opens something (TASK-L181 §4).
if (!arg) {
  for (const [concept, state] of reached) {
    if ((state === 'done' || state === 'now') && !seenConcepts.has(concept)) failures.push(`${concept}: Sam has reached this step and it has no lesson — its card's control would open "not written yet"`);
  }
}

if (failures.length) {
  console.error(`check-lessons: ${failures.length} failure(s)\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-lessons: OK — ${lessons.length} lesson(s) pass the product's validateLessonOutput (Digital Bricks pack)${arg ? '' : ', one per reached step'}.`);
