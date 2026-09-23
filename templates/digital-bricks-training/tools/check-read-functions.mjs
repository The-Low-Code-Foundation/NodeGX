#!/usr/bin/env node
/**
 * THE FOUR READ FUNCTIONS, AGAINST THE FIXTURES THEY REPLACE (TASK-L170).
 *
 * `course`, `lesson`, `roster` and `learnerProgramme` are correct when each one's
 * output is the fixture it will replace in L171 — so a page swapped from
 * `Static Data` to a `Cloud Function` cannot tell the difference.
 *
 * ── WHAT IS COMPARED WITH WHAT ─────────────────────────────────────────────
 * The expected output is NEVER my transcription of a projection. It is the
 * fixture passed through the PRODUCT's own `projectForLearner` /
 * `projectForCoach`, compiled from `src/lib/server/timeline/model.ts` (DBT_REPO,
 * as check-dossier.mjs finds the product). Comparison is structural and
 * key-order-insensitive; arrays keep their order, because order is part of what
 * a function answers.
 *
 * ── TWO MODES ──────────────────────────────────────────────────────────────
 * OFFLINE (the default): every function's OWN scripts, read from its
 * `nodes.json`, run in-process against `backend/seed.json` resolved exactly as
 * `setup-backend.mjs` writes it (lib/seed-resolve.mjs — one owner, because the
 * first version of this check tested rows the backend never holds and passed
 * while every learner lookup failed live). A fake `Noodl.Records` counts the
 * queries (criterion 6). The chains are hand-wired here, and the wires they
 * assume are ASSERTED against each function's `connections.json`, so a graph
 * that stops matching its offline model fails by name rather than passing.
 *
 * LIVE (`--backend <url> --token <admin> --scratch`): the same comparisons over
 * HTTP against a backend `setup-backend.mjs` seeded and `deploy-functions.mjs`
 * loaded, plus what only a live backend has: the gate (criterion 3), real
 * sessions, and timings (criterion 7). `--scratch` is REQUIRED for live mode and
 * means what it says: this check MINTS `_Session` rows and a probe note with the
 * admin credential, and deletes them afterwards. Never point it at a backend
 * whose sessions or notes belong to anybody.
 *
 * ── `now`, AND THE WINDOW THE FIXTURE IS TRUE IN ───────────────────────────
 * The fixture stores `state`; the functions derive it from `now` (L116). Found
 * by MEASUREMENT, not fitted (§2): every stored state holds from the moved
 * session's end (18 Sept 19:15 UTC, inclusive) until the photos brief falls due
 * (30 Sept 22:59:59.999 UTC, exclusive), one contiguous window, and the check
 * re-proves both edges each run. `learnerProgramme` is pinned inside it; `course` takes no `now` at
 * all (§0.6), so it is compared with the fixture only while the server clock is
 * inside the window, and at every moment with `learnerProgramme` at the same
 * instant (criterion 4).
 *
 * Run: node tools/check-read-functions.mjs
 *      node tools/check-read-functions.mjs --backend http://127.0.0.1:8577 --token <admin> --scratch
 */
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './lib/seed-resolve.mjs';
import { fixture } from './lib/fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = arg('backend') ? arg('backend').replace(/\/$/, '') : null;
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
if (BACKEND && !process.argv.includes('--scratch')) {
  console.error('check-read-functions: live mode mints sessions and a probe row with the admin credential. Pass --scratch to say this backend is disposable.');
  process.exit(2);
}

const FIXTURE_NOW = '2026-09-22T12:00:00.000Z';
const WINDOW_START = '2026-09-18T19:15:00.000Z'; // sess-moved's end: 18:30 + 45 minutes
/* HALF-OPEN at the end, and the edge test is what said so: brief-photos falls due
   AT 22:59:59.999, and a brief at its due instant is already `now`
   (assignmentState compares with `>`). So the last instant the fixture is true in
   is one millisecond earlier; the first version of this constant was the due
   instant itself and failed its own edge check. */
const WINDOW_END = '2026-09-30T22:59:59.998Z';
const SAM = 'l-sam';

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

