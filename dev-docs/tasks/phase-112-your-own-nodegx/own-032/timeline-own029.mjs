// OWN-032 3a — one section of an OWN-029 run, as a timeline the viewer reads (§3a). No new logging: every step comes
// from the ledgers (calls[], judgements[], roundsLog[]) and the round trees (r<k>/tree.json); the pictures are the
// section re-rendered alone on the bench.
//
//   node timeline-own029.mjs <run> [--section 0] [--bench <bench project>]
//   → runs/view-<run>-s<k>/timeline.json (+ pics/)
//
// A run made with --decisions-from replayed most of its answers from an earlier run: those steps are read from that
// run's ledger and marked `from`, so the timeline shows where each decision was actually asked.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outline } from './outline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNS = path.join(HERE, '../own-029/runs');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const RUN = argv[0], SEC = Number(opt('--section', 0)), BENCH = opt('--bench');
const OUT = path.join(HERE, 'runs', `view-${RUN}-s${SEC}`);
fs.mkdirSync(path.join(OUT, 'pics'), { recursive: true });

const read = (run) => JSON.parse(fs.readFileSync(path.join(RUNS, run, 'ledger.json'), 'utf8'));
const L = read(RUN);
const SRC = L.decisionsFrom ? read(L.decisionsFrom.run) : null;
const trees = fs.readdirSync(path.join(RUNS, RUN)).filter((d) => /^r\d+$/.test(d)).sort((a, b) => a.slice(1) - b.slice(1)).map((d) => JSON.parse(fs.readFileSync(path.join(RUNS, RUN, d, 'tree.json'), 'utf8')));
const nodes = trees[0].sections[SEC].nodes;
const kind = trees[0].sections[SEC].kind;
const mine = (c) => c.section === SEC || c.section === undefined && /^(card|sections)/.test(c.key);

// the options a prompt listed, with the model's probability of each where the ledger has it (single-enum answers)
const options = (c) => (c.conf?.dist ? Object.entries(c.conf.dist).sort((a, b) => b[1] - a[1]).map(([label, p]) => ({ label, p })) : null);

// what the script did with an answer: the nodes of this section it decided, read off the round-0 tree
function did(c) {
  const role = (r) => nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.role === r);
  const show = (xs) => outline(nodes).split('\n').filter((l) => xs.some(({ i }) => l.trim().startsWith(`#${i} `))).map((l) => l.trim()).join('\n');
  const k = c.key.replace(/^s\d+\./, '');
  if (k === 'look.band') return { say: `Set the section's ground to the "${c.answer.look}" composition: the band and its container.`, nodes: show([{ i: 0 }, { i: 1 }]) };
  if (k.startsWith('look.')) { const xs = role(k.slice(5)); return { say: `Dressed "${k.slice(5)}" with the "${c.answer.look}" composition.`, nodes: show(xs) }; }
  if (k === 'align') { const xs = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.params.textAlignX || n.params.alignItems || n.params.justifyContent); return { say: `"${c.answer.answer}": set the alignment of the words, the headline, the line under it and the button row.`, nodes: show(xs) }; }
  if (k === 'photoPlace') { const xs = nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.type === 'net.noodl.visual.columns' || n.type === 'Image'); return { say: `"${c.answer.answer}": put the words and the photo in two columns (one column on a phone).`, nodes: show(xs) }; }
  if (k === 'bits') return { say: `Took the parts ${c.answer.bits.map((b) => `"${b}"`).join(', ')}; the script builds each from the kit's composition for it.` };
  if (k === 'form.fields') return { say: `Made a form with the fields ${c.answer.fields.join(', ')}.`, nodes: show(nodes.map((n, i) => ({ n, i })).filter(({ n }) => /field|form/.test(n.role))) };
  if (k === 'deck') return { say: 'Wrote these words into the Text and Button nodes.', nodes: show(nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.params.text || n.params.label)) };
  if (c.key === 'card.preset+hue') return { say: `Theme: the "${c.answer.preset}" preset; --primary from the hue the request named.` };
  if (c.key === 'sections') return { say: `The page gets ${c.answer.sections.length} sections; this timeline follows the ${SEC === 0 ? 'first' : `#${SEC}`}, "${kind}".` };
  return null;
}

const steps = [];
const stepOf = (c, from) => ({
  actor: 'builder', round: c.round, key: c.key, model: c.model, from, prompt: c.user, system: 'You answer one question about building a web page. Reply with JSON only, matching the schema. Be brief.',
  options: options(c), answer: c.answer, ms: c.ms, tokensIn: c.tokensIn, tokensOut: c.tokensOut, forced: c.forced, hinted: c.hinted, did: did(c)
});

