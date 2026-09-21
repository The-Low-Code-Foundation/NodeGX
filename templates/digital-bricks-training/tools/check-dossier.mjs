#!/usr/bin/env node
/**
 * WHAT EACH OBJECTIVE HOLDS, PROVEN EQUAL TO THE PRODUCT (TASK-L166).
 *
 * Runs the graph's OWN scripts — Data/Strings' merge, Data/Fixture programme's
 * split and Logic/Dossier — straight out of nodes.json, and compares what
 * Logic/Dossier emits against the PRODUCT'S OWN `dossierProgress`,
 * `humaniseFactName` and `toMarkdown`, bundled in memory from the product's
 * source. Nothing here is a second implementation of either side: if the graph
 * changes, this runs the changed graph; if the product changes, this compares
 * against the changed product.
 *
 * The product is found the way the kit's build.mjs finds it: `DBT_REPO`, else
 * the sibling `digital-bricks-training` checkout. Absent, this FAILS rather than
 * passing by comparing nothing.
 *
 * Run: node tools/check-dossier.mjs
 */
import { build } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', 'components');
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');

const nodeIn = (c, id) => {
  const n = JSON.parse(readFileSync(join(ROOT, c, 'nodes.json'), 'utf8')).nodes.find((x) => x.id === id);
  if (!n) throw new Error(`no node ${id} in ${c}`);
  return n;
};
const script = (c, id) => nodeIn(c, id).parameters.functionScript;
const staticRows = (c, id) => JSON.parse(nodeIn(c, id).parameters.json);

/** Run a Function node's script the way the runtime does: Inputs in, Outputs out. */
function run(src, inputs) {
  const outputs = { loaded() {} };
  new Function('Inputs', 'Outputs', 'Noodl', src)(inputs, outputs, {});
  return outputs;
}

const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); };

