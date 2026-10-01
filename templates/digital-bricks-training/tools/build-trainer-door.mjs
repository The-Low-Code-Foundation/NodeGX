#!/usr/bin/env node
/**
 * WRITE THE GENERATED HALF OF THE TRAINER'S TOOLS (TASK-L189 §1).
 *
 *   node tools/build-trainer-door.mjs           write every block
 *   node tools/build-trainer-door.mjs --check   write nothing; exit 1 if any block is stale
 *
 * Four blocks, each between `/* NAME:begin … *\/` and `/* NAME:end *\/` markers
 * in a cloud function's script, each from ONE source:
 *
 *   TRAINER_DOOR_LIB  tools/lib/trainer-door.lib.js, verbatim — the rules the
 *                     seven functions share (their path, field clashes, the
 *                     copy-leak rule). In every function that carries the marker.
 *   LESSON_GATE       the PRODUCT's validateLessonOutput, compiled from its
 *                     source (DBT_REPO, under the Digital Bricks pack, as
 *                     check-lessons does) to a minified IIFE. Not a port: the
 *                     gate a trainer's lesson passes is the gate the product's
 *                     own generator was held to.
 *   AUTHORING_GUIDE   a header written for the trainer's tools, then the
 *                     product's PROJECTION_SYSTEM_PROMPT and widget catalogue,
 *                     VERBATIM — a paraphrase is how a contract drifts.
 *   CONCEPT_BODIES    the pack corpus's title, capsule, canonical body and
 *                     prerequisites, per concept.
 *
 * A cloud function never reaches a browser (deployToFolder drops every
 * /#__cloud__/ component), so the size is the backend's, not a learner's page.
 * The output is still refused if it holds `</script` (D75), because the dev
 * renderer inlines the whole project into a page.
 *
 * An absent product FAILS rather than writing empty blocks.
 */
import { build } from 'esbuild';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const CLOUD = join(TEMPLATE, 'components', '__cloud__');
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');
const CHECK = process.argv.includes('--check');
const SRC = (...p) => join(DBT_REPO, 'src', 'lib', ...p);
if (!existsSync(SRC('server', 'lessons', 'validate.ts'))) {
  console.error(`build-trainer-door: the product is not at ${DBT_REPO} — set DBT_REPO. Refusing to write empty blocks.`);
  process.exit(1);
}

const PACK = { 'process.env.NEXT_PUBLIC_DOMAIN_PACK': '"loom"' };
const STUB_NAMES = ['db', 'learnerProfiles', 'makeLessonRepository', 'makeCreditLedger', 'makeModelClient', 'getOrGenerateLesson', 'eq'];
/* projection.ts imports the database, the ledger and the model client. Only two
   STRINGS are read from it here, so those modules are stubbed rather than bundled. */
