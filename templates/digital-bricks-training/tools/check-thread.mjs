#!/usr/bin/env node
/**
 * THE THREAD, OFFLINE, AGAINST A FAKE AS STRICT AS THE BACKEND (TASK-L186).
 *
 * `__cloud__/shared/Thread` is the one owner of a thread's rules; the four
 * functions (openThread, sendMessage — the learner's; openThreadAsCoach,
 * replyAsCoach — the coach's) each hand it one request. This runs that node's
 * own script over the seed and checks, by name:
 *
 *  - who marks what read: opening marks the OTHER party's turns and still says
 *    which were new; a reader's own turns are never marked; sending marks
 *    nothing; a coach opening does not clear the learner's side;
 *  - refusals, never trims: 4,001 characters, an empty body, a stale notice, an
 *    anchor kind outside the vocabulary — each with 0 rows written;
 *  - the subject is the first line, cut at 80 (the product's deriveSubject);
 *  - ONE VOCABULARY: the node's anchor kinds, the kit's THREAD_ANCHOR_KINDS and
 *    the product's NOTE_ANCHOR_KINDS are the same list in the same order;
 *  - the graph: no function takes a person as a parameter, the learner's half
 *    takes its learner from Caller learner, the coach's half has no learner at
 *    all, and each `reader` is typed in its own graph.
 *
 * ── AND A CONTROL, SO A GREEN RUN MEANS SOMETHING ───────────────────────────
 * The one mutation this module's misuse is a cross-learner leak: the learner
 * scope dropped from the thread lookup. It typechecks (there is nothing to
 * check) and reads fine. This file runs the node's script WITH that scope cut
 * out and requires that another learner then reads Sam's thread — or this check
 * could not see the thing it guards (check-write-functions' race control).
 *
 * Run: node tools/check-thread.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './lib/seed-resolve.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const OPENNOODL = resolve(TEMPLATE, '..', '..');
const DBT_REPO = process.env.DBT_REPO || resolve(OPENNOODL, '..', 'digital-bricks-training');
const json = (p) => JSON.parse(readFileSync(join(TEMPLATE, p), 'utf8'));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const cloud = (name) => ({ nodes: json(`components/__cloud__/${name}/nodes.json`).nodes, wires: json(`components/__cloud__/${name}/connections.json`).connections });
const THREAD = cloud('shared/Thread').nodes.find((n) => n.id === 'th_fn').parameters.functionScript;

// ── One vocabulary ───────────────────────────────────────────────────────────
const listIn = (src, re) => { const m = src.match(re); return m ? [...m[1].matchAll(/['"]([a-z_]+)['"]/g)].map((x) => x[1]) : null; };
const nodeKinds = listIn(THREAD, /ANCHOR_KINDS = \[([^\]]*)\]/);
const kitKinds = listIn(readFileSync(join(OPENNOODL, 'library/modules/dbt-lesson/src/kit.js'), 'utf8'), /var THREAD_ANCHOR_KINDS = \[([^\]]*)\]/);
let productKinds = null;
try {
  const src = readFileSync(join(DBT_REPO, 'src/lib/coach/note-anchor.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  productKinds = listIn(src, /NOTE_ANCHOR_KINDS = \[([^\]]*)\]/);
} catch { /* reported below */ }
check(nodeKinds && nodeKinds.length === 7, `vocabulary: shared/Thread's ANCHOR_KINDS not found (${nodeKinds})`);
check(JSON.stringify(nodeKinds) === JSON.stringify(kitKinds), `vocabulary: shared/Thread ${nodeKinds} ≠ kit ${kitKinds}`);
check(productKinds !== null, `vocabulary: the product's note-anchor.ts was not found under ${DBT_REPO} — set DBT_REPO; an absent product FAILS this check rather than passing it by comparing nothing`);
if (productKinds) check(JSON.stringify(nodeKinds) === JSON.stringify(productKinds), `vocabulary: shared/Thread ${nodeKinds} ≠ the product's ${productKinds}`);

// ── The graph ────────────────────────────────────────────────────────────────
const security = json('nodegx.security.json');
const FUNCTIONS = { openThread: ['learner', 'authenticated'], sendMessage: ['learner', 'authenticated'], openThreadAsCoach: ['coach', 'role:staff'], replyAsCoach: ['coach', 'role:staff'] };
for (const [fn, [reader, rule]] of Object.entries(FUNCTIONS)) {
  const g = cloud(fn);
  const req = g.nodes.find((n) => n.id === 'req');
  const params = String(req.parameters.params || '').split(',').filter(Boolean);
  check(!params.some((p) => /learner|user/i.test(p)), `gate: ${fn} declares a parameter naming a person (${params.join(', ')})`);
  check(req.parameters.allowNoAuth === false, `gate: ${fn} allows an anonymous caller`);
  check(security.functions[fn] && security.functions[fn].call === rule, `security: ${fn} is not "${rule}"`);
  const ask = g.nodes.find((n) => n.id === 'ask').parameters.functionScript;
  check(ask.includes(`reader: '${reader}'`), `gate: ${fn} does not type reader '${reader}' in its own graph`);
  check(g.nodes.find((n) => n.id === 'thread').type === '/#__cloud__/shared/Thread', `gate: ${fn} does not hand its request to shared/Thread`);
  const who = g.nodes.find((n) => n.id === 'who');
  if (reader === 'learner') {
    check(who && who.type === '/#__cloud__/shared/Caller learner', `gate: ${fn} does not take its learner from Caller learner`);
    check(g.wires.some((w) => w.fromId === 'who' && w.fromProperty === 'learnerId' && w.toId === 'ask'), `gate: ${fn}'s learner does not come from the session`);
  } else {
    check(!who && !/learnerId/.test(ask), `gate: ${fn} names a learner — a coach names a thread, and the thread says whose it is`);
  }
}