// ── The product, bundled in memory from its own source ──────────────────────
if (!existsSync(join(DBT_REPO, 'src', 'lib', 'server', 'delivery', 'dossier-map.ts'))) {
  console.error(`check-dossier: the product is not at ${DBT_REPO} — set DBT_REPO. Refusing to pass by comparing nothing.`);
  process.exit(1);
}
const entry = `
  export { dossierProgress } from ${JSON.stringify(join(DBT_REPO, 'src/lib/server/delivery/dossier-map.ts'))};
  export { humaniseFactName, toMarkdown } from ${JSON.stringify(join(DBT_REPO, 'src/lib/components/course/dossier-format.ts'))};
  export { languexpertPack } from ${JSON.stringify(join(DBT_REPO, 'src/lib/domain/languexpert/index.ts'))};
`;
const bundled = await build({
  stdin: { contents: entry, resolveDir: DBT_REPO, loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
  plugins: [
    {
      // dossier-map.ts imports the ACTIVE pack only as the DEFAULT of its second
      // parameter. Every call below passes deliverables explicitly, so the active
      // pack is never read — stubbed rather than dragging the whole domain
      // index (and its env read) into a check.
      name: 'no-active-pack',
      setup(b) {
        b.onResolve({ filter: /^\.\.\/\.\.\/domain$/ }, () => ({ path: 'active-pack', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export const ACTIVE_DOMAIN = { get deliverables() { throw new Error("the default was read"); } };',
          loader: 'js'
        }));
      }
    }
  ]
});
const product = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

// ── The graph's side ────────────────────────────────────────────────────────
const stringsFor = (audience) =>
  run(script('Data/Strings', 'str_split'), {
    items: staticRows('Data/Strings', 'str_data'),
    graph: staticRows('Data/Strings', 'str_graph'),
    locales: staticRows('Data/Strings', 'str_locales'),
    language: 'en',
    audience
  }).copy;
const copyFor = { learner: stringsFor('learner'), coach: stringsFor('coach') };

const fx = run(script('Data/Fixture programme', 'fp_split'), { items: staticRows('Data/Fixture programme', 'fp_data') });
const DOSSIER = script('Logic/Dossier', 'do_fn');
const dossier = (audience, over = {}) =>
  run(DOSSIER, {
    deliverables: fx.deliverables,
    facts: fx.facts,
    submissions: fx.submissions,
    concepts: fx.concepts,
    onboardingFacts: fx.onboardingFacts,
    audience,
    copy: copyFor[audience],
    ...over
  });

const learner = dossier('learner');
const coach = dossier('coach');

// ── The fixture reaches every branch, or the checks below prove nothing ─────
check(fx.deliverables.length === 4, `the fixture has ${fx.deliverables.length} objectives, not 4`);
check(fx.deliverables.filter((d) => d.archivedAt).length === 1, 'the fixture needs exactly one archived objective');
check(Object.keys(fx.facts).some((k) => !k.includes('.')), 'the fixture holds no un-namespaced fact');
check(fx.submissions.some((s) => s.deliverableId === null) && fx.submissions.some((s) => s.deliverableId),
  'the fixture needs one filed and one unfiled submission');

// ── AC1: EQUAL TO THE PRODUCT, field by field ───────────────────────────────
const PRODUCT_KEYS = ['slug', 'labelKey', 'title', 'deliverableId', 'expectedTotal', 'expectedFields', 'capturedExpected', 'totalCaptured', 'captured'];
const CAPTURED_KEYS = ['field', 'factName', 'value'];
function compare(name, ours, facts, deliverables, copy) {
  const theirs = product.dossierProgress(facts, deliverables);
  if (ours.length !== theirs.length) { failures.push(`AC1 ${name}: ${ours.length} segments, the product has ${theirs.length}`); return; }
  theirs.forEach((t, i) => {
    const o = ours[i];
    for (const k of PRODUCT_KEYS) {
      const ov = k === 'captured' ? o.captured.map((c) => Object.fromEntries(CAPTURED_KEYS.map((q) => [q, c[q]]))) : o[k];
      if (JSON.stringify(ov) !== JSON.stringify(t[k])) failures.push(`AC1 ${name}: ${t.slug}.${k} differs from the product's dossierProgress`);
    }
    // The product's other two helpers, over the same segment.
    const label = t.title ?? copy.dossier.deliverable[t.labelKey];
    if (o.label !== label) failures.push(`AC1 ${name}: ${t.slug}.label is "${o.label}", DossierMeter would say "${label}"`);
    if (o.markdown !== product.toMarkdown(label, t.captured)) failures.push(`AC1 ${name}: ${t.slug}.markdown differs from the product's toMarkdown`);
    if (JSON.stringify(o.asksFor) !== JSON.stringify(t.expectedFields.map(product.humaniseFactName))) failures.push(`AC1 ${name}: ${t.slug}.asksFor differs from humaniseFactName`);
    const fill = t.expectedTotal > 0 ? Math.min(100, Math.round((t.capturedExpected / t.expectedTotal) * 100)) : 0;
    if (o.fillPct !== fill) failures.push(`AC1 ${name}: ${t.slug}.fillPct ${o.fillPct}, DossierMeter computes ${fill}`);
  });
}
const effective = fx.deliverables.filter((d) => !d.archivedAt);
compare('fixture (learner)', learner.segments, fx.facts, effective, copyFor.learner);
compare('fixture (coach)', coach.segments, fx.facts, fx.deliverables, copyFor.coach);

// Probe 1: the LangueXpert six, by labelKey — the pack-label path, reached ONLY
// here (decision 2). Facts under three of them, including an extra and one
// under an expected field of a different deliverable.
const six = product.languexpertPack.deliverables;
const sixFacts = {
  [`${six[0].slug}.${six[0].expectedCoreFields[0]}`]: 'Mes apprenants veulent parler au téléphone.',
  [`${six[0].slug}.somethingExtra`]: 'Un détail en plus.',
  [`${six[2].slug}.${six[2].expectedCoreFields[1] ?? six[2].expectedCoreFields[0]}`]: 'Une grille simple.',
  teachingContext: 'Adultes, niveau B1.'
};
const p1 = dossier('learner', { deliverables: six, facts: sixFacts, submissions: [] });
compare('probe: the LangueXpert six', p1.segments, sixFacts, six, copyFor.learner);
check(p1.segments.every((s) => s.label && !s.label.includes('.') && s.label !== s.labelKey),
  'probe: a pack labelKey did not resolve through the string table');

// Probe 2: an empty set — a first-class state, not an error.
const p2 = dossier('learner', { deliverables: [], facts: fx.facts });
compare('probe: empty', p2.segments, fx.facts, [], copyFor.learner);
check(p2.hasSegments === false, 'probe: an empty set claims to have segments');

// Probe 3: a fact under a prefix no objective owns.
const p3Facts = { ...fx.facts, 'notAnObjective.someAnswer': 'Nobody set this.' };
const p3 = dossier('learner', { facts: p3Facts });
compare('probe: unknown prefix', p3.segments, p3Facts, effective, copyFor.learner);

// ── AC2: THE ASYMMETRY ──────────────────────────────────────────────────────
check(learner.segments.length === 3, `AC2: the learner has ${learner.segments.length} segments, not 3`);
check(learner.segments.every((s) => !('archived' in s)), 'AC2: a learner segment carries the coach-only `archived` field');
check(!learner.segments.some((s) => s.slug === fx.deliverables.find((d) => d.archivedAt).slug), 'AC2: the archived objective reached the learner');
check(coach.segments.length === 4, `AC2: the coach has ${coach.segments.length} segments, not 4`);
check(coach.segments.filter((s) => s.archived === true).length === 1, 'AC2: the coach does not see exactly one archived objective');
check(JSON.stringify(coach.segments.map((s) => s.position)) === JSON.stringify([0, 1, 2, 3]), 'AC2: the coach list is not in position order');

// ── AC3: AN EMPTY OBJECTIVE SAYS WHAT IT ASKS FOR, AND NO COUNT ─────────────
const empty = learner.segments[2];
check(empty && empty.totalCaptured === 0 && empty.asksFor.length > 0, 'AC3: segment 3 is not the empty-but-reachable objective');
check(empty && empty.caption === '' && empty.fillPct === 0, 'AC3: the empty objective carries a caption or a bar');
const FRACTION = /\d+\s*(\/|of)\s*\d+|%/;
function strings(v, into = []) {
  if (typeof v === 'string') into.push(v);
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) strings(v[k], into);
  return into;
}
for (const s of [...learner.segments, ...coach.segments]) {
  // The captured values and the markdown are the LEARNER'S words, not ours.
  const ours = { ...s, captured: [], markdown: '' };
  const hit = strings(ours).find((x) => FRACTION.test(x));
  check(!hit, `AC3: ${s.slug} carries a fraction or a percentage: "${hit}"`);
}

