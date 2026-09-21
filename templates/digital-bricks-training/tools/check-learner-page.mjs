#!/usr/bin/env node
/**
 * THE COACH AND THEIR CLIENT READ THE SAME ASSEMBLY (TASK-L165).
 *
 * Runs the graph's OWN scripts — Data/Strings' merge, Data/Fixture programme's
 * split and Logic/Ordered timeline's projection — straight out of nodes.json,
 * for BOTH audiences, and asserts the properties the coach's page about one
 * learner exists for. Nothing here is a second implementation: if a script in
 * the graph changes, this runs the changed script.
 *
 * The claim it guards hardest is L116's: ONE model, TWO projections, differing
 * by exactly one filter (a learner never receives a `signal`) and one reader
 * (`unread` is relative to who is reading). The product proves it in
 * `timeline.dbtest.ts`; this is the same proof arriving in the graph.
 *
 * Run: node tools/check-learner-page.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'components');
const nodesOf = (c) => JSON.parse(readFileSync(join(ROOT, c, 'nodes.json'), 'utf8')).nodes;
const connsOf = (c) => JSON.parse(readFileSync(join(ROOT, c, 'connections.json'), 'utf8')).connections;
const nodeIn = (c, id) => {
  const n = nodesOf(c).find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id} in ${c}`);
  return n;
};
const script = (c, id) => nodeIn(c, id).parameters.functionScript;
const staticRows = (c, id) => JSON.parse(nodeIn(c, id).parameters.json);

/** Run a Function node's script the way the runtime does: Inputs in, Outputs out. */
function run(src, inputs, extra = {}) {
  const outputs = { loaded() {} };
  new Function('Inputs', 'Outputs', 'Noodl', src)(inputs, outputs, extra.Noodl);
  return outputs;
}

const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); };

// ── The strings, resolved by Data/Strings' own merge, per audience ──────────
const stringsFor = (audience) =>
  run(script('Data/Strings', 'str_split'), {
    items: staticRows('Data/Strings', 'str_data'),
    graph: staticRows('Data/Strings', 'str_graph'),
    locales: staticRows('Data/Strings', 'str_locales'),
    language: 'en',
    audience
  }).copy;
const copyFor = { learner: stringsFor('learner'), coach: stringsFor('coach') };

// ── The programme, split by the fixture's own Function ──────────────────────
const programme = run(script('Data/Fixture programme', 'fp_split'), {
  items: staticRows('Data/Fixture programme', 'fp_data')
});
const project = (audience, entries = programme.entries) =>
  run(script('Logic/Ordered timeline', 'ot_fn'), { entries, copy: copyFor[audience], audience });

const learner = project('learner');
const coach = project('coach');

// ── The fixture reaches every branch, or the checks below prove nothing ─────
const census = (list) => list.reduce((m, e) => ((m[e.kind] = (m[e.kind] || 0) + 1), m), {});
const kinds = census(programme.entries);
check(kinds.signal > 0, 'the fixture holds no signal, so "signals render for the coach only" is untestable');
check(kinds.message > 0, 'the fixture holds no message, so "a message renders for the coach only" is untestable');
check(programme.history.length > 0, 'the fixture holds no second programme, so the scope selector never renders');

// ── AC1: THE TWO PROJECTIONS AGREE, field by field, in order ────────────────
// The coach's list minus its signals IS the learner's list. Compared on the
// model-ordered ENTRIES (`inOrder`), which is what both surfaces are built
// from, and on the drawn rows too, ignoring only what is reader-relative.
const withoutSignals = coach.inOrder.filter((e) => e.kind !== 'signal');
check(withoutSignals.length === learner.inOrder.length,
  `AC1: coach minus signals has ${withoutSignals.length} entries, the learner has ${learner.inOrder.length}`);