// ── The product ──────────────────────────────────────────────────────────────
if (!existsSync(join(DBT_REPO, 'src', 'lib', 'server', 'timeline', 'model.ts'))) {
  console.error(`check-read-functions: the product is not at ${DBT_REPO} — set DBT_REPO. Refusing to pass by comparing nothing.`);
  process.exit(2);
}
const bundled = await build({
  stdin: {
    contents: `export { projectForLearner, projectForCoach, orderEntries } from ${JSON.stringify(join(DBT_REPO, 'src/lib/server/timeline/model.ts'))};
export { loomPack } from ${JSON.stringify(join(DBT_REPO, 'src/lib/domain/loom/index.ts'))};`,
    resolveDir: DBT_REPO,
    loader: 'ts'
  },
  bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'
});
const product = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

// ── The template ─────────────────────────────────────────────────────────────
const json = (path) => JSON.parse(readFileSync(join(TEMPLATE, path), 'utf8'));
// The fixtures live in backend/fixtures/ since TASK-L171 (tools/lib/fixtures.mjs).
const cloud = (name) => ({
  nodes: json(`components/__cloud__/${name}/nodes.json`).nodes,
  wires: json(`components/__cloud__/${name}/connections.json`).connections
});
const script = (name, id) => cloud(name).nodes.find((n) => n.id === id).parameters.functionScript;
const comment = (name, id) => (cloud(name).nodes.find((n) => n.id === id).metadata || {}).comment || '';

/* The wires each offline chain below assumes, asserted against the graph. The
   chains are hand-written; this is what stops them describing a graph that no
   longer exists. */
const WIRING = {
  course: ['req.userId>who.userId', 'who.learnerId>ask.in-learnerId', 'ask.out-query>prog.query', 'prog.payload>proj.in-payload', 'proj.out-rows>res.pm-rows', 'proj.out-done>res.send'],
  learnerProgramme: ['req.pm-learnerId>ask.in-learnerId', 'req.pm-now>ask.in-now', 'req.receive>ask.run', 'ask.out-query>prog.query', 'prog.payload>proj.in-payload', 'proj.out-rows>res.pm-rows', 'proj.out-done>res.send'],
  lesson: ['req.userId>who.userId', 'req.pm-conceptId>read.in-conceptId', 'who.learnerId>read.in-learnerId', 'read.out-rows>res.pm-rows', 'read.out-done>res.send'],
  roster: ['req.receive>read.run', 'read.out-rows>res.pm-rows', 'read.out-done>res.send']
};
for (const [fn, wires] of Object.entries(WIRING)) {
  const have = new Set(cloud(fn).wires.map((c) => `${c.fromId}.${c.fromProperty}>${c.toId}.${c.toProperty}`));
  for (const w of wires) check(have.has(w), `wiring: ${fn} has no ${w} — the offline chain no longer describes the graph`);
}
check(cloud('course').nodes.find((n) => n.id === 'who').type === '/#__cloud__/shared/Caller learner', 'wiring: course does not place Caller learner');
check(cloud('course').nodes.find((n) => n.id === 'prog').type === '/#__cloud__/shared/Programme', 'wiring: course does not place Programme');
check(cloud('learnerProgramme').nodes.find((n) => n.id === 'prog').type === '/#__cloud__/shared/Programme', 'wiring: learnerProgramme does not place Programme');
/* §0.6 is structural: `course` declares NO parameter, so a learner cannot send a
   `now` or a `learnerId` that anything reads. */
check(cloud('course').nodes.find((n) => n.id === 'req').parameters.params === '', 'gate: course declares a parameter — a learner could then send one');