// ── AC4: THE UNFILED SUBMISSION IS UNDER NO OBJECTIVE ───────────────────────
for (const sub of fx.submissions) {
  const under = coach.segments.filter((s) => s.submissions.some((x) => x.conceptId === sub.conceptId && x.submittedAt === sub.submittedAt));
  check(under.length === (sub.deliverableId ? 1 : 0),
    `AC4: the submission on ${sub.conceptId} (${sub.deliverableId ?? 'unfiled'}) is under ${under.length} objective(s)`);
}
/* A filed submission is named by the title on their path — and one on a
   concept that is NOT on their path renders its slug, the product's `?? id`
   (DossierMeter's stepTitleByConceptId). L167 filed one on the lesson page's own
   concept, which is off this programme, so both branches are reached. */
const onPath = new Set(fx.concepts.map((c) => c.id));
/* The OFF-path branch used to be reached by a fixture submission on the lesson
   page's concept — which belonged to a different learner's project, one of the
   contradictions sprint 49 decision 5 removed (TASK-L169 §3b). The fixture now
   reaches the on-path branch and a PROBE reaches the other, so the rule is still
   exercised both ways rather than losing a branch to a correction. */
const OFF_PATH = { conceptId: 'a-concept-off-this-path', attempt: 1, submittedAt: '2026-09-15T17:20:00.000Z', evaluated: false, deliverableId: fx.deliverables[0].id };
const probed = dossier('coach', { submissions: [...fx.submissions, OFF_PATH] });
check(!onPath.has(OFF_PATH.conceptId), 'AC4: the off-path probe names a concept that IS on the path');
const filed = probed.segments.flatMap((s) => s.submissions);
check(coach.segments.flatMap((s) => s.submissions).some((x) => onPath.has(x.conceptId)),
  'AC4: the fixture needs a filed submission on the path');
