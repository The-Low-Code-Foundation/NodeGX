#!/usr/bin/env node
/**
 * GATE: THE COACH INBOX LISTS WHAT WAITS, AND LETS GO OF WHAT IS DONE (DBU-08).
 *
 *   node tools/check-inbox.mjs [--keep]
 *
 * Builds a SCRATCH backend of its own (reset-demo --root ~/.nodegx/dbu-inbox-check --port 8598
 * --keep-mail), so the demo on 8595 is never touched. reset-demo fires the morning round once, as it
 * does for the demo; this gate fires it again by hand (the admin door) whenever it needs the cron.
 * The every-minute message mail is switched off on the scratch backend, so only the digest is read.
 *
 *  1. The seed: exactly Tomasz (review), Sarah (question), Jonas (question), Ana (review), Mei (gone
 *     quiet), oldest first, then Tomasz's check-in answered (DBU-10: low priority, last); countOnly
 *     says 6 and lists nothing; reset's round sent one digest.
 *  2. The round is idempotent: run again, it raises and closes nothing and sends no second digest.
 *  3. Resolving: approving Tomasz's hand-in, asking Ana for changes, replying to Sarah, and "No reply
 *     needed" on Jonas each take that item off. settleQuestion refuses a message that is not the
 *     learner's newest; a new learner message after it is a question again.
 *  4. Gone quiet: Snooze a week hides Mei, and the round does not raise her again; when the snooze
 *     ends she is back. A nudge (snoozeQuiet nudged) stamps nudgedAt. Mei being active again (any
 *     page: myUnread) takes the item off at once, and the next round closes the flag.
 *  5. Overdue: homework not started 3 days past due raises its learner; Camille's changes-asked work
 *     past due does not. Moving the date takes the item off, and the round closes the flag.
 *  6. The digest: something new since the last one is one email, "1 new thing in your inbox".
 *
 * Afterwards the scratch backend is stopped and its folder removed (--keep leaves it running), and
 * the mail this run caused is deleted from Mailpit. Exit 1 with the failures, or 0 with a count.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient } from './lib/admin-client.mjs';
import { MAILPIT, has } from './lib/local.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(homedir(), '.nodegx', 'dbu-inbox-check');
const PORT = 8598;
const BACKEND = `http://127.0.0.1:${PORT}`;
const DEFAULT_COACH = 'coach@example.com';
const DIGEST = /new things? in your inbox$/;
const DAY = 86400000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const show = (r) => `${r.status} ${String(r.text || '').slice(0, 160)}`;
const refused = (r) => !r.ok && [400, 403, 404].includes(r.status);
const iso = (ms) => new Date(ms).toISOString();

function resetDemo(...extra) {
  const r = spawnSync(process.execPath, [join(here, 'reset-demo.mjs'), '--root', ROOT, '--port', String(PORT), ...extra], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`check-inbox: reset-demo ${extra.join(' ')} failed:\n${(r.stdout || '').slice(-1500)}\n${(r.stderr || '').slice(-1500)}`);
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
/** Digests to the coach that this run has not looked at yet, after waiting `ms` for them to settle. */
async function newDigests(ms = 1500) {
  await sleep(ms);
  const found = (await inbox()).filter((m) => !seen.has(m.id) && m.to.includes(DEFAULT_COACH) && DIGEST.test(m.subject));
  for (const m of found) {
    seen.add(m.id);
    m.text = (await (await fetch(`${MAILPIT.web}/api/v1/message/${m.id}`)).json()).Text;
  }
  return found;
}

const before = await inbox();
for (const m of before) seen.add(m.id);
console.log(`check-inbox: building a scratch backend on ${BACKEND} (${ROOT})…`);
resetDemo('--keep-mail');

