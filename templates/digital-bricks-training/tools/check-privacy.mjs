#!/usr/bin/env node
/**
 * THE PRIVACY FLOOR, CHECKED AGAINST THE FILES RATHER THAN REMEMBERED (TASK-L185).
 *
 * 1. THE PLAN IS TOTAL. `__cloud__/shared/Rows about` holds the one statement of
 *    which rows belong to a person (both exportMine and deleteMine read it). Every
 *    collection in backend/schema.json must be in its PLAN or in
 *    NOTHING_ABOUT_THEM with a reason, and nothing may be in both or in neither.
 *    A collection added later fails here until somebody decides about it — the
 *    product's L55, which parsed schema.ts for exactly this.
 * 2. ONE VERSION. privacy/notice.en.json owns it; the browser's copy (the
 *    generated `privacy` half of Data/Strings) and the server's copy (the
 *    NOTICE_VERSION constant in `__cloud__/shared/Notice`) must equal it, and the
 *    generated half must be exactly what tools/build-privacy.mjs would write.
 * 3. THE NOTICE CLAIMS NOTHING THE TEMPLATE DOES NOT DO. It may not name a
 *    company, a kind of file transfer or a credential this template has no node,
 *    function or setting for. A notice describing somebody else's product is
 *    inaccurate, which is why this is not the product's notice (§1).
 *
 * Run: node tools/check-privacy.mjs      (exit 1 on any failure, each by name)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(TEMPLATE, p), 'utf8'));
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const scriptOf = (component, nodeId) => {
  const n = json(`components/__cloud__/${component}/nodes.json`).nodes.find((x) => x.id === nodeId);
  if (!n) throw new Error(`${component} has no node ${nodeId}`);
  return n.parameters.functionScript;
};

// ── 1. The plan against the schema ────────────────────────────────────────────
const rows = scriptOf('shared/Rows about', 'ra_fn');
const constant = (name) => {
  const m = rows.match(new RegExp(`const ${name} = ([\\[{][\\s\\S]*?\\n[\\]}]);`));
  if (!m) throw new Error(`shared/Rows about has no ${name} constant this check can read`);
  return new Function(`return ${m[1]};`)();
};
const PLAN = constant('PLAN');
const NOTHING = constant('NOTHING_ABOUT_THEM');
const schema = json('backend/schema.json').tables.map((t) => t.name);
const planned = PLAN.map((p) => p.c);
check(planned.length > 0, 'plan: PLAN read as empty, so every other plan check tested nothing');
for (const c of schema) {
  const inPlan = planned.includes(c);
  const excused = Object.prototype.hasOwnProperty.call(NOTHING, c);
  check(inPlan || excused, `plan: ${c} is in backend/schema.json and in neither PLAN nor NOTHING_ABOUT_THEM — nobody has decided whether it holds anything about a person`);
  check(!(inPlan && excused), `plan: ${c} is both in PLAN and excused as holding nothing about them`);
  if (excused) check(String(NOTHING[c]).length > 20, `plan: ${c} is excused without a reason`);
}
for (const c of [...planned, ...Object.keys(NOTHING)]) check(schema.includes(c), `plan: ${c} is planned but is not a collection in backend/schema.json`);
check(new Set(planned).size === planned.length, 'plan: a collection appears twice in PLAN');
for (const p of PLAN) {
  check(Boolean(p.by) !== Boolean(p.via), `plan: ${p.c} must say exactly one of by / via`);
  if (p.via) {
    check(planned.indexOf(p.via) > -1 && planned.indexOf(p.via) < planned.indexOf(p.c), `plan: ${p.c} hangs off ${p.via}, which is not earlier in PLAN, so it would be read before its parent`);
    check(Boolean(p.key), `plan: ${p.c} hangs off ${p.via} by no key`);
  }
}
/* TASK-L189 §5: rows that go when a person goes but are another learner's (an
   unadapted copy of their lesson). Each must be a planned collection, keyed by a
   field that names a learner, deleted by deleteMine and NOT handed over by exportMine. */
const ALSO = constant('ALSO_DELETED');
check(ALSO.length > 0, 'plan: ALSO_DELETED read as empty');
for (const a of ALSO) {
  check(planned.includes(a.c), `plan: ${a.c} is in ALSO_DELETED but not in PLAN`);
  check(/learnerid$/i.test(String(a.by)), `plan: ${a.c} in ALSO_DELETED is keyed by ${a.by}, which does not name a learner`);
}
check(/Inputs\.alsoDeleted/.test(scriptOf('deleteMine', 'erase')), 'plan: deleteMine does not delete Rows about\'s alsoDeleted rows');
check(!/alsoDeleted/.test(scriptOf('exportMine', 'doc')), "plan: exportMine reads alsoDeleted — that is another learner's draft");
check(planned[planned.length - 1] === 'LearnerProfile', 'plan: LearnerProfile is not last — it is how a second deletion run finds them');
// Both functions read the plan from here, never a copy of their own.
for (const [fn, node] of [['exportMine', 'doc'], ['deleteMine', 'erase']]) {
  const nodes = json(`components/__cloud__/${fn}/nodes.json`).nodes;
  check(nodes.some((n) => n.type === '/#__cloud__/shared/Rows about'), `plan: ${fn} does not place shared/Rows about`);
  check(!/const PLAN\b/.test(scriptOf(fn, node)), `plan: ${fn} carries a PLAN of its own`);
}