check(filed.some((x) => !onPath.has(x.conceptId)), 'AC4: the probe did not reach the off-path branch');
check(filed.every((x) => (onPath.has(x.conceptId) ? x.title && x.title !== x.conceptId : x.title === x.conceptId)),
  'AC4: a filed submission is not named by its lesson title, or an off-path one lost its slug');

// ── AC5: NOTHING SAYS WHETHER AN OBJECTIVE IS COMPLETE (L114) ───────────────
const VERDICT = /complete|done|remaining|missing|outstanding|score/i;
function keys(v, path, into) {
  if (Array.isArray(v)) v.forEach((x, i) => keys(x, `${path}[${i}]`, into));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) { into.push(`${path}.${k}`); keys(v[k], `${path}.${k}`, into); }
  return into;
}
for (const [who, out] of [['learner', learner], ['coach', coach]]) {
  const hit = keys(out.segments, 'segments', []).filter((k) => VERDICT.test(k.split('.').pop()));
  check(hit.length === 0, `AC5: a ${who} segment carries a verdict: ${hit.join(', ')}`);
}

// ── AC6: WHAT THEY HAVE TOLD US — the product's defect is NOT ported ────────
check(learner.toldUs.length === 0, 'AC6: the learner received the coach-only told-us list');
check(coach.toldUs.length === Object.keys(fx.facts).length, `AC6: told-us has ${coach.toldUs.length} of ${Object.keys(fx.facts).length} facts`);
const told = Object.fromEntries(coach.toldUs.map((t) => [t.id, t.label]));
check(told.clubSize === 'Club size', `AC6: the legacy fact is labelled "${told.clubSize}", not humanised whole`);
check(told.projectGoal === fx.onboardingFacts.find((f) => f.key === 'projectGoal').label, 'AC6: an onboarding fact lost its authored label');
check(coach.toldUs[0].id === 'projectGoal', 'AC6: the onboarding facts do not lead, as the product orders them');
check(told['bookingRules.whoCanBook'] === 'The booking rules, written down · Who can book',
  `AC6: a namespaced fact is "${told['bookingRules.whoCanBook']}", not "<objective> · <fact>"`);
const archivedSlug = fx.deliverables.find((d) => d.archivedAt).slug;
check(coach.toldUs.some((t) => t.id.startsWith(archivedSlug + '.') && t.label.startsWith(fx.deliverables.find((d) => d.archivedAt).title)),
  "AC6: the archived objective's fact is missing or unnamed");
check(coach.toldUs.every((t) => !/[A-Za-z]\.[a-z]/.test(t.label)), 'AC6: a raw dotted key reached a label');
const hostile = coach.toldUs.find((t) => t.value.includes('onerror'));
check(hostile && hostile.value === fx.facts[hostile.id], 'AC6: the hostile fact was altered rather than carried verbatim as text');