// round 0: the decisions, in the order they were asked (the source run's, for a replayed run), then this run's re-asks
const asked = new Set(L.calls.filter((c) => c.round === 0).map((c) => c.sig));
const order = [...(SRC ? SRC.calls.filter((c) => c.round === 0 && mine(c) && !asked.has(c.sig)).map((c) => [c, L.decisionsFrom.run]) : []), ...L.calls.filter((c) => c.round === 0 && mine(c)).map((c) => [c, null])];
const photoJ = (SRC || L).judgements.filter((j) => j.round === 0 && /^photo\./.test(j.key));
let photosDone = false;
for (const [c, from] of order) {
  steps.push(stepOf(c, from));
  // the photo judgements happen while the card is made (card.photos), before the sections
  if (!photosDone && c.key === 'card.mustShow' && photoJ.length) {
    photosDone = true;
    const fits = photoJ.filter((j) => j.key === 'photo.fit').sort((a, b) => b.pYes - a.pYes);
    steps.push({ actor: 'reviewer', round: 0, key: 'photo.fit', from: SRC ? L.decisionsFrom.run : null, model: fits[0]?.model,
      prompt: fits[0]?.user, note: `Asked once per photo in the kit's starter imagery (${fits.length} photos), each with that photo attached. P(yes) from the one answer token.`,
      pictures: fits.map((j) => ({ src: `photos/${j.file}`, label: j.file, pYes: j.pYes })), ms: fits.reduce((s, j) => s + (j.ms || 0), 0) });
    for (const j of photoJ.filter((x) => x.key === 'photo.shows')) steps.push({ actor: 'reviewer', round: 0, key: j.key, from: SRC ? L.decisionsFrom.run : null, model: j.model, prompt: j.user, pictures: [{ src: `photos/${j.file}`, label: j.file, pYes: j.pYes }], ms: j.ms });
  }
}

// the script builds the section; the picture is the section alone on the bench
steps.push({ actor: 'script', round: 0, key: 'build', did: { say: `Built the "${kind}" section from the answers above: ${nodes.length} nodes, each dressed by a kit composition. No model chose a gap, a padding or a width: those come with the compositions.`, nodes: outline(nodes) },
  pictures: [{ src: 'pics/r0/desktop.png', label: 'desktop, 1280' }, { src: 'pics/r0/phone.png', label: 'phone, 390' }], facts: 'pics/r0/facts.json' });

// the section's own judgement, then the page judges folded into one step: they read the whole page in words, this
// section being one part of it
const judgeSteps = (r) => {
  const js = L.judgements.filter((j) => j.round === r);
  const own = js.filter((j) => j.section === SEC).map((j) => ({ actor: 'reviewer', round: r, key: j.key, model: j.model, prompt: j.user, pYes: j.pYes, ms: j.ms, note: 'The section read in words, top to bottom. No picture.' }));
  const page = js.filter((j) => /^page\./.test(j.key));
  return [...own, ...(page.length ? [{ actor: 'reviewer', round: r, key: 'page judges', model: page[0].model, note: `${page.length} questions about the whole page, read in words (this section is one part of it). Each answered with one token, P(yes).`,
    judgements: page.map((j) => ({ key: j.key, prompt: j.user, pYes: j.pYes, ms: j.ms })) }] : [])];
};
steps.push(...judgeSteps(0));

for (const r of L.roundsLog) {
  const issues = r.issues || [];
  const here = issues.filter((i) => i.id.includes(`${kind}#`) || /\|page$/.test(i.id));
  steps.push({ actor: 'script', round: r.round, key: 'critics', did: { say: `Round ${r.round}: the critics found ${issues.length} issues on the page, ${here.length} of them about "${kind}" or the whole page. ${r.round === 0 ? '' : r.kept ? 'The round was kept (it scored better).' : 'The round was NOT kept: the agent went back to the best round.'}` },
    findings: here.map((i) => ({ say: i.say, weight: i.weight, repair: i.op })), elsewhere: issues.length - here.length,
    score: { perLine: r.perLine, organised: r.org, shape: r.shape, suits: r.suits } });
  if (r.round > 0) {
    const sameHere = JSON.stringify(trees[r.round]?.sections[SEC]?.nodes) === JSON.stringify(nodes);
    for (const c of L.calls.filter((c) => c.round === r.round && mine(c))) steps.push(stepOf(c, null));
    steps.push({ actor: 'script', round: r.round, key: 'rebuild', did: { say: sameHere ? `Rebuilt the page with this round's repairs. The "${kind}" section came out the same as round 0.` : `Rebuilt the page; the "${kind}" section changed.`, nodes: sameHere ? undefined : outline(trees[r.round].sections[SEC].nodes) } });
    steps.push(...judgeSteps(r.round));
  }
}

const tl = { title: `${L.run}: the "${kind}" section`, run: L.run, decisionsFrom: L.decisionsFrom?.run, request: L.request, model: L.model, judge: L.judge, harness: L.harness, startedAt: L.startedAt, section: SEC, kind,
  summary: { builderCalls: steps.filter((s) => s.actor === 'builder').length, reviewerCalls: steps.filter((s) => s.actor === 'reviewer').reduce((n, s) => n + (s.pictures?.length || 1), 0), pictureOfThisSectionShownToReviewer: false }, steps };
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(tl, null, 1));

// pictures: the photos the reviewer saw, and the section rendered alone
const projectOf = (round) => L.roundsLog.find((r) => r.round === round)?.project;
fs.mkdirSync(path.join(OUT, 'photos'), { recursive: true });
for (const s of steps) for (const p of s.pictures || []) if (p.src.startsWith('photos/')) {
  const f = path.join(HERE, '../../../../packages/noodl-editor/src/assets/starter-project/noodl_modules/starter-imagery', p.label);
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(OUT, p.src));
}
if (BENCH) {
  const { openBench, writeHero } = await import('./bench.mjs');
  writeHero(BENCH, nodes);
  const bench = await openBench(BENCH);
  await bench.shoot(path.join(OUT, 'pics/r0'));
  await bench.close();
}
console.log(`${steps.length} steps → ${OUT}`);