// ── The fake ─────────────────────────────────────────────────────────────────
const seed = json('backend/seed.json');
const oid = (username) => `u:${username}`;
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
  if ('equalTo' in c) return row[k] === c.equalTo;
  throw new Error(`the fake does not implement ${JSON.stringify(c)}`);
};
const copy = (x) => JSON.parse(JSON.stringify(x));
function makeRecords(table) {
  return {
    async query(c, where = {}, options = {}) {
      if (options.plain !== true) throw new Error(`Records.query('${c}') without { plain: true } (HLT-022)`);
      return (table[c] || []).filter((r) => matches(r, where)).slice(0, options.limit ?? 100).map(copy);
    },
    async save(id, props, options = {}) {
      if (!options.className) throw new Error('Records.save without className');
      const row = (table[options.className] || []).find((r) => r.objectId === id);
      if (!row) throw new Error('Object not found.');
      Object.assign(row, copy(props));
    },
    async create(c, props) {
      const unique = { Conversation: 'conversationId', ConversationMessage: 'messageId' }[c];
      if (unique && (table[c] || []).some((r) => r[unique] === props[unique])) throw new Error(`duplicate value for a unique index on ${c}`);
      (table[c] = table[c] || []).push({ objectId: `${c}:${serial++}`, ...copy(props), createdAt: new Date(Date.now() + serial).toISOString() });
    }
  };
}
/* The node logs every refusal; silenced while it runs and restored when it
   ANSWERS — never on a timer, which once swallowed this file's own report. */
const run = async (code, request, table) => {
  const { warn, error } = console;
  console.warn = () => {}; console.error = () => {};
  try {
    return await new Promise((done) => {
      const Outputs = { done: () => done({ ok: true, ...Outputs }), failed: () => done({ ok: false, reason: Outputs.reason }) };
      new Function('Inputs', 'Outputs', 'Noodl', code)({ request }, Outputs, { Records: makeRecords(table) });
    });
  } finally {
    Object.assign(console, { warn, error });
  }
};
const count = (t) => (t.Conversation || []).length + (t.ConversationMessage || []).length;
const msg = (t, id) => t.ConversationMessage.find((m) => m.messageId === id);

const SAM = 'l-sam';
const SAM_USER = oid('sam.okafor@example.test');
const COACH_USER = oid('trainer@example.test');
const OTHER = seed.rows.LearnerProfile.map((p) => p.learnerId).find((id) => id !== SAM);
const CSS = { anchorKind: 'lesson', anchorId: 'lesson:css-making-it-look-right' };
const L = (op, extra) => ({ op, reader: 'learner', learnerId: SAM, authorUserId: SAM_USER, noticeCurrent: true, ...CSS, ...extra });
const C = (op, extra) => ({ op, reader: 'coach', conversationId: 'conv-css', authorUserId: COACH_USER, noticeCurrent: true, ...extra });