const token = readFileSync(join(ROOT, 'admin-token'), 'utf8').trim();
const api = adminClient(BACKEND, token);
const users = await api.all('_User');
const user = (email) => users.find((u) => u.email === email);
const who = { coach: user('coach@example.com'), mei: user('mei.lin@example.com'), jonas: user('jonas.weber@example.com'), sarah: user('sarah.oneill@example.com') };
const sessions = {};
for (const [k, u] of Object.entries(who)) sessions[k] = await api.sessionFor(u.objectId, `inbox-${k}`);
const fn = (w, name, body = {}) => api.as(w ? sessions[w].token : null, 'POST', `/functions/${name}`, body);
const list = async (body = {}) => {
  const r = await fn('coach', 'coachInbox', body);
  return { r, items: (r.ok && r.json.result.items) || [], count: r.ok ? r.json.result.count : -1 };
};
const ids = async () => (await list()).items.map((i) => i.id);
const round = async () => {
  const r = await api.call('POST', '/admin/triggers/morning-round/fire', {});
  try {
    return JSON.parse((r.response && r.response.body) || '{}').result || {};
  } catch {
    return {};
  }
};
const putRow = (cls, id, body) => api.data('PUT', `/classes/${cls}/${id}`, body);
const flagsOf = async (learnerId) => (await api.all('QuietFlag')).filter((f) => f.learner === learnerId);
const openFlag = async (learnerId) => (await flagsOf(learnerId)).find((f) => !f.closedAt) || null;