// ── Offline: a fake Records over the rows the backend really holds ───────────
const seed = json('backend/seed.json');
const oid = (username) => `u:${username}`;
const buildTable = () => {
  const t = { _User: seed.users.map((u) => ({ ...userFields(u).fields, objectId: oid(u.username), createdAt: u.createdAt })) };
  for (const [c, rows] of Object.entries(seed.rows)) t[c] = rows.map((r) => resolveRow(c, r, oid));
  return t;
};
let table = buildTable();
let queries = 0;
/* The backend's filter rules, not a looser set. The first fake accepted a
   two-key filter the backend refuses ("A filter must have exactly one key"), so
   the lesson passed here and answered nothing live — the second time in one
   task that offline agreed with rows or rules the backend does not have. */
const matches = (row, where) => {
  const keys = Object.keys(where);
  if (keys.length === 0) return true;
  if (keys.length > 1) throw new Error(`A filter must have exactly one key, found ${keys.length}: ${keys.join(', ')} (the backend refuses it)`);
  const [k] = keys;
  const c = where[k];
  if (k === 'and') return c.every((w) => matches(row, w));
  if (k === 'or') return c.some((w) => matches(row, w));
  if ('equalTo' in c) return row[k] === c.equalTo;
  if ('containedIn' in c) return c.containedIn.includes(row[k]);
  throw new Error(`the fake Records does not implement ${JSON.stringify(c)} — add it before trusting a result`);
};
const Records = {
  async query(c, where = {}, options = {}) {
    queries++;
    const rows = (table[c] || []).filter((r) => matches(r, where));
    // A backend promises no order, so neither does this: a fixed shuffle (seeded,
    // so a failure reproduces) means an order a function does not state cannot
    // pass offline by the seed happening to be in file order.
    const shuffled = rows.map((r, i) => [((i + 1) * 2654435761 + c.length * 97) % 4294967296, r]).sort((a, b) => a[0] - b[0]).map(([, r]) => r);
    // Every function reads `{ plain: true }` (OpenNoodl HLT-022). A default read
    // is a Model that re-ids every nested object — the defect that cost a lesson its
    // section ids live and was invisible here — so it is REFUSED by name rather
    // than imitated: a read that forgets the option fails offline, not in front of
    // a learner.
    if (options.plain !== true) throw new Error(`Records.query('${c}') without { plain: true } — a Model read re-ids nested documents (HLT-022)`);
    return shuffled.slice(0, options.limit ?? 100).map((r) => JSON.parse(JSON.stringify(r)));
  }
};
/* Runs ONE node's script. An async node answers through `done` / `failed`; the
   two `ask` nodes set a value and signal nothing, so they are run `sync` and
   read back at once — a sync node that also signals would be a different node. */
const run = (code, Inputs, { sync = false } = {}) =>
  new Promise((resolve_, reject) => {
    const Outputs = { done: () => resolve_(Outputs), failed: () => reject(new Error(Outputs.error)) };
    new Function('Inputs', 'Outputs', 'Noodl', code)(Inputs, Outputs, { Records });
    if (sync) resolve_(Outputs);
  });
const offline = {
  async course({ as }) {
    const { learnerId } = await run(script('shared/Caller learner', 'cl_fn'), { userId: as });
    const { query } = await run(script('course', 'ask'), { learnerId }, { sync: true });
    const { payload } = await run(script('shared/Programme', 'pr_fn'), { query });
    return (await run(script('course', 'proj'), { payload })).rows;
  },
  async learnerProgramme({ learnerId, now }) {
    const ask = await run(script('learnerProgramme', 'ask'), { learnerId, now }, { sync: true });
    const { payload } = await run(script('shared/Programme', 'pr_fn'), { query: ask.query });
    return (await run(script('learnerProgramme', 'proj'), { payload })).rows;
  },
  async lesson({ as, conceptId }) {
    const { learnerId } = await run(script('shared/Caller learner', 'cl_fn'), { userId: as });
    return (await run(script('lesson', 'read'), { learnerId, conceptId })).rows;
  },
  async roster() {
    return (await run(script('roster', 'read'), {})).rows;
  }
};

// ── Comparison ───────────────────────────────────────────────────────────────
const canon = (v) =>
  Array.isArray(v) ? v.map(canon)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** Every difference, by path, so a failure names what moved rather than "not equal". */