{ // Opening: the coach's unread turn is new THIS once, then marked; Sam's own turn untouched.
  const t = makeWorld();
  // Sam's own turn starts UNREAD, so marking it would be visible (with it already
  // read, the fixture hid exactly the mutation this case exists to catch).
  msg(t, 'msg-phone').readAt = null;
  const samTurnBefore = msg(t, 'msg-phone').readAt;
  check(msg(t, 'msg-phone-reply').readAt == null, 'fixture: the coach\'s reply on the css thread should start unread');
  const first = await run(THREAD, L('open'), t);
  check(first.ok && first.turns.length === 2, `open: Sam's css thread should have 2 turns, got ${first.ok ? first.turns.length : first.reason}`);
  check(first.ok && first.turns[1].authorRole === 'coach' && first.turns[1].unread === true, 'open: the coach\'s reply is not reported as new on the first open');
  check(msg(t, 'msg-phone-reply').readAt != null, 'open: the coach\'s reply was not marked read by opening');
  check(msg(t, 'msg-phone').readAt === samTurnBefore, 'open: Sam\'s OWN turn was marked — unread would mean unwritten');
  const again = await run(THREAD, L('open'), t);
  check(again.ok && again.turns.every((x) => !x.unread), 'open: a second open still reports a turn as new');
  check(first.ok && !JSON.stringify(first.turns).includes('readAt'), 'open: readAt left the node — a turn carries unread, never when somebody read it');
}
{ // Sending marks nothing; the turn is the learner's; the thread is reused.
  const t = makeWorld();
  const sent = await run(THREAD, L('send', { body: 'Does this need a viewport line?' }), t);
  check(sent.ok && sent.turns.length === 3 && sent.turns[2].authorRole === 'learner', 'send: the question is not the third turn, written as the learner\'s');
  check(msg(t, 'msg-phone-reply').readAt == null, 'send: sending marked the coach\'s reply read — answering is not evidence of reading');
  check(t.Conversation.filter((c) => c.learnerId === SAM && c.anchorId === CSS.anchorId).length === 1, 'send: a second thread was started on an anchor that already has one');
  check(sent.ok && sent.turn && sent.turn.body === 'Does this need a viewport line?' && sent.learnerId === SAM, 'send: the written turn and its learner are not reported for the mail (L188)');
}
{ // A new anchor starts a thread with the first line as its subject.
  const t = makeWorld();
  const anchor = { anchorKind: 'session', anchorId: 'session:demo-new' };
  const long = 'x'.repeat(90);
  const r = await run(THREAD, L('send', { ...anchor, body: '  ' + long + '\nand some more context' }), t);
  const conv = t.Conversation.find((c) => c.anchorId === anchor.anchorId);
  check(r.ok && conv && conv.subject === 'x'.repeat(79) + '…', `subject: not the first line cut at 80 (${conv && conv.subject})`);
  const empty = await run(THREAD, L('open', { anchorKind: 'assignment', anchorId: 'assignment:none' }), t);
  check(empty.ok && Array.isArray(empty.turns) && empty.turns.length === 0, 'open: a card with no thread is not an empty thread');
}
{ // Refusals, each with nothing written.
  const cases = [
    ['too_long', L('send', { body: 'y'.repeat(4001) })],
    ['empty', L('send', { body: '   \n ' })],
    ['notice-not-accepted', L('send', { body: 'hello', noticeCurrent: false })],
    ['refused', L('send', { body: 'hello', anchorKind: 'note', anchorId: 'note:n1' })],
    ['refused', L('send', { body: 'hello', anchorKind: 'lesson', anchorId: 'session:x' })],
    ['refused', L('open', { learnerId: '' })],
    ['refused', C('send', { conversationId: 'conv-nope', body: 'hello' })],
    ['refused', { op: 'send', reader: 'admin', learnerId: SAM, body: 'hi', ...CSS }]
  ];
  for (const [reason, req] of cases) {
    const t = makeWorld();
    const before = count(t);
    const r = await run(THREAD, req, t);
    check(!r.ok && r.reason === reason, `refuse: expected ${reason}, got ${r.ok ? 'done' : r.reason} for ${JSON.stringify(req).slice(0, 90)}`);
    check(count(t) === before, `refuse: ${reason} wrote a row`);
  }
  const t = makeWorld();
  const ok = await run(THREAD, L('send', { body: 'z'.repeat(4000) }), t);
  check(ok.ok, 'limit: exactly 4,000 characters was refused');
}
{ // The coach's half: marks the learner's turns, never their own, never the learner's side.
  const t = makeWorld();
  msg(t, 'msg-phone').readAt = null;
  const opened = await run(THREAD, C('open'), t);
  check(opened.ok && opened.learnerId === SAM && opened.turns[0].unread === true, 'coach open: the learner\'s turn is not reported as new to the coach');
  check(msg(t, 'msg-phone').readAt != null, 'coach open: the learner\'s turn was not marked read');
  check(msg(t, 'msg-phone-reply').readAt == null, 'coach open: the coach\'s own turn was marked — that would clear the LEARNER\'s unread');
  const replied = await run(THREAD, C('send', { body: 'Yes — ask for that.' }), t);
  check(replied.ok && replied.turns.at(-1).authorRole === 'coach' && t.ConversationMessage.at(-1).authorRole === 'coach', 'coach send: the reply is not written as the coach\'s');
}
{ // Identity: another learner cannot reach Sam's thread — and the CONTROL proves this check can see it.
  const t = makeWorld();
  const other = await run(THREAD, L('open', { learnerId: OTHER }), t);
  check(other.ok && other.turns.length === 0, `scope: ${OTHER} read Sam's thread about the css lesson`);
  const scope = "q('Conversation', { learnerId: { equalTo: learnerId } })";
  check(THREAD.split(scope).length === 2, 'control: the learner-scoped lookup is not where this check cuts it');
  const leaky = THREAD.replace(scope, "q('Conversation', {})");
  const leaked = await run(leaky, L('open', { learnerId: OTHER }), makeWorld());
  check(leaked.ok && leaked.turns.length === 2, 'control: with the learner scope cut out, another learner did NOT read Sam\'s thread — this check cannot see the leak it guards');
}

if (failures.length) {
  console.error(`check-thread: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-thread: OK — one vocabulary (${nodeKinds.join(', ')}), four functions gated, read-marking both ways, 8 refusals writing nothing, the subject, and a learner scope whose removal this check sees (control leaked to ${OTHER}).`);
