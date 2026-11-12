#!/usr/bin/env node
/**
 * GATE: MESSAGE MAIL GOES OUT ONCE, TO THE RIGHT PERSON (DBU-07).
 *
 *   node tools/check-mail.mjs [--keep]
 *
 * Builds a SCRATCH backend of its own (reset-demo --root ~/.nodegx/dbu-mail-check --port 8597
 * --keep-mail --mail-hold-seconds 2), so the demo on 8595 is never touched, and reads what arrives
 * in Mailpit. The hold is 2 seconds here instead of 5 minutes; nothing else differs from the app.
 * The every-minute flush is switched off on the scratch backend and fired by hand, so the clock
 * never races the checks.
 *
 *  1. One learner message: exactly one email to the coach address, with the learner's name, the
 *     homework, the text and a reply link.
 *  2. Two more within the hold: no email at once; the flush sends exactly one, carrying both.
 *  3. The coach replies: exactly one email to the learner, "Richard replied", with a link to the
 *     homework and an unsubscribe link in the footer.
 *  4. The unsubscribe link with its signature changed does nothing; the link itself turns message
 *     emails off. The next reply sends nothing, then or at the flush.
 *  5. Turned back on (Messages page): the next reply is one email again.
 *  6. The coach address from Settings is where learner messages go.
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
const ROOT = join(homedir(), '.nodegx', 'dbu-mail-check');
const PORT = 8597;
const BACKEND = `http://127.0.0.1:${PORT}`;
const HOLD_S = 2;
const TRIGGER = 'mail-waiting-messages';
const DEFAULT_COACH = 'coach@example.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });
const show = (r) => `${r.status} ${String(r.text || '').slice(0, 160)}`;

function resetDemo(...extra) {
  const r = spawnSync(process.execPath, [join(here, 'reset-demo.mjs'), '--root', ROOT, '--port', String(PORT), ...extra], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`check-mail: reset-demo ${extra.join(' ')} failed:\n${(r.stdout || '').slice(-1500)}\n${(r.stderr || '').slice(-1500)}`);
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
/** Mail to `address` that this run has not looked at yet, after waiting `ms` for it to settle. */
async function newMailTo(address, ms = 2500) {
  await sleep(ms);
  const found = (await inbox()).filter((m) => !seen.has(m.id) && m.to.includes(address));
  for (const m of found) {
    seen.add(m.id);
    m.text = (await (await fetch(`${MAILPIT.web}/api/v1/message/${m.id}`)).json()).Text;
  }
  return found;
}

const before = await inbox();
for (const m of before) seen.add(m.id);
console.log(`check-mail: building a scratch backend on ${BACKEND} (${ROOT})…`);
resetDemo('--keep-mail', '--mail-hold-seconds', String(HOLD_S));
// The reset fires the morning round (DBU-08), whose digest goes to the coach address: not this gate's mail.
for (const m of await inbox()) seen.add(m.id);

const token = readFileSync(join(ROOT, 'admin-token'), 'utf8').trim();
const api = adminClient(BACKEND, token);
const users = await api.all('_User');
const user = (email) => users.find((u) => u.email === email);
const jonas = user('jonas.weber@example.com');
const coach = user('coach@example.com');
const sessions = { jonas: await api.sessionFor(jonas.objectId, 'mail-jonas'), coach: await api.sessionFor(coach.objectId, 'mail-coach') };
const fn = (who, name, body = {}) => api.as(who ? sessions[who].token : null, 'POST', `/functions/${name}`, body);
const step = (await api.all('Step')).find((s) => s.learner === jonas.objectId && s.shared && s.kind === 'homework');
const pendingOf = async (body) => (await api.all('Message')).find((m) => m.body === body);
const fire = () => api.call('POST', `/admin/triggers/${TRIGGER}/fire`, {});
const holdOver = () => sleep(HOLD_S * 1000 + 600);

