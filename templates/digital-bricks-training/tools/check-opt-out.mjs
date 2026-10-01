#!/usr/bin/env node
/**
 * THE OPT-OUT AND THE MESSAGE MAIL, OFFLINE (TASK-L187, TASK-L188).
 *
 *  1. ONE OWNER OF MAIL. No cloud component places a Send Email node, exactly one
 *     script reaches the mailer and it is shared/Message mail's, and both senders
 *     run write → mail → answer.
 *  2. ONLY ONE THING TURNS MAIL BACK ON. `emailOptOutAt` is cleared by
 *     setEmailPreference's script and by no other script in the template.
 *  3. THE LINK. The mail and `unsubscribe` sign the same purpose string with the
 *     same key; the site is SITE_ORIGIN and no cloud component reads the request's
 *     origin; `unsubscribe` is public and the switch's two functions authenticated;
 *     the page calls `unsubscribe` from its button alone, so a scanner's GET stops
 *     nothing.
 *  4. THE SCRIPTS, RUN. `unsubscribe`'s verifier over a fake (bad, truncated,
 *     unknown and good all answer `done`, only good writes, the first stamp kept);
 *     `setEmailPreference` (off keeps the first stamp, on clears it); and
 *     shared/Message mail against a FAKE MAILER: the recorded coach alone, every
 *     staff account (saying so) when nobody is recorded, the learner for a reply,
 *     NOBODY who opted out or has no address, the triggering turn and never an
 *     earlier one, a subject that never quotes it, no coach's label, each
 *     recipient's OWN signed unsubscribe link, and no address or body in a log.
 *
 * Run: node tools/check-opt-out.mjs
 */
import { createHmac } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(TEMPLATE, p), 'utf8'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const cloud = (name) => ({ nodes: json(`components/__cloud__/${name}/nodes.json`).nodes, wires: json(`components/__cloud__/${name}/connections.json`).connections });
const script = (name, id) => cloud(name).nodes.find((n) => n.id === id).parameters.functionScript;

// ── 1. One owner of mail ──────────────────────────────────────────────────
// Nothing in the template places a Send Email node, and only shared/Message mail's
// script reaches the mailer — so that script is where every rule below is run.
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const cloudDirs = walk(join(TEMPLATE, 'components/__cloud__')).filter((f) => f.endsWith('nodes.json')).map((f) => f.split('__cloud__/')[1].replace(/\/nodes\.json$/, ''));
let senders = 0;
for (const name of cloudDirs) {
  for (const n of cloud(name).nodes) {
    check(n.type !== 'noodl.cloud.sendemail', `owner: ${name}/${n.id} is a Send Email node — mail goes through shared/Message mail, where the gate is`);
    if (n.type === 'JavaScriptFunction' && /_noodl_send_email/.test(n.parameters.functionScript || '')) {
      senders++;
      check(name === 'shared/Message mail', `owner: ${name}/${n.id} reaches the mailer — only shared/Message mail may`);
    }
  }
}
check(senders === 1, `owner: expected exactly one script that sends mail, found ${senders}`);
// Write, then mail, then answer: the turn is saved before anyone is told, and the
// answer waits for the mail, which always answers.
for (const fn of ['sendMessage', 'replyAsCoach']) {
  const w = cloud(fn).wires.map((c) => `${c.fromId}.${c.fromProperty}>${c.toId}.${c.toProperty}`);
  check(w.includes('thread.done>mailreq.run') && w.includes('mail.done>res.send') && !w.includes('thread.done>res.send'), `order: ${fn} is not write → mail → answer`);
  check(cloud(fn).nodes.some((n) => n.id === 'mail' && n.type === '/#__cloud__/shared/Message mail'), `order: ${fn} does not tell anybody through shared/Message mail`);
}

// ── 2. Only one thing turns mail back on ───────────────────────────────────
for (const name of cloudDirs) {
  for (const n of cloud(name).nodes.filter((x) => x.type === 'JavaScriptFunction')) {
    const s = n.parameters.functionScript || '';
    if (!/emailOptOutAt\s*:/.test(s)) continue;
    const clears = /emailOptOutAt\s*:\s*null|emailOptOutAt\s*:\s*stamp/.test(s);
    if (clears) check(name === 'setEmailPreference', `on: ${name}/${n.id} can clear emailOptOutAt — only setEmailPreference may turn mail back on`);
  }
}

