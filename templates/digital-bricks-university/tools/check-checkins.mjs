#!/usr/bin/env node
/**
 * GATE: CHECK-INS ARRIVE WHEN THE COACH PLANNED THEM, AND THEIR ANSWERS REACH HIM (DBU-10).
 *
 *   node tools/check-checkins.mjs [--keep]
 *
 * Builds a SCRATCH backend of its own (reset-demo --root ~/.nodegx/dbu-checkins-check --port 8599
 * --keep-mail), so the demo on 8595 is never touched, and fires the hourly send by hand (the admin
 * door). The every-minute message mail is switched off, so the mail read here is check-in mail only.
 *
 *  1. The seed: Ana's sent check-in is open to her, Tomasz's is answered, Camille's "42 days after the
 *     wrap-up" has no date yet (the wrap-up is not booked); none of them opens for anyone else.
 *  2. Planning: a new check-in gets the "After a session" form; another form replaces it; "N days after"
 *     a session is that day + N at 09:00 Paris, and follows the session when it moves; removing the
 *     session keeps the day and drops the rule. Sharing needs a date or a rule.
 *  3. Sending: a due, shared check-in on an active plan goes 'sent' with one email linking to
 *     /checkin?step=<id>; a second run sends nothing; one not yet due, one unshared and one on a paused
 *     plan stay scheduled (the paused one goes once the plan is active); a learner with emails off gets
 *     none but it is still sent. Once sent, its form can't change.
 *  4. Answering: required, ranges and options are refused in a sentence; conditions drop the answers to
 *     hidden questions; a good answer is saved once and the step is done; twice, or before it is sent,
 *     is refused.
 *  5. The coach: the answers are in learnerAsCoach and in the inbox as a low-priority "checkin" item,
 *     last; Done (settleCheckin) takes it off; the morning digest names it.
 *  6. My creations: the latest 6-week check-in's hours are the estimate (Tomasz: 3); a "Not really"
 *     answer gives none.
 *  7. Who may: a learner can't settle or send; nobody can call sendCheckins over HTTP.
 *
 * Afterwards the scratch backend is stopped and its folder removed (--keep leaves it running), and the
 * mail this run caused is deleted from Mailpit. Exit 1 with the failures, or 0 with a count.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient } from './lib/admin-client.mjs';
import { MAILPIT, has } from './lib/local.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(homedir(), '.nodegx', 'dbu-checkins-check');
const PORT = 8599;
const BACKEND = `http://127.0.0.1:${PORT}`;
const DAY = 86400000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const show = (r) => `${r.status} ${String(r.text || '').slice(0, 200)}`;
const refused = (r) => !r.ok && [400, 403, 404].includes(r.status);
const said = (r) => String((r.json && r.json.error) || r.text || '');
const paris = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Paris', hourCycle: 'h23' });
const parisDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });

function resetDemo(...extra) {
  const r = spawnSync(process.execPath, [join(here, 'reset-demo.mjs'), '--root', ROOT, '--port', String(PORT), ...extra], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`check-checkins: reset-demo ${extra.join(' ')} failed:\n${(r.stdout || '').slice(-1500)}\n${(r.stderr || '').slice(-1500)}`);
    process.exit(2);
  }
}

// ── Mailpit ──────────────────────────────────────────────────────────────────
async function inbox() {
  const r = await fetch(`${MAILPIT.web}/api/v1/messages?limit=500`);
  if (!r.ok) throw new Error(`Mailpit is not answering at ${MAILPIT.web}`);
  return (await r.json()).messages.map((m) => ({ id: m.ID, to: m.To.map((t) => t.Address), subject: m.Subject }));
}
const seen = new Set();
/** Mail this run has not looked at yet, after waiting `ms` for it to settle. */
async function newMail(ms = 1200) {
  await sleep(ms);
  const found = (await inbox()).filter((m) => !seen.has(m.id));
  for (const m of found) {
    seen.add(m.id);
    m.text = (await (await fetch(`${MAILPIT.web}/api/v1/message/${m.id}`)).json()).Text;
  }
  return found;
}