// The slug fallback for a concept that is not on the path.
const storage = coach.segments.find((s) => s.slug === 'whereBookingsLive');
check(storage && storage.requires.some((r) => r.id === r.title) && storage.requires.some((r) => r.id !== r.title),
  'a required concept with no title should render its slug, beside one that has a title');

// ── AC7: THE COPY GUARD, BOTH HALVES ────────────────────────────────────────
const waited = dossier('learner', { copy: undefined });
check(waited.segments === undefined, 'AC7: an absent copy did not wait');
let threw = '';
try { dossier('learner', { copy: { common: {} } }); } catch (e) { threw = String(e.message); }
check(/no `dossier` copy/.test(threw), `AC7: a copy without \`dossier\` did not throw by name (${threw || 'no error'})`);
let threwAudience = '';
try { dossier('nobody', { copy: copyFor.learner }); } catch (e) { threwAudience = String(e.message); }
check(/Audience must be/.test(threwAudience), 'AC7: an unknown audience did not throw by name');

// ── The coach's words exist in the table ────────────────────────────────────
for (const k of ['heading', 'archived', 'filedUnder', 'expecting', 'needs', 'nothingSet', 'toldUs', 'toldUsEmpty']) {
  check(copyFor.coach.dossierCoach && copyFor.coach.dossierCoach[k], `dossierCoach.${k} is missing from Data/Strings`);
}

// ── A run-driven Function must not also run on its inputs (L165) ────────────
const conns = JSON.parse(readFileSync(join(ROOT, 'Logic/Dossier', 'connections.json'), 'utf8')).connections;
check(!conns.some((k) => k.toId === 'do_fn' && k.toProperty === 'run'),
  'Logic/Dossier is now run-driven — untick runOnChange-in-* on every input (L165) and update this check');

// ── L167: THE METER, RENDERED BY THE KIT ITSELF ──────────────────────────────
/* The kit's own DossierSegment, server-rendered over the learner's real
   segments with the product's React — so this proves what the NODE draws from
   what Logic/Dossier gives it, not a transcription of either. The dialog's
   behaviour (Escape, focus, the Tab trap) is a browser's to prove, and is. */
const { createRequire } = await import('node:module');
const req = createRequire(join(DBT_REPO, 'package.json'));
globalThis.React = req('react');
globalThis.ReactDOM = req('react-dom/server');
let kitModule;
globalThis.Noodl = { defineModule: (k) => { kitModule = k; } };
new Function(readFileSync(join(here, '..', 'noodl_modules', 'dbt-lesson', 'index.js'), 'utf8'))();
const kitNode = (name) => kitModule.reactNodes.find((n) => n.name === 'dbt-lesson.' + name).getReactComponent();
const SSR = req('react-dom/server');
const html = learner.segments.map((s) =>
  SSR.renderToString(React.createElement(kitNode('DossierSegment'), {
    label: s.label, ariaLabel: s.ariaLabel, hasFacts: s.hasFacts, fillPct: s.fillPct, caption: s.caption
  })));