// ── 3. The link ─────────────────────────────────────────────────────────────
const MAIL = script('shared/Message mail', 'mm_fn');
check(/'dbt-unsubscribe:v1:'/.test(MAIL) && /'dbt-unsubscribe:v1:'/.test(script('unsubscribe', 'v_start')), 'link: the mail and the verifier do not sign the same purpose string');
const keyOf = (name) => cloud(name).nodes.filter((n) => n.type === 'noodl.cloud.secret').map((n) => n.parameters.name).sort();
check(JSON.stringify(keyOf('shared/Message mail')) === '["SITE_ORIGIN","UNSUBSCRIBE_KEY"]' && JSON.stringify(keyOf('unsubscribe')) === '["UNSUBSCRIBE_KEY"]', 'link: the mail and the verifier do not read the same key, or the site is not SITE_ORIGIN');
check(!cloudDirs.some((n) => cloud(n).nodes.some((x) => /requestorigin/i.test(x.type))), 'link: a cloud component reads the request\'s origin — a caller could aim somebody else\'s link anywhere');
const sec = json('nodegx.security.json').functions;
check(sec.unsubscribe && sec.unsubscribe.call === 'public', 'security: unsubscribe is not public — a link in a mail has no session');
for (const f of ['emailPreference', 'setEmailPreference']) check(sec[f] && sec[f].call === 'authenticated', `security: ${f} is not authenticated`);
{
  const page = { nodes: json('components/Pages/Unsubscribe/nodes.json').nodes, wires: json('components/Pages/Unsubscribe/connections.json').connections };
  const calls = page.wires.filter((w) => w.toId === 'un_call' && w.toProperty === 'call');
  check(calls.length === 1 && calls[0].fromId === 'un_btn' && calls[0].fromProperty === 'onClick', `page: unsubscribe is called by ${calls.map((w) => w.fromId + '.' + w.fromProperty).join(', ') || 'nothing'}, not by the button alone — a GET must stop nothing`);
  const app = json('components/App/nodes.json').nodes;
  check(/'Pages\/Unsubscribe'/.test(app.find((n) => n.id === 'app_gate').parameters.functionScript), 'page: /unsubscribe is behind sign-in');
  check(/'Pages\/Unsubscribe'/.test(app.find((n) => n.id === 'app_notice_gate').parameters.functionScript), 'page: /unsubscribe is behind the notice gate');
}

// ── 4. The scripts, run ────────────────────────────────────────────────────
const fake = (rows) => ({
  writes: 0,
  async query(c, where, o) {
    if (!o || o.plain !== true) throw new Error('query without plain (HLT-022)');
    const [k] = Object.keys(where); return rows.filter((r) => r[k] === where[k].equalTo).map((r) => ({ ...r }));
  },
  async save(id, props, o) {
    if (!o || !o.className) throw new Error('save without className');
    const r = rows.find((x) => x.objectId === id); if (!r) throw new Error('no row'); Object.assign(r, props); this.writes++;
  }
});
/* The scripts log their refusals; silenced while one runs and restored when it
   ANSWERS, never on a timer (check-thread's lesson: a timer swallowed the report). */