const before = await inbox();
for (const m of before) seen.add(m.id);
console.log(`check-checkins: building a scratch backend on ${BACKEND} (${ROOT})…`);
resetDemo('--keep-mail');

const token = readFileSync(join(ROOT, 'admin-token'), 'utf8').trim();
const api = adminClient(BACKEND, token);
const users = await api.all('_User');
const user = (email) => users.find((u) => u.email === email);
const who = {
  coach: user('coach@example.com'), ana: user('ana.ruiz@example.com'), tomasz: user('tomasz.nowak@example.com'),
  camille: user('camille.laurent@example.com'), jonas: user('jonas.weber@example.com'), sarah: user('sarah.oneill@example.com'),
  mei: user('mei.lin@example.com')
};
const sessions = {};
for (const [k, u] of Object.entries(who)) sessions[k] = await api.sessionFor(u.objectId, `checkins-${k}`);
const fn = (w, name, body = {}) => api.as(w ? sessions[w].token : null, 'POST', `/functions/${name}`, body);
const result = (r) => (r.ok && r.json.result) || {};
const step = async (id) => (await api.all('Step', { objectId: id }))[0];
const putRow = (cls, id, body) => api.data('PUT', `/classes/${cls}/${id}`, body);
const fire = async () => {
  const r = await api.call('POST', '/admin/triggers/send-checkins/fire', {});
  try {
    return JSON.parse((r.response && r.response.body) || '{}').result || {};
  } catch {
    return {};
  }
};
const round = () => api.call('POST', '/admin/triggers/morning-round/fire', {});
const inboxItems = async () => result(await fn('coach', 'coachInbox')).items || [];
/** A new shared check-in in a plan, its day `days` from today (negative: already due). */
async function plannedCheckin(planId, title, days, { share = true, formId } = {}) {
  const add = await fn('coach', 'addStep', { planId, kind: 'checkin', title });
  const id = result(add).stepId;
  const save = await fn('coach', 'saveStep', { id, title, sendsAt: parisDay(Date.now() + days * DAY), ...(formId ? { formId } : {}) });
  if (share) await fn('coach', 'shareSteps', { planId, stepIds: [id], shared: true });
  return { id, ok: add.ok && save.ok, add, save };
}