function differences(got, want, path = '') {
  if (same(got, want)) return [];
  const list = (x) => Array.isArray(x) && x.every((e) => e && typeof e === 'object' && 'id' in e);
  if (list(got) && list(want)) {
    const out = [];
    const G = new Map(got.map((e) => [e.id, e]));
    const W = new Map(want.map((e) => [e.id, e]));
    for (const id of W.keys()) if (!G.has(id)) out.push(`${path}: missing ${id}`);
    for (const id of G.keys()) if (!W.has(id)) out.push(`${path}: unexpected ${id}`);
    for (const [id, w] of W) if (G.has(id)) out.push(...differences(G.get(id), w, `${path}[${id}]`));
    if (!out.length) out.push(`${path}: same entries in a different order`);
    return out;
  }
  if (Array.isArray(got) && Array.isArray(want)) {
    if (got.length !== want.length) return [`${path}: ${got.length} items ≠ ${want.length}`];
    return got.flatMap((g, i) => differences(g, want[i], `${path}[${i}]`));
  }
  if (got && want && typeof got === 'object' && typeof want === 'object' && !Array.isArray(got) && !Array.isArray(want)) {
    return [...new Set([...Object.keys(got), ...Object.keys(want)])].flatMap((k) => differences(got[k], want[k], `${path}.${k}`));
  }
  return [`${path}: ${JSON.stringify(got)?.slice(0, 90)} ≠ ${JSON.stringify(want)?.slice(0, 90)}`];
}
const expectSame = (label, got, want) => {
  const d = differences(got, want);
  check(d.length === 0, `${label}: ${d.length} difference(s)\n      ${d.slice(0, 8).join('\n      ')}`);
};

// The expected outputs, from the fixtures through the PRODUCT's projections.
const fxProgramme = fixture('programme')[0];
const expected = {
  coach: [{ ...fxProgramme, entries: product.projectForCoach(fxProgramme.entries), history: product.projectForCoach(fxProgramme.history) }],
  learner: (() => {
    const { history, ...rest } = fxProgramme;
    return [{ ...rest, entries: product.projectForLearner(fxProgramme.entries) }];
  })(),
  lesson: fixture('lesson'),
  roster: fixture('roster')
};
// The pack data the function serves must be the product's pack (Richard, 2026-09-23).
check(
  same(expected.coach[0].onboardingFacts, product.loomPack.onboardingFacts.map(({ key, label }) => ({ key, label }))),
  'onboardingFacts: the fixture is not the product pack\'s list'
);

/** The product's roster ORDER BY — lastActivity DESC NULLS LAST, createdAt DESC. */
const rosterOrder = (people) =>
  [...people].sort((a, b) => {
    if (a.lastActivity === null && b.lastActivity !== null) return 1;
    if (b.lastActivity === null && a.lastActivity !== null) return -1;
    if (a.lastActivity !== b.lastActivity) return a.lastActivity < b.lastActivity ? 1 : -1;
    if (a.createdAt !== b.createdAt) return (b.createdAt || '').localeCompare(a.createdAt || '');
    return a.learnerId.localeCompare(b.learnerId);
  });

/** What must never appear in a learner's payload (§4): every trainer label, every staff email. */
const forbidden = () => {
  const labels = (seed.rows.LearnerInvite || []).map((i) => i.label).filter(Boolean);
  const emails = [
    ...seed.users.filter((u) => (u.roles || []).includes('staff')).map((u) => u.email),
    ...(seed.rows.CoachingSession || []).map((s) => s.createdByEmail),
    ...(seed.rows.CoachNote || []).map((n) => n.authorEmail),
    ...(seed.rows.LearnerProfile || []).map((p) => p.coachEmail)
  ].filter(Boolean);
  return [...new Set([...labels, ...emails])];
};