try {
  expect('setup: Jonas, the coach and a shared homework of his are there', !!(jonas && coach && step));
  await api.call('POST', `/admin/triggers/${TRIGGER}/enabled`, { enabled: false });

  // 1. One learner message: one email to the coach.
  const a = await fn('jonas', 'sendMessage', { body: 'Mail check A: should the prompt be in English?', stepId: step.objectId });
  // 2. Two more at once: held.
  const b = await fn('jonas', 'sendMessage', { body: 'Mail check B: and the examples?' });
  const c = await fn('jonas', 'sendMessage', { body: 'Mail check C: one more thing.' });
  expect('sendMessage: three messages saved', a.ok && b.ok && c.ok, show(a));
  const first = await newMailTo(DEFAULT_COACH);
  expect('1. one learner message: exactly one email to the coach address', first.length === 1, first.map((m) => m.subject).join(' | '));
  const m1 = first[0] || { text: '', subject: '' };
  expect('1. the subject names the learner', m1.subject === 'Jonas Weber sent you a message', m1.subject);
  expect('1. it carries the homework, the text and a reply link to the learner\'s page', m1.text.includes(`About the homework "${step.title}"`) &&
    m1.text.includes('Mail check A') && m1.text.includes(`/coach/plan?learner=${jonas.objectId}`), m1.text.slice(0, 400));
  expect('1. it carries only the first message (the others are held)', !m1.text.includes('Mail check B') && !m1.text.includes('Mail check C'));
  expect('2. the two quick messages are held, waiting for the flush', (await pendingOf('Mail check B: and the examples?'))?.mailPending === true &&
    (await pendingOf('Mail check C: one more thing.'))?.mailPending === true);

  await holdOver();
  const flushed = await fire();
  const grouped = await newMailTo(DEFAULT_COACH);
  expect('2. the flush sends exactly one email for both', grouped.length === 1, `${JSON.stringify(flushed).slice(0, 200)} / ${grouped.map((m) => m.subject).join(' | ')}`);
  const g = grouped[0] || { text: '', subject: '' };
  expect('2. it says how many, and carries both', g.subject === 'Jonas Weber sent you 2 messages' && g.text.includes('Mail check B') && g.text.includes('Mail check C'), g.subject);
  await fire();
  expect('2. a second flush sends nothing more', (await newMailTo(DEFAULT_COACH, 1500)).length === 0);

  // 3. The coach replies: one email to the learner.
  const r1 = await fn('coach', 'replyAsCoach', { learnerId: jonas.objectId, body: 'Mail check reply 1: English, please.', stepId: step.objectId });
  const replyMail = await newMailTo(jonas.email);
  expect('3. a reply: exactly one email to the learner', r1.ok && replyMail.length === 1, `${show(r1)} / ${replyMail.length}`);
  const rm = replyMail[0] || { text: '', subject: '' };
  expect('3. "Richard replied", with the text and a link to the homework', rm.subject === 'Richard replied' && rm.text.includes('Mail check reply 1') &&
    rm.text.includes(`/homework?step=${encodeURIComponent(step.objectId)}`), rm.text.slice(0, 400));
  const link = (rm.text.match(/Stop these emails: (\S+)/) || [])[1] || '';
  const url = link ? new URL(link) : null;
  expect('3. the footer has an unsubscribe link with an id and a signature', !!url && url.pathname === '/unsubscribe' &&
    url.searchParams.get('u') === jonas.objectId && /^[0-9a-f]{64}$/.test(url.searchParams.get('s') || ''), link);

  // 4. Unsubscribe: a changed signature does nothing; the real one turns emails off.
  const optOut = async () => (await api.all('_User', { objectId: jonas.objectId }))[0].emailOptOutAt || null;
  if (url) {
    const s = url.searchParams.get('s');
    const forged = await fn(null, 'unsubscribe', { u: jonas.objectId, s: (s[0] === 'a' ? 'b' : 'a') + s.slice(1) });
    expect('4. a changed signature leaves emails on', forged.ok && (await optOut()) === null, show(forged));
    const real = await fn(null, 'unsubscribe', { u: url.searchParams.get('u'), s });
    expect('4. the link from the email, signed out, turns them off', real.ok && (await optOut()) !== null, show(real));
    expect('4. both answer the same', forged.text === real.text);
  }
  await holdOver();
  const r2 = await fn('coach', 'replyAsCoach', { learnerId: jonas.objectId, body: 'Mail check reply 2: while you are unsubscribed.' });
  expect('4. unsubscribed: the reply sends no email', r2.ok && (await newMailTo(jonas.email)).length === 0, show(r2));
  await fire();
  expect('4. ... and the flush does not send it later either', (await newMailTo(jonas.email, 1500)).length === 0 &&
    (await pendingOf('Mail check reply 2: while you are unsubscribed.'))?.mailPending === false);
  const mine = await fn('jonas', 'myMessages');
  expect('4. Jonas still sees the reply in Messages, with emails shown as off', mine.ok && mine.text.includes('Mail check reply 2') && mine.json.result.emailOn === false, show(mine));

  // 5. Back on.
  const on = await fn('jonas', 'setEmailPreference', { state: 'on' });
  expect('5. turned back on', on.ok && (await optOut()) === null, show(on));
  await holdOver();
  await fn('coach', 'replyAsCoach', { learnerId: jonas.objectId, body: 'Mail check reply 3: welcome back.' });
  const back = await newMailTo(jonas.email);
  expect('5. the next reply is one email again', back.length === 1 && back[0].text.includes('Mail check reply 3'), back.map((m) => m.subject).join(' | '));

  // 6. The coach address from Settings.
  const set = await fn('coach', 'saveCoachSettings', { coachEmail: 'coach-inbox@example.com' });
  expect('6. the coach sets another address', set.ok && set.json.result.coachEmail === 'coach-inbox@example.com', show(set));
  await holdOver();
  await fn('jonas', 'sendMessage', { body: 'Mail check D: to the new address.' });
  const moved = await newMailTo('coach-inbox@example.com');
  expect('6. learner messages now go there, and not to the default', moved.length === 1 && moved[0].text.includes('Mail check D') && (await newMailTo(DEFAULT_COACH, 0)).length === 0,
    moved.map((m) => m.subject).join(' | '));
} catch (e) {
  expect(`no exception (${String((e && e.message) || e).slice(0, 200)})`, false);
} finally {
  if (!has('keep')) {
    resetDemo('--stop');
    if (existsSync(join(ROOT, '.dbu-demo'))) rmSync(ROOT, { recursive: true, force: true });
    const keep = new Set(before.map((m) => m.id));
    const ids = (await inbox()).map((m) => m.id).filter((id) => !keep.has(id));
    if (ids.length) await fetch(`${MAILPIT.web}/api/v1/messages`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IDs: ids }) });
  }
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`check-mail: ${failed.length} of ${results.length} checks FAILED:\n  ✗ ${failed.map((f) => `${f.name}${f.detail ? `  (${f.detail})` : ''}`).join('\n  ✗ ')}`);
  process.exit(1);
}
console.log(`check-mail: ok — ${results.length} checks on a scratch backend (hold ${HOLD_S} s), mail read back from Mailpit.`);