const stubServer = {
  name: 'stub-server',
  setup(b) {
    const stubbed = /(\/server\/db(\/schema)?$|\/server\/lessons\/(repository|ledger|service)$|\/anthropic-client$|^drizzle-orm$|^server-only$)/;
    b.onResolve({ filter: /.*/ }, (a) => (stubbed.test(a.path) ? { path: a.path, namespace: 'stub' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: STUB_NAMES.map((n) => `export const ${n} = {};`).join('\n'),
      loader: 'js'
    }));
  }
};
const esm = async (contents, plugins = []) => {
  const r = await build({
    stdin: { contents, resolveDir: DBT_REPO, loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent', jsx: 'automatic',
    define: PACK, external: ['react', 'react-dom', 'next', 'next/*'], plugins
  });
  return import(`data:text/javascript;base64,${Buffer.from(r.outputFiles[0].text).toString('base64')}`);
};

// ── LESSON_GATE ──────────────────────────────────────────────────────────────
const gate = await build({
  stdin: { contents: `export { validateLessonOutput } from ${JSON.stringify(SRC('server', 'lessons', 'validate.ts'))};`, resolveDir: DBT_REPO, loader: 'ts' },
  bundle: true, write: false, format: 'iife', globalName: 'LessonGate', platform: 'neutral', minify: true,
  logLevel: 'silent', define: PACK, external: ['react', 'react-dom', 'next', 'next/*'], legalComments: 'none'
});
const GATE = gate.outputFiles[0].text.trim();

// ── AUTHORING_GUIDE ──────────────────────────────────────────────────────────
const projection = await esm(
  `export { PROJECTION_SYSTEM_PROMPT, widgetCatalogueForPrompt } from ${JSON.stringify(SRC('ai', 'projection.ts'))};`,
  [stubServer]
);
const HEADER = `HOW LESSONS ARE WRITTEN IN THIS COURSE — FOR THE TRAINER'S CLAUDE

You are helping a trainer write lessons. The trainer is the course designer: they decide which
concepts each learner meets, in what order, and why. You write lessons inside that design when they
ask you to. You do not change anybody's path unless the trainer asks you to.

Every lesson is written for ONE learner, about THEIR project, in their words. A lesson written for
one learner can be copied to another learner with similar needs as the basis of theirs, and then it
must be rewritten for the second learner's project before it is published.

THE TOOLS, IN THE ORDER YOU WILL USE THEM

1. learnersForLessons — every learner, their path, and which steps have a published lesson, a
   draft, or nothing yet.
2. lessonContext(learnerId, conceptId) — what the lesson is written against: their project, its
   problem statement, every answer they have saved, the step on their path, the concept's teaching
   body (the generic version a lesson projects onto their project), the capture fields their other
   lessons already use, and which other learners have a published lesson on it.
3. saveLessonDraft(learnerId, conceptId, lesson, version?) — saves a DRAFT. Nobody but the trainer
   sees a draft. It answers a previewPath: tell the trainer to open it on their course site to see
   the lesson exactly as the learner will. To replace an existing draft, send the version you read.
4. readLesson(learnerId, conceptId, which?) — a draft or the published lesson, in full.
5. publishLesson(learnerId, conceptId) — ONLY when the trainer tells you to. The learner sees it
   the next time they open that step (or when it opens, if it is still locked).
6. copyLesson(fromLearnerId, toLearnerId, conceptId, replaceDraft?) — copies a PUBLISHED lesson as
   the other learner's draft. It never publishes. It lists every place that still mentions the first
   learner's project; publishLesson refuses the copy until none is left.
7. conceptList and setLearnerPath — the trainer's own path tools. Use them only when asked.

EVERYTHING YOU SEND IS CHECKED

A lesson is checked by the same gate the course's own lesson generator was held to, on every save,
publish and copy. A refusal says exactly what to fix. Nothing is half-saved: fix what it names and
send it again. A refusal is part of the work, not a failure.

THINGS TO KNOW

- The \`lesson\` argument is one object: { title, hook, landing, sections, steps }. That object is
  what the brief below calls "the output". There is no tool call inside it and no prose outside it.
- "Project Context" in the brief below is lessonContext's \`project\`: its name, problem
  statement and saved answers. The concept body is lessonContext's \`concept.canonicalBody\`.
- This course does not hold a learner's techComfort, preferred modalities, computer (the
  "environment" block) or language. Treat techComfort as "none" unless the trainer tells you
  otherwise; choose section types for the content; write as rule 11 says to when there is no
  environment block; and write in English unless the trainer says otherwise.
- Capture fields are lowerCamelCase, and never one another of their lessons already asks for
  (lessonContext lists them). Two lessons saving one answer would overwrite it.
- When you rewrite a lesson, keep the ids of the sections you keep.
- You are given a learner's project, saved answers, path and lessons, and the name their coach knows
  them by. You are deliberately not given their email address, their messages to their coach, or
  their coach's notes, sessions or reviews. Do not ask for them, and never put one learner's details
  in another learner's lesson.

THE LESSON CONTRACT — the brief the course's own lesson generator was given, verbatim:
`;
/* THE EXACT SHAPE. The product's generator was handed lessonOutputSchema as
   its tool's input schema; an MCP function tool here can only declare `lesson`
   as an object (CWF-014 types a parameter, not its contents). Measured on the
   first real Claude session: three refusals, each teaching one field the schema
   would have stated. So the same zod object goes into the guide as JSON Schema,
   converted by the same library the product's AI SDK uses — the shape, not a
   description of it. */
const { readdirSync: ls } = await import('node:fs');
const pnpm = join(DBT_REPO, 'node_modules', '.pnpm');
const z2j = ls(pnpm).find((d) => d.startsWith('zod-to-json-schema@'));
if (!z2j) {
  console.error('build-trainer-door: zod-to-json-schema is not in the product\'s node_modules — run pnpm install there.');
  process.exit(1);
}
const shape = await esm(
  `import { zodToJsonSchema } from ${JSON.stringify(join(pnpm, z2j, 'node_modules', 'zod-to-json-schema', 'dist', 'esm', 'index.js'))};
   import { lessonOutputSchema } from ${JSON.stringify(SRC('ai', 'schemas.ts'))};
   export const SHAPE = zodToJsonSchema(lessonOutputSchema, { $refStrategy: 'none' });`
);
const SHAPE_TEXT = JSON.stringify(shape.SHAPE);
const GUIDE_TEXT = `${HEADER}\n${projection.PROJECTION_SYSTEM_PROMPT}\n\n${projection.widgetCatalogueForPrompt()}\n\n` +
  `THE EXACT SHAPE OF THE \`lesson\` ARGUMENT — JSON Schema, generated from the course's own lesson schema. ` +
  `Every section must match one member of \`sections.items.anyOf\` exactly; the check below it enforces the rest (the step index, the answer capsule first, one artifact_challenge on the final step):\n${SHAPE_TEXT}\n`;
const GUIDE = `const AUTHORING_GUIDE = ${JSON.stringify(GUIDE_TEXT)};`;

// ── CONCEPT_BODIES ───────────────────────────────────────────────────────────
const corpus = await esm(`export { allConcepts } from ${JSON.stringify(SRC('domain', 'loom', 'concepts', 'index.ts'))};`);
const bodies = {};
for (const c of corpus.allConcepts) {
  bodies[c.id] = { title: c.title, capsule: c.capsule, canonicalBody: c.canonicalBody, prerequisites: c.prerequisites || [] };
}
const BODIES = `const CONCEPT_BODIES = ${JSON.stringify(bodies)};`;

// ── TRAINER_DOOR_LIB ─────────────────────────────────────────────────────────
const LIB = readFileSync(join(here, 'lib', 'trainer-door.lib.js'), 'utf8').trim();

export const BLOCKS = { TRAINER_DOOR_LIB: LIB, LESSON_GATE: GATE, AUTHORING_GUIDE: GUIDE, CONCEPT_BODIES: BODIES };
for (const [name, text] of Object.entries(BLOCKS)) {
  if (/<\/script/i.test(text)) {
    console.error(`build-trainer-door: ${name} contains "</script" — it would break every dev-rendered page (D75).`);
    process.exit(1);
  }
}

// ── Write ────────────────────────────────────────────────────────────────────
const marker = (name) => new RegExp(`(/\\* ${name}:begin[^*]*\\*/\\n)([\\s\\S]*?)(/\\* ${name}:end \\*/)`);
let stale = 0;
const placed = {};
for (const fn of readdirSync(CLOUD)) {
  const file = join(CLOUD, fn, 'nodes.json');
  if (!existsSync(file)) continue;
  const raw = readFileSync(file, 'utf8');
  const doc = JSON.parse(raw);
  let changed = false;
  for (const node of doc.nodes) {
    let s = node.parameters && node.parameters.functionScript;
    if (typeof s !== 'string') continue;
    for (const [name, text] of Object.entries(BLOCKS)) {
      const m = s.match(marker(name));
      if (!m) continue;
      (placed[name] = placed[name] || []).push(fn);
      if (m[2] === `${text}\n`) continue;
      s = s.replace(marker(name), (_, a, __, c) => `${a}${text}\n${c}`);
      changed = true;
    }
    node.parameters.functionScript = s;
  }
  if (!changed) continue;
  stale++;
  if (CHECK) console.error(`build-trainer-door: ${fn} carries a stale block`);
  else writeFileSync(file, JSON.stringify(doc, null, 2));
}
for (const [name, fns] of Object.entries(placed)) console.log(`${name.padEnd(17)} → ${fns.sort().join(', ')}`);
console.log(`gate ${GATE.length} bytes · guide ${GUIDE_TEXT.length} chars · ${Object.keys(bodies).length} concept bodies`);
if (CHECK && stale) process.exit(1);
console.log(CHECK ? 'build-trainer-door: every block is current.' : `build-trainer-door: ${stale} function(s) written.`);