async function criteria(fns, mode, samUser, priyaUser, staffUser) {
  const tag = (s) => `[${mode}] ${s}`;
  // 1. learnerProgramme at the fixture's instant is the coach's projection of the fixture.
  expectSame(tag('C1 learnerProgramme'), await fns.learnerProgramme({ learnerId: SAM, now: FIXTURE_NOW, as: staffUser }), expected.coach);
  // …and the window is exact: one millisecond outside either edge, a state changes.
  for (const [at, inside] of [[WINDOW_START, true], [new Date(Date.parse(WINDOW_START) - 1).toISOString(), false],
    [WINDOW_END, true], [new Date(Date.parse(WINDOW_END) + 1).toISOString(), false]]) {
    const got = await fns.learnerProgramme({ learnerId: SAM, now: at, as: staffUser });
    check(same(got, expected.coach) === inside, tag(`C1 the fixture's window is not exact at ${at} (expected ${inside ? 'inside' : 'outside'})`));
  }
  // lesson, and the roster as a set in the product's order.
  expectSame(tag('C1 lesson'), await fns.lesson({ as: samUser, conceptId: expected.lesson[0].conceptId }), expected.lesson);
  const people = await fns.roster({ as: staffUser });
  expectSame(tag('C1 roster'), [...people].sort((a, b) => a.learnerId.localeCompare(b.learnerId)),
    [...expected.roster].sort((a, b) => a.learnerId.localeCompare(b.learnerId)));
  check(same(people.map((p) => p.learnerId), rosterOrder(people).map((p) => p.learnerId)), tag('C1 roster: not in the product\'s ORDER BY'));

  // 4. course, bracketed: learnerProgramme at t0 and t1 must agree, so no state
  //    boundary fell between the calls, and course must be ITS learner projection.
  const t0 = new Date().toISOString();
  const before = await fns.learnerProgramme({ learnerId: SAM, now: t0, as: staffUser });
  const course = await fns.course({ as: samUser });
  const after = await fns.learnerProgramme({ learnerId: SAM, now: new Date().toISOString(), as: staffUser });
  check(same(before, after), tag('C4 a state changed between the bracketing calls — re-run'));
  const strip = (entries) => entries.map(({ unread, ...e }) => e);
  const fromCoach = before[0].entries.filter((e) => e.kind !== 'signal');
  check(course[0].learnerId === SAM, tag(`C4 course served ${course[0].learnerId}, not the caller's own learner`));
  check(same(strip(course[0].entries), strip(fromCoach)), tag('C4 course is not the coach\'s list minus its signals'));
  check(!('history' in course[0]), tag('C4 course carries history'));
  // unread is reader-relative and must be ABLE to differ — the probe proves the
  // comparison above is not passing because both sides are one object.
  const differsOnUnread = course[0].entries.some((e) => e.kind === 'message' &&
    fromCoach.find((c) => c.id === e.id)?.unread !== e.unread);
  check(differsOnUnread, tag('C4 unread never differs between the projections — the check cannot see it'));
  // Inside the window, course is ALSO the learner's projection of the fixture.
  const clock = Date.now();
  if (clock >= Date.parse(WINDOW_START) && clock <= Date.parse(WINDOW_END)) expectSame(tag('C1 course'), course, expected.learner);
  else console.log(tag(`C1 course: the server clock is outside the fixture's window, so course is proven through criterion 4 only`));

  // 5. Nothing of the coach's reaches a learner's payload — every value, not a spot check.
  const lessonRows = await fns.lesson({ as: samUser, conceptId: expected.lesson[0].conceptId });
  for (const [name, payload] of [['course', course], ['lesson', lessonRows]]) {
    const text = JSON.stringify(payload);
    const hits = forbidden().filter((v) => text.includes(v));
    check(hits.length === 0, tag(`C5 ${name} carries ${hits.join(', ')}`));
  }
  check(JSON.stringify(course).includes(fxProgramme.projectName), tag('C5 positive control: course does not carry the project name'));

  // A learner's own rows, for two different learners, and no argument changes whose.
  const priya = await fns.course({ as: priyaUser, body: { learnerId: SAM } });
  check(priya[0].learnerId === 'l-priya', tag(`C3 course for Priya served ${priya[0].learnerId}`));
  check(!JSON.stringify(priya).includes(fxProgramme.projectName), tag('C3 Priya\'s course carries Sam\'s project'));
  check((await fns.lesson({ as: priyaUser, conceptId: expected.lesson[0].conceptId })).length === 0, tag('C3 Priya was served Sam\'s lesson'));
  check((await fns.lesson({ as: samUser, conceptId: 'javascript-making-it-do-things' })).length === 0, tag('C3 a locked step was served'));
  return { course };
}