check(html.length === 3 && html.every((x) => /<button[^>]*class="dossier-segment/.test(x)), 'L167 AC1: not three segments, each a button');
check(html.filter((x) => x.includes('dossier-segment-bar')).length === 2, 'L167 AC1: not exactly two segments carry a bar');
const emptyHtml = html[learner.segments.indexOf(empty)];
check(emptyHtml && !/dossier-segment-(bar|caption)/.test(emptyHtml), 'L167 AC1: the empty objective carries a bar or a caption');
const visible = (x) => x.replace(/<[^>]*>/g, ' ');
check(html.every((x) => !/\d\s*%|\d+\s*(\/|of)\s*\d+|✗/.test(visible(x) + ' ' + (x.match(/aria-label="([^"]*)"/) || [])[1])),
  'L167: a segment prints a percentage, a fraction or a cross in its text or its accessible name');
// Closed is nothing, and so is OPEN under a server render (no document, no portal).
const rev = (props) => SSR.renderToString(React.createElement(kitNode('DossierReveal'), props));
check(rev({ open: false, segment: learner.segments[0] }) === '<div class="dbt-dossier-reveal"></div>', 'L167: a closed reveal renders something');
check(rev({ open: true, segment: learner.segments[0] }) === '<div class="dbt-dossier-reveal"></div>', 'L167: an open reveal rendered during a server render');
/* L167 AC6: work filed on the lesson the card opens, and work filed elsewhere.
   The card's lesson is the next OPENABLE path step now (sprint 49 decision 7),
   not the lesson fixture, which belongs to another learner. The fixture holds no
   filed work on that step, so a probe puts some there. */
const cardLesson = fx.entries.find((e) => e.kind === 'lesson' && (e.status === 'available' || e.status === 'in_progress'));
check(cardLesson, 'L167 AC6: the fixture has no openable lesson for the card');
const onCard = { conceptId: cardLesson.conceptId, attempt: 1, submittedAt: '2026-09-18T10:00:00.000Z', evaluated: false, deliverableId: fx.deliverables[0].id };
const withCard = dossier('learner', { submissions: [...fx.submissions, onCard] });
check(withCard.segments.some((s) => s.submissions.some((x) => x.conceptId === cardLesson.conceptId)) &&
  withCard.segments.some((s) => s.submissions.some((x) => x.conceptId !== cardLesson.conceptId)),
  'L167 AC6: the meter needs work filed on the lesson the card opens and work filed elsewhere');
check(learner.segments.every((s) => s.id === s.slug), 'L167: a segment row is not keyed by its slug');

/* DECISION 1, AS A GUARD: the reveal is the kit's, never Show Popup, and a
   captured value never takes the markdown path. */
const courseNodes = JSON.parse(readFileSync(join(ROOT, 'Pages/Course', 'nodes.json'), 'utf8')).nodes;
check(!courseNodes.some((n) => /popup/i.test(n.type)), 'L167 decision 1: /course uses a popup node — the reveal is the kit’s DossierReveal until HLT-014');
check(courseNodes.filter((n) => n.type === 'dbt-lesson.DossierReveal').length === 1, 'L167: /course needs exactly one DossierReveal');
const kitSrc = readFileSync(join(here, '..', '..', '..', 'library', 'modules', 'dbt-lesson', 'src', 'kit.js'), 'utf8');
const dialogSrc = kitSrc.slice(kitSrc.indexOf('function DossierDialog('), kitSrc.indexOf('function DossierRevealView('));
check(dialogSrc.length > 0 && !/\bmd\(/.test(dialogSrc) && !/dangerouslySetInnerHTML/.test(dialogSrc),
  'L167: the reveal renders a learner’s value through markdown or raw HTML');
// Every run-driven Function on /course unticks runOnChange on each input (L165).
const courseConns = JSON.parse(readFileSync(join(ROOT, 'Pages/Course', 'connections.json'), 'utf8')).connections;
for (const n of courseNodes.filter((x) => x.type === 'JavaScriptFunction')) {
  if (!courseConns.some((k) => k.toId === n.id && k.toProperty === 'run')) continue;
  for (const port of (n.ports || []).filter((q) => q.plug === 'input' && q.name.startsWith('in-'))) {
    check(n.parameters[`runOnChange-${port.name}`] === false, `L165: ${n.id} is run-driven and still runs when ${port.name} changes`);
  }
}

if (failures.length) {
  console.error(`check-dossier: ${failures.length} failure(s)`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(
  `check-dossier: OK — learner ${learner.segments.length} segments, coach ${coach.segments.length} (1 archived), ` +
  `${coach.toldUs.length} told-us facts; equal to the product's dossierProgress over the fixture and 3 probes ` +
  `(${six.length} LangueXpert deliverables, empty, unknown prefix), 0 mismatches`
);