const READER_RELATIVE = new Set(['unread']);
let mismatches = 0;
let differOnUnread = 0;
withoutSignals.forEach((e, i) => {
  const l = learner.inOrder[i];
  if (!l || l.id !== e.id) { mismatches++; failures.push(`AC1: position ${i} is ${e.id} for the coach and ${l && l.id} for the learner`); return; }
  for (const k of new Set([...Object.keys(e), ...Object.keys(l)])) {
    if (READER_RELATIVE.has(k)) { if (JSON.stringify(e[k]) !== JSON.stringify(l[k])) differOnUnread++; continue; }
    if (JSON.stringify(e[k]) !== JSON.stringify(l[k])) { mismatches++; failures.push(`AC1: ${e.id}.${k} differs between the two projections`); }
  }
});
// ...and the same check must be able to SEE a difference, or it passes because
// both sides are one object. `unread` is the field that is supposed to differ,
// so a message nobody has opened must read as new to exactly one side.
const probe = programme.entries.map((e) => (e.kind === 'message' ? { ...e, read: false } : e));
const pc = project('coach', probe).inOrder.filter((e) => e.kind === 'message');
const pl = project('learner', probe).inOrder.filter((e) => e.kind === 'message');
check(pc.length > 0 && pc.every((m, i) => m.unread !== pl[i].unread),
  'AC1: an unopened message reads the same to both sides — the comparison cannot see the reader at all');
check(mismatches === 0, `AC1: ${mismatches} field mismatch(es)`);

// The drawn ROWS agree too, once the two render-layer differences are named:
// signals (dropped by the projection) and messages (drawn for a coach only).
// `hasHeading`, never the heading's WORDS: "Theirs to pick up" and "Yours to
// pick up" start the same group, and differing by voice is L163 working.
const rowKey = (r) => JSON.stringify({ id: r.id, state: r.state, collapsed: r.collapsed, hasHeading: r.hasHeading, notes: r.notes.map((n) => n.id) });
const coachRows = coach.ordered.filter((r) => r.kind !== 'signal' && r.kind !== 'message').map(rowKey);
const learnerRows = learner.ordered.filter((r) => r.kind !== 'message').map(rowKey);
check(JSON.stringify(coachRows) === JSON.stringify(learnerRows),
  'AC3: the fold, the grouping or a carried note differs between the two surfaces for reasons that are not a signal or a message');

// ── AC4/AC5: what differs, attributed by name ───────────────────────────────
const coachOnly = coach.ordered.filter((r) => r.kind === 'signal');
check(coachOnly.length === kinds.signal, `AC4: ${coachOnly.length} signal rows for the coach, ${kinds.signal} in the fixture`);
check(learner.ordered.every((r) => r.kind !== 'signal'), 'AC4: a signal reached the learner');

// ── The Activity log is the same order, every entry its own row ─────────────
check(JSON.stringify(coach.feed.map((r) => r.id)) === JSON.stringify(coach.inOrder.map((e) => e.id)),
  'the Activity log is not the model order — it must not be re-sorted (L119 criterion 1)');

// ── AC2: ONE timeline row component, placed by BOTH pages ───────────────────
// A second copy is how a coach's view of a programme drifts from the learner's
// (L86, L127 §6). Counted by what a component IS — a place the kit's
// TimelineRow is drawn — not by its name.
const all = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'nodes.json') all.push(p.slice(ROOT.length + 1, -'/nodes.json'.length));
  }
})(ROOT);
const drawsRow = all.filter((c) => nodesOf(c).some((n) => n.type === 'dbt-lesson.TimelineRow'));
check(drawsRow.length === 1 && drawsRow[0] === 'Course/Timeline row',
  `AC2: the kit's TimelineRow is drawn by ${drawsRow.length} component(s): ${drawsRow.join(', ')}`);
for (const page of ['Pages/Course', 'Pages/Learner']) {
  if (!existsSync(join(ROOT, page, 'nodes.json'))) { check(false, `AC2: ${page} does not exist`); continue; }
  const places = nodesOf(page).some((n) => n.type === 'For Each' && n.parameters && n.parameters.template === '/Course/Timeline row');
  check(places, `AC2: ${page} does not place Course/Timeline row`);
}

