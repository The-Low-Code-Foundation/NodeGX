#!/usr/bin/env node
/**
 * GATE: THE BACKEND HOLDS A COHERENT DEMO WORLD (DBU-01).
 *
 *   node tools/check-seed.mjs [--backend <url>] [--token <admin>]
 *
 * Reads every row through the master key and checks:
 *  - every relation resolves (and points at the same learner where it should)
 *  - every fixed value is one schema.json `enums` allows, and every step status
 *    is valid FOR ITS KIND
 *  - statuses agree with the rows behind them (a homework's status with its
 *    newest hand-in, a booked session in the future, a done check-in with answers)
 *  - every learner has exactly one active plan; the coach has none
 *  - the row counts are the fixtures' counts
 *  - the six stories DBU-01 asks for, each checked as written
 * Exit 1 and a list of what failed, or exit 0 and one line.
 */
import { adminClient } from './lib/admin-client.mjs';
import { BACKEND, readJson, token } from './lib/local.mjs';
import { buildWorld } from './lib/seed.mjs';

const schema = readJson('backend', 'schema.json');
const E = schema.enums;
const api = adminClient(BACKEND, token());
const problems = [];
const check = (ok, msg) => {
  if (!ok) problems.push(msg);
};

const names = ['Plan', 'Step', 'Submission', 'Message', 'Creation', 'LibraryItem', 'PlanTemplate', 'CheckinResponse', 'CoachNote', 'Setting'];
const db = {};
for (const n of [...names, '_User', '_Files']) db[n] = await api.all(n);
const byId = (c) => new Map(db[c].map((r) => [r.objectId, r]));
const users = byId('_User');
const plans = byId('Plan');
const steps = byId('Step');
const subs = byId('Submission');
const library = byId('LibraryItem');
const templates = byId('PlanTemplate');
const files = new Map(db._Files.map((f) => [f.storedName, f]));
const ownerOf = (name) => {
  const o = files.get(name)?.owner;
  return o && typeof o === 'object' ? o.objectId : o;
};
const now = Date.now();
const past = (iso) => iso && Date.parse(iso) < now;
const future = (iso) => iso && Date.parse(iso) > now;

const roles = new Map((await api.call('GET', '/admin/roles')).roles.map((r) => [r.name, new Set(r.users)]));
const staffIds = roles.get('staff') || new Set();
const learnerIds = [...users.keys()].filter((id) => !staffIds.has(id));
check(learnerIds.every((id) => roles.get('learner')?.has(id)), 'a user who is not staff is missing the learner role');
check(staffIds.size === 1, `expected exactly one staff user (the coach), found ${staffIds.size}`);
const isLearner = (id) => users.has(id) && !staffIds.has(id);

