#!/usr/bin/env node
/**
 * THE TWO WRITE FUNCTIONS, OFFLINE, AGAINST A FAKE AS STRICT AS THE BACKEND
 * (TASK-L177, TASK-L178).
 *
 * `capture` (a learner's answer onto their project) and `finishStep` (this step
 * complete, the next open) are the template's first writes, on OpenNoodl
 * HLT-016's compare-and-swap: `Records.save(id, props, { className, ifMatch })`,
 * refused with `code: 'precondition-failed'` when the row no longer holds what
 * was read.
 *
 * ── THE FAKE ENFORCES WHAT THE BACKEND ENFORCES, OR IT PROVES NOTHING ───────
 * L170's lesson: every offline double that was looser than the backend passed
 * what live refused. So this `Records` refuses a read without `{ plain: true }`
 * (HLT-022), a save without `className` (a plain read has no Model to find it
 * from), a filter with two keys, and a create that breaks a unique index — and
 * it applies `ifMatch` exactly as the backend's UPDATE does: all named fields
 * equal, or `precondition-failed` and nothing written.
 *
 * ── THE RACE, BY CONSTRUCTION ─────────────────────────────────────────────
 * Two captures at once only lose a fact when both READ before either WRITES.
 * Timing cannot promise that offline, so a barrier does: the first read of the
 * project by each caller waits until every caller has read. That is the losing
 * interleaving on every run. Then the same race runs with `ifMatch` cut out of
 * the function's own script — the CONTROL — and must lose a fact, or this check
 * could not see the thing it guards.
 *
 * Run: node tools/check-write-functions.mjs
 *      node tools/check-write-functions.mjs --backend http://127.0.0.1:8577 --token <admin> --scratch \
 *           [--log <backend log file>] [--expect-loss]
 * The live half WRITES; run `reset-demo` afterwards.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './lib/seed-resolve.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(TEMPLATE, p), 'utf8'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const cloud = (name) => ({
  nodes: json(`components/__cloud__/${name}/nodes.json`).nodes,
  wires: json(`components/__cloud__/${name}/connections.json`).connections
});
const script = (name, id) => cloud(name).nodes.find((n) => n.id === id).parameters.functionScript;

// ── The graph ────────────────────────────────────────────────────────────────
const WIRING = {
  capture: ['req.userId>who.userId', 'who.learnerId>write.in-learnerId', 'req.pm-conceptId>write.in-conceptId', 'req.pm-field>write.in-field', 'req.pm-value>write.in-value', 'write.out-version>res.pm-version', 'write.out-bumped>res.pm-bumped', 'write.out-done>res.send', 'write.out-failed>deny.send', 'who.failed>deny.send'],
  finishStep: ['req.userId>who.userId', 'who.learnerId>write.in-learnerId', 'req.pm-conceptId>write.in-conceptId', 'write.out-steps>res.pm-steps', 'write.out-done>res.send', 'write.out-failed>deny.send', 'who.failed>deny.send']
};
for (const [fn, wires] of Object.entries(WIRING)) {
  const have = new Set(cloud(fn).wires.map((c) => `${c.fromId}.${c.fromProperty}>${c.toId}.${c.toProperty}`));
  for (const w of wires) check(have.has(w), `wiring: ${fn} has no ${w}`);
  const req = cloud(fn).nodes.find((n) => n.id === 'req');
  const params = String(req.parameters.params || '').split(',').filter(Boolean);
  // §4: a write that accepts a learner id is a write somebody can aim at someone else.
  check(!params.some((p) => /learner|user/i.test(p)), `gate: ${fn} declares a parameter naming a person (${params.join(', ')})`);
  check(req.parameters.allowNoAuth === false, `gate: ${fn} allows an anonymous caller`);
  check(cloud(fn).nodes.find((n) => n.id === 'who').type === '/#__cloud__/shared/Caller learner', `gate: ${fn} does not take its learner from Caller learner`);
}
const security = json('nodegx.security.json');
for (const fn of ['capture', 'finishStep']) check(security.functions[fn] && security.functions[fn].call === 'authenticated', `security: ${fn} is not "authenticated"`);
check(Object.keys(security.collections || {}).length === 0, 'security: a collection is open to a client — the writes are functions');
for (const [op, who] of Object.entries(security.defaults.permissions)) check(who === 'nobody', `security: default ${op} is ${who}, not nobody`);

/* L178 §3: the ORDER is the design. Stamp (invisible), open the next, then
   complete this one — so no crash between two writes can leave every step done
   and nothing open. Asserted on positions in the source, because a reorder
   typechecks and reads fine. */
{
  const s = script('finishStep', 'write');
  const at = (needle) => s.indexOf(needle);
  const stamp = at("{ completedAt: now }");
  const open = at("setStatus(next, 'locked', 'available')");
  const done = at("setStatus(conceptId, null, 'complete')");
  check(stamp > -1 && open > -1 && done > -1, 'finishStep: one of its three writes is not where this check looks for it');
  check(stamp < open && open < done, 'finishStep: the writes are not in the order stamp → open the next → complete this (TASK-L178 §3)');
  // Both step writes carry a precondition; neither is an unconditional save.
  check((s.match(/className: 'PathStep', ifMatch/g) || []).length === 1 && /async function setStatus/.test(s), 'finishStep: a step is written without ifMatch');
}
check(/className: 'ProjectContext', ifMatch: \{ version \}/.test(script('capture', 'write')), 'capture: the context is written without ifMatch: { version }');