try {
  expect('setup: the coach, Mei, Jonas and Sarah are there', Object.values(who).every(Boolean));
  await api.call('POST', '/admin/triggers/mail-waiting-messages/enabled', { enabled: false });

  // 1. The seed.
  const seed = await list();
  const shape = seed.items.map((i) => `${i.kind}:${i.first}`).join(' ');
  expect('1. the seed: Tomasz review, Sarah question, Jonas question, Ana review, Mei gone quiet, oldest first; then Tomasz\'s check-in (DBU-10, low priority)',
    shape === 'review:Tomasz question:Sarah question:Jonas review:Ana quiet:Mei checkin:Tomasz', shape || show(seed.r));
  expect('1. every item carries a learner id, a summary and a time', seed.items.every((i) => i.learnerId && i.learner && Date.parse(i.since) &&
    (i.kind === 'review' ? i.title && i.submissions?.length : i.kind === 'question' ? i.body && i.messageId
      : i.kind === 'checkin' ? i.responseId && i.form?.questions?.length && i.answers : i.flagId && i.reasons?.length)));
  const low = (i) => (i.kind === 'checkin' ? 1 : 0);
  const ordered = seed.items.every((i, k, a) => !k || low(a[k - 1]) < low(i) || (low(a[k - 1]) === low(i) && Date.parse(a[k - 1].since) <= Date.parse(i.since)));
  expect('1. sorted oldest first, check-ins after the rest', ordered);
  const mei = seed.items.find((i) => i.kind === 'quiet');
  expect('1. Mei is quiet for being inactive', mei && mei.reasons.some((r) => r.kind === 'inactive'), JSON.stringify(mei?.reasons));
  const count = await list({ countOnly: true });
  expect('1. countOnly: 6, and no list', count.count === 6 && count.items.length === 0, show(count.r));
  const firstDigest = await newDigests(0);
  const fd = firstDigest[0] || { text: '', subject: '' };
  expect('1. reset\'s round sent one digest', firstDigest.length === 1, firstDigest.map((m) => m.subject).join(' | '));
  expect('1. it names Mei as gone quiet and links to the inbox', fd.text.includes('Mei Lin has gone quiet') && fd.text.includes('/coach/inbox'), fd.text.slice(0, 500));

  // 2. Idempotent.
  const flagsBefore = (await api.all('QuietFlag')).length;
  const again = await round();
  expect('2. a second round raises and closes nothing', again.raised === 0 && again.closed === 0, JSON.stringify(again));
  expect('2. ... and sends no second digest', again.digest === 'nothing new' && (await newDigests()).length === 0, JSON.stringify(again));
  expect('2. ... and leaves one flag', (await api.all('QuietFlag')).length === flagsBefore);

  // 3. Resolving.
  const tomasz = seed.items.find((i) => i.first === 'Tomasz');
  const ana = seed.items.find((i) => i.first === 'Ana');
  const sarah = seed.items.find((i) => i.first === 'Sarah');
  const jonas = seed.items.find((i) => i.first === 'Jonas');
  const ok1 = await fn('coach', 'reviewSubmission', { submissionId: tomasz.submissions[0].id, verdict: 'approved' });
  expect('3. approving Tomasz\'s hand-in takes it off', ok1.ok && !(await ids()).includes(tomasz.id), show(ok1));
  const ch = await fn('coach', 'reviewSubmission', { submissionId: ana.submissions[0].id, verdict: 'changes', note: 'Inbox gate: add the answer key.' });
  expect('3. asking Ana for changes takes hers off', ch.ok && !(await ids()).includes(ana.id), show(ch));
  const rep = await fn('coach', 'replyAsCoach', { learnerId: sarah.learnerId, body: 'Inbox gate: yes, that format works.', stepId: sarah.stepId });
  expect('3. replying to Sarah takes her question off', rep.ok && !(await ids()).includes(sarah.id), show(rep));
  const older = (await api.all('Message')).filter((m) => m.learner === jonas.learnerId && m.objectId !== jonas.messageId);
  const notNewest = older.length ? await fn('coach', 'settleQuestion', { messageId: older[0].objectId }) : { ok: false, status: 400 };
  expect('3. settleQuestion refuses a message that is not the learner\'s newest', refused(notNewest), show(notNewest));
  const settle = await fn('coach', 'settleQuestion', { messageId: jonas.messageId });
  expect('3. "No reply needed" on Jonas takes his question off', settle.ok && !(await ids()).includes(jonas.id), show(settle));
  const settledRow = (await api.all('Message', { objectId: jonas.messageId }))[0] || {};
  expect('3. ... by marking his message settled (and read)', settledRow.settledAt && settledRow.readAt, JSON.stringify({ s: settledRow.settledAt, r: settledRow.readAt }));
  const left = (await list()).items.map((i) => `${i.kind}:${i.first}`).join(' ');
  expect('3. only Mei is left, and Tomasz\'s check-in (DBU-10: it ends only on Done)', left === 'quiet:Mei checkin:Tomasz', left);

  // 4. Gone quiet. Mei's homework falls 2 days overdue at 17:00 today, so a reset after that also
  // flags her for it; it gets a later date here, so that only her silence is in play.
  for (const s of await api.all('Step')) {
    if (s.learner === who.mei.objectId && s.kind === 'homework' && s.status === 'not_started' && s.dueAt) await putRow('Step', s.objectId, { dueAt: iso(Date.now() + 3 * DAY) });
  }
  const meiFlag = await openFlag(who.mei.objectId);
  const snooze = await fn('coach', 'snoozeQuiet', { flagId: meiFlag.objectId });
  expect('4. Snooze a week hides Mei', snooze.ok && !(await ids()).some((i) => i.startsWith('quiet-')), show(snooze));
  const snoozed = await openFlag(who.mei.objectId);
  const days = (Date.parse(snoozed.snoozedUntil) - Date.now()) / DAY;
  expect('4. ... for a week, without a nudge stamp', days > 6.9 && days <= 7 && !snoozed.nudgedAt, JSON.stringify(snoozed));
  const r4 = await round();
  expect('4. the round keeps the same flag, snoozed, and raises none', r4.raised === 0 && (await flagsOf(who.mei.objectId)).length === 1 &&
    !(await ids()).some((i) => i.startsWith('quiet-')), JSON.stringify(r4));
  await putRow('QuietFlag', meiFlag.objectId, { snoozedUntil: iso(Date.now() - 60000) });
  const back = (await list()).items.find((i) => i.kind === 'quiet');
  expect('4. when the snooze ends, Mei is back', back && back.flagId === meiFlag.objectId, JSON.stringify((await list()).items.map((i) => i.id)));
  const nudge = await fn('coach', 'snoozeQuiet', { flagId: meiFlag.objectId, nudged: true });
  const nudged = await openFlag(who.mei.objectId);
  expect('4. a nudge snoozes and stamps nudgedAt', nudge.ok && nudged.nudgedAt && Date.parse(nudged.snoozedUntil) > Date.now() + 6 * DAY, show(nudge));
  await putRow('QuietFlag', meiFlag.objectId, { snoozedUntil: iso(Date.now() - 60000) });
  expect('4. (snooze ended again: back, showing the nudge)', (await list()).items.find((i) => i.kind === 'quiet')?.nudgedAt);
  const seenNow = await fn('mei', 'myUnread');
  expect('4. Mei opens a page: her item goes at once', seenNow.ok && !(await ids()).some((i) => i.startsWith('quiet-')), show(seenNow));
  const r4b = await round();
  expect('4. ... and the next round closes her flag', r4b.closed >= 1 && !(await openFlag(who.mei.objectId)), JSON.stringify(r4b));
  const closedFlag = (await api.all('QuietFlag', { objectId: meiFlag.objectId }))[0] || {};
  const snz = await fn('coach', 'snoozeQuiet', { flagId: meiFlag.objectId });
  expect('4. a closed flag cannot be snoozed', closedFlag.closedAt && refused(snz), show(snz));

  // 5. Overdue.
  const steps = await api.all('Step');
  const jonasHw = steps.find((s) => s.learner === who.jonas.objectId && s.kind === 'homework' && s.shared && s.status === 'not_started');
  const camChanges = steps.find((s) => s.kind === 'homework' && s.status === 'changes_asked' && s.dueAt && Date.parse(s.dueAt) < Date.now() - 2 * DAY);
  expect('5. setup: a not-started homework of Jonas, and a changes-asked one past due', jonasHw && camChanges);
  await putRow('Step', jonasHw.objectId, { dueAt: iso(Date.now() - 3 * DAY) });
  const r5 = await round();
  const jq = (await list()).items.find((i) => i.kind === 'quiet' && i.learnerId === who.jonas.objectId);
  expect('5. 3 days past due raises Jonas, for that homework', r5.raised === 1 && jq && jq.reasons.length === 1 &&
    jq.reasons[0].kind === 'overdue' && jq.reasons[0].stepId === jonasHw.objectId, JSON.stringify({ r5, jq: jq?.reasons }));
  expect('5. changes-asked work past due raises nobody', !(await list()).items.some((i) => i.kind === 'quiet' && i.learnerId === camChanges.learner));
  const fresh = await newDigests();
  expect('6. the round sends one digest for what is new', fresh.length === 1 && fresh[0].subject === '1 new thing in your inbox' &&
    fresh[0].text.includes('Jonas Weber has gone quiet') && fresh[0].text.includes(jonasHw.title), fresh.map((m) => m.subject).join(' | '));
  await putRow('Step', jonasHw.objectId, { dueAt: iso(Date.now() + 3 * DAY) });
  expect('5. a new date takes the item off at once', !(await list()).items.some((i) => i.kind === 'quiet'));
  const r5b = await round();
  expect('5. ... and the round closes the flag, with no digest', r5b.closed === 1 && !(await openFlag(who.jonas.objectId)) && r5b.digest === 'nothing new', JSON.stringify(r5b));

  // 3 (end). A new learner message after "No reply needed" is a question again.
  const ask = await fn('jonas', 'sendMessage', { body: 'Inbox gate: one more question.' });
  const reopened = (await list()).items.find((i) => i.kind === 'question' && i.learnerId === who.jonas.objectId);
  expect('3. a new message from Jonas is a question again, counting only itself', ask.ok && reopened && reopened.body.includes('one more question') &&
    reopened.count === 1, show(ask));
  const r6 = await round();
  const d6 = await newDigests();
  expect('6. ... and the next round mails it, once', r6.digest === 'sent 1' && d6.length === 1 && d6[0].text.includes('Jonas Weber asked'), JSON.stringify(r6));
  await round();
  expect('6. a round after that sends nothing', (await newDigests()).length === 0);
  expect('end: the count matches the list', (await list({ countOnly: true })).count === (await list()).items.length);
} catch (e) {
  expect(`no exception (${String((e && e.message) || e).slice(0, 200)})`, false);
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
  console.error(`check-inbox: ${failed.length} of ${results.length} checks FAILED:\n  ✗ ${failed.map((f) => `${f.name}${f.detail ? `  (${f.detail})` : ''}`).join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(`check-inbox: ok — ${results.length} checks on a scratch backend, the morning round fired by hand.`);