// ── Offline run ──────────────────────────────────────────────────────────────
const asOffline = {
  course: ({ as }) => offline.course({ as }),
  learnerProgramme: ({ learnerId, now }) => offline.learnerProgramme({ learnerId, now }),
  lesson: ({ as, conceptId }) => offline.lesson({ as, conceptId }),
  roster: () => offline.roster()
};
await criteria(asOffline, 'offline', oid('sam.okafor@example.test'), oid('priya@example.test'), oid('trainer@example.test'));

// An INTERNAL note, injected, must reach the coach and never the learner (L128).
table.CoachNote.push({ noteId: 'probe-internal', learnerId: SAM, visibility: 'internal', body: 'PROBE-INTERNAL-BODY',
  authorEmail: 'trainer@example.test', createdAt: FIXTURE_NOW, anchorKind: null, anchorId: null, sessionId: null, editedAt: null });
check(!JSON.stringify(await offline.course({ as: oid('sam.okafor@example.test') })).includes('PROBE-INTERNAL-BODY'), '[offline] C5 an internal note reached course');
check(JSON.stringify(await offline.learnerProgramme({ learnerId: SAM, now: FIXTURE_NOW })).includes('PROBE-INTERNAL-BODY'), '[offline] C5 positive control: the internal note did not reach the coach');
table = buildTable();

/* SOMEBODY ELSE'S CACHED LESSON, on a step that IS open on the caller's path.
   C3's Priya case cannot see a dropped learner scope on the Lesson query: her
   path does not carry Sam's concept, so the gate refuses her before that query's
   answer matters — measured: with the scope removed this file stayed green. The
   case that can see it is Sam asking for a concept open on HIS path that only
   somebody else has a lesson for. The concept is derived, not named, and the
   positive control proves the gate lets it through. */
{
  const samPath = [...table.LearningPath.filter((p) => p.learnerId === SAM)].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const cached = new Set(table.Lesson.filter((l) => l.learnerId === SAM).map((l) => l.conceptId));
  const open = table.PathStep.find((s) => s.pathId === samPath.pathId && !s.removedAt && s.status !== 'locked' && !cached.has(s.conceptId));
  check(open !== undefined, '[offline] C3 no open step on Sam\'s path without a lesson — the probe below would test nothing');
  const probe = (learnerId) => ({ ...table.Lesson[0], learnerId, conceptId: open.conceptId, title: 'PROBE-OTHER-LESSON' });
  table.Lesson.push(probe('l-priya'));
  check((await offline.lesson({ as: oid('sam.okafor@example.test'), conceptId: open.conceptId })).length === 0,
    `[offline] C3 Sam was served another learner's cached lesson for ${open.conceptId}`);
  table.Lesson.push(probe(SAM));
  check((await offline.lesson({ as: oid('sam.okafor@example.test'), conceptId: open.conceptId })).some((l) => l.title === 'PROBE-OTHER-LESSON'),
    `[offline] C3 positive control: Sam's own lesson for ${open.conceptId} was not served — the gate refused before the scope mattered`);
  table = buildTable();
}