// ── Relations and enums ──────────────────────────────────────────────────────
for (const p of plans.values()) {
  check(isLearner(p.learner), `Plan ${p.objectId}: learner ${p.learner} is not a learner`);
  check(E.planStatus.includes(p.status), `Plan ${p.objectId}: status "${p.status}"`);
  check(p.fromTemplate === null || templates.has(p.fromTemplate), `Plan ${p.objectId}: fromTemplate ${p.fromTemplate} does not resolve`);
}
for (const t of templates.values()) {
  for (const it of t.items || []) {
    check(E.stepKind.includes(it.kind), `PlanTemplate ${t.objectId}: item kind "${it.kind}"`);
    check(!it.libraryItem || library.has(it.libraryItem), `PlanTemplate ${t.objectId}: libraryItem ${it.libraryItem} does not resolve`);
  }
}
const latestSub = new Map();
for (const s of subs.values()) {
  const st = steps.get(s.step);
  check(st && st.kind === 'homework', `Submission ${s.objectId}: step ${s.step} is not a homework step`);
  check(st && st.learner === s.learner, `Submission ${s.objectId}: learner differs from its step's`);
  check(E.submissionKind.includes(s.kind), `Submission ${s.objectId}: kind "${s.kind}"`);
  check(E.review.includes(s.review), `Submission ${s.objectId}: review "${s.review}"`);
  check(s.review === 'pending' || s.reviewedAt, `Submission ${s.objectId}: reviewed but no reviewedAt`);
  if (s.kind === 'file') {
    const fs = Array.isArray(s.files) ? s.files : [];
    check(fs.length >= 1 && fs.length <= 5, `Submission ${s.objectId}: a file version with ${fs.length} files (1 to 5)`);
    for (const f of fs) check(ownerOf(f.file) === s.learner && f.fileName, `Submission ${s.objectId}: file ${f.file} missing, nameless or not the learner's`);
  }
  if (s.kind === 'link') check(/^https:\/\//.test(s.url || ''), `Submission ${s.objectId}: link hand-in with no https url`);
  if (s.kind === 'text') check((s.text || '').trim(), `Submission ${s.objectId}: text hand-in with no text`);
  const cur = latestSub.get(s.step);
  if (!cur || s.version > cur.version) latestSub.set(s.step, s);
}
for (const s of subs.values()) {
  check(s.review !== 'pending' || latestSub.get(s.step) === s, `Submission ${s.objectId}: pending, but a newer version exists`);
  const versions = db.Submission.filter((x) => x.step === s.step).map((x) => x.version).sort((a, b) => a - b);
  check(versions.every((v, i) => v === i + 1), `Step ${s.step}: hand-in versions ${versions.join(',')} are not 1..n`);
}
const responses = new Map(db.CheckinResponse.map((r) => [r.step, r]));
const expectedHomework = { undefined: 'not_started', pending: 'handed_in', changes: 'changes_asked', approved: 'approved' };
for (const st of steps.values()) {
  const plan = plans.get(st.plan);
  check(plan, `Step ${st.objectId}: plan ${st.plan} does not resolve`);
  check(plan && plan.learner === st.learner, `Step ${st.objectId}: learner differs from its plan's`);
  check(E.stepKind.includes(st.kind), `Step ${st.objectId}: kind "${st.kind}"`);
  const valid = E.stepStatus[st.kind] || [];
  check(valid.includes(st.status), `Step ${st.objectId}: status "${st.status}" is not valid for a ${st.kind} step (${valid.join(', ')})`);
  check(typeof st.shared === 'boolean', `Step ${st.objectId}: shared is not true or false`);
  if (st.kind === 'live') {
    if (st.status === 'booked') check(future(st.startsAt), `Step ${st.objectId}: booked, but startsAt ${st.startsAt} is not in the future`);
    if (st.status === 'done' || st.status === 'missed') check(past(st.startsAt), `Step ${st.objectId}: ${st.status}, but startsAt ${st.startsAt} is not in the past`);
    if (st.status === 'to_book') check(!st.startsAt, `Step ${st.objectId}: to_book, but has a startsAt`);
  }
  if (st.kind === 'homework') {
    const want = expectedHomework[latestSub.get(st.objectId)?.review];
    check(st.status === want, `Step ${st.objectId}: status ${st.status}, but its newest hand-in says ${want}`);
    check(!st.fromLibraryItem || library.has(st.fromLibraryItem), `Step ${st.objectId}: fromLibraryItem ${st.fromLibraryItem} does not resolve`);
    check((st.brief || '').trim(), `Step ${st.objectId}: homework with no brief`);
  }
  if (st.kind === 'checkin') {
    check(st.form && Array.isArray(st.form.questions), `Step ${st.objectId}: check-in with no form`);
    check((st.status === 'done') === responses.has(st.objectId), `Step ${st.objectId}: status ${st.status}, response ${responses.has(st.objectId) ? 'present' : 'absent'}`);
    // DBU-10: reset fires the send once, so a shared check-in whose day has passed must already be sent.
    if (st.status === 'scheduled') check(!st.sendsAt || future(st.sendsAt), `Step ${st.objectId}: scheduled, but its day ${st.sendsAt} has passed (the first send would mail it)`);
    if (st.status !== 'scheduled') check(st.sentAt && past(st.sentAt), `Step ${st.objectId}: ${st.status}, but sentAt ${st.sentAt} is not in the past`);
    if (st.sendAfter) {
      const a = steps.get(st.sendAfter.step);
      check(a && a.plan === st.plan && ['live', 'homework'].includes(a.kind) && Number.isInteger(st.sendAfter.days), `Step ${st.objectId}: sendAfter ${JSON.stringify(st.sendAfter)} is not a live session or homework of its plan`);
    }
  }
}
for (const p of plans.values()) {
  const pos = db.Step.filter((s) => s.plan === p.objectId).map((s) => s.position).sort((a, b) => a - b);
  check(pos.every((v, i) => v === i + 1), `Plan ${p.objectId}: step positions ${pos.join(',')} are not 1..n`);
}
for (const r of db.CheckinResponse) {
  const st = steps.get(r.step);
  check(st && st.kind === 'checkin' && st.learner === r.learner, `CheckinResponse ${r.objectId}: step or learner does not match`);
  const qids = new Set(((r.form || (st && st.form) || {}).questions || []).map((q) => q.id));
  check(Object.keys(r.answers || {}).every((k) => qids.has(k)), `CheckinResponse ${r.objectId}: answers a question its form does not have`);
}
for (const m of db.Message) {
  check(isLearner(m.learner), `Message ${m.objectId}: learner ${m.learner} is not a learner`);
  check(m.author === m.learner || staffIds.has(m.author), `Message ${m.objectId}: author is neither the learner nor the coach`);
  check(!m.step || steps.get(m.step)?.learner === m.learner, `Message ${m.objectId}: step ${m.step} is not this learner's`);
  for (const a of m.attachments || []) check(ownerOf(a.file) === m.author, `Message ${m.objectId}: attachment ${a.file} missing or not the author's`);
  // DBU-07: a seeded message is history. Waiting for mail, the first flush after a reset would email it.
  check(m.mailPending === false && !!m.mailedAt, `Message ${m.objectId}: seeded as waiting for mail (mailPending must be false, mailedAt set)`);
}
for (const c of db.Creation) {
  check(isLearner(c.learner), `Creation ${c.objectId}: learner is not a learner`);
  check(E.creationKind.includes(c.kind), `Creation ${c.objectId}: kind "${c.kind}"`);
  check(!c.fromStep || steps.get(c.fromStep)?.learner === c.learner, `Creation ${c.objectId}: fromStep is not this learner's`);
  check(!c.submission || subs.get(c.submission)?.learner === c.learner, `Creation ${c.objectId}: submission is not this learner's`);
  // DBU-09: a creation holds its own file, link or text, or points at a hand-in that holds it (never both).
  check([c.file, c.url, c.text, c.submission].filter(Boolean).length === 1, `Creation ${c.objectId}: holds ${[c.file && 'a file', c.url && 'a link', c.text && 'text', c.submission && 'a hand-in'].filter(Boolean).join(' and ') || 'nothing'}`);
  check(!c.submission || c.fromStep === subs.get(c.submission)?.step, `Creation ${c.objectId}: fromStep is not its hand-in's step`);
  check(!c.file || ownerOf(c.file) === c.learner, `Creation ${c.objectId}: file missing or not the learner's`);
}
for (const n of db.CoachNote) check(isLearner(n.learner), `CoachNote ${n.objectId}: learner is not a learner`);

// ── One active plan each ─────────────────────────────────────────────────────
for (const id of learnerIds) {
  const active = db.Plan.filter((p) => p.learner === id && p.status === 'active').length;
  check(active === 1, `${users.get(id).name}: ${active} active plans, not 1`);
}
for (const id of staffIds) check(!db.Plan.some((p) => p.learner === id), 'the coach has a plan');

// ── The fixtures' counts ─────────────────────────────────────────────────────
const world = buildWorld(new Date());
check(db._User.length === world.users.length, `_User: ${db._User.length} rows, fixtures make ${world.users.length}`);
for (const [c, list] of Object.entries(world.rows)) check(db[c].length === list.length, `${c}: ${db[c].length} rows, fixtures make ${list.length}`);

// ── The six stories, as DBU-01 writes them ───────────────────────────────────
const who = (name) => [...users.values()].find((u) => u.name === name)?.objectId;
const planOf = (id) => db.Plan.find((p) => p.learner === id && p.status === 'active');
const stepsOf = (id) => db.Step.filter((s) => s.learner === id).sort((a, b) => a.position - b.position);
const daysAgo = (date) => Math.round((now - Date.parse(`${date}T12:00:00Z`)) / 86400000);
const story = (name, ok, what) => check(ok, `${name}: ${what}`);

const camille = who('Camille Laurent');
const cHw = stepsOf(camille).filter((s) => s.kind === 'homework' && s.shared);
const cLive = stepsOf(camille).filter((s) => s.kind === 'live');
story('Camille', Math.floor(daysAgo(planOf(camille)?.startedOn) / 7) + 1 === 4, 'is not in week 4');
story('Camille', cHw[1]?.status === 'changes_asked', 'homework 2 is not "changes asked"');
story('Camille', cLive[2]?.status === 'booked', 'session 3 is not booked');
story('Camille', stepsOf(camille).some((s) => !s.shared), 'has no unshared step (the gate needs one)');

const jonas = who('Jonas Weber');
const jMsgs = db.Message.filter((m) => m.learner === jonas).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
story('Jonas', daysAgo(planOf(jonas)?.startedOn) <= 7, 'is not early (plan started more than a week ago)');
story('Jonas', jMsgs.at(-1)?.author === jonas && !jMsgs.at(-1)?.readAt, 'has no open question (newest message is not his and unread)');

const ana = who('Ana Ruiz');
story('Ana', db.Submission.some((s) => s.learner === ana && s.review === 'pending'), 'has no hand-in waiting for review');
story('Ana', db.Submission.some((s) => s.learner === ana && s.review === 'pending' && s.kind === 'file' && (s.files || []).length === 2), 'has no two-file version (an MP3 and its script) waiting');
story('Ana', db.Step.some((s) => s.learner === ana && s.kind === 'checkin' && s.status === 'sent' && s.shared), 'has no check-in sent and waiting for her answers (DBU-10)');

const tomasz = who('Tomasz Nowak');
story('Tomasz', planOf(tomasz)?.title === 'Automation for Events', 'is not on "Automation for Events"');
story('Tomasz', db.Submission.some((s) => s.learner === tomasz && s.kind === 'link'), 'has no link hand-in');
story('Tomasz', db.Submission.some((s) => s.learner === tomasz && s.kind === 'link' && s.review === 'pending'), 'has no link hand-in waiting for review (DBU-08)');
story('Tomasz', db.CheckinResponse.some((r) => r.learner === tomasz && !r.seenAt && r.form?.id === 'six-week-impact' && Number.isFinite(r.answers?.hours_per_week)), 'has no unseen 6-week check-in with hours saved (DBU-10)');

const mei = who('Mei Lin');
story('Mei', daysAgo(planOf(mei)?.startedOn) === 9, 'did not enrol 9 days ago');
story('Mei', !stepsOf(mei).some((s) => ['done', 'booked', 'handed_in', 'approved', 'changes_asked'].includes(s.status)), 'has done something');
story('Mei', !db.Submission.some((s) => s.learner === mei) && !db.Message.some((m) => m.author === mei), 'has handed in or written something');

const sarah = who("Sarah O'Neill");
story('Sarah', !planOf(sarah)?.fromTemplate && stepsOf(sarah).length === 3, 'does not have a custom 3-step plan');
story('Sarah', db.Message.some((m) => m.author === sarah && !m.readAt && (m.attachments || []).some((a) => files.get(a.file)?.contentType === 'application/pdf')),
  'has no unread question with a PDF');

check(library.size === 3, `${library.size} library items, not 3`);

// ── Library and homework shapes (DBU-03) ────────────────────────────────────
const coachId = [...staffIds][0];
const checklistOk = (list) => Array.isArray(list) && list.every((c) => c && typeof c.text === 'string' && c.text.trim() && typeof c.required === 'boolean');
const resourcesOk = (list, ownerOk) =>
  Array.isArray(list) &&
  list.every((r) => r && typeof r.label === 'string' && r.label && (r.file ? files.has(r.file) && ownerOk(r.file) && r.fileName : /^https?:\/\//.test(r.url || '')));
for (const l of library.values()) {
  check(checklistOk(l.handInChecklist), `LibraryItem ${l.objectId}: handInChecklist is not [{text, required}]`);
  check(resourcesOk(l.resources, (f) => ownerOf(f) === coachId), `LibraryItem ${l.objectId}: a resource is not a link or a file the coach uploaded`);
  check(typeof l.archived === 'boolean', `LibraryItem ${l.objectId}: archived is not true or false`);
}
for (const st of db.Step.filter((x) => x.kind === 'homework')) {
  check(checklistOk(st.handInChecklist), `Step ${st.objectId}: handInChecklist is not [{text, required}]`);
  check(resourcesOk(st.resources, (f) => ownerOf(f) === coachId), `Step ${st.objectId}: a resource is not a link or a file the coach uploaded`);
}
check([...library.values()].some((l) => (l.resources || []).some((r) => r.file)), 'no library item has a file resource (the security gate needs one)');
check(templates.size === 2, `${templates.size} plan templates, not 2`);

if (problems.length) {
  console.error(`check-seed: ${problems.length} problem(s):\n  ✗ ${problems.join('\n  ✗ ')}`);
  process.exit(1);
}
const rowCount = names.reduce((n, c) => n + db[c].length, 0);
console.log(
  `check-seed: ok — ${db._User.length} users (1 coach), ${rowCount} rows, ${db._Files.length} private files; ` +
    'every relation resolves, every status fits its kind and its rows, one active plan per learner, and the six stories hold.'
);