// ── 2. One version ────────────────────────────────────────────────────────────
const notice = json('privacy/notice.en.json');
const version = notice.version;
const server = scriptOf('shared/Notice', 'nt_fn').match(/const NOTICE_VERSION = '([^']*)';/);
check(server && server[1] === version, `version: shared/Notice says ${server ? server[1] : '(none)'}, the notice says ${version} — run tools/build-privacy.mjs`);
const strings = json('components/Data/Strings/nodes.json').nodes.find((n) => n.id === 'str_privacy');
const half = strings ? JSON.parse(strings.parameters.json)[0] : {};
check(half.privacy && half.privacy.version === version, `version: Data/Strings says ${half.privacy && half.privacy.version}, the notice says ${version} — run tools/build-privacy.mjs`);
const fill = (x) =>
  typeof x === 'string' ? x.replace(/\{\{version\}\}/g, version).replace(/\{\{email\}\}/g, notice.contactEmail)
  : Array.isArray(x) ? x.map(fill)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fill(v)]))
  : x;
check(JSON.stringify(half.privacy) === JSON.stringify(Object.assign({ version }, fill(notice.privacy))),
  'version: the privacy half of Data/Strings is not what build-privacy.mjs writes from the notice — somebody edited the generated copy, or forgot to regenerate');
for (const fn of ['capture', 'finishStep', 'acceptPrivacy', 'sendMessage', 'replyAsCoach']) {
  check(json(`components/__cloud__/${fn}/nodes.json`).nodes.some((n) => n.type === '/#__cloud__/shared/Notice'), `version: ${fn} does not read shared/Notice`);
}

// ── 3. The notice against what the template does ──────────────────────────────
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const nodeTypes = new Set(walk(join(TEMPLATE, 'components')).filter((f) => f.endsWith('nodes.json')).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).nodes.map((n) => n.type)));
const policy = json('nodegx.security.json');
const hasType = (re) => [...nodeTypes].some((t) => re.test(t));
/* TASK-L189: the trainer's Claude reads a learner's project through these, so
   learner data reaches Anthropic whenever the door exists — and then the notice
   MUST say so (checked below), not merely MAY. */
const TRAINER_DOOR = ['authoringGuide', 'learnersForLessons', 'lessonContext', 'saveLessonDraft', 'readLesson', 'publishLesson', 'copyLesson'];
const trainerDoor = TRAINER_DOOR.some((f) => policy.functions && policy.functions[f]);
const CLAIMS = [
  { word: /\banthropic\b|\bclaude\b|\bopenai\b|\bgpt\b/i, what: 'an AI company', does: () => hasType(/model|llm|ai\./i) || trainerDoor },
  { word: /\bgoogle\b/i, what: 'Google', does: () => /google/i.test(JSON.stringify(policy)) },
  { word: /\bupload/i, what: 'uploads', does: () => policy.files.upload !== 'nobody' || hasType(/upload|file/i) },
  { word: /\btoken\b|\bapi key\b/i, what: 'a token or key', does: () => hasType(/apikey|mcp/i) },
  { word: /\bconnector\b|\bmcp\b/i, what: 'a connector', does: () => hasType(/mcp|connector/i) },
  { word: /\bpayment|\bstripe\b|\bcard\b/i, what: 'payments', does: () => hasType(/stripe|payment/i) },
  { word: /\bcohort\b|\bgroup feed\b/i, what: 'a cohort feed', does: () => hasType(/cohort feed/i) }
];
const text = JSON.stringify(notice.privacy);
for (const c of CLAIMS) {
  const m = text.match(c.word);
  if (m) check(c.does(), `notice: it names ${c.what} ("${m[0]}") and the template has no node, function or setting that does that`);
}
check(/Brevo/.test(text), 'notice: it does not name Brevo, which sends every sign-in link');
if (trainerDoor) {
  check(/Anthropic/.test(text) && /Claude/.test(text), "notice: the trainer's lesson tools exist, so a learner's project reaches Anthropic, and the notice does not say so (TASK-L189 §6)");
  check(!/nothing you do is sent to an AI model(\.|, and)/i.test(text), 'notice: it still says nothing you do is sent to an AI model, and the trainer\'s assistant reads their project (TASK-L189 §6)');
}
check(/Hetzner/.test(text) && /Germany/.test(text), 'notice: it does not say where the data lives (Hetzner, Germany)');
check(!/GDPR compliant|RGPD compliant|fully compliant/i.test(text), 'notice: it claims compliance — a legal judgement nobody here may assert (sprint 17)');

if (fails.length) {
  console.error(`check-privacy: ${fails.length} failure(s)`);
  for (const f of fails) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`check-privacy: OK — ${schema.length} collections, ${planned.length} in the plan and ${Object.keys(NOTHING).length} holding nothing about anybody; version ${version} in the notice, Data/Strings and shared/Notice; the notice names nothing the template does not do.`);