// ── AC10: two name chains, and the one about a PERSON never names a project ─
// Driven through the page's own Function over the real roster row and three
// variants of it, so both fallbacks are reached rather than argued about.
const roster = run(script('Data/Fixture roster', 'fr_order'), { items: staticRows('Data/Fixture roster', 'fr_data') }).people;
const who = (people) => run(script('Pages/Learner', 'lr_who'), { people, learnerId: programme.learnerId, copy: copyFor.coach });
const me = roster.find((p) => p.learnerId === programme.learnerId);
check(me, `AC10: the programme belongs to ${programme.learnerId}, who is not on the roster`);
if (me) {
  check(me.coachLabel && me.projectName, 'AC10: the fixture learner needs BOTH a coach label and a project name, or this proves nothing');
  const variants = [
    me,
    { ...me, coachLabel: null },
    { ...me, coachLabel: null, email: null }
  ];
  for (const v of variants) {
    const w = who([v]);
    check(w.audienceName !== v.projectName && !String(w.tabTitle).includes(v.projectName),
      `AC10: audienceName named a project (${w.audienceName}) for coachLabel=${v.coachLabel} email=${v.email}`);
  }
  check(who([{ ...me, coachLabel: null }]).displayName === me.projectName,
    'AC10: the <h1> chain should fall back to the project — the two chains must differ, or they have been merged');
}

// ── AC7: a chip for each kind present, in the vocabulary's order, no counts ─
const pipe = (feed, filter = []) => {
  const Noodl = { Variables: {} };
  return run(script('Logic/Feed filter', 'ff_pipe'), { feed, copy: copyFor.coach, filter, loaded: true, open: [], programmeRows: coach.ordered, focus: '' }, { Noodl });
};
const vocabulary = Object.keys(copyFor.coach.timeline.kind);
const present = vocabulary.filter((k) => coach.feed.some((r) => r.kind === k));
const chips = pipe(coach.feed).chips;
check(JSON.stringify(chips.map((c) => c.id)) === JSON.stringify(present),
  `AC7: chips ${chips.map((c) => c.id)} are not the kinds present (${present}) in the vocabulary's order`);
check(chips.every((c) => !/\d/.test(c.label)), 'AC7: a chip carries a number — "Signals 7" is rejected by name');
check(!pipe(coach.feed.filter((r) => r.kind !== 'signal')).chips.some((c) => c.id === 'signal'),
  'AC7: a kind removed from the programme kept its chip');
check(!pipe(coach.feed.filter((r) => r.kind === 'lesson')).hasChips, 'AC7: a person with one kind is offered a filter that can only show everything');

// ── §4: "loaded" is its own value, never the filter's length ────────────────
const pipeSrc = script('Logic/Feed filter', 'ff_pipe').replace(/\/\*[\s\S]*?\*\//g, '');
check(/if \(focus && loaded\)/.test(pipeSrc) && /Inputs\.loaded === true/.test(pipeSrc),
  '§4: the jump no longer waits for the saved filter to be READ');
check(!/filter\.length\s*(===|>|!==)\s*0\s*\)?\s*(&&|\|\|)?\s*focus|loaded\s*=\s*filter\.length/.test(pipeSrc),
  '§4: "the filter has loaded" is being inferred from its length — nothing saved and not read yet are both []');

// ── A FUNCTION DRIVEN BY `Run` MUST NOT ALSO RUN ON ITS INPUTS ──────────────
// Since NDA-017 §2, wiring Run no longer makes a Function's value inputs
// passive: each has a Run On Value Change box, ticked by default. Measured on
// this page: opening a row in the log ALSO jumped to the programme, because the
// jump's Function ran when the row's id arrived. So every Function with an
// incoming `run` connection must untick every input — across the template.
for (const c of all) {
  const conns = connsOf(c);
  for (const n of nodesOf(c)) {
    if (n.type !== 'JavaScriptFunction') continue;
    if (!conns.some((k) => k.toId === n.id && k.toProperty === 'run')) continue;
    for (const port of (n.ports || []).filter((q) => q.plug === 'input' && q.name.startsWith('in-'))) {
      check(n.parameters && n.parameters['runOnChange-' + port.name] === false,
        `run-driven Function ${c} › ${n.id} still runs when ${port.name} changes`);
    }
  }
}

console.log(`checked ${programme.entries.length} entries (${Object.entries(kinds).map(([k, v]) => k + ' ' + v).join(', ')}); ` +
  `coach ${coach.ordered.length} rows, learner ${learner.ordered.length} rows, ${withoutSignals.length} entries compared, ${differOnUnread} unread difference(s) as read`);
if (failures.length) {
  console.error('FAIL:\n' + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log('OK: the coach and their client read the same assembly.');
