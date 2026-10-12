#!/usr/bin/env node
/**
 * THE TRAINER'S TOOLS, OFFLINE, AGAINST A FAKE AS STRICT AS THE BACKEND (TASK-L189).
 *
 * Runs the seven functions' OWN scripts — the generated gate, guide, corpus and
 * shared rules included — against the seed, and holds the task's criteria:
 *
 *   1. every generated block is what tools/build-trainer-door.mjs writes now;
 *   2. the wiring: role:staff, receive → run, no input runs on change;
 *   3. Sam's six lessons save; a broken lesson is refused naming the field; a
 *      capture field another of his lessons asks for is refused naming it;
 *   4. A DRAFT REACHES NO LEARNER: the learner's own `lesson` read answers the
 *      same bytes after a save, and the new lesson only after publishLesson;
 *   5. compare-and-swap on a draft, with a CONTROL: ifMatch cut out, the race
 *      loses a draft and both callers are told it worked;
 *   6. a copy lands as a DRAFT naming the source's project, publish refuses it,
 *      adapted it publishes — with a CONTROL: the leak check cut out, the
 *      unadapted copy publishes;
 *   7. deleting the source deletes the unadapted copy and nothing else of the
 *      other learner's; the source's export holds their drafts and not the copy;
 *   8. nothing the door returns carries an email address, a message, a note, a
 *      session or a review — with a CONTROL that the scan sees one when it is there;
 *   9. no function a learner can call writes Lesson or LessonDraft.
 *
 * A control that does NOT fail is reported as a failure: a check that cannot
 * see the thing it guards is not a check.
 *
 * Run: node tools/check-trainer-door.mjs
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWorld, makeRecords, run, quiet, oid } from './lib/fake-records.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const json = (p) => JSON.parse(readFileSync(join(TEMPLATE, p), 'utf8'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const md5 = (x) => createHash('md5').update(JSON.stringify(x)).digest('hex');

const DOOR = ['authoringGuide', 'learnersForLessons', 'lessonContext', 'saveLessonDraft', 'readLesson', 'publishLesson', 'copyLesson'];
const cloud = (name) => ({ nodes: json(`components/__cloud__/${name}/nodes.json`).nodes, wires: json(`components/__cloud__/${name}/connections.json`).connections });
const script = (name, id) => {
  const nodes = cloud(name).nodes;
  const n = id ? nodes.find((x) => x.id === id) : nodes.filter((x) => x.type === 'JavaScriptFunction').length === 1 ? nodes.find((x) => x.type === 'JavaScriptFunction') : null;
  if (!n) throw new Error(`${name}: no script node ${id || '(the only one)'}`);
  return n.parameters.functionScript;
};

// ── 1. Generated blocks ──────────────────────────────────────────────────────
{
  const r = spawnSync(process.execPath, [join(here, 'build-trainer-door.mjs'), '--check'], { encoding: 'utf8' });
  check(r.status === 0, `generated: a block is stale — run tools/build-trainer-door.mjs\n${r.stderr || r.stdout}`);
  const has = (fn, block) => script(fn, 'run').includes(`/* ${block}:begin`);
  for (const fn of DOOR.slice(1)) check(has(fn, 'TRAINER_DOOR_LIB'), `generated: ${fn} does not carry the shared rules`);
  for (const fn of ['saveLessonDraft', 'publishLesson', 'copyLesson']) check(has(fn, 'LESSON_GATE'), `generated: ${fn} does not carry the product's gate`);
  check(has('authoringGuide', 'AUTHORING_GUIDE') && has('lessonContext', 'CONCEPT_BODIES'), 'generated: the guide or the concept bodies are missing');
}

// ── 2. Wiring and security ───────────────────────────────────────────────────
const security = json('nodegx.security.json');
for (const fn of DOOR) {
  const { nodes, wires } = cloud(fn);
  check(security.functions[fn] && security.functions[fn].call === 'role:staff', `security: ${fn} is not role:staff`);
  const req = nodes.find((n) => n.id === 'req');
  check(req && req.parameters.allowNoAuth === false, `wiring: ${fn} allows an anonymous caller`);
  const have = new Set(wires.map((c) => `${c.fromId}.${c.fromProperty}>${c.toId}.${c.toProperty}`));
  check(have.has('req.receive>run.run'), `wiring: ${fn} does not run on the request's receive signal`);
  check(have.has('req.userId>run.in-callerId'), `wiring: ${fn} does not take its caller from the session`);
  const runNode = nodes.find((n) => n.id === 'run');
  for (const w of wires.filter((w) => w.toId === 'run' && w.toProperty.startsWith('in-'))) {
    check(runNode.parameters[`runOnChange-${w.toProperty}`] === false, `wiring: ${fn}'s ${w.toProperty} runs on change — with receive → run it would run twice`);
  }
  const s = script(fn, 'run');
  for (const sig of new Set([...s.matchAll(/Outputs\.(\w+)\(\)/g)].map((m) => m[1]))) {
    check(have.has(`run.out-${sig}>res.send`) || have.has(`run.out-${sig}>deny.send`), `wiring: ${fn} fires Outputs.${sig}() and nothing listens`);
  }
  // deploy-functions derives nothing: a signal or output the script fires with no
  // declared port throws mid-run and reads to the caller as a 30-second hang.
  const declared = new Set((runNode.ports || []).map((p) => `${p.name}:${p.plug}:${p.type === 'signal' ? 'signal' : 'data'}`));
  for (const sig of new Set([...s.matchAll(/Outputs\.(\w+)\(\)/g)].map((m) => m[1]))) check(declared.has(`out-${sig}:output:signal`), `ports: ${fn} fires Outputs.${sig}() with no declared signal port`);
  for (const w of wires.filter((w) => w.fromId === 'run')) check([...declared].some((d) => d.startsWith(`${w.fromProperty}:output`)), `ports: ${fn} wires ${w.fromProperty}, which is not a declared port`);
  for (const w of wires.filter((w) => w.toId === 'run' && w.toProperty !== 'run')) check([...declared].some((d) => d.startsWith(`${w.toProperty}:input`)), `ports: ${fn} wires into ${w.toProperty}, which is not a declared port`);
  const resParams = String(nodes.find((n) => n.id === 'res').parameters.params || '').split(',').filter(Boolean);
  for (const p of resParams) check(have.has(`run.out-${p}>res.pm-${p}`), `wiring: ${fn} answers ${p} and nothing sets it`);
}

// ── The world ────────────────────────────────────────────────────────────────
const SAM = 'l-sam';
const PRIYA = 'l-priya';
const MARIE = 'l-marie';
const STAFF = oid('richard@digitalbricks.io');
const fn = (name) => script(name, 'run');
const call = (table, name, inputs, opts = {}) => run(opts.code || fn(name), { callerId: STAFF, ...inputs }, opts.records || makeRecords(table).Records);
const learnerRead = async (table, learnerId, conceptId) => (await run(script('lesson'), { learnerId, conceptId }, makeRecords(table).Records)).rows;
const seedLessons = (table) => table.Lesson.filter((l) => l.learnerId === SAM).map((l) => ({ conceptId: l.conceptId, lesson: { title: l.title, hook: l.hook, landing: l.landing, steps: l.steps, sections: l.sections } }));
const clone = (x) => JSON.parse(JSON.stringify(x));

await quiet(async () => {
  // ── 3. Saving ──────────────────────────────────────────────────────────────
  const table = makeWorld();
  const before = {};
  for (const { conceptId } of seedLessons(table)) before[conceptId] = md5(await learnerRead(table, SAM, conceptId));

  for (const { conceptId, lesson } of seedLessons(table)) {
    const r = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId, lesson });
    check(r.ok && r.version === 1, `save: Sam's fixture lesson ${conceptId} did not save as version 1 (${r.refused || JSON.stringify(r)})`);
  }
  check(table.LessonDraft.length === 6, `save: expected 6 drafts, found ${(table.LessonDraft || []).length}`);

  // 4. A draft reaches no learner.
  for (const { conceptId } of seedLessons(table)) {
    check(md5(await learnerRead(table, SAM, conceptId)) === before[conceptId], `draft: saving a draft changed what Sam's own lesson read answers for ${conceptId}`);
  }

  const html = seedLessons(table).find((x) => x.conceptId === 'html-the-structure').lesson;
  const draftOf = (t, l, c) => t.LessonDraft.find((d) => d.learnerId === l && d.conceptId === c);
  const v0 = md5(draftOf(table, SAM, 'html-the-structure'));
  const BROKEN = [
    ['the answer capsule not first', (l) => { l.sections.reverse(); }, /answer_capsule|first section/i],
    ['a section claimed by two steps', (l) => { l.steps[1].sectionIds.push(l.steps[0].sectionIds[0]); }, /claim|more than one|twice|exactly once/i],
    ['a kind not in the palette', (l) => { l.sections[1].kind = 'banner'; }, /sections\.1/],
    ['no steps', (l) => { delete l.steps; }, /steps/]
  ];
  for (const [what, mutate, says] of BROKEN) {
    const l = clone(html);
    mutate(l);
    const r = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: l, version: 1 });
    check(!r.ok && says.test(r.refused || ''), `gate: ${what} was not refused naming it (${r.ok ? 'it saved' : r.refused})`);
  }
  check(md5(draftOf(table, SAM, 'html-the-structure')) === v0, 'gate: a refused save changed the draft');

  {
    const css = seedLessons(table).find((x) => x.conceptId === 'css-making-it-look-right').lesson;
    const taken = css.sections.find((s) => s.kind === 'capture').field;
    const l = clone(html);
    l.sections.find((s) => s.kind === 'capture').field = taken;
    const r = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: l, version: 1 });
    check(!r.ok && /css-making-it-look-right/.test(r.refused || '') && r.refused.includes(taken), `fields: a capture field another lesson asks for was not refused naming that lesson (${r.refused})`);
  }
  {
    const r = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'tables-and-the-join', lesson: html });
    check(!r.ok && /not on/.test(r.refused || ''), 'save: a concept not on the path was not refused');
    const n = await call(table, 'saveLessonDraft', { learnerId: 'l-nobody', conceptId: 'html-the-structure', lesson: html });
    check(!n.ok && /no learner/.test(n.refused || ''), 'save: an unknown learner was not refused');
  }

  // 5. Compare-and-swap.
  {
    const noVersion = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: html });
    check(!noVersion.ok && /version: 1/.test(noVersion.refused || ''), 'cas: replacing a draft without sending its version was not refused');
    const stale = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: html, version: 7 });
    check(!stale.ok && /changed since/.test(stale.refused || ''), 'cas: a stale version was not refused');

    const race = async (code) => {
      const t = makeWorld();
      await call(t, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: html });
      let waiting = 0;
      let release;
      const gate = new Promise((r) => { release = r; });
      const barrier = async (c) => { if (c !== 'LessonDraft') return; if (++waiting === 2) release(); await gate; };
      const a = clone(html); a.title = 'Version A';
      const b = clone(html); b.title = 'Version B';
      const [ra, rb] = await Promise.all([
        call(t, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: a, version: 1 }, { code, records: makeRecords(t, { beforeRead: barrier }).Records }),
        call(t, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: b, version: 1 }, { code, records: makeRecords(t, { beforeRead: barrier }).Records })
      ]);
      return { told: [ra.ok, rb.ok].filter(Boolean).length, title: draftOf(t, SAM, 'html-the-structure').title };
    };
    const real = await race(fn('saveLessonDraft'));
    check(real.told === 1, `cas: two concurrent saves of one version both reported success (${real.told})`);
    const cut = fn('saveLessonDraft').replace(", ifMatch: { version: existing.version } })", ' })');
    check(cut !== fn('saveLessonDraft'), 'cas control: the ifMatch this check cuts out is not where it looks');
    const control = await race(cut);
    check(control.told === 2, `cas control: with ifMatch cut out, both saves were still not told they succeeded (${control.told}) — the race is not being exercised`);
  }

  // 4 (cont.) and publishing.
  {
    const cur = draftOf(table, SAM, 'html-the-structure');
    const l = clone(html); l.title = 'HTML, the bones of your landing page';
    const saved = await call(table, 'saveLessonDraft', { learnerId: SAM, conceptId: 'html-the-structure', lesson: l, version: cur.version });
    check(saved.ok, `publish: the rewrite did not save (${saved.refused})`);
    check(md5(await learnerRead(table, SAM, 'html-the-structure')) === before['html-the-structure'], 'draft: a rewritten draft reached Sam before it was published');
    const lessonsBefore = table.Lesson.length;
    const pub = await call(table, 'publishLesson', { learnerId: SAM, conceptId: 'html-the-structure' });
    check(pub.ok, `publish: did not publish (${pub.refused})`);
    check(table.Lesson.length === lessonsBefore + 1, 'publish: did not add a new Lesson row beside the old one');
    const served = await learnerRead(table, SAM, 'html-the-structure');
    check(served.length === 1 && served[0].title === l.title && served[0].generatedByTier === 'trainer', `publish: Sam's own lesson read does not serve the published draft (${served[0] && served[0].title})`);
    const again = await call(table, 'publishLesson', { learnerId: SAM, conceptId: 'html-the-structure' });
    check(!again.ok && /Nothing new/.test(again.refused || ''), 'publish: publishing an unchanged draft again was not refused');
    const read = await call(table, 'readLesson', { learnerId: SAM, conceptId: 'html-the-structure', which: 'published' });
    check(read.ok && read.lesson.title === l.title && read.generationVersion === pub.generationVersion, 'read: readLesson does not return the published lesson');
  }

  // 6. Copying.
  const priyaCtx = table.ProjectContext.find((c) => c.learnerId === PRIYA);
  const copied = await call(table, 'copyLesson', { fromLearnerId: SAM, toLearnerId: PRIYA, conceptId: 'html-the-structure' });
  check(copied.ok && copied.version === 1, `copy: did not land as Priya's draft (${copied.refused})`);
  const priyaDraft = draftOf(table, PRIYA, 'html-the-structure');
  check(priyaDraft && priyaDraft.copiedFromLearnerId === SAM && priyaDraft.publishedVersion === null, 'copy: the draft does not record its source, or says it is published');
  check(Array.isArray(copied.stillAboutAnotherLearner) && copied.stillAboutAnotherLearner.length > 0, 'copy: Sam\'s lesson came back mentioning nothing of his project — the leak list is blind');
  check(!(await learnerRead(table, PRIYA, 'html-the-structure')).length, 'copy: the copy reached Priya without being published');
  const refusedLeak = await call(table, 'publishLesson', { learnerId: PRIYA, conceptId: 'html-the-structure' });
  check(!refusedLeak.ok && /still mentions/.test(refusedLeak.refused || ''), `copy: an unadapted copy was published (${refusedLeak.refused || 'ok'})`);
  {
    const cutCode = fn('publishLesson').replace('if (still.length) {', 'if (false) {');
    check(cutCode !== fn('publishLesson'), 'copy control: the leak check this check cuts out is not where it looks');
    const t2 = makeWorld();
    const c2 = await call(t2, 'copyLesson', { fromLearnerId: SAM, toLearnerId: PRIYA, conceptId: 'html-the-structure' });
    const leak = await call(t2, 'publishLesson', { learnerId: PRIYA, conceptId: 'html-the-structure' }, { code: cutCode });
    check(c2.ok && leak.ok, 'copy control: with the leak check cut out, the unadapted copy still did not publish — the refusal is coming from somewhere else');
  }
  {
    const terms = [...new Set(copied.stillAboutAnotherLearner.map((m) => m.term))];
    let text = JSON.stringify({ title: priyaDraft.title, hook: priyaDraft.hook, landing: priyaDraft.landing, steps: priyaDraft.steps, sections: priyaDraft.sections });
    for (const term of terms) text = text.split(term).join(priyaCtx.projectName).split(term.toLowerCase()).join(priyaCtx.projectName);
    const adapted = JSON.parse(text);
    const s = await call(table, 'saveLessonDraft', { learnerId: PRIYA, conceptId: 'html-the-structure', lesson: adapted, version: 1 });
    check(s.ok && s.stillAboutAnotherLearner.length === 0, `copy: the adapted draft still reports Sam's project (${JSON.stringify(s.stillAboutAnotherLearner || s.refused)})`);
    const p = await call(table, 'publishLesson', { learnerId: PRIYA, conceptId: 'html-the-structure' });
    check(p.ok, `copy: the adapted copy did not publish (${p.refused})`);
    check(draftOf(table, PRIYA, 'html-the-structure').copiedFromLearnerId === null, 'copy: publishing did not clear the copy pointer');
  }
  {
    const noLesson = await call(table, 'copyLesson', { fromLearnerId: MARIE, toLearnerId: PRIYA, conceptId: 'what-the-web-is' });
    check(!noLesson.ok && /no published lesson/.test(noLesson.refused || ''), 'copy: copying from a learner with no lesson was not refused');
    const self = await call(table, 'copyLesson', { fromLearnerId: SAM, toLearnerId: SAM, conceptId: 'html-the-structure' });
    check(!self.ok && /same learner/.test(self.refused || ''), 'copy: copying a learner to themselves was not refused');
    const over = await call(table, 'copyLesson', { fromLearnerId: SAM, toLearnerId: PRIYA, conceptId: 'html-the-structure' });
    check(!over.ok && /replaceDraft/.test(over.refused || ''), 'copy: an existing draft was replaced without replaceDraft');
  }

  // 7. Deletion and export.
  {
    const unadapted = await call(table, 'copyLesson', { fromLearnerId: SAM, toLearnerId: MARIE, conceptId: 'html-the-structure' });
    check(unadapted.ok, `delete: could not set up an unadapted copy on Marie (${unadapted.refused})`);
    const exportRows = await run(script('shared/Rows about', 'ra_fn'), { learnerId: SAM }, makeRecords(table).Records);
    const doc = await run(script('exportMine', 'doc'), { userId: oid('sam.okafor@example.test'), rows: exportRows.rows }, makeRecords(table).Records, { Users: { Current: null } });
    const drafts = (doc.document && doc.document.collections.LessonDraft) || [];
    check(drafts.length === 6 && drafts.every((d) => d.learnerId === SAM), `export: Sam's export does not hold exactly his six drafts (${drafts.length})`);
    check(drafts.every((d) => !('copiedFromLearnerId' in d) && !('updatedByEmail' in d)), 'export: a draft carries the copy pointer or the coach\'s address');
    check(!JSON.stringify(doc.document || {}).includes('"l-marie"'), "export: Sam's export carries Marie's draft");

    const keepPriya = md5(draftOf(table, PRIYA, 'html-the-structure'));
    const marieOther = table.LessonDraft.filter((d) => d.learnerId === MARIE).length;
    const del = await run(script('deleteMine', 'erase'), {
      userId: oid('sam.okafor@example.test'), confirm: 'DELETE', rows: exportRows.rows, alsoDeleted: exportRows.alsoDeleted, order: exportRows.order
    }, makeRecords(table).Records);
    check(del.ok, `delete: the erasure did not finish (${del.refused})`);
    check(!table.LessonDraft.some((d) => d.learnerId === SAM), 'delete: a draft of Sam\'s survived him');
    check(!draftOf(table, MARIE, 'html-the-structure'), "delete: the unadapted copy of Sam's lesson on Marie survived him");
    check(table.LessonDraft.filter((d) => d.learnerId === MARIE).length === marieOther - 1, "delete: deleting Sam removed something else of Marie's");
    check(md5(draftOf(table, PRIYA, 'html-the-structure')) === keepPriya, "delete: deleting Sam touched Priya's adapted, published draft");
  }
});

// 8. What the door returns.
await quiet(async () => {
  const table = makeWorld();
  const outputs = [];
  outputs.push(await call(table, 'authoringGuide', {}));
  outputs.push(await call(table, 'learnersForLessons', {}));
  for (const l of ['l-sam', 'l-priya', 'l-marie']) {
    const steps = table.PathStep.filter((s) => s.pathId === table.LearningPath.find((p) => p.learnerId === l).pathId);
    outputs.push(await call(table, 'lessonContext', { learnerId: l, conceptId: steps[0].conceptId }));
  }
  outputs.push(await call(table, 'copyLesson', { fromLearnerId: SAM, toLearnerId: PRIYA, conceptId: 'html-the-structure' }));
  outputs.push(await call(table, 'readLesson', { learnerId: PRIYA, conceptId: 'html-the-structure' }));
  check(outputs.every((o) => o.ok), `privacy: a door call failed while collecting its outputs (${outputs.filter((o) => !o.ok).map((o) => o.refused).join(' | ')})`);
  const learners = outputs[1].learners || [];
  check(learners.length >= 9 && learners.find((l) => l.learnerId === SAM).steps.filter((s) => s.lesson === 'published').length === 6, 'learners: Sam does not show six published lessons');
  const ctx = outputs[2].context;
  check(ctx && ctx.concept.canonicalBody && ctx.concept.canonicalBody.length > 500, 'context: the concept body did not arrive');
  check(ctx && ctx.project && ctx.project.savedAnswers && Object.keys(ctx.project.savedAnswers).length > 0, "context: Sam's saved answers did not arrive");

  const probes = [
    ...table.ConversationMessage.map((m) => m.body),
    ...table.CoachNote.map((n) => n.body),
    ...table.CoachingSession.map((s) => s.summary || s.title),
    ...table.DimensionRating.map((r) => r.words).filter(Boolean),
    ...table._User.map((u) => u.email || u.username).filter((x) => /@/.test(String(x))),
    ...table.LearnerProfile.map((p) => p.coachEmail).filter(Boolean)
  ].filter((x) => typeof x === 'string' && x.length >= 8);
  check(probes.length > 15, `privacy: only ${probes.length} probe strings — the scan below would be close to blind`);
  const scan = (o) => { const s = JSON.stringify(o); return probes.filter((p) => s.includes(p)); };
  const leaked = scan(outputs.map(({ ok, ...rest }) => rest));
  check(leaked.length === 0, `privacy: the door returned ${leaked.length} thing(s) it must not: ${leaked.slice(0, 3).map((x) => JSON.stringify(x.slice(0, 40))).join(', ')}`);
  check(!/[^\s"@]+@[^\s"@]+\.[a-z]{2,}/i.test(JSON.stringify(outputs.slice(1))), 'privacy: an email address reached a door output');
  check(scan({ planted: table.ConversationMessage[0].body }).length === 1, 'privacy control: the scan did not see a message body planted in front of it');
});

// 9. Nothing a learner can call writes a lesson.
for (const [name, rule] of Object.entries(security.functions)) {
  const dir = join(TEMPLATE, 'components', '__cloud__', name);
  if (!existsSync(dir)) continue;
  const code = cloud(name).nodes.map((n) => (n.parameters && n.parameters.functionScript) || '').join('\n');
  const writesLesson = /create\('Lesson'|className: 'Lesson'/.test(code);
  const writesDraft = /create\('LessonDraft'|className: 'LessonDraft'/.test(code);
  if (rule.call !== 'role:staff') {
    check(!writesLesson && !writesDraft, `learner: ${name} (${rule.call}) writes a lesson or a draft`);
  } else {
    if (writesLesson) check(name === 'publishLesson', `writers: ${name} writes Lesson — only publishLesson may`);
    if (writesDraft) check(['saveLessonDraft', 'publishLesson', 'copyLesson'].includes(name), `writers: ${name} writes LessonDraft`);
  }
}
check(script('lesson').indexOf('LessonDraft') === -1, "draft: the learner's lesson read names LessonDraft");

if (failures.length) {
  console.error(`check-trainer-door: ${failures.length} failure(s)\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}
console.log('check-trainer-door: OK — the generated blocks are current; seven role:staff functions wired receive → run; the product\'s gate refuses by name; a draft reaches no learner until published; compare-and-swap and the copy-leak check each hold, and each fails with its control cut out; an unadapted copy goes with its source\'s account; nothing the door returns carries an address, a message, a note, a session or a review.');
