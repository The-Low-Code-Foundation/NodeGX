#!/usr/bin/env node
/**
 * THE OPT-OUT, OFFLINE (TASK-L187).
 *
 *  1. THE ONE GATE. Every cloud component that places a `Send Email` node also
 *     places `shared/May email`, and the Send Email's Do is fired by a node that
 *     READS the gate's `may` — never straight from a Request. With no Send Email
 *     in the template yet (L188 adds them) that would pass by testing nothing, so
 *     the rule is first run against two made-up components: one gated, one not,
 *     and it must pass the first and fail the second.
 *  2. ONLY ONE THING TURNS MAIL BACK ON. `emailOptOutAt` is cleared (`null`) by
 *     setEmailPreference's script and by no other script in the template.
 *  3. THE LINK. `shared/Unsubscribe link` and `unsubscribe` sign the same
 *     purpose string with the same secret name; the site is SITE_ORIGIN, never a
 *     request header; `unsubscribe` is `public` and the switch's two functions
 *     `authenticated`; the page calls `unsubscribe` from its button and nothing
 *     else, so a mail scanner's GET stops nothing.
 *  4. THE SCRIPTS, RUN. `unsubscribe`'s verifier over a fake: a bad signature, a
 *     truncated one, an unknown account and a success all answer `done`, only the
 *     success writes, and a second press keeps the first stamp.
 *     `setEmailPreference`: off keeps the first stamp, on clears it. `May email`:
 *     opted out → no, no address → no, otherwise yes.
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

// ── 1. The one gate ─────────────────────────────────────────────────────────
/** Problems with one component's mail, or [] when it is gated. */
function gateProblems(name, { nodes, wires }) {
  const sends = nodes.filter((n) => n.type === 'noodl.cloud.sendemail');
  if (!sends.length) return [];
  const out = [];
  const gates = nodes.filter((n) => n.type === '/#__cloud__/shared/May email').map((n) => n.id);
  if (!gates.length) return [`${name}: places Send Email and no shared/May email`];
  // A node that reads the gate's answer…
  const readers = new Set(wires.filter((w) => gates.includes(w.fromId) && w.fromProperty === 'may').map((w) => w.toId));
  for (const s of sends) {
    const firers = wires.filter((w) => w.toId === s.id && w.toProperty === 'send').map((w) => w.fromId);
    if (!firers.length) out.push(`${name}: ${s.id} is never fired`);
    for (const f of firers) if (!readers.has(f)) out.push(`${name}: ${s.id} is fired by ${f}, which does not read May email's answer`);
    // …and the address comes from the gate, never from a Request or a Function's own lookup.
    const to = wires.filter((w) => w.toId === s.id && w.toProperty === 'to');
    for (const w of to) if (!(gates.includes(w.fromId) && w.fromProperty === 'to') && !readers.has(w.fromId)) out.push(`${name}: ${s.id} takes its address from ${w.fromId}, not from the gate`);
  }
  return out;
}
{ // The rule, first, against two made-up components.
  const gated = { nodes: [{ id: 'g', type: '/#__cloud__/shared/May email' }, { id: 'f', type: 'JavaScriptFunction' }, { id: 'm', type: 'noodl.cloud.sendemail' }],
    wires: [{ fromId: 'g', fromProperty: 'may', toId: 'f', toProperty: 'in-may' }, { fromId: 'f', fromProperty: 'out-send', toId: 'm', toProperty: 'send' }, { fromId: 'g', fromProperty: 'to', toId: 'm', toProperty: 'to' }] };
  const ungated = { nodes: [{ id: 'r', type: 'noodl.cloud.request' }, { id: 'm', type: 'noodl.cloud.sendemail' }], wires: [{ fromId: 'r', fromProperty: 'receive', toId: 'm', toProperty: 'send' }] };
  check(gateProblems('gated', gated).length === 0, `self-test: a gated component is accused: ${gateProblems('gated', gated)}`);
  check(gateProblems('ungated', ungated).length > 0, 'self-test: a Send Email fired straight from a Request passed — the rule cannot see an ungated sender');
}
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const cloudDirs = walk(join(TEMPLATE, 'components/__cloud__')).filter((f) => f.endsWith('nodes.json')).map((f) => f.split('__cloud__/')[1].replace(/\/nodes\.json$/, ''));
let senders = 0;
for (const name of cloudDirs) {
  const c = cloud(name);
  if (c.nodes.some((n) => n.type === 'noodl.cloud.sendemail')) senders++;
  for (const p of gateProblems(name, c)) check(false, `gate: ${p}`);
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
const PURPOSE = /'dbt-unsubscribe:v1:'/;
check(PURPOSE.test(script('shared/Unsubscribe link', 'ul_start')) && PURPOSE.test(script('unsubscribe', 'v_start')), 'link: the minter and the verifier do not sign the same purpose string');
const keyOf = (name) => cloud(name).nodes.filter((n) => n.type === 'noodl.cloud.secret').map((n) => n.parameters.name);
check(keyOf('shared/Unsubscribe link').includes('UNSUBSCRIBE_KEY') && JSON.stringify(keyOf('unsubscribe')) === '["UNSUBSCRIBE_KEY"]', 'link: the minter and the verifier do not read the same key');
check(keyOf('shared/Unsubscribe link').includes('SITE_ORIGIN'), 'link: the site does not come from SITE_ORIGIN');
check(!cloud('shared/Unsubscribe link').nodes.some((n) => /requestorigin/i.test(n.type)), 'link: the site comes from the request — a caller could aim somebody else\'s link anywhere');
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
{
  const MAY = script('shared/May email', 'me_fn');
  const rows = [{ objectId: 'ok', email: 'a@x.test' }, { objectId: 'out', email: 'b@x.test', emailOptOutAt: '2026-10-01T00:00:00Z' }, { objectId: 'none' }];
  const ask = async (id) => (await run(MAY, { userId: id }, fake(rows), ['done'])).may;
  check((await ask('ok')) === true, 'May email: an ordinary account is refused');
  check((await ask('out')) === false, 'May email: an opted-out account is allowed');
  check((await ask('none')) === false, 'May email: an account with no address is allowed');
  check((await ask('ghost')) === false, 'May email: an unknown account is allowed');
}

if (failures.length) {
  console.error(`check-opt-out: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check-opt-out: OK — ${senders} mail sender(s), each behind May email (the rule proven on a gated and an ungated sender first); only setEmailPreference turns mail back on; one purpose, one key, the site from SITE_ORIGIN; unsubscribe public, called by the button alone; its verifier answers the same four ways and writes once.`);