// 6. Query counts, measured, against the number each component's comment states.
const stated = (name, id) => Number((comment(name, id).match(/RECORDS QUERIES PER CALL: (\d+)/) || [])[1]);
const measure = async (fn) => { queries = 0; await fn(); return queries; };
const counted = {
  programme: (await measure(() => offline.learnerProgramme({ learnerId: SAM, now: FIXTURE_NOW }))),
  caller: await measure(() => run(script('shared/Caller learner', 'cl_fn'), { userId: oid('sam.okafor@example.test') })),
  lesson: (await measure(() => offline.lesson({ as: oid('sam.okafor@example.test'), conceptId: expected.lesson[0].conceptId }))),
  roster: await measure(() => offline.roster())
};
const declared = { programme: stated('shared/Programme', 'pr_fn'), caller: stated('shared/Caller learner', 'cl_fn'), read: stated('lesson', 'read'), roster: stated('roster', 'read') };
check(counted.programme === declared.programme, `C6 Programme: ${counted.programme} queries, its comment says ${declared.programme}`);
check(counted.caller === declared.caller, `C6 Caller learner: ${counted.caller} queries, its comment says ${declared.caller}`);
check(counted.lesson === declared.caller + declared.read, `C6 lesson: ${counted.lesson} queries, the comments say ${declared.caller} + ${declared.read}`);
check(counted.roster === declared.roster, `C6 roster: ${counted.roster} queries, its comment says ${declared.roster}`);