const run = async (code, Inputs, Records, signals) => {
  const { warn, error } = console;
  console.warn = () => {}; console.error = () => {};
  try {
    return await new Promise((done) => {
      const Outputs = {};
      for (const s of signals) Outputs[s] = () => done({ signal: s, ...Outputs });
      new Function('Inputs', 'Outputs', 'Noodl', code)(Inputs, Outputs, { Records });
    });
  } finally {
    Object.assign(console, { warn, error });
  }
};
const KEY = 'k'.repeat(64);
const sign = (u) => createHmac('sha256', KEY).update('dbt-unsubscribe:v1:' + u).digest('hex');
{
  const VERIFY = script('unsubscribe', 'v_fn');
  const rows = [{ objectId: 'u1', email: 'a@x.test' }];
  const rec = fake(rows);
  const cases = [['bad', 'u1', '0'.repeat(64)], ['short', 'u1', sign('u1').slice(0, 40)], ['unknown', 'nobody', sign('nobody')]];
  for (const [label, u, s] of cases) {
    const r = await run(VERIFY, { u, s, signature: sign(u) === s ? s : sign(u) }, rec, ['done']);
    check(r.signal === 'done', `unsubscribe: ${label} did not answer done`);
  }
  check(rec.writes === 0 && !rows[0].emailOptOutAt, `unsubscribe: a link that does not verify wrote (${rec.writes})`);
  await run(VERIFY, { u: 'u1', s: sign('u1'), signature: sign('u1') }, rec, ['done']);
  const first = rows[0].emailOptOutAt;
  check(typeof first === 'string' && rec.writes === 1, 'unsubscribe: a good link did not stop the mail');
  await run(VERIFY, { u: 'u1', s: sign('u1').toUpperCase(), signature: sign('u1') }, rec, ['done']);
  check(rows[0].emailOptOutAt === first, 'unsubscribe: a second press moved the first stamp');
}
{
  const SET = script('setEmailPreference', 'fn');
  const rows = [{ objectId: 'u1', email: 'a@x.test' }];
  await run(SET, { userId: 'u1', state: 'off' }, fake(rows), ['done', 'failed']);
  const first = rows[0].emailOptOutAt;
  await run(SET, { userId: 'u1', state: 'off' }, fake(rows), ['done', 'failed']);
  check(typeof first === 'string' && rows[0].emailOptOutAt === first, 'setEmailPreference: off does not keep the first stamp');
  const on = await run(SET, { userId: 'u1', state: 'on' }, fake(rows), ['done', 'failed']);
  check(on.signal === 'done' && rows[0].emailOptOutAt === null && on.on === true, 'setEmailPreference: on does not clear the opt-out');
  const bad = await run(SET, { userId: 'u1', state: 'maybe' }, fake(rows), ['done', 'failed']);
  check(bad.signal === 'failed', 'setEmailPreference: a state that is neither on nor off was accepted');
}
{ // shared/Message mail, run: who gets what, and who never does.
  const SECRET_KEY = 'k'.repeat(64);
  const ORIGIN = 'https://training.example.test';
  const LABEL = 'Sam — first site, autumn';
  const TURN = 'Is a viewport line what I need?';
  const EARLIER = 'It looks fine on my laptop and squashed on my phone.';
  const world = (over = {}) => ({
    LearnerProfile: [{ learnerId: 'l1', userId: 'u-sam', coachEmail: 'coach@x.test', ...over.profile }],
    _User: [
      { objectId: 'u-sam', username: 'sam@x.test', email: 'sam@x.test', firstName: 'Sam', lastName: 'Okafor', ...over.sam },
      { objectId: 'u-coach', username: 'coach@x.test', email: 'coach@x.test', ...over.coach },
      { objectId: 'u-staff2', username: 'staff2@x.test', email: 'staff2@x.test' }
    ],
    Concept: [{ conceptId: 'css', title: 'CSS: making it look right' }],
    LearnerInvite: [{ claimedByLearnerId: 'l1', label: LABEL }],
    ConversationMessage: [{ body: EARLIER }]
  });
  const recs = (t) => ({
    async query(c, where, o) {
      if (!o || o.plain !== true) throw new Error('query without plain (HLT-022)');
      const [k] = Object.keys(where); return (t[c] || []).filter((r) => r[k] === where[k].equalTo).map((r) => ({ ...r }));
    }
  });
  async function mail(t, request, extra = {}) {
    const sent = [];
    const logs = [];
    const prev = globalThis._noodl_send_email;
    globalThis._noodl_send_email = async (m) => { sent.push(m); return extra.fail ? { success: false, error: 'relay said no to ' + m.to } : { success: true }; };
    const { log, warn, error } = console;
    console.log = console.warn = console.error = (...a) => logs.push(a.join(' '));
    try {
      await new Promise((done) => {
        const Outputs = { done: () => done() };
        new Function('Inputs', 'Outputs', 'Noodl', MAIL)(
          { request, staffIds: ['u-coach', 'u-staff2'], origin: extra.origin ?? ORIGIN, key: extra.key ?? SECRET_KEY },
          Outputs,
          { Records: recs(t) }
        );
      });
    } finally {
      Object.assign(console, { log, warn, error });
      globalThis._noodl_send_email = prev;
    }
    return { sent, logs: logs.join('\n') };
  }
  const Q = { to: 'coach', learnerId: 'l1', body: TURN, anchorKind: 'lesson', anchorId: 'lesson:css' };
  const R = { to: 'learner', learnerId: 'l1', body: 'Yes — ask for exactly that.', anchorKind: 'lesson', anchorId: 'lesson:css' };
  const sig = (u) => createHmac('sha256', SECRET_KEY).update('dbt-unsubscribe:v1:' + u).digest('hex');
  { const { sent, logs } = await mail(world(), Q);
    check(sent.length === 1 && sent[0].to === 'coach@x.test', `mail: a question did not go to the recorded coach alone (${sent.map((m) => m.to)})`);
    const m = sent[0] || { subject: '', text: '' };
    check(m.subject === 'Sam Okafor asked you a question' && !m.subject.includes(TURN), `mail: the subject is "${m.subject}" — it must name them and never quote the message`);
    check(m.text.includes(TURN) && !m.text.includes(EARLIER), 'mail: the coach\'s mail does not carry exactly the triggering turn');
    check(m.text.includes('“CSS: making it look right”'), 'mail: it does not say which card it is about');
    check(m.text.includes(ORIGIN + '/learner?learner=l1'), 'mail: the coach\'s link is not their learner\'s programme on SITE_ORIGIN');
    check(m.text.includes(`${ORIGIN}/unsubscribe?u=u-coach&s=${sig('u-coach')}`), 'mail: the unsubscribe link is not the recipient\'s own, signed as `unsubscribe` verifies it');
    check(!m.text.includes(LABEL) && !m.subject.includes(LABEL), 'mail: the coach\'s private label reached a mail (L84)');
    check(!m.text.includes('Nobody is set'), 'mail: an assigned learner\'s mail says nobody is set');
    check(!/@/.test(logs) && !logs.includes(TURN), 'mail: the log carries an address or a body'); }
  { const { sent } = await mail(world({ coach: { emailOptOutAt: '2026-10-01T00:00:00Z' } }), Q);
    check(sent.length === 0, 'mail: a coach who opted out was emailed'); }
  { const { sent } = await mail(world({ profile: { coachEmail: null } }), Q);
    check(sent.length === 2 && sent.every((m) => m.text.includes('Nobody is set as this learner’s coach')), `mail: with no coach recorded it did not go to every staff account, saying so (${sent.length})`);
    check(sent.every((m) => m.text.includes(`/unsubscribe?u=${m.to === 'coach@x.test' ? 'u-coach' : 'u-staff2'}&`)), 'mail: a staff recipient got somebody else\'s unsubscribe link'); }
  { const { sent } = await mail(world(), R);
    check(sent.length === 1 && sent[0].to === 'sam@x.test' && sent[0].subject === 'Your coach replied', 'mail: a reply did not go to the learner, or its subject quotes it');
    check(sent[0] && sent[0].text.includes(ORIGIN + '/course?comment=' + encodeURIComponent('lesson:css')), 'mail: the learner\'s link does not open that card\'s thread'); }
  { const { sent } = await mail(world({ sam: { email: null } }), R);
    check(sent.length === 0, 'mail: an account with no address was handed to the mailer'); }
  { const { sent } = await mail(world({ sam: { emailOptOutAt: '2026-10-01T00:00:00Z' } }), R);
    check(sent.length === 0, 'mail: a learner who opted out was emailed'); }
  { const { sent } = await mail(world(), Q, { origin: '', key: '' });
    check(sent.length === 0, 'mail: it sent without SITE_ORIGIN or UNSUBSCRIBE_KEY'); }
  { const { sent, logs } = await mail(world(), Q, { fail: true });
    check(sent.length === 1 && !/@/.test(logs), 'mail: a refused send was not attempted once, or its log names an address'); }
}

if (failures.length) {
  console.error(`check-opt-out: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-opt-out: OK — one owner of mail (shared/Message mail), write → mail → answer in both senders; run against a fake mailer: the recorded coach, everyone on staff when nobody is, the learner, nobody who opted out or has no address, the turn and never the thread, no label, no address in a log; only setEmailPreference turns mail back on; one purpose and one key; unsubscribe public, called by the button alone, answering the same four ways.`);