/* A client Cloud Function's outcome ports are `done` and `failure` (ERG-001
   renamed `Success` to `Done`). A wire from `success` is accepted by NodeGX's
   validator and never fires: the page shows Saving… forever and the console
   says "doesn't have a port named success" — measured on the first drive of
   TASK-L177. So every client Cloud Function wire in the template is checked. */
{
  const { readdirSync, statSync } = await import('node:fs');
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  let clientCalls = 0;
  for (const f of walk(join(TEMPLATE, 'components')).filter((f) => f.endsWith('nodes.json') && !f.includes('__cloud__'))) {
    const nodes = JSON.parse(readFileSync(f, 'utf8')).nodes;
    const calls = new Set(nodes.filter((n) => n.type === 'CloudFunction2').map((n) => n.id));
    if (!calls.size) continue;
    clientCalls += calls.size;
    const wires = JSON.parse(readFileSync(f.replace('nodes.json', 'connections.json'), 'utf8')).connections;
    for (const w of wires.filter((w) => calls.has(w.fromId))) {
      check(['done', 'failure', 'error'].includes(w.fromProperty) || w.fromProperty.startsWith('out-'), `wiring: ${f.split('components/')[1]} wires ${w.fromId}.${w.fromProperty}, which a Cloud Function does not have`);
    }
  }
  // TASK-L185 added three: acceptPrivacy (the acceptance screen), exportMine and deleteMine (settings).
  // TASK-L184 added three on the coach's side: addLearner (People/Add a learner), conceptList and setLearnerPath (People/Their path).
  // TASK-L186 added four in Course/Timeline row: openThread, sendMessage, openThreadAsCoach, replyAsCoach.
  check(clientCalls === 16, `wiring: expected 16 client Cloud Function nodes (4 reads, capture, finishStep, acceptPrivacy, exportMine, deleteMine, addLearner, conceptList, setLearnerPath, openThread, sendMessage, openThreadAsCoach, replyAsCoach), found ${clientCalls}`);
}


// ── The fake ─────────────────────────────────────────────────────────────────
const seed = json('backend/seed.json');
const oid = (username) => `u:${username}`;
const UNIQUE = { Progress: ['learnerId', 'conceptId'], ProjectContext: ['learnerId'], PathStep: ['pathId', 'position'] };
let serial = 0;
function makeWorld() {
  const t = { _User: seed.users.map((u) => ({ ...userFields(u).fields, objectId: oid(u.username) })) };
  for (const [c, rows] of Object.entries(seed.rows)) t[c] = rows.map((r) => ({ objectId: `${c}:${serial++}`, ...resolveRow(c, r, oid) }));
  return t;
}
const matches = (row, where) => {
  const keys = Object.keys(where);
  if (keys.length === 0) return true;
  if (keys.length > 1) throw new Error(`A filter must have exactly one key, found ${keys.join(', ')} (the backend refuses it)`);
  const [k] = keys;
  const c = where[k];
  if (k === 'and') return c.every((w) => matches(row, w));
  if (k === 'or') return c.some((w) => matches(row, w));
  if ('equalTo' in c) return row[k] === c.equalTo;
  if ('containedIn' in c) return Array.isArray(c.containedIn) && c.containedIn.includes(row[k]);
  throw new Error(`the fake does not implement ${JSON.stringify(c)}`);
};
const copy = (x) => JSON.parse(JSON.stringify(x));
function makeRecords(table, { beforeRead } = {}) {
  const stats = { writes: 0, conflicts: 0 };
  const Records = {
    async query(c, where = {}, options = {}) {
      if (options.plain !== true) throw new Error(`Records.query('${c}') without { plain: true } (HLT-022)`);
      if (beforeRead) await beforeRead(c);
      const rows = (table[c] || []).filter((r) => matches(r, where));
      return rows.slice(0, options.limit ?? 100).map(copy);
    },
    async save(id, props, options = {}) {
      await Promise.resolve();
      if (!options.className) throw new Error('Records.save without className — a plain read has no Model to find the class from');
      const row = (table[options.className] || []).find((r) => r.objectId === id);
      if (!row) throw new Error('Object not found.');
      if (options.ifMatch) {
        for (const [k, v] of Object.entries(options.ifMatch)) {
          if (row[k] !== v) {
            stats.conflicts++;
            const e = new Error('Someone else changed this record since it was read.');
            e.code = 'precondition-failed';
            throw e;
          }
        }
      }
      Object.assign(row, copy(props), { updatedAt: new Date().toISOString() });
      stats.writes++;
    },
    async create(c, props) {
      await Promise.resolve();
      const keys = UNIQUE[c] || [];
      if (keys.length && (table[c] || []).some((r) => keys.every((k) => r[k] === props[k]))) throw new Error(`duplicate value for a unique index on ${c}`);
      (table[c] = table[c] || []).push({ objectId: `${c}:${serial++}`, ...copy(props), updatedAt: new Date().toISOString() });
      stats.writes++;
    }
  };
  return { Records, stats };
}
/** One node's script: resolves with Outputs on `done`, with `{ refused }` on `failed`. */
const run = (code, Inputs, Records) =>
  new Promise((resolve_) => {
    const Outputs = { done: () => resolve_({ ok: true, ...Outputs }), failed: () => resolve_({ ok: false, refused: Outputs.error }), stale: () => resolve_({ ok: false, stale: true }), refuse: () => resolve_({ ok: false, refused: Outputs.why }) };
    new Function('Inputs', 'Outputs', 'Noodl', code)(Inputs, Outputs, { Records });
  });