try {
  expect('setup: the coach and six learners are there', Object.values(who).every(Boolean));
  await api.call('POST', '/admin/triggers/mail-waiting-messages/enabled', { enabled: false });
  await newMail(0);

  // 1. The seed.
  const ana = await fn('ana', 'myCheckin', { stepId: 'step-ana-4' });
  const ac = result(ana).checkin || {};
  expect('1. Ana\'s check-in is open, with the "After a session" questions', ana.ok && ac.state === 'open' &&
    ac.questions.map((q) => q.id).join(',') === 'useful,change' && ac.minutes === 2, show(ana));
  const tom = await fn('tomasz', 'myCheckin', { stepId: 'step-tomasz-4' });
  const tc = result(tom).checkin || {};
  expect('1. Tomasz\'s is answered, with his answers and the form he answered', tom.ok && tc.state === 'answered' &&
    tc.answers.hours_per_week === 3 && tc.questions.some((q) => q.id === 'hours_per_week'), show(tom));
  const cam = await fn('camille', 'myCheckin', { stepId: 'step-camille-10' });
  expect('1. Camille\'s "42 days after the wrap-up" waits, with no date yet', cam.ok && result(cam).checkin.state === 'waiting' &&
    result(cam).checkin.sendsAt === null, show(cam));
  const camOld = await fn('camille', 'myCheckin', { stepId: 'step-camille-4' });
  expect('1. an answer to an older form still reads with its own questions', camOld.ok && result(camOld).checkin.state === 'answered' &&
    result(camOld).checkin.questions.map((q) => q.id).join(',') === 'confidence,stuck', show(camOld));
  for (const [w, id] of [['jonas', 'step-ana-4'], ['ana', 'step-tomasz-4'], ['ana', 'step-ana-5']]) {
    const r = await fn(w, 'myCheckin', { stepId: id });
    expect(`1. ${w} can't open ${id} (not hers, or not a check-in)`, refused(r) && said(r).includes('could not be found'), show(r));
  }
  expect('1. signed out, nobody opens one', refused(await fn(null, 'myCheckin', { stepId: 'step-ana-4' })));

  // 2. Planning.
  const plain = await fn('coach', 'addStep', { planId: 'plan-jonas', kind: 'checkin', title: 'Gate: after the kick-off' });
  const pid = result(plain).stepId;
  expect('2. a new check-in gets the "After a session" form', plain.ok && (await step(pid)).form?.id === 'after-session', show(plain));
  const notReady = await fn('coach', 'shareSteps', { planId: 'plan-jonas', stepIds: [pid], shared: true });
  expect('2. it can\'t be shared without a send date', refused(notReady) && said(notReady).includes('a send date'), show(notReady));
  const toEnd = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', formId: 'end-of-programme' });
  expect('2. another form replaces it', toEnd.ok && (await step(pid)).form?.id === 'end-of-programme', show(toEnd));
  const badForm = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', formId: 'no-such-form' });
  expect('2. a form that is not offered is refused', refused(badForm), show(badForm));
  // Jonas's step 3 is a live session to book: book it, then send 2 days after it.
  const sessionAt = parisDay(Date.now() + 5 * DAY);
  await fn('coach', 'saveStep', { id: 'step-jonas-3', title: 'Prompting for lesson materials', startsAt: `${sessionAt}T14:00` });
  const after = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendAfterStep: 'step-jonas-3', sendAfterDays: '2' });
  const a1 = await step(pid);
  const want1 = parisDay(Date.parse(`${sessionAt}T12:00:00Z`) + 2 * DAY);
  expect('2. "2 days after the session" is that day + 2, at 09:00 Paris', after.ok && a1.sendAfter?.step === 'step-jonas-3' &&
    parisDay(Date.parse(a1.sendsAt)) === want1 && paris(a1.sendsAt).endsWith('09:00:00'), `${show(after)} ${a1.sendsAt} ${paris(a1.sendsAt || 0)}`);
  const moved = parisDay(Date.now() + 9 * DAY);
  await fn('coach', 'saveStep', { id: 'step-jonas-3', title: 'Prompting for lesson materials', startsAt: `${moved}T14:00` });
  const a2 = await step(pid);
  expect('2. ... and follows the session when it moves', parisDay(Date.parse(a2.sendsAt)) === parisDay(Date.parse(`${moved}T12:00:00Z`) + 2 * DAY), a2.sendsAt);
  for (const [days, name] of [['-1', 'negative'], ['1.5', 'a fraction'], ['', 'empty']]) {
    const r = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendAfterStep: 'step-jonas-3', sendAfterDays: days });
    expect(`2. ${name} days are refused`, refused(r) && said(r).includes('whole number'), show(r));
  }
  const self = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendAfterStep: pid, sendAfterDays: '1' });
  expect('2. a check-in can\'t follow itself', refused(self), show(self));
  const otherPlan = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendAfterStep: 'step-ana-3', sendAfterDays: '1' });
  expect('2. ... nor a step of another plan', refused(otherPlan), show(otherPlan));
  const shareRule = await fn('coach', 'shareSteps', { planId: 'plan-jonas', stepIds: [pid], shared: true });
  expect('2. a rule is enough to share it', shareRule.ok, show(shareRule));
  // A draft session to remove: the rule goes, the day stays.
  const tmp = result(await fn('coach', 'addStep', { planId: 'plan-jonas', kind: 'live', title: 'Gate: a session to remove' })).stepId;
  await fn('coach', 'saveStep', { id: tmp, title: 'Gate: a session to remove', startsAt: `${parisDay(Date.now() + 20 * DAY)}T10:00` });
  await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendAfterStep: tmp, sendAfterDays: '1' });
  const dayBefore = (await step(pid)).sendsAt;
  const rm = await fn('coach', 'removeStep', { stepId: tmp });
  const a3 = await step(pid);
  expect('2. removing the session keeps the day and drops the rule', rm.ok && !a3.sendAfter && a3.sendsAt === dayBefore && !!dayBefore, `${show(rm)} ${JSON.stringify(a3.sendAfter)} ${a3.sendsAt}`);
  const onDate = await fn('coach', 'saveStep', { id: pid, title: 'Gate: after the kick-off', sendsAt: parisDay(Date.now() + 30 * DAY), sendAfterStep: '' });
  expect('2. choosing a date again clears any rule', onDate.ok && !(await step(pid)).sendAfter, show(onDate));

  // 3. Sending.
  const due = await plannedCheckin('plan-jonas', 'Gate: due yesterday', -1, { formId: 'six-week-impact' });
  const later = await plannedCheckin('plan-jonas', 'Gate: due tomorrow', 1);
  const hidden = await plannedCheckin('plan-jonas', 'Gate: due, not shared', -1, { share: false });
  const paused = await plannedCheckin('plan-sarah', 'Gate: on a paused plan', -1);
  const quiet = await plannedCheckin('plan-mei', 'Gate: emails off', -1);
  expect('3. setup: five check-ins planned', [due, later, hidden, paused, quiet].every((c) => c.ok), [due, later, hidden, paused, quiet].map((c) => show(c.save)).join(' | '));
  await fn('coach', 'savePlan', { planId: 'plan-sarah', title: 'AI for exam preparation', status: 'paused' });
  const off = await fn('mei', 'setEmailPreference', { state: 'off' });
  expect('3. setup: Mei turned emails off', off.ok, show(off));
  await newMail(300);
  const s1 = await fire();
  const d = await step(due.id);
  const mail1 = await newMail();
  const jm = mail1.filter((m) => m.to.includes(who.jonas.email));
  expect('3. the due one is sent, now', d.status === 'sent' && Date.now() - Date.parse(d.sentAt) < 60000, JSON.stringify({ status: d.status, sentAt: d.sentAt }));
  expect('3. ... with one email to Jonas, linking to that check-in', jm.length === 1 && jm[0].text.includes(`/checkin?step=${due.id}`) &&
    /check-in/i.test(jm[0].subject) && jm[0].text.includes('Gate: due yesterday') && jm[0].text.includes('/unsubscribe?u='), jm.map((m) => m.subject).join(' | '));
  expect('3. not yet due: still scheduled', (await step(later.id)).status === 'scheduled');
  expect('3. not shared: still scheduled', (await step(hidden.id)).status === 'scheduled');
  expect('3. paused plan: still scheduled', (await step(paused.id)).status === 'scheduled');
  expect('3. emails off: sent, and no email to Mei', (await step(quiet.id)).status === 'sent' && !mail1.some((m) => m.to.includes(who.mei.email)));
  expect('3. the run counts two sent, one mailed', s1.sent === 2 && s1.mailed === 1 && s1.unsent === 0, JSON.stringify(s1));
  const s2 = await fire();
  expect('3. a second run sends nothing', s2.sent === 0 && (await newMail()).length === 0, JSON.stringify(s2));
  await fn('coach', 'savePlan', { planId: 'plan-sarah', title: 'AI for exam preparation', status: 'active' });
  const s3 = await fire();
  const mail3 = await newMail();
  expect('3. the paused plan\'s goes once it is active again', s3.sent === 1 && (await step(paused.id)).status === 'sent' &&
    mail3.filter((m) => m.to.includes(who.sarah.email)).length === 1, JSON.stringify(s3));
  const lateForm = await fn('coach', 'saveStep', { id: due.id, title: 'Gate: due yesterday', formId: 'after-session' });
  expect('3. once sent, its form can\'t change', refused(lateForm) && said(lateForm).includes('already gone out'), show(lateForm));
  expect('3. nobody can call the send over HTTP', refused(await fn('coach', 'sendCheckins')) && refused(await fn('jonas', 'sendCheckins')));

  // 4. Answering (Ana's "After a session"; Jonas's 6-week impact, which has conditions).
  const cases = [
    [{}, 'Answer “How useful'],
    [{ useful: 7 }, 'from 1 to 5'],
    [{ useful: 3.5 }, 'from 1 to 5'],
    [{ useful: 4, change: 'x'.repeat(5001) }, 'under 5,000']
  ];
  for (const [answers, words] of cases) {
    const r = await fn('ana', 'answerCheckin', { stepId: 'step-ana-4', answers });
    expect(`4. ${JSON.stringify(answers).slice(0, 40)} is refused: "${words}"`, refused(r) && said(r).includes(words), show(r));
  }
  expect('4. ... and nothing was saved', (await step('step-ana-4')).status === 'sent' && !(await api.all('CheckinResponse', { step: 'step-ana-4' })).length);
  const good = await fn('ana', 'answerCheckin', { stepId: 'step-ana-4', answers: { useful: 4, change: '  More time on the answer key.  ', extra: 'dropped' } });
  const ar = (await api.all('CheckinResponse', { step: 'step-ana-4' }))[0];
  expect('4. a good answer is saved, trimmed, unknown ids dropped, with its form', good.ok && ar && ar.answers.useful === 4 &&
    ar.answers.change === 'More time on the answer key.' && !('extra' in ar.answers) && ar.form?.id === 'after-session', show(good));
  expect('4. ... and the step is done', (await step('step-ana-4')).status === 'done');
  const twice = await fn('ana', 'answerCheckin', { stepId: 'step-ana-4', answers: { useful: 5 } });
  expect('4. a second answer is refused, and the first stays', refused(twice) && said(twice).includes('already sent') &&
    (await api.all('CheckinResponse', { step: 'step-ana-4' })).length === 1, show(twice));
  const early = await fn('jonas', 'answerCheckin', { stepId: later.id, answers: { useful: 4 } });
  expect('4. one not sent yet is refused', refused(early) && said(early).includes('not open yet'), show(early));
  const theirs = await fn('jonas', 'answerCheckin', { stepId: 'step-ana-4', answers: { useful: 1 } });
  expect('4. someone else\'s is refused', refused(theirs) && said(theirs).includes('could not be found'), show(theirs));
  const noHours = await fn('jonas', 'answerCheckin', { stepId: due.id, answers: { still_using: 'weekly' } });
  expect('4. a question shown by a condition is required when shown', refused(noHours) && said(noHours).includes('hours a week'), show(noHours));
  const badOpt = await fn('jonas', 'answerCheckin', { stepId: due.id, answers: { still_using: 'always' } });
  expect('4. an answer that is not an option is refused', refused(badOpt) && said(badOpt).includes('pick one'), show(badOpt));
  const tooMany = await fn('jonas', 'answerCheckin', { stepId: due.id, answers: { still_using: 'sometimes', hours_per_week: '41' } });
  expect('4. hours over the form\'s maximum are refused', refused(tooMany) && said(tooMany).includes('up to 40'), show(tooMany));
  const no = await fn('jonas', 'answerCheckin', { stepId: due.id, answers: { still_using: 'no', hours_per_week: 5, story: 'hidden', in_the_way: 'Exams season.' } });
  const jr = (await api.all('CheckinResponse', { step: due.id }))[0];
  expect('4. "Not really": the hidden questions\' answers are dropped, the shown one kept', no.ok && jr &&
    JSON.stringify(jr.answers) === JSON.stringify({ still_using: 'no', in_the_way: 'Exams season.' }), `${show(no)} ${JSON.stringify(jr?.answers)}`);

  // 5. The coach sees them.
  const asCoach = result(await fn('coach', 'learnerAsCoach', { learnerId: who.ana.objectId }));
  expect('5. the plan page has Ana\'s answers, with their form', (asCoach.checkins || []).some((c) => c.step === 'step-ana-4' && c.answers.useful === 4 && c.form.id === 'after-session'));
  const items = await inboxItems();
  const kinds = items.map((i) => i.kind);
  const firstLow = kinds.indexOf('checkin');
  expect('5. the inbox lists Tomasz, Ana and Jonas\'s check-ins, after everything else', firstLow > 0 && kinds.slice(firstLow).every((k) => k === 'checkin') &&
    ['Tomasz', 'Ana', 'Jonas'].every((n) => items.some((i) => i.kind === 'checkin' && i.first === n)), kinds.join(' '));
  const anaItem = items.find((i) => i.kind === 'checkin' && i.first === 'Ana');
  expect('5. an item carries the answers and the questions', anaItem && anaItem.answers.useful === 4 && anaItem.form.questions.length === 2 && anaItem.title === 'After your second session');
  const learnerSettles = await fn('ana', 'settleCheckin', { responseId: anaItem?.responseId });
  expect('5. a learner can\'t press Done', refused(learnerSettles), show(learnerSettles));
  const settle = await fn('coach', 'settleCheckin', { responseId: anaItem?.responseId });
  expect('5. Done takes it off the inbox', settle.ok && !(await inboxItems()).some((i) => i.id === anaItem.id), show(settle));
  const settleAgain = await fn('coach', 'settleCheckin', { responseId: anaItem?.responseId });
  expect('5. ... and pressing it again changes nothing', settleAgain.ok);
  await api.data('PUT', '/classes/Setting/' + ((await api.all('Setting', { key: 'digestSentAt' }))[0] || {}).objectId, { value: new Date(Date.now() - 60000).toISOString() });
  await round();
  const digest = (await newMail()).find((m) => m.to.includes('coach@example.com') && /in your inbox$/.test(m.subject));
  expect('5. the morning digest names Jonas\'s check-in', digest && digest.text.includes('Jonas Weber answered the check-in "Gate: due yesterday"'), digest ? digest.text.slice(0, 400) : 'no digest');

  // 6. My creations.
  const tomC = result(await fn('tomasz', 'myCreations'));
  expect('6. Tomasz\'s estimate is 3 hours a week, from his 6-week check-in', tomC.estimate && tomC.estimate.hours === 3 && Date.parse(tomC.estimate.at), JSON.stringify(tomC.estimate));
  const tomCoach = result(await fn('coach', 'creationsAsCoach', { learnerId: who.tomasz.objectId }));
  expect('6. ... and the coach sees the same', tomCoach.estimate && tomCoach.estimate.hours === 3, JSON.stringify(tomCoach.estimate));
  expect('6. Jonas answered "Not really": no estimate', result(await fn('jonas', 'myCreations')).estimate === null);
  expect('6. Ana has no 6-week check-in: no estimate', result(await fn('ana', 'myCreations')).estimate === null);
} catch (e) {
  expect(`no exception (${String((e && e.stack) || e).slice(0, 300)})`, false);
} finally {
  if (!has('keep')) {
    resetDemo('--stop');
    if (existsSync(join(ROOT, '.dbu-demo'))) rmSync(ROOT, { recursive: true, force: true });
    const keep = new Set(before.map((m) => m.id));
    const gone = (await inbox()).map((m) => m.id).filter((id) => !keep.has(id));
    if (gone.length) await fetch(`${MAILPIT.web}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: gone }) });
  }
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`check-checkins: ${failed.length} of ${results.length} checks FAILED:\n  ✗ ${failed.map((f) => `${f.name}${f.detail ? `  (${f.detail})` : ''}`).join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(`check-checkins: ok — ${results.length} checks on a scratch backend, the hourly send fired by hand.`);