// ── Live run ─────────────────────────────────────────────────────────────────
let live = null;
if (BACKEND) {
  if (!TOKEN) { console.error('check-read-functions: live mode needs --token.'); process.exit(2); }
  const admin = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
  const http = async (method, path, body, headers = {}) => {
    const t = Date.now();
    const res = await fetch(BACKEND + path, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    return { status: res.status, text, ms: Date.now() - t, body: text ? JSON.parse(text) : null };
  };
  const { body: userList } = await http('GET', '/classes/_User?limit=1000', undefined, admin);
  const idOf = (username) => userList.results.find((u) => u.username === username).objectId;
  const minted = [];
  const session = async (username) => {
    const token = `check-read-functions-${createHash('sha256').update(username + Date.now()).digest('hex').slice(0, 24)}`;
    const { body } = await http('POST', '/classes/_Session', { sessionToken: token, userId: idOf(username) }, admin);
    minted.push(body.objectId);
    return token;
  };
  const probeNotes = [];
  try {
    const tokens = { sam: await session('sam.okafor@example.test'), priya: await session('priya@example.test'), staff: await session('trainer@example.test') };
    const timings = {};
    const call = async (fn, token, body = {}) => {
      const r = await http('POST', `/functions/${fn}`, body, token ? { 'X-Parse-Session-Token': token } : {});
      timings[fn] = Math.max(timings[fn] || 0, r.ms);
      return r;
    };
    const rows = async (fn, token, body) => {
      const r = await call(fn, token, body);
      if (r.status !== 200) throw new Error(`${fn} answered ${r.status}: ${r.text.slice(0, 200)}`);
      return r.body.result.rows;
    };
    const asLive = {
      course: ({ as, body }) => rows('course', as, body),
      learnerProgramme: ({ learnerId, now, as }) => rows('learnerProgramme', as, { learnerId, now }),
      lesson: ({ as, conceptId }) => rows('lesson', as, { conceptId }),
      roster: ({ as }) => rows('roster', as)
    };
    await criteria(asLive, 'live', tokens.sam, tokens.priya, tokens.staff);

    // 3. The gate, calibrated: staff first, so a refusal is a refusal.
    check((await call('roster', tokens.staff)).status === 200, '[live] C3 calibration: staff could not call roster');
    const anon = await Promise.all(['course', 'lesson', 'roster', 'learnerProgramme'].map((fn) => call(fn, null, fn === 'lesson' ? { conceptId: 'x' } : fn === 'learnerProgramme' ? { learnerId: SAM } : {})));
    for (const r of anon) check(r.status >= 400 && !/"rows"/.test(r.text), `[live] C3 an anonymous call was answered ${r.status}`);
    const learnerAtStaff = [await call('roster', tokens.sam), await call('learnerProgramme', tokens.sam, { learnerId: SAM })];
    const md5 = (s) => createHash('md5').update(s).digest('hex');
    for (const r of learnerAtStaff) check(r.status >= 400 && !/"rows"/.test(r.text), `[live] C3 a learner reached a staff function (${r.status})`);
    /* CRITERION 3 CORRECTED IN PLACE, NOT SATISFIED: "one md5" is impossible by
       construction. The backend's refusal is `Permission denied for function
       "<name>"` plus a `requestId` unique to every request, so even two refusals
       of the SAME function never share an md5. What the criterion protects is that
       a refusal tells a learner nothing about the function beyond the name they
       already sent — so the bodies are compared with those two normalised. */
    const normalised = (r) => {
      const body = JSON.parse(r.text);
      delete body.requestId;
      body.error = String(body.error).replace(/"[^"]+"/, '"<function>"');
      return JSON.stringify(body);
    };
    check(normalised(learnerAtStaff[0]) === normalised(learnerAtStaff[1]) && learnerAtStaff[0].status === learnerAtStaff[1].status,
      `[live] C3 the two staff refusals to a learner differ beyond the function name and requestId: ${normalised(learnerAtStaff[0])} / ${normalised(learnerAtStaff[1])}`);
    // An INTERNAL note, live: the coach reads it, the learner never does.
    const { body: note } = await http('POST', '/classes/CoachNote', { noteId: 'probe-internal', learnerId: SAM, visibility: 'internal',
      body: 'PROBE-INTERNAL-BODY', authorEmail: 'trainer@example.test', createdAt: FIXTURE_NOW }, admin);
    probeNotes.push(note.objectId);
    check(!JSON.stringify(await rows('course', tokens.sam)).includes('PROBE-INTERNAL-BODY'), '[live] C5 an internal note reached course');
    check(JSON.stringify(await rows('learnerProgramme', tokens.staff, { learnerId: SAM, now: FIXTURE_NOW })).includes('PROBE-INTERNAL-BODY'),
      '[live] C5 positive control: the internal note did not reach the coach');
    // 7. Under two seconds each, recorded as a baseline for L171's Postgres run.
    for (const [fn, ms] of Object.entries(timings)) check(ms < 2000, `[live] C7 ${fn} took ${ms} ms`);
    live = { timings, anonymous: anon.map((r) => r.status), learnerAtStaff: learnerAtStaff[0].status };
  } catch (e) {
    // A crash is reported as a failure, never left as a stack: the cleanup below
    // must still run and still be checked.
    failures.push(`[live] stopped: ${e.message}`);
  } finally {
    /* CLEANUP IS VERIFIED, NEVER ASSUMED. A DELETE here answers 200 even for an id
       that does not exist, so its status proves nothing — each row is read back and
       must be gone. The first version trusted the DELETEs and left three sessions
       and the probe note behind, which check-seed then found. */
    const gone = async (collection, id) => {
      if (!id) return failures.push(`[live] cleanup: a ${collection} row was created with no id to delete`);
      await http('DELETE', `/classes/${collection}/${id}`, undefined, admin);
      const back = await http('GET', `/classes/${collection}/${id}`, undefined, admin);
      if (back.status !== 404) failures.push(`[live] cleanup: ${collection} ${id} is still there (${back.status})`);
    };
    for (const id of probeNotes) await gone('CoachNote', id);
    for (const id of minted) await gone('_Session', id);
  }
}

if (failures.length) {
  console.error(`check-read-functions: ${failures.length} failure(s)\n  ✗ ${failures.join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(
  `check-read-functions: OK — offline: all four functions equal their fixtures through the product's projections at ${FIXTURE_NOW}, ` +
    `the window ${WINDOW_START} → ${WINDOW_END} exact at both edges, course the coach's list minus its signals, ` +
    `no label or staff email in a learner's payload, an internal note to the coach only; queries per call: ` +
    `course ${counted.caller + counted.programme}, learnerProgramme ${counted.programme}, lesson ${counted.lesson}, roster ${counted.roster}.` +
    (live
      ? ` LIVE: the same, over HTTP; anonymous ${live.anonymous.join('/')}, a learner at a staff function ${live.learnerAtStaff} (one body); ` +
        `slowest call per function ${Object.entries(live.timings).map(([f, ms]) => `${f} ${ms} ms`).join(', ')}.`
      : ' (offline only — pass --backend … --scratch for the live half.)')
);