const quiet = async (fn) => {
  const { warn, error } = console;
  const log = [];
  console.warn = (...a) => log.push(a.join(' '));
  console.error = (...a) => log.push(a.join(' '));
  try { return { result: await fn(), log }; } finally { Object.assign(console, { warn, error }); }
};
const SAM = 'l-sam';
const samUserId = oid('sam.okafor@example.test');
const learnerOf = async (table, userId) => (await run(script('shared/Caller learner', 'cl_fn'), { userId }, makeRecords(table).Records)).learnerId;
const ctxOf = (table) => table.ProjectContext.find((r) => r.learnerId === SAM);
const pathOf = (table) => table.LearningPath.filter((p) => p.learnerId === SAM).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
const stepsOf = (table) => table.PathStep.filter((s) => s.pathId === pathOf(table).pathId).sort((a, b) => a.position - b.position);
const status = (table, concept) => stepsOf(table).find((s) => s.conceptId === concept).status;

// ── capture ──────────────────────────────────────────────────────────────────
const CAPTURE = script('capture', 'write');
const capture = (table, input, records = makeRecords(table).Records, code = CAPTURE) => run(code, { learnerId: SAM, noticeCurrent: true, ...input }, records);
/** Every field Sam can be asked for on a step he has reached: the capture sections and the fact-capturing activities. */
function askable(table) {
  const open = new Set(stepsOf(table).filter((s) => s.status !== 'locked').map((s) => s.conceptId));
  const out = [];
  for (const l of table.Lesson.filter((x) => x.learnerId === SAM && open.has(x.conceptId))) {
    for (const s of l.sections) {
      if (s.kind === 'capture') out.push({ conceptId: l.conceptId, field: s.field });
      if (s.kind === 'activity' && s.capturesProjectFact) out.push({ conceptId: l.conceptId, field: s.capturesProjectFact.field });
    }
  }
  return out;
}
{
  const table = makeWorld();
  check((await learnerOf(table, samUserId)) === SAM, 'Caller learner does not resolve Sam from his session');
  const v0 = ctxOf(table).version;
  const r = await capture(table, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: '  Calm and friendly, like a bike shop you trust.  ' });
  check(r.ok && r.version === v0 + 1 && r.bumped === true, `capture: a first save did not answer version ${v0 + 1}, bumped (got ${JSON.stringify(r)})`);
  check(ctxOf(table).facts.howThePageShouldFeel === 'Calm and friendly, like a bike shop you trust.', 'capture: the fact was not stored trimmed');
  check(Object.keys(ctxOf(table).facts).length === 16, `capture: the save lost or added a fact (${Object.keys(ctxOf(table).facts).length} ≠ 16)`);

  const { Records, stats } = makeRecords(table);
  const same = await capture(table, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'Calm and friendly, like a bike shop you trust.' }, Records);
  check(same.ok && same.bumped === false && same.version === v0 + 1 && stats.writes === 0, 'capture: identical words were written again or moved the version');

  const act = await capture(table, { conceptId: 'css-making-it-look-right', field: 'whatThePhoneShowed', value: 'The photos were squashed.' });
  check(act.ok && act.bumped, 'capture: an activity\'s fact was not saved');

  const before = JSON.stringify(ctxOf(table));
  const REFUSED = [
    ['a field on none of his lessons', { conceptId: 'css-making-it-look-right', field: 'favouriteColour', value: 'teal' }],
    ['a field from a different lesson', { conceptId: 'css-making-it-look-right', field: 'whatHappensToAMessage', value: 'x' }],
    ['a concept whose step is locked', { conceptId: 'javascript-making-it-do-things', field: 'howThePageShouldFeel', value: 'x' }],
    ['an unknown concept', { conceptId: 'no-such-concept', field: 'howThePageShouldFeel', value: 'x' }],
    ['an empty value', { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: '   ' }],
    ['2,001 characters', { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x'.repeat(2001) }],
    ['a 129-character field', { conceptId: 'css-making-it-look-right', field: 'f'.repeat(129), value: 'x' }]
  ];
  for (const [label, input] of REFUSED) {
    const { result } = await quiet(() => capture(table, input));
    check(result.ok === false, `capture: ${label} was not refused`);
  }
  const { result: nobody } = await quiet(() => run(CAPTURE, { noticeCurrent: true, learnerId: 'l-newstart', conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x' }, makeRecords(table).Records));
  check(nobody.ok === false, 'capture: a learner with no path could write');
  const { result: signedOut } = await quiet(() => run(CAPTURE, { noticeCurrent: true, learnerId: '', conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x' }, makeRecords(table).Records));
  check(signedOut.ok === false, 'capture: an account with no learner could write');
  check(JSON.stringify(ctxOf(table)) === before, 'capture: a refusal changed the project context');
  const okCap = await capture(table, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x'.repeat(2000) });
  check(okCap.ok, 'capture: exactly 2,000 characters was refused — the cap is off by one');

  // TASK-L185 §2: under an out-of-date privacy notice the write is refused with its OWN body,
  // and nothing is written — not even a read-then-skip that could move a version.
  const { Records: rs, stats: ss } = makeRecords(table);
  const beforeStale = JSON.stringify(ctxOf(table));
  const { result: stale } = await quiet(() => capture(table, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'under a stale notice', noticeCurrent: false }, rs));
  check(stale.ok === false && stale.stale === true, `capture: a stale notice was not refused as stale (${JSON.stringify(stale)})`);
  check(ss.writes === 0 && JSON.stringify(ctxOf(table)) === beforeStale, 'capture: a stale notice still wrote');
}

/** Every caller's FIRST read of the project waits until all of them have read it: the losing interleaving, every run. */
function barrier(n) {
  let arrived = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  let passed = 0;
  return async (c) => {
    if (c !== 'ProjectContext' || passed >= n) return;
    passed++;
    arrived++;
    if (arrived === n) release();
    await gate;
  };
}
async function race(code) {
  const table = makeWorld();
  const fields = askable(table);
  const { Records, stats } = makeRecords(table, { beforeRead: barrier(fields.length) });
  const v0 = ctxOf(table).version;
  const { result, log } = await quiet(() => Promise.all(fields.map((f, i) => capture(table, { ...f, value: `race answer ${i}` }, Records, code))));
  const kept = fields.filter((f, i) => ctxOf(table).facts[f.field] === `race answer ${i}`).length;
  return { n: fields.length, allOk: result.every((r) => r.ok), kept, version: ctxOf(table).version - v0, conflicts: stats.conflicts, retries: log.filter((l) => l.includes('conflict')).length };
}
{
  const guarded = await race(CAPTURE);
  check(guarded.n === 12, `race: Sam has ${guarded.n} askable fields, not 12 — the fixture moved`);
  check(guarded.allOk && guarded.kept === guarded.n && guarded.version === guarded.n, `race: guarded, ${guarded.kept}/${guarded.n} facts kept, version +${guarded.version} (${JSON.stringify(guarded)})`);
  check(guarded.conflicts >= guarded.n - 1 && guarded.retries >= 1, `race: the barrier did not force conflicts (${guarded.conflicts}) — this proves nothing`);

  /* THE CONTROL: the function's own script with the precondition cut out. It must
     LOSE facts while telling every caller it worked (L62), or this check is blind. */
  const cut = CAPTURE.replace(", { className: 'ProjectContext', ifMatch: { version } }", ", { className: 'ProjectContext' }");
  check(cut !== CAPTURE, 'race: the control mutation did not apply — the save line moved');
  const control = await race(cut);
  check(control.allOk && control.kept < control.n, `race: with ifMatch removed nothing was lost (${JSON.stringify(control)}) — the race is not being exercised`);
  console.log(`  race: guarded ${guarded.kept}/${guarded.n} kept, +${guarded.version}, ${guarded.conflicts} conflicts · control (no ifMatch) ${control.kept}/${control.n} kept, all ${control.n} told OK`);
}

// ── setLearnerPath and addLearner (TASK-L184) ────────────────────────────────
{
  const PATH = script('setLearnerPath', 'write');
  const GIVE = script('addLearner', 'give');
  const table = makeWorld();
  const known = table.Concept.map((c) => c.conceptId);
  const finished = table.Progress.filter((p) => p.learnerId === SAM && p.completedAt).map((p) => p.conceptId);
  check(finished.length > 0 && known.length >= 4, 'setLearnerPath: the seed has no finished concept or too few concepts to test with');
  const freshConcept = known.find((c) => finished.indexOf(c) === -1);
  const snapshot = () => JSON.stringify([table.LearningPath, table.PathStep]);

  // Refusals, each by name, each writing nothing.
  const before = snapshot();
  for (const [label, input, needle] of [
    ['an unknown concept', { learnerId: SAM, conceptIds: [freshConcept, 'no-such-concept'] }, 'no-such-concept'],
    ['an empty path', { learnerId: SAM, conceptIds: [] }, 'at least one'],
    ['a concept twice', { learnerId: SAM, conceptIds: [freshConcept, freshConcept] }, 'twice'],
    ['an unknown learner', { learnerId: 'l-nobody', conceptIds: [freshConcept] }, 'no learner']
  ]) {
    const { result } = await quiet(() => run(PATH, input, makeRecords(table).Records));
    check(result.ok === false && String(result.refused || '').includes(needle), `setLearnerPath: ${label} was not refused by name (${JSON.stringify(result)})`);
    if (label === 'an unknown concept') check(!String(result.refused).includes(freshConcept), 'setLearnerPath: the refusal named a concept that IS in the course');
  }
  check(snapshot() === before, 'setLearnerPath: a refusal wrote a path or a step');

  // A path: a NEW row, the path written before its steps, the coach's order kept,
  // what they finished still finished, the first unfinished step open, the rest locked.
  const order = [finished[0], freshConcept, known.find((c) => c !== freshConcept && finished.indexOf(c) === -1 && c !== finished[0])];
  const paths0 = table.LearningPath.length;
  const r = await run(PATH, { learnerId: SAM, conceptIds: order }, makeRecords(table).Records);
  check(r.ok && r.steps === 3, `setLearnerPath: a good path was not saved (${JSON.stringify(r)})`);
  check(table.LearningPath.length === paths0 + 1, 'setLearnerPath: it did not write a NEW path row (a replan writes a new row and leaves the old one)');
  const newPath = table.LearningPath[table.LearningPath.length - 1];
  const steps = table.PathStep.filter((x) => x.pathId === newPath.pathId).sort((a, b) => a.position - b.position);
  const serial = (o) => Number(String(o.objectId).split(':')[1]);
  check(steps.every((x) => serial(x) > serial(newPath)), 'setLearnerPath: a step was written before its path row — a crash between would leave steps no path names');
  check(JSON.stringify(steps.map((x) => x.conceptId)) === JSON.stringify(order), 'setLearnerPath: the coach\'s order was not kept');
  check(JSON.stringify(steps.map((x) => x.status)) === JSON.stringify(['complete', 'available', 'locked']), `setLearnerPath: statuses are ${steps.map((x) => x.status)} — expected what they finished complete, the next open, the rest locked`);
  check(steps.every((x) => x.rationale === ''), 'setLearnerPath: a step carries a rationale nobody wrote');

  // addLearner's second half: a coach's account is refused and nothing is written;
  // a new account gets a profile, a project and the label once; a second run writes nothing.
  const accts = (n) => [table.LearnerProfile.length, table.ProjectContext.length, (table.LearnerInvite || []).length].join('/');
  const a0 = accts();
  const { result: staffR } = await quiet(() => run(GIVE, { userId: 'u:trainer@example.test', roles: ['staff'], projectName: 'X', problemStatement: '', label: 'L' }, makeRecords(table).Records));
  check(staffR.ok === false && /coach/.test(String(staffR.refused)) && accts() === a0, 'addLearner: a coach\'s address was not refused, or something was written for it');
  const first = await run(GIVE, { userId: 'u:new@example.org', roles: [], projectName: ' A choir sign-up sheet ', problemStatement: 'Paper list', label: 'Lena — spring' }, makeRecords(table).Records);
  check(first.ok && first.created === true && /^l-/.test(first.learnerId), `addLearner: a new learner was not made (${JSON.stringify(first)})`);
  const ctx = table.ProjectContext.find((x) => x.learnerId === first.learnerId);
  check(ctx && ctx.version === 1 && ctx.projectName === 'A choir sign-up sheet' && JSON.stringify(ctx.facts) === '{}', 'addLearner: the project is not version 1, trimmed, with empty facts');
  check((table.LearnerInvite || []).some((i) => i.claimedByLearnerId === first.learnerId && i.label === 'Lena — spring' && i.status === 'claimed'), 'addLearner: the label is not on a claimed invite, where the roster reads it');
  const a1 = accts();
  const { Records: rs2, stats: st2 } = makeRecords(table);
  const again = await run(GIVE, { userId: 'u:new@example.org', roles: [], projectName: 'Something else', problemStatement: '', label: 'another label' }, rs2);
  check(again.ok && again.created === false && again.learnerId === first.learnerId && st2.writes === 0 && accts() === a1, 'addLearner: a second run with the same account wrote something or made a second learner');
  console.log(`  L184: setLearnerPath refused 4 ways by name, saved [${steps.map((x) => x.status)}] path-first; addLearner refused a coach, made one learner, and wrote nothing the second time`);
}

// ── finishStep ───────────────────────────────────────────────────────────────
const FINISH = script('finishStep', 'write');
const finish = (table, conceptId, records = makeRecords(table).Records) => run(FINISH, { learnerId: SAM, noticeCurrent: true, conceptId }, records);
{
  const table = makeWorld();
  check(status(table, 'css-making-it-look-right') === 'in_progress' && status(table, 'javascript-making-it-do-things') === 'locked', 'finishStep: the seed is not step 5 in progress, step 6 locked');
  const r = await finish(table, 'css-making-it-look-right');
  check(r.ok, `finishStep: finishing step 5 was refused (${r.refused})`);
  check(status(table, 'css-making-it-look-right') === 'complete', 'finishStep: step 5 is not complete');
  check(status(table, 'javascript-making-it-do-things') === 'available', 'finishStep: step 6 did not open');
  check(stepsOf(table).filter((s) => s.status === 'available' || s.status === 'in_progress').length === 1, 'finishStep: more or fewer than one step is open');
  const prog = table.Progress.find((p) => p.learnerId === SAM && p.conceptId === 'css-making-it-look-right');
  check(prog && prog.completedAt && Date.now() - Date.parse(prog.updatedAt) < 60_000, 'finishStep: the progress row was not stamped');
  check(Array.isArray(r.steps) && r.steps.length === 20 && r.steps.every((s) => Object.keys(s).join() === 'conceptId,status'), 'finishStep: the answer is not the product\'s {conceptId, status} per live step');

  const again = await finish(table, 'css-making-it-look-right');
  check(again.ok && status(table, 'javascript-making-it-do-things') === 'available', 'finishStep: pressing it again on a finished step was not harmless');

  // TASK-L185 §2: a stale privacy notice refuses the finish, as its own refusal, and moves nothing.
  {
    const t2 = makeWorld();
    const { Records: rs, stats: ss } = makeRecords(t2);
    const before2 = JSON.stringify(stepsOf(t2));
    const { result: stale } = await quiet(() => run(FINISH, { learnerId: SAM, noticeCurrent: false, conceptId: 'css-making-it-look-right' }, rs));
    check(stale.ok === false && stale.stale === true, `finishStep: a stale notice was not refused as stale (${JSON.stringify(stale)})`);
    check(ss.writes === 0 && JSON.stringify(stepsOf(t2)) === before2, 'finishStep: a stale notice still moved a step');
  }

  const before = JSON.stringify(stepsOf(table));
  for (const [label, concept] of [['a locked step', 'reading-what-the-ai-did'], ['an unknown concept', 'no-such-concept']]) {
    const { result } = await quiet(() => finish(table, concept));
    check(result.ok === false, `finishStep: ${label} was not refused`);
  }
  check(JSON.stringify(stepsOf(table)) === before, 'finishStep: a refusal changed the path');
}
{
  // A double press: two calls whose reads both land before either writes.
  const table = makeWorld();
  let reads = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const { Records, stats } = makeRecords(table, {
    beforeRead: async (c) => {
      if (c !== 'LearningPath' || reads >= 2) return;
      reads++;
      if (reads === 2) release();
      await gate;
    }
  });
  const { result, log } = await quiet(() => Promise.all([finish(table, 'css-making-it-look-right', Records), finish(table, 'css-making-it-look-right', Records)]));
  check(result.every((x) => x.ok), `finishStep: a double press refused one of them (${JSON.stringify(result.map((x) => x.refused))})`);
  check(status(table, 'css-making-it-look-right') === 'complete' && status(table, 'javascript-making-it-do-things') === 'available', 'finishStep: a double press left the path wrong');
  check(stepsOf(table).filter((s) => s.status === 'available').length === 1, 'finishStep: a double press opened more than one step');
  check(stats.conflicts >= 1 && log.some((l) => l.includes('conflict')), `finishStep: the double press produced no conflict (${stats.conflicts}) — it was not concurrent`);
  console.log(`  double press: both OK, ${stats.conflicts} conflict(s) read again, one step open`);
}

// ── LIVE (--backend --token --scratch [--log <backend log>] [--expect-loss]) ──
/* The same properties over HTTP, on a backend `setup-backend` seeded and
   `deploy-functions` loaded. It WRITES — Sam's project and path change — so
   `--scratch` is required and means it: afterwards, `reset-demo` puts the seed
   back. `--log` is the backend's log file, read to count the conflicts the
   function reported (a 409 is invisible to the caller by design: it is retried).
   `--expect-loss` is the CONTROL run: the deployed `capture` has had ifMatch cut
   out, and this asserts the race LOSES facts while every caller is told 200 —
   the L62 failure, reproduced on the backend before the guard is believed. */
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const BACKEND = arg('backend') ? arg('backend').replace(/\/$/, '') : null;
if (BACKEND) {
  const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
  if (!process.argv.includes('--scratch')) { console.error('check-write-functions: live mode WRITES. Pass --scratch to say this backend is disposable.'); process.exit(2); }
  if (!TOKEN) { console.error('check-write-functions: live mode needs --token.'); process.exit(2); }
  const LOG = arg('log');
  const expectLoss = process.argv.includes('--expect-loss');
  const admin = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
  const http = async (method, path, body, headers = {}) => {
    const res = await fetch(BACKEND + path, { method, headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, text, body: text ? JSON.parse(text) : null };
  };
  const q = async (c, where) => (await http('GET', `/classes/${c}?limit=1000&where=${encodeURIComponent(JSON.stringify(where))}`, undefined, admin)).body.results;
  const users = (await http('GET', '/classes/_User?limit=1000', undefined, admin)).body.results;
  const minted = [];
  const session = async (username) => {
    const token = `check-write-${username.split('@')[0]}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const { body } = await http('POST', '/classes/_Session', { sessionToken: token, userId: users.find((u) => u.username === username).objectId }, admin);
    minted.push(body.objectId);
    return token;
  };
  const call = (fn, token, body) => http('POST', `/functions/${fn}`, body, token ? { 'X-Parse-Session-Token': token } : {});
  const ctx = async () => (await q('ProjectContext', { learnerId: SAM }))[0];
  const liveSteps = async () => {
    const path = (await q('LearningPath', { learnerId: SAM })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    return (await q('PathStep', { pathId: path.pathId })).sort((a, b) => a.position - b.position);
  };
  const conflictsInLog = (fn) => (LOG ? (readFileSync(LOG, 'utf8').match(new RegExp(`\\[dbt:${fn}\\] conflict`, 'g')) || []).length : null);
  try {
    const sam = await session('sam.okafor@example.test');
    const priya = await session('priya@example.test');
    // Sam's askable fields, from the lessons the BACKEND holds.
    const open = new Set((await liveSteps()).filter((s) => s.status !== 'locked').map((s) => s.conceptId));
    const fields = [];
    for (const l of await q('Lesson', { learnerId: SAM })) {
      if (!open.has(l.conceptId)) continue;
      for (const s of l.sections) {
        if (s.kind === 'capture') fields.push({ conceptId: l.conceptId, field: s.field });
        if (s.kind === 'activity' && s.capturesProjectFact) fields.push({ conceptId: l.conceptId, field: s.capturesProjectFact.field });
      }
    }
    const before = await ctx();
    const conflicts0 = conflictsInLog('capture');
    const stamp = Date.now();
    const answers = await Promise.all(fields.map((f, i) => call('capture', sam, { ...f, value: `live race ${stamp} ${i}` })));
    const after = await ctx();
    const kept = fields.filter((f, i) => after.facts[f.field] === `live race ${stamp} ${i}`).length;
    const all200 = answers.every((a) => a.status === 200);
    const conflicts = conflictsInLog('capture') === null ? null : conflictsInLog('capture') - conflicts0;
    console.log(`  live race: ${fields.length} captures at once → ${kept} kept, version ${before.version} → ${after.version}, statuses ${[...new Set(answers.map((a) => a.status))].join(',')}, conflicts logged ${conflicts ?? 'n/a (no --log)'}`);
    if (expectLoss) {
      check(all200 && kept < fields.length, `CONTROL: with ifMatch cut out, expected facts lost and every caller told 200 — got ${kept}/${fields.length}, all200=${all200}`);
    } else {
      check(fields.length === 12, `live: Sam has ${fields.length} askable fields, not 12`);
      check(all200 && kept === fields.length, `live race: ${kept}/${fields.length} facts kept (all 200: ${all200})`);
      check(after.version === before.version + fields.length, `live race: version moved ${after.version - before.version}, not ${fields.length}`);
      if (conflicts !== null) check(conflicts >= 1, 'live race: no conflict was logged — the race did not happen, so it proves nothing');

      // Identical words: no write, no version move.
      const again = await call('capture', sam, { ...fields[0], value: `live race ${stamp} 0` });
      check(again.status === 200 && again.body.result.bumped === false && (await ctx()).version === after.version, 'live: identical words moved the version');

      // Refusals: one body, the project unchanged.
      const snapshot = JSON.stringify(await ctx());
      const bodies = new Set();
      const REFUSE = [
        ['a field on none of his lessons', sam, { conceptId: 'css-making-it-look-right', field: 'favouriteColour', value: 'teal' }],
        ['a locked step', sam, { conceptId: 'javascript-making-it-do-things', field: 'howThePageShouldFeel', value: 'x' }],
        ['an unknown concept', sam, { conceptId: 'no-such-concept', field: 'howThePageShouldFeel', value: 'x' }],
        ['an empty value', sam, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: '   ' }],
        ['2,001 characters', sam, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x'.repeat(2001) }],
        ["another learner's session (Sam's field)", priya, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x' }],
        ['a learnerId in the body is ignored', sam, { conceptId: 'css-making-it-look-right', field: 'favouriteColour', value: 'x', learnerId: 'l-priya' }]
      ];
      for (const [label, token, body] of REFUSE) {
        const r = await call('capture', token, body);
        check(r.status !== 200, `live refusal: ${label} answered 200`);
        bodies.add(r.status + ' ' + r.text);
      }
      check(bodies.size === 1, `live refusal: ${bodies.size} different refusal bodies — ${[...bodies].join(' | ').slice(0, 300)}`);
      const anon = await call('capture', null, { conceptId: 'css-making-it-look-right', field: 'howThePageShouldFeel', value: 'x' });
      check(anon.status === 401 || anon.status === 403, `live: anonymous capture answered ${anon.status}`);
      check(JSON.stringify(await ctx()) === snapshot, 'live refusal: the project changed');
      console.log(`  live refusals: ${REFUSE.length} → one body (${[...bodies][0].slice(0, 60)}…), anonymous ${anon.status}, project unchanged`);

      // finishStep: a locked step is refused; a double press finishes once.
      const s0 = JSON.stringify(await liveSteps());
      const locked = await call('finishStep', sam, { conceptId: 'reading-what-the-ai-did' });
      const unknown = await call('finishStep', sam, { conceptId: 'no-such-concept' });
      check(locked.status !== 200 && unknown.status !== 200 && locked.text === unknown.text, 'live finishStep: a locked or unknown step was not refused with one body');
      check(JSON.stringify(await liveSteps()) === s0, 'live finishStep: a refusal changed the path');
      const f0 = conflictsInLog('finishStep');
      const [a, b] = await Promise.all([call('finishStep', sam, { conceptId: 'css-making-it-look-right' }), call('finishStep', sam, { conceptId: 'css-making-it-look-right' })]);
      const steps = await liveSteps();
      const st = (c) => steps.find((x) => x.conceptId === c).status;
      check(a.status === 200 && b.status === 200, `live double press: ${a.status}/${b.status}`);
      check(st('css-making-it-look-right') === 'complete' && st('javascript-making-it-do-things') === 'available', 'live double press: step 5 not complete or step 6 not open');
      check(steps.filter((x) => x.status === 'available' || x.status === 'in_progress').length === 1, 'live double press: not exactly one open step');
      const fc = conflictsInLog('finishStep') === null ? null : conflictsInLog('finishStep') - f0;
      const progress = (await q('Progress', { learnerId: SAM })).find((p) => p.conceptId === 'css-making-it-look-right');
      check(progress && progress.completedAt && Date.now() - Date.parse(progress.updatedAt) < 120_000, 'live finishStep: the progress row was not stamped');
      console.log(`  live double press: both 200, step 5 complete, step 6 available, one open step, conflicts logged ${fc ?? 'n/a'}`);
    }
  } finally {
    for (const id of minted) await http('DELETE', `/classes/_Session/${id}`, undefined, admin);
  }
}

if (failures.length) {
  console.error(`check-write-functions: ${failures.length} failure(s)`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('check-write-functions: capture and finishStep hold — the gate, the refusals, the race (and its control), the double press');
