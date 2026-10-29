// OWN-027 — the question tree. Gemma 4 E2B answers small typed questions; this program builds the page.
//
//   node harness.mjs --run r1 [--tuning tuning.json]       one arm-T run into ~/vscode_projects/NodeGX test projects/own-027-T-<run>
//   node harness.mjs --questions                           (re)write questions.md from prompts.mjs and the rules below
//
// Route: an MCP client over stdio against packages/noodl-mcp/bin/noodl-mcp.js (mcp.mjs) — the same door, validators
// and tool disclosure a stranger's client meets. The model: Ollama /api/chat, `format: <schema>`, `think: false`,
// num_ctx 3072, no history (TPL-016's call shape). Opus does not touch the page: every parameter below comes from a
// model answer or from a lookup rule written in RULES before the run, and the ledger says which.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './mcp.mjs';
import * as P from './prompts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MODEL = process.env.OWN027_MODEL || 'gemma4:e2b-it-qat';
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const PROMPT_BUDGET = 600;

// ─── The rules a script answers (§3 rule 4), stated before any run ─────────────────────────────────────────────────
export const RULES = [
  'R1 offered types: the visual types from list_node_types that render from parameters alone and that the vocabulary has content for. Out, with the reason: Component Children, For Each (Repeater), Page Stack, Router — they need another component or data, which stage 2 cannot make; Drag — behaviour, not a part; Video — the imagery has no video; Radio Button Group, Radio Button, Dropdown, Slider — they need an options list or a value no question supplies.',
  'R2 the type description in stage 2 is list_node_types\' summary cut at its first ":" / "—" / "." and to 70 characters, so the call stays under the 600-token budget.',
  'R3 looks: the compositions get_style_vocabulary returns for the node\'s type. A section root (depth 0) is offered the "spine" compositions except shell and sectionHead; any other Group is offered the rest of the Group compositions plus shell and sectionHead. When a type has exactly one composition (Image → cardImage, Text Input → textField) the script applies it without asking; a type with none (Icon, Checkbox, Shape) is not asked.',
  'R4 a look\'s parameters are copied verbatim onto the node. A Group with look "none" gets width 100% + sizeMode contentHeight (what every Group composition in the vocabulary carries) and nothing else.',
  'R5 enum ports asked: Group flexDirection and alignItems, each only when the look does not already set it; Text textAlignX always. Not asked, with the reason: Group justifyContent (default flex-start is right for a stacked section), every other enum port (its default is the right one for a static landing section, or the look sets it).',
  'R6 dark ground: a node with an ancestor-or-self look in heroGround, ctaBand, imageGround (whose descriptions say "light text only"): Text color → var(--primary-foreground); a primaryButton → backgroundColor var(--background), color var(--primary); an outlineButton → color var(--primary-foreground), borderColor var(--border-glass); an Icon → iconColor var(--primary-foreground). Elsewhere an Icon is var(--primary).',
  'R6b (from final-e4b) R6 stops at a light surface: a node inside a card, testimonialCard, statTile, emptyState or raised Group is on a light ground again.',
  'R7 a badge NOT on a dark ground swaps its fill to var(--surface) and border to var(--border) (the badge composition\'s own description says so).',
  'R8 Text "as": displayHeadline → h1, sectionHeading → h2, cardTitle → h3. Section root "as": hero → header, footer → footer, else section.',
  'R9 type pairing: the card\'s pairing sets fontFamily on heading-look Text (displayHeadline, sectionHeading, cardTitle) and on all other Text, only where the pairing names a family other than --font-sans (the project default).',
  'R10 density on spine looks\' paddingTop/paddingBottom: airy → --space-24, regular → as the look says, compact → --space-12.',
  'R11 radius via set_project_tokens: sharp → radius-md 2px … radius-3xl 8px; soft → the preset\'s own; round → radius-md 10px … radius-3xl 36px. Hue via set_project_tokens: --primary var(--<hue>-600), --primary-hover var(--<hue>-700), --ring var(--<hue>-500) (neutral → gray-900/800/500).',
  'R12 images: every Image (and an imageGround\'s backgroundImage) is the card\'s photo, from noodl_modules/starter-imagery; alt is the node\'s role.',
  'R13 a Text whose parent look is badge or actionRow takes sizeMode contentSize (the badge composition says the Texts inside it must hug).',
  'R14 copy lengths by look: displayHeadline 70, sectionHeading 60, cardTitle 40, eyebrow 30, meta 60, lead 160, fieldLabel 30, fieldHint 80, fieldError 80, otherwise 200. A Button label 28, a Text Input placeholder 40, a Checkbox label 60.',
  'R15 an Icon: iconSourceType icon, iconSize 24, glyph from the vocabulary\'s glyph list (the one model question it gets). A Shape: fillColor var(--primary), size 48.',
  'R16 assembly: one component per section (Sections/S<n><Kind>), the page Pages/Home is its Page node holding one instance per section, title = card.name. One create_plan, apply_plan once, scroll "page".',
  'R17 retries: a rejection whose diagnostic names a node and a port re-asks only the question that set that port, with the diagnostic appended, at most twice; then the port is unset (script default) and the ledger says so. A port a rule set is unset at once (a harness defect, ledgered).',
  'R19 (tuning 2, from r2) the displayHeadline composition says "Exactly ONE per page": once a node has taken it, later look questions do not offer it.',
  'R20 (tuning 3, from r3) the band composition says "a band always holds exactly one shell": when a section root took a spine look and no child of it is a shell, the script inserts one between the root and its children.',
  'R21 (tuning 3, from r3) a Group or Columns with nothing inside it is dropped before any question is asked (render_report\'s empty-decorated-box shape).',
  'R18 stage 2 check: every type offered, item 0 a Group with parent -1, parents earlier, only Group/Columns parents, depth ≤ 3, ≤ 6 children. One re-ask with the diagnostic; a second failure is repaired by the script (offending items dropped), ledgered as a default.'
];

const OFFERED = ['Group', 'net.noodl.visual.columns', 'Text', 'Image', 'net.noodl.controls.button', 'net.noodl.visual.icon', 'net.noodl.controls.textinput', 'net.noodl.controls.checkbox', 'Circle'];
const CONTAINERS = new Set(['Group', 'net.noodl.visual.columns']);
const DARK = new Set(['heroGround', 'ctaBand', 'imageGround']);
const HEADING_LOOKS = new Set(['displayHeadline', 'sectionHeading', 'cardTitle']);
const COPY_LEN = { displayHeadline: 70, sectionHeading: 60, cardTitle: 40, eyebrow: 30, meta: 60, lead: 160, fieldLabel: 30, fieldHint: 80, fieldError: 80 };
const PAIRINGS = [
  { id: 'sans-sans', label: 'Inter headings / Inter body', head: null, body: null },
  { id: 'serif-sans', label: 'serif headings / Inter body', head: 'var(--font-serif)', body: null },
  { id: 'sans-serif', label: 'Inter headings / serif body', head: null, body: 'var(--font-serif)' },
  { id: 'serif-serif', label: 'serif headings / serif body', head: 'var(--font-serif)', body: 'var(--font-serif)' },
  { id: 'mono-sans', label: 'monospace headings / Inter body', head: 'var(--font-mono)', body: null }
];
const HUES = { blue: 'blue', green: 'green', warm: 'amber', purple: 'purple', neutral: 'gray' };
const RADII = {
  sharp: { '--radius-md': '2px', '--radius-lg': '4px', '--radius-xl': '4px', '--radius-2xl': '6px', '--radius-3xl': '8px' },
  round: { '--radius-md': '10px', '--radius-lg': '14px', '--radius-xl': '20px', '--radius-2xl': '28px', '--radius-3xl': '36px' }
};
const short = (s, n = 70) => { const c = String(s || '').split(/:\s|—|\.\s/)[0].trim(); return c.length > n ? c.slice(0, n - 1) + '…' : c; };

// ─── questions.md ─────────────────────────────────────────────────────────────────────────────────────────────────
if (argv.includes('--questions')) {
  const card = { kind: '<kind>', tone: '<tone>', audience: '<audience>', action: '<action>', name: '<name>', preset: '<preset>', hue: '<hue>', pairing: '<pairing>', density: '<density>', radius: '<radius>', photo: '<photo>' };
  const sec = { kind: '<section kind>', purpose: '<purpose>' };
  const node = { type: '<type>', role: '<role>', look: '<look>', parentLook: '<parent look>', childSummary: '<child types>' };
  const show = (title, q, temp) => `### ${title}\n\ntemperature ${temp}\n\n\`\`\`text\n[system] ${P.SYSTEM}\n[user] ${q.user}\n\`\`\`\n\nschema:\n\n\`\`\`json\n${JSON.stringify(q.schema)}\n\`\`\`\n`;
  const md = [
    '# OWN-027 — the questions, verbatim',
    '',
    'Generated by `node harness.mjs --questions` from `prompts.mjs` and `RULES` in `harness.mjs`. `<…>` is filled at run time; lists marked `<…list…>` are read from the MCP at run time (`get_style_vocabulary`, `list_node_types`). Every call is one system line + one user message, no history, `think: false`, `num_ctx` 3072, Ollama `format` = the schema.',
    '',
    '## The rules a script answers (no model call)', '', ...RULES.map((r) => `- ${r}`), '',
    '## Stage 0 — the brief card', '',
    show('kind + tone', P.stage0.kindTone(P.REQUEST), 0.2),
    show('audience + action + name', P.stage0.audience(P.REQUEST), 0.4),
    show('preset + hue', P.stage0.palette(P.REQUEST, [{ id: '<preset id>', description: '<…presets list…>' }]), 0.2),
    show('pairing + density + radius', P.stage0.typeDensity(P.REQUEST, PAIRINGS), 0.2),
    show('photo', P.stage0.photo(P.REQUEST, ['<…44 imagery files…>']), 0.2),
    '## Stage 1 — the parts', '', show('sections', P.stage1(card), 0.3),
    '## Stage 2 — each section\'s tree', '', show('tree', P.stage2(card, sec, [{ typeName: '<type>', short: '<…offered types list…>' }]), 0.3),
    '## Stage 3 — each node', '',
    show('look', P.look(card, sec, node, [{ id: '<look id>', short: '<…compositions list…>' }]), 0.2),
    show('enum port', P.enumPort(card, sec, node, '<port>', ['<…enum verbatim…>']), 0.2),
    show('copy', P.copy(card, sec, node, 70, 'text'), 0.8),
    show('glyph', P.glyph(card, sec, node, ['<…glyph list…>']), 0.2),
    '## v2 stage 2 — the section as decisions (`--v2`, Richard 2026-10-28)', '', ...P.RULES_V2.map((r) => `- ${r}`), '',
    show('bits', P.bits(card, sec), 0.3),
    show('a decision (alignment, photo place, item count, grid or column)', P.choice(card, sec, '<question>', ['<option>', '<option>']), 0.2),
    show('item bits', P.itemBits(card, sec, '<n>'), 0.3)
  ].join('\n');
  fs.writeFileSync(path.join(HERE, 'questions.md'), md);
  console.log('wrote questions.md');
  process.exit(0);
}

// ─── The run ──────────────────────────────────────────────────────────────────────────────────────────────────────
const RUN = opt('--run', 'r1');
const tuningFile = opt('--tuning');
const TUNING = tuningFile ? JSON.parse(fs.readFileSync(path.resolve(tuningFile), 'utf8')) : null;
// P112 OWN-028 AC7 — the control: switch off the three script rules the product now gates itself (R19 one display
// headline, R20 a shell per band, V10 imageGround's floor), so the page's render_report has to NAME what they fixed.
const NO_SCRIPT_GATES = argv.includes('--no-script-gates');
const PROJECT = opt('--project', path.join(os.homedir(), 'vscode_projects/NodeGX test projects', `own-027-T-${RUN}`));
const OUT = path.join(HERE, 'runs', 'T', RUN);
fs.mkdirSync(OUT, { recursive: true });
if (fs.existsSync(PROJECT) && fs.readdirSync(PROJECT).length) throw new Error(`${PROJECT} exists and is not empty — a fresh project per run`);

const t0 = Date.now();
// A peer session fixes MCP bugs in parallel (2026-10-28): stamp which server build this run met, since bin/ runs dist/.
import { execSync } from 'node:child_process';
const REPO_ROOT = path.resolve(HERE, '../../../..');
const BUILD = { distMtime: fs.statSync(path.join(REPO_ROOT, 'packages/noodl-mcp/dist/noodl-mcp.cjs')).mtime.toISOString(),
  head: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim(); } catch { return null; } })() };
const ledger = { arm: 'T', run: RUN, build: BUILD, router: opt('--copy-model') ? 'v2 (every free-text answer)' : undefined, listRows: argv.includes('--list-rows'), scriptGates: NO_SCRIPT_GATES ? 'off (R19, R20, V10)' : 'on', listCopy: argv.includes('--list-copy'), copyModel: opt('--copy-model'), vote: Number(opt('--vote', 1)), model: MODEL, request: P.REQUEST, project: PROJECT, startedAt: new Date().toISOString(), tuning: TUNING, harness: argv.includes('--v2') ? 'v2 (stage 2 as decisions)' : 'v1 (stage 2 as a tree)', rules: RULES, card: {}, sections: [], calls: [], skipped: [], defaults: [], mcp: [], rejections: [], result: null };
const writeLedger = () => fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 1));
process.on('uncaughtException', (e) => { ledger.result = { crashed: String(e?.stack || e) }; writeLedger(); console.error(e); process.exit(1); });

// A/B idea (Richard 2026-10-28, "go off the reservation"): --vote N asks every single-enum decision N times at
// temperature 0.7 and keeps the majority (ties → the first answer). Copy and lists are never voted.
const VOTE = Number(opt('--vote', 1));
const COPY_MODEL = opt('--copy-model');
const LIST_COPY = argv.includes('--list-copy');
const LIST_ROWS = argv.includes('--list-rows');
const ROW_FIELD = { 'its title': 'title', 'its sentence or two': 'sentence', 'a name and a role': 'name' };
const listCache = {};
async function ask(key, stage, q, temperature, tag = {}) {
  const props = Object.keys(q.schema.properties || {});
  const single = props.length === 1 && q.schema.properties[props[0]].enum;
  if (VOTE > 1 && single && !tag._inner) {
    const answers = [];
    for (let v = 0; v < VOTE; v++) answers.push(await ask(key, stage, q, 0.7, { ...tag, _inner: true, vote: v + 1 }));
    const tally = {};
    for (const a of answers) { const x = a?.[props[0]]; if (x !== undefined) tally[x] = (tally[x] || 0) + 1; }
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    ledger.votes = ledger.votes || [];
    ledger.votes.push({ key, tally, kept: best?.[0], unanimous: Object.keys(tally).length === 1 });
    return best ? { [props[0]]: best[0] } : null;
  }
  const messages = [{ role: 'system', content: P.SYSTEM }, { role: 'user', content: q.user }];
  const t = Date.now();
  // A/B idea: --copy-model routes the words (a schema whose one key is `text`) to a second model; every decision stays
  // with MODEL.
  // Router v2 (from Richard's LFM3 question, 2026-10-28): EVERY free-text answer goes to the copy model — the copy
  // calls (`text`), the list calls (`texts`, `items`) and the brief card's audience / action / name — so the deciding
  // model writes no words at all. v1 routed `text` only (final-e2b-e4b ran on v1).
  const words = ['text', 'texts', 'items'].includes(props[0]) || props.includes('audience');
  const model = COPY_MODEL && words ? COPY_MODEL : MODEL;
  const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify({ model, messages, stream: false, format: q.schema, think: false,
    // H1 (harness fix, not a prompt tuning; applied from the tuning-3 runs on, to every model): stage 2 trees may
    // write up to 900 tokens. E4B pretty-prints its JSON and 4 of its e4b-r1 trees were cut at the old 400.
    options: { temperature, num_predict: stage === 2 && TUNING?.harness?.includes('H1') ? 900 : 400, num_ctx: 3072 }, keep_alive: '30m' }) });
  if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  let parsed = null; try { parsed = JSON.parse(j.message?.content ?? ''); } catch {}
  const row = { key, stage, model, ...tag, user: q.user, schema: q.schema, temperature, answer: parsed, raw: parsed ? undefined : j.message?.content,
    tokensIn: j.prompt_eval_count, tokensCached: j.prompt_eval_cached_count, tokensOut: j.eval_count, truncated: j.done_reason === 'length' || undefined, promptChars: P.SYSTEM.length + q.user.length, ms: Date.now() - t,
    overBudget: (j.prompt_eval_count ?? 0) > PROMPT_BUDGET || undefined };
  ledger.calls.push(row);
  process.stdout.write(`  [${stage}] ${key} → ${JSON.stringify(parsed).slice(0, 110)} (${row.tokensIn}/${row.tokensOut} tok, ${row.ms} ms)\n`);
  return parsed;
}
const skip = (key, why) => ledger.skipped.push({ key, why });

async function mcp(s, name, args) {
  const r = await s.call(name, args);
  ledger.mcp.push({ tool: name, isError: r.isError, ms: r.ms, chars: r.text.length, head: r.isError ? r.text.slice(0, 800) : undefined });
  return r;
}

// Stage 0, part 1 — before a project exists.
console.log(`OWN-027 arm T ${RUN} → ${PROJECT}`);
const card = ledger.card;
Object.assign(card, await ask('card.kind+tone', 0, P.stage0.kindTone(P.REQUEST), 0.2));
Object.assign(card, await ask('card.audience+action+name', 0, P.stage0.audience(P.REQUEST), 0.4));

const door = await open(null);
const created = await mcp(door, 'create_project', {
  directory: PROJECT, name: card.name || 'Puppy Adoption', request: P.REQUEST,
  summary: `A ${card.kind}. The one action: ${card.action}`, audience: card.audience,
  pages: [{ name: 'Home', purpose: `The ${card.kind}: ${card.action}` }], backend: { kind: 'none', description: 'None.' }, agreed: false
});
if (created.isError) throw new Error(`create_project: ${created.text.slice(0, 400)}`);
const s = door; // bound now
const vocab = (await mcp(s, 'get_style_vocabulary', {})).json;
const presets = vocab.presets;
const comps = vocab.compositions;
const imagery = vocab.imagery.subjects.flatMap((x) => x.files);
const glyphs = vocab.icons?.[0]?.glyphs || [];
const iconShape = vocab.icons?.[0]?.valueShape;

Object.assign(card, await ask('card.preset+hue', 0, P.stage0.palette(P.REQUEST, presets), 0.2));
Object.assign(card, await ask('card.pairing+density+radius', 0, P.stage0.typeDensity(P.REQUEST, PAIRINGS), 0.2));
Object.assign(card, await ask('card.photo', 0, P.stage0.photo(P.REQUEST, imagery), 0.2));
const photoSrc = `${vocab.imagery.moduleDir}/${card.photo}`;

// The card becomes the project's tokens.
await mcp(s, 'find_tools', { group: 'theme' });
const presetR = await mcp(s, 'set_style_preset', { preset_id: card.preset });
const h = HUES[card.hue];
const tokens = [{ name: '--primary', value: `var(--${h}-${h === 'gray' ? 900 : 600})` }, { name: '--primary-hover', value: `var(--${h}-${h === 'gray' ? 800 : 700})` }, { name: '--ring', value: `var(--${h}-500)` },
  ...Object.entries(RADII[card.radius] || {}).map(([name, value]) => ({ name, value }))];
const tokR = await mcp(s, 'set_project_tokens', { tokens });
ledger.tokensSet = { preset: presetR.json ?? presetR.text.slice(0, 300), tokens, result: tokR.json ?? tokR.text.slice(0, 300) };
const pairing = PAIRINGS.find((p) => p.id === card.pairing) || PAIRINGS[0];

// Stage 1.
const st1 = await ask('sections', 1, P.stage1(card), 0.3);
const sections = (st1?.sections || []).slice(0, 7);
ledger.sections = sections;

// Types, as list_node_types says them.
const nt = (await mcp(s, 'list_node_types', { visual_only: true })).json.nodeTypes;
const types = OFFERED.map((n) => nt.find((t) => t.typeName === n)).filter(Boolean).map((t) => ({ typeName: t.typeName, short: short(t.summary) }));
const specs = {};
for (let i = 0; i < OFFERED.length; i += 4) {
  const r = await mcp(s, 'get_node_type', { type_names: OFFERED.slice(i, i + 4) });
  for (const t of r.json.types) specs[t.typeName] = t;
}
const enumOf = (type, port) => {
  const line = specs[type]?.ports.find((p) => p.startsWith(`in ${port}: enum(`));
  return line ? line.slice(line.indexOf('enum(') + 5, line.lastIndexOf(')')).split('|') : null;
};

function checkTree(nodes) {
  const errs = [];
  if (!nodes?.length) return ['no nodes'];
  if (nodes[0].parent !== -1 || nodes[0].type !== 'Group') errs.push('item 0 must be a Group with parent -1');
  const depth = [0], kids = {};
  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i].parent;
    if (!(p >= 0 && p < i)) { errs.push(`item ${i}: parent ${p} is not an earlier item`); depth[i] = 99; continue; }
    if (!CONTAINERS.has(nodes[p].type)) errs.push(`item ${i}: parent ${p} is a ${nodes[p].type}, which cannot hold children`);
    depth[i] = depth[p] + 1;
    if (depth[i] > 3) errs.push(`item ${i}: depth ${depth[i]} is deeper than 3`);
    kids[p] = (kids[p] || 0) + 1;
    if (kids[p] === 7) errs.push(`item ${p} has more than 6 children`);
  }
  if (!nodes.some((n) => !CONTAINERS.has(n.type))) errs.push('the tree has no Text, Image or Button — nothing to see');
  return errs;
}
// R21 (tuning 3): a container with nothing inside it is dropped, repeatedly, root excepted (render_report's
// empty-decorated-box is this shape). Parents are re-indexed.
function pruneEmpty(nodes) {
  let list = nodes.map((n, i) => ({ ...n, _i: i }));
  for (;;) {
    const empty = list.findIndex((n, k) => k > 0 && CONTAINERS.has(n.type) && !list.some((m) => m.parent === n._i));
    if (empty < 0) break;
    list.splice(empty, 1);
  }
  const idx = new Map(list.map((n, k) => [n._i, k]));
  return list.map(({ _i, ...n }) => ({ ...n, parent: n.parent < 0 ? -1 : idx.get(n.parent) }));
}
function repairTree(nodes) {
  const keep = [{ ...nodes[0], parent: -1, type: 'Group' }], map = { 0: 0 }, depth = { 0: 0 }, kids = {};
  for (let i = 1; i < nodes.length; i++) {
    const p = map[nodes[i].parent];
    if (p === undefined || !CONTAINERS.has(keep[p].type) || depth[p] + 1 > 3 || (kids[p] || 0) >= 6) continue;
    map[i] = keep.length; depth[map[i]] = depth[p] + 1; kids[p] = (kids[p] || 0) + 1;
    keep.push({ ...nodes[i], parent: p });
  }
  return keep;
}

// ─── v2 stage 2 (Richard 2026-10-28): the section as decisions ────────────────────────────────────────────────
// The model picks the bits a section needs from a list, then answers one decision per follow-up; the script makes one
// node per bit (type from the node specs, look options narrowed to the compositions that fit the bit) and puts the
// parts together the way the vocabulary says (band → shell → words / photo → items). Rules V1–V8 in RULES_V2.
const V2 = argv.includes('--v2');
const RULES_V2 = P.RULES_V2;
const WORD_BITS = new Set(['eyebrow', 'badge', 'headline', 'sub-line', 'body text', 'button', 'second button', 'quote', 'name line', 'email field', 'small print']);
async function buildV2(si, sec, tag) {
  const T = [];
  const add = (n) => { T.push({ fixedParams: {}, ...n }); return T.length - 1; };
  const a1 = await ask(`s${si}.bits`, 2, P.bits(card, sec), 0.3, tag);
  let bits = [...new Set((a1?.bits || ['headline']).filter((b) => P.BITS[b]))];
  if (!bits.length) { bits = ['headline']; ledger.defaults.push({ key: `s${si}.bits`, what: 'headline (no usable answer)' }); }
  const root = add({ parent: -1, type: 'Group', role: `the ${sec.kind} section band`, rootBand: true });
  const shell = add({ parent: root, type: 'Group', role: 'the one centred container inside the band', fixedLook: 'shell' });
  const words = bits.filter((b) => WORD_BITS.has(b));
  let align = 'left';
  if (words.length) {
    const a = await ask(`s${si}.align`, 2, P.choice(card, sec, 'Are its words centred or left-aligned?', ['centred', 'left-aligned']), 0.2, tag);
    align = a?.answer === 'centred' ? 'center' : 'left';
  } else skip(`s${si}.align`, 'V6: no word bits');
  let wordsParent = shell, photoMode = null;
  if (bits.includes('photo') && words.length) {
    const a = await ask(`s${si}.photoPlace`, 2, P.choice(card, sec, 'Should the photo sit beside the words, above them, or below them?', ['beside', 'above', 'below']), 0.2, tag);
    photoMode = a?.answer || 'beside';
  }
  if (photoMode === 'beside') {
    const cols = add({ parent: shell, type: 'net.noodl.visual.columns', role: 'the words beside the photo', fixedLook: 'columnsTwoUp' });
    wordsParent = add({ parent: cols, type: 'Group', role: 'the words', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start' } });
    add({ parent: cols, type: 'Image', role: `the ${sec.kind} photograph` });
  } else if (words.length > 1) {
    wordsParent = add({ parent: shell, type: 'Group', role: 'the words', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', alignItems: align === 'center' ? 'center' : 'flex-start' } });
  }
  const textP = (extra = {}) => ({ textAlignX: align, ...extra });
  let actionRow = null;
  const placeBit = async (b) => {
    if (b === 'photo') { if (photoMode !== 'beside') add({ parent: shell, type: 'Image', role: `the ${sec.kind} photograph` }); return; }
    if (b === 'list of items') return placeList();
    const P0 = wordsParent;
    switch (b) {
      case 'eyebrow': add({ parent: P0, type: 'Text', role: 'the small uppercase line above the headline', fixedLook: 'eyebrow', fixedParams: textP() }); break;
      case 'badge': { const g = add({ parent: P0, type: 'Group', role: 'a small pill', fixedLook: 'badge' }); add({ parent: g, type: 'Text', role: 'the few words in the pill', fixedLook: 'none', fixedParams: { sizeMode: 'contentSize' } }); break; }
      case 'headline': add({ parent: P0, type: 'Text', role: `the ${sec.kind} headline`, lookOptions: ['displayHeadline', 'sectionHeading'], fixedParams: textP() }); break;
      case 'sub-line': add({ parent: P0, type: 'Text', role: 'one sentence under the headline', lookOptions: ['lead', 'body'], fixedParams: textP() }); break;
      case 'body text': add({ parent: P0, type: 'Text', role: 'a short paragraph', fixedLook: 'body', fixedParams: textP() }); break;
      case 'quote': add({ parent: P0, type: 'Text', role: 'a quotation from a happy adopter', lookOptions: ['lead', 'body'], fixedParams: textP() }); break;
      case 'name line': add({ parent: P0, type: 'Text', role: 'who said it: a name and a role', fixedLook: 'meta', fixedParams: textP() }); break;
      case 'small print': add({ parent: P0, type: 'Text', role: 'a line of fine print', fixedLook: 'meta', fixedParams: textP() }); break;
      case 'email field': add({ parent: P0, type: 'net.noodl.controls.textinput', role: 'a box to type an email address' }); break;
      case 'button': case 'second button': {
        if (actionRow === null) actionRow = add({ parent: P0, type: 'Group', role: 'the buttons', fixedLook: 'actionRow', fixedParams: align === 'center' ? { justifyContent: 'center' } : {} });
        add({ parent: actionRow, type: 'net.noodl.controls.button', role: b === 'button' ? `the main action of the ${sec.kind} section` : 'a quieter second action', lookOptions: ['primaryButton', 'outlineButton'] });
        break;
      }
    }
  };
  const placeList = async () => {
    const c = await ask(`s${si}.items.count`, 2, P.choice(card, sec, 'It has a list of similar items. How many items?', ['2', '3', '4', '6']), 0.2, tag);
    const count = Number(c?.answer || 3);
    const ib = await ask(`s${si}.items.bits`, 2, P.itemBits(card, sec, count), 0.3, tag);
    const ibits = [...new Set((ib?.bits || ['title', 'text']).filter((b) => P.ITEM_BITS[b]))];
    const lay = await ask(`s${si}.items.layout`, 2, P.choice(card, sec, `Its ${count} items: a grid, or one column?`, ['grid', 'one column']), 0.2, tag);
    const container = lay?.answer === 'one column'
      ? add({ parent: shell, type: 'Group', role: 'the list of items, one column', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-6)' } })
      : add({ parent: shell, type: 'net.noodl.visual.columns', role: 'the list of items, a grid', fixedLook: 'gridAutoFit' });
    const itemLooks = ['card', 'featureItem', 'testimonialCard', 'statTile'];
    for (let k = 1; k <= count; k++) {
      const it = add({ parent: container, type: 'Group', role: `item ${k} of ${count} in the list`, lookOptions: itemLooks, shareKey: `s${si}.item`, itemOf: [k, count], itemBits: ibits });
      T[it].pending = true; // inner nodes depend on the item's look: placed after 3a (placeItemInner)
    }
  };
  for (const b of bits) await placeBit(b);
  return { tree: T, align };
}
// V5, after the item's look is known.
function placeItemInner(nodes, item, si) {
  const [k, count] = item.itemOf, ib = item.itemBits;
  const mk = (parent, type, role, extra = {}) => {
    const n = { type, typeLabel: nt.find((x) => x.typeName === type)?.displayName || type, role: `item ${k} of ${count}: ${role}`, parent: parent.j, id: `s${si}n${nodes.length}`, j: nodes.length, params: {}, origin: {}, children: [], fixedParams: {}, listKey: `s${si}.${role}`, listIndex: k - 1, listCount: count, ...extra };
    nodes.push(n); parent.children.push(n); return n;
  };
  const leadKinds = new Set(['icon', 'number', 'photo']);
  let lead = [], rest = ib;
  let body = item;
  if (item.look === 'card') { lead = ib.filter((b) => b === 'photo'); rest = ib.filter((b) => b !== 'photo'); }
  if (item.look === 'featureItem') { lead = ib.filter((b) => leadKinds.has(b)).slice(0, 1); rest = ib.filter((b) => !lead.includes(b)); }
  const place = (parent, b) => {
    if (b === 'photo') return mk(parent, 'Image', 'its photograph');
    if (b === 'icon') return mk(parent, 'net.noodl.visual.icon', 'its icon');
    if (b === 'number') return mk(parent, 'Text', 'its step number', { fixedLook: 'sectionHeading', fixedText: String(k), fixedParams: { color: 'var(--primary)' } });
    if (b === 'title') return mk(parent, 'Text', 'its title', { fixedLook: 'cardTitle' });
    if (b === 'text') return mk(parent, 'Text', 'its sentence or two', { fixedLook: 'body' });
    if (b === 'button') return mk(parent, 'net.noodl.controls.button', 'its button', { lookOptions: ['primaryButton', 'outlineButton'], shareKey: `s${si}.itemButton` });
    if (b === 'name line') return mk(parent, 'Text', 'a name and a role', { fixedLook: 'meta' });
  };
  for (const b of lead) place(item, b);
  if (rest.length && (item.look === 'card' || item.look === 'featureItem')) {
    body = mk(item, 'Group', 'its words', item.look === 'card' ? { fixedLook: 'cardBody' } : { fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-1)' } });
  }
  for (const b of rest) place(body, b);
}

// Stage 2 + 3 per section.
const built = [];
const pageTaken = new Set();
for (let si = 0; si < sections.length; si++) {
  const sec = sections[si];
  const tag = { section: si, sectionKind: sec.kind };
  let tree, v2align = null;
  if (V2) { const r = await buildV2(si, sec, tag); tree = r.tree; v2align = r.align; }
  else tree = (await ask(`s${si}.tree`, 2, P.stage2(card, sec, types, null, TUNING), 0.3, tag))?.nodes;
  let errs = V2 ? [] : checkTree(tree);
  if (errs.length) {
    ledger.rejections.push({ by: 'harness tree check', section: si, errs });
    tree = (await ask(`s${si}.tree`, 2, P.stage2(card, sec, types, errs.join('; '), TUNING), 0.3, { ...tag, retry: 1 }))?.nodes;
    errs = checkTree(tree);
    if (errs.length) { ledger.rejections.push({ by: 'harness tree check', section: si, errs, retry: 1 }); tree = repairTree(tree || [{ parent: -1, type: 'Group', role: 'section' }]); ledger.defaults.push({ key: `s${si}.tree`, what: 'repaired by script (offending items dropped)', errs, kept: tree.length }); }
  }
  if (!V2 && TUNING?.rules?.includes('R21')) { const before = tree.length; tree = pruneEmpty(tree); if (tree.length < before) skip(`s${si}.tree:empty`, `R21: ${before - tree.length} Group/Columns with nothing inside dropped`); }
  const nodes = tree.map((n, j) => ({ ...n, id: `s${si}n${j}`, j, params: {}, origin: {}, children: [] }));
  for (const n of nodes) if (n.parent >= 0) nodes[n.parent].children.push(n);
  const depthOf = (n) => (n.parent < 0 ? 0 : depthOf(nodes[n.parent]) + 1);
  // (from ab-listrows) the copy prompt names a node by its display name: given "net.noodl.controls.textinput" Gemma
  // wrote it into the placeholder ("Contact us: email.noodl.controls.text输入").
  const labelOf = (t) => nt.find((x) => x.typeName === t)?.displayName || t;
  for (const n of nodes) n.typeLabel = labelOf(n.type);
  for (const n of nodes) n.childSummary = n.children.map((c) => c.type.replace(/^net\.noodl\.(controls|visual)\./, '')).join(', ');
  // Tuning 1 (c): a node that has same-type siblings is told which one it is, so three step texts do not each write
  // all three steps. Structure only — no sibling's answer is shown (§3 rule 3).
  for (const n of nodes) { if (n.parent < 0) continue; const sib = nodes[n.parent].children.filter((c) => c.type === n.type);
    if (sib.length > 1) n.siblingNote = `It is item ${sib.indexOf(n) + 1} of ${sib.length} ${n.type} nodes side by side in the same parent: write only this one's words, not the others'. `; }

  // 3a looks, top-down so a child knows its parent's look.
  const shared = {};
  for (let ni = 0; ni < nodes.length; ni++) {
    const n = nodes[ni];
    const d = depthOf(n);
    n.parentLook = n.parent >= 0 ? nodes[n.parent].look : null;
    if (n.fixedLook) { n.look = n.fixedLook; skip(`${n.id}.look`, `V2: the bit fixes it (${n.fixedLook})`); }
    else if (n.shareKey && shared[n.shareKey]) { n.look = shared[n.shareKey]; skip(`${n.id}.look`, `V4: shared with the first of its kind (${n.look})`); }
    if (n.look) {
      pageTaken.add(n.look);
      const c0 = comps.find((x) => x.id === n.look);
      if (c0) for (const [k, v] of Object.entries(c0.parameters)) { n.params[k] = structuredClone(v); n.origin[k] = 'V2'; }
      if (n.pending) placeItemInner(nodes, n, si);
      continue;
    }
    let looks = comps.filter((c) => c.nodeType === n.type);
    if (n.lookOptions) looks = looks.filter((c) => n.lookOptions.includes(c.id));
    if (n.type === 'Group') looks = d === 0 ? looks.filter((c) => c.group === 'spine' && !['shell', 'sectionHead'].includes(c.id)) : looks.filter((c) => c.group !== 'spine' || ['shell', 'sectionHead'].includes(c.id));
    // R19 (tuning 2): the displayHeadline composition says "Exactly ONE per page"; once one is taken the script
    // stops offering it — the gate the MCP does not have.
    if (!NO_SCRIPT_GATES && TUNING?.rules?.includes('R19') && pageTaken.has('displayHeadline')) { const before = looks.length; looks = looks.filter((c) => c.id !== 'displayHeadline'); if (looks.length < before) skip(`${n.id}.look:displayHeadline`, 'R19: the page already has its one displayHeadline'); }
    if (looks.length === 0) { n.look = 'none'; skip(`${n.id}.look`, `R3: ${n.type} has no composition`); continue; }
    if (looks.length === 1) { n.look = looks[0].id; skip(`${n.id}.look`, `R3: ${n.type} has one composition (${looks[0].id})`); }
    else {
      const a = await ask(`${n.id}.look`, 3, P.look(card, sec, n, looks.map((l) => ({ id: l.id, short: short(l.description, 90) }))), 0.2, { ...tag, node: n.id, type: n.type });
      n.look = a?.look || 'none';
      if (!a?.look) ledger.defaults.push({ key: `${n.id}.look`, what: 'none (no parseable answer)' });
    }
    pageTaken.add(n.look);
    if (n.shareKey) shared[n.shareKey] = n.look;
    const c = comps.find((x) => x.id === n.look);
    if (c) for (const [k, v] of Object.entries(c.parameters)) { n.params[k] = structuredClone(v); n.origin[k] = `${n.id}.look`; }
    if (n.pending) placeItemInner(nodes, n, si);
  }
  for (const n of nodes) n.childSummary = n.children.map((c) => c.type.replace(/^net\.noodl\.(controls|visual)\./, '')).join(', ');
  // R20 (tuning 3): the band composition says "a band always holds exactly one shell". When the section root took a
  // spine look and none of its children is a shell, the script inserts one between the root and its children.
  if (!NO_SCRIPT_GATES && TUNING?.rules?.includes('R20')) {
    const root = nodes[0], spine = comps.find((c) => c.id === root.look)?.group === 'spine';
    if (spine && !root.children.some((c) => c.look === 'shell')) {
      const shellC = comps.find((c) => c.id === 'shell');
      const sh = { type: 'Group', role: 'the one centred container inside the band (R20)', id: `s${si}shell`, j: nodes.length, parent: 0, look: 'shell', parentLook: root.look, params: {}, origin: {}, children: root.children };
      for (const [k, v] of Object.entries(shellC.parameters)) { sh.params[k] = structuredClone(v); sh.origin[k] = 'R20'; }
      for (const c of root.children) c.parent = sh.j;
      root.children = [sh]; nodes.push(sh);
      sh.childSummary = sh.children.map((c) => c.type.replace(/^net\.noodl\.(controls|visual)\./, '')).join(', ');
      ledger.defaults.push({ key: `${sh.id}`, what: 'R20: shell inserted under the band root' });
    }
  }
  // R6 stops at a light surface: a card on a dark band is light again (from final-e4b: card titles drawn white on white).
  const LIGHT = new Set(['card', 'testimonialCard', 'statTile', 'emptyState', 'raised']);
  const darkOf = (n) => (DARK.has(n.look) ? true : LIGHT.has(n.look) ? false : n.parent < 0 ? false : darkOf(nodes[n.parent]));

  // 3b enum ports, copy, glyphs, rules.
  for (const n of nodes) {
    const d = depthOf(n), dark = darkOf(n);
    const setR = (k, v, rule) => { n.params[k] = v; n.origin[k] = rule; };
    if (n.type === 'Group') {
      if (n.look === 'none') { setR('width', { value: 100, unit: '%' }, 'R4'); setR('sizeMode', 'contentHeight', 'R4'); }
      for (const port of V2 ? [] : ['flexDirection', 'alignItems']) {
        if (port in n.params) { skip(`${n.id}.${port}`, `R5: look ${n.look} sets it`); continue; }
        const vals = enumOf('Group', port);
        const a = await ask(`${n.id}.${port}`, 3, P.enumPort(card, sec, n, port, vals), 0.2, { ...tag, node: n.id, type: n.type });
        if (a?.value) { n.params[port] = a.value; n.origin[port] = `${n.id}.${port}`; } else ledger.defaults.push({ key: `${n.id}.${port}`, what: 'unset' });
      }
      if (d === 0) setR('as', sec.kind === 'hero' ? 'header' : sec.kind === 'footer' ? 'footer' : 'section', 'R8');
      if (n.look === 'badge' && !dark) { setR('backgroundColor', 'var(--surface)', 'R7'); setR('borderColor', 'var(--border)', 'R7'); }
      if (comps.find((c) => c.id === n.look)?.group === 'spine' && card.density !== 'regular' && 'paddingTop' in n.params) {
        const v = card.density === 'airy' ? 'var(--space-24)' : 'var(--space-12)'; setR('paddingTop', v, 'R10'); setR('paddingBottom', v, 'R10');
      }
      if (n.look === 'imageGround') setR('backgroundImage', photoSrc, 'R12');
    } else if (n.type === 'Text') {
      if (V2) { setR('textAlignX', v2align || 'left', 'V6'); skip(`${n.id}.textAlignX`, 'V6: the section\'s one alignment answer'); }
      else {
        const vals = enumOf('Text', 'textAlignX');
        const a = await ask(`${n.id}.textAlignX`, 3, P.enumPort(card, sec, n, 'textAlignX', vals), 0.2, { ...tag, node: n.id, type: n.type });
        if (a?.value) { n.params.textAlignX = a.value; n.origin.textAlignX = `${n.id}.textAlignX`; } else ledger.defaults.push({ key: `${n.id}.textAlignX`, what: 'unset' });
      }
      if (n.fixedText) { setR('text', n.fixedText, 'V5'); skip(`${n.id}.text`, 'V5: a step number is the item index'); }
      else if (LIST_ROWS && n.listKey && ROW_FIELD[n.role.replace(/^item \d+ of \d+: /, '')]) {
        const listId = `s${si}.list`, field = ROW_FIELD[n.role.replace(/^item \d+ of \d+: /, '')];
        if (!listCache[listId]) {
          const fields = [...new Set(nodes.filter((m) => m.listKey && m.type === 'Text' && !m.fixedText && ROW_FIELD[m.role.replace(/^item \d+ of \d+: /, '')]).map((m) => ROW_FIELD[m.role.replace(/^item \d+ of \d+: /, '')]))];
          const maxLens = { title: 40, sentence: 160, name: 60 };
          listCache[listId] = (await ask(`${listId}.rows`, 3, P.listRows(card, sec, n.listCount, fields, maxLens), 0.8, { ...tag, list: listId }))?.items || [];
        }
        const t = listCache[listId][n.listIndex]?.[field];
        if (t) { n.params.text = t; n.origin.text = `${listId}.rows`; } else ledger.defaults.push({ key: `${n.id}.text`, what: 'empty (row missing)' });
      }
      else if (LIST_COPY && n.listKey) {
        const max = COPY_LEN[n.look] || 200;
        if (!listCache[n.listKey]) listCache[n.listKey] = (await ask(`${n.listKey}.texts`, 3, P.listCopy(card, sec, n.listCount, n.role.replace(/^item \d+ of \d+: /, ''), max), 0.8, { ...tag, list: n.listKey }))?.texts || [];
        const t = listCache[n.listKey][n.listIndex];
        if (t) { n.params.text = t; n.origin.text = `${n.listKey}.texts`; } else ledger.defaults.push({ key: `${n.id}.text`, what: 'empty (list answer short)' });
        if (n.listIndex > 0) skip(`${n.id}.text`, 'list-copy: written with item 1');
      }
      else {
        const max = COPY_LEN[n.look] || 200;
        const w = await ask(`${n.id}.text`, 3, P.copy(card, sec, n, max, 'words'), 0.8, { ...tag, node: n.id, type: n.type });
        if (w?.text) { n.params.text = w.text; n.origin.text = `${n.id}.text`; } else ledger.defaults.push({ key: `${n.id}.text`, what: 'empty' });
      }
      if (dark) setR('color', 'var(--primary-foreground)', 'R6');
      if (n.look === 'displayHeadline') setR('as', 'h1', 'R8'); else if (n.look === 'sectionHeading') setR('as', 'h2', 'R8'); else if (n.look === 'cardTitle') setR('as', 'h3', 'R8');
      const fam = HEADING_LOOKS.has(n.look) ? pairing.head : pairing.body;
      if (fam) setR('fontFamily', fam, 'R9');
      if (['badge', 'actionRow'].includes(n.parentLook)) setR('sizeMode', 'contentSize', 'R13');
    } else if (n.type === 'net.noodl.controls.button') {
      const w = await ask(`${n.id}.label`, 3, P.copy(card, sec, n, 28, 'button label'), 0.8, { ...tag, node: n.id, type: n.type });
      if (w?.text) { n.params.label = w.text; n.origin.label = `${n.id}.label`; } else ledger.defaults.push({ key: `${n.id}.label`, what: 'empty' });
      if (dark && n.look === 'primaryButton') { setR('backgroundColor', 'var(--background)', 'R6'); setR('color', 'var(--primary)', 'R6'); }
      if (dark && n.look === 'outlineButton') { setR('color', 'var(--primary-foreground)', 'R6'); setR('borderColor', 'var(--border-glass)', 'R6'); }
    } else if (n.type === 'Image') {
      setR('src', photoSrc, 'R12'); setR('alt', n.role, 'R12');
    } else if (n.type === 'net.noodl.controls.textinput') {
      const w = await ask(`${n.id}.placeholder`, 3, P.copy(card, sec, n, 40, 'placeholder'), 0.8, { ...tag, node: n.id, type: n.type });
      if (w?.text) { n.params.placeholder = w.text; n.origin.placeholder = `${n.id}.placeholder`; }
    } else if (n.type === 'net.noodl.controls.checkbox') {
      const w = await ask(`${n.id}.label`, 3, P.copy(card, sec, n, 60, 'label'), 0.8, { ...tag, node: n.id, type: n.type });
      if (w?.text) { n.params.label = w.text; n.params.useLabel = true; n.origin.label = `${n.id}.label`; n.origin.useLabel = 'R14'; }
    } else if (n.type === 'net.noodl.visual.icon') {
      const g = await ask(`${n.id}.glyph`, 3, P.glyph(card, sec, n, glyphs), 0.2, { ...tag, node: n.id, type: n.type });
      setR('iconSourceType', 'icon', 'R15'); setR('iconSize', 24, 'R15'); setR('iconColor', dark ? 'var(--primary-foreground)' : 'var(--primary)', 'R6');
      if (g?.glyph) { n.params.iconIconSource = { ...iconShape, code: g.glyph }; n.origin.iconIconSource = `${n.id}.glyph`; }
    } else if (n.type === 'Circle') {
      setR('fillColor', 'var(--primary)', 'R15'); setR('size', 48, 'R15');
    }
  }
  for (const n of nodes) for (const [k, v] of Object.entries(n.fixedParams || {})) { n.params[k] = v; n.origin[k] = 'V2'; }
  if (V2) for (const n of nodes) {
    // V10 (from v2b-e4b/-lfm3): imageGround's fixed 520 px + flex-end spills a full band UP over the one above
    // (P112-OWN027-IMAGEGROUNDSPILL): its height becomes a minimum.
    if (!NO_SCRIPT_GATES && n.look === 'imageGround') { n.params.sizeMode = 'contentHeight'; delete n.params.height; n.params.minHeight = { value: 520, unit: 'px' }; n.origin.minHeight = 'V10'; }
    // V11 (from v2b-e2b's five-line hero headline): a display headline in a half-width column takes --display-md.
    if (n.look === 'displayHeadline' && nodes[n.parent]?.role === 'the words' && nodes[nodes[n.parent].parent]?.type === 'net.noodl.visual.columns') { n.params.fontSize = 'var(--display-md)'; n.origin.fontSize = 'V11'; }
  }
  built.push({ sec, nodes, path: `Sections/S${si + 1}${sec.kind.replace(/(^|\s)(\w)/g, (_, a, b) => b.toUpperCase())}` });
}

// Stage 4 — assemble, validate, retry, render.
const home = (await mcp(s, 'get_component', { path: 'Pages/Home' })).json;
const pageNode = home.nodes.find((n) => n.type === 'Page');
// V9 (from v2-e2b, 2026-10-28): the MCP refuses three identical sibling subtrees (repeated-sibling-subtree: "Make one
// component and instantiate it 3 times"), so a list's items become ONE item component whose Component Inputs carry
// every parameter that differs between the items (their words, their glyph); the section places it N times.
const itemComps = [];
const subtree = (n) => { const out = [n]; for (let i = 0; i < out.length; i++) out.push(...out[i].children); return out; };
for (const b of built) {
  b.replace = {};
  const lists = {};
  for (const n of b.nodes) if (n.itemOf) (lists[n.parent] = lists[n.parent] || []).push(n);
  let li = 0;
  for (const items of Object.values(lists)) {
    if (items.length < 2) continue;
    const trees = items.map(subtree), tpl = trees[0];
    if (trees.some((t) => t.length !== tpl.length || t.some((n, i) => n.type !== tpl[i].type))) { ledger.defaults.push({ key: `${b.path}.items`, what: 'V9: items differ in shape; left inline' }); continue; }
    const varying = [];
    tpl.forEach((n, i) => { const keys = new Set(trees.flatMap((t) => Object.keys(t[i].params)));
      for (const k of keys) if (new Set(trees.map((t) => JSON.stringify(t[i].params[k]))).size > 1) varying.push({ i, k, port: `p${i}_${k}` }); });
    const path = `${b.path}Item${++li}`;
    const inId = `${tpl[0].id}-in`;
    const strip = (n, i) => { const p = { ...n.params }; for (const v of varying) if (v.i === i) delete p[v.k]; return p; };
    itemComps.push({ path, b, varying, graph: {
      nodes: [{ id: inId, type: 'Component Inputs', label: 'what changes between the items', ports: varying.map((v) => ({ name: v.port, plug: 'output', type: '*' })) },
        ...tpl.map((n, i) => ({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...(i > 0 ? { parent: n.parent === tpl[0].j ? tpl[0].id : b.nodes[n.parent].id } : {}), parameters: strip(n, i) }))],
      connections: varying.map((v) => `${inId}.${v.port} -> ${tpl[v.i].id}.${v.k}`), visual_roots: [tpl[0].id] } });
    items.forEach((it, k) => { b.replace[it.id] = { id: `${it.id}-inst`, type: `/${path}`, label: it.role.slice(0, 60), parameters: Object.fromEntries(varying.map((v) => [v.port, trees[k][v.i].params[v.k]])) }; });
    (b.instantiates = b.instantiates || []).push(path);
    skip(`${path}`, `V9: ${items.length} items → one component, ${varying.length} inputs`);
  }
}
const plan = (await mcp(s, 'create_plan', { request: P.REQUEST, scroll: 'page', operations: [
  ...itemComps.map((c) => ({ kind: 'create', target: c.path, intent: `One item of the ${c.b.sec.kind} list`, inputs: c.varying.map((v) => ({ name: v.port, type: 'string' })) })),
  ...built.map((b) => ({ kind: 'create', target: b.path, intent: `The ${b.sec.kind} section: ${b.sec.purpose}`, ...(b.instantiates ? { instantiates: b.instantiates } : {}) })),
  { kind: 'update', target: 'Pages/Home', intent: `The ${card.kind}, its sections top to bottom.`, instantiates: built.map((b) => b.path) }
] })).json;
const opFor = (target) => plan.operations.find((o) => o.target === target).id;
const bfs = (nodes) => { const out = [nodes[0]]; for (let i = 0; i < out.length; i++) out.push(...out[i].children); return out; };
const graphOf = (b) => {
  const out = [], q = [b.nodes[0]];
  while (q.length) { const n = q.shift(); const parent = n.parent >= 0 ? { parent: b.nodes[n.parent].id } : {};
    if (b.replace?.[n.id]) { out.push({ ...b.replace[n.id], ...parent }); continue; }
    out.push({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...parent, parameters: n.params }); q.push(...n.children); }
  return { nodes: out, connections: [], visual_roots: [b.nodes[0].id] };
};

async function reask(b, n, key, diagnostic) {
  const sec = b.sec, tag = { section: built.indexOf(b), sectionKind: sec.kind, node: n.id, type: n.type, retryFor: diagnostic.slice(0, 200) };
  const port = key.slice(n.id.length + 1);
  if (port === 'look') {
    const looks = comps.filter((c) => c.nodeType === n.type).map((l) => ({ id: l.id, short: short(l.description, 90) }));
    const a = await ask(key, 3, P.look(card, sec, n, looks, diagnostic), 0.2, tag);
    for (const [k, o] of Object.entries(n.origin)) if (o === key) delete n.params[k];
    n.look = a?.look || 'none';
    const c = comps.find((x) => x.id === n.look);
    if (c) for (const [k, v] of Object.entries(c.parameters)) { n.params[k] = structuredClone(v); n.origin[k] = key; }
  } else if (['text', 'label', 'placeholder'].includes(port)) {
    const w = await ask(key, 3, P.copy(card, sec, n, port === 'text' ? COPY_LEN[n.look] || 200 : 28, port, diagnostic), 0.8, tag);
    if (w?.text) n.params[port] = w.text;
  } else {
    const vals = enumOf(n.type, port);
    const a = vals && (await ask(key, 3, P.enumPort(card, sec, n, port, vals, diagnostic), 0.2, tag));
    if (a?.value) n.params[port] = a.value;
  }
}

async function stage(b) {
  const target = b.path;
  for (let round = 0; round < 3; round++) {
    const g = graphOf(b);
    const r = await mcp(s, 'stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(target), ...g });
    const diags = r.json?.validation?.diagnostics || r.json?.diagnostics || r.json?.error?.diagnostics || [];
    const errors = diags.filter((d) => d.severity === 'error');
    ledger.rejections.push(...diags.filter((d) => d.severity !== 'info').map((d) => ({ by: 'validator', target, round, severity: d.severity, code: d.code, message: d.message.slice(0, 300), nodeId: d.location?.nodeId, port: d.location?.port, suggestion: d.suggestion })));
    if (!r.isError && !errors.length) return true;
    if (r.isError && !errors.length) { ledger.rejections.push({ by: 'mcp', target, round, text: r.text.slice(0, 600) }); return false; }
    for (const d of errors) {
      const n = b.nodes.find((x) => x.id === d.location?.nodeId);
      if (!n) continue;
      const port = d.location?.port;
      const origin = port ? n.origin[port] : `${n.id}.look`;
      if (origin && !origin.startsWith('R') && round < 2) await reask(b, n, origin, `${d.message.slice(0, 220)}${d.suggestion ? ` Suggested: ${d.suggestion}` : ''}`);
      else if (port) { delete n.params[port]; ledger.defaults.push({ key: `${n.id}.${port}`, what: `unset after rejection (origin ${origin})`, code: d.code }); }
    }
  }
  return false;
}

const failedItems = new Set();
for (const c of itemComps) {
  const r = await mcp(s, 'stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(c.path), ...c.graph });
  if (r.isError) { failedItems.add(c.path); ledger.rejections.push({ by: 'mcp', target: c.path, text: r.text.slice(0, 600) }); }
}
const stagedOk = [];
for (const b of built) stagedOk.push(!(b.instantiates || []).some((p) => failedItems.has(p)) && (await stage(b)));
// The page places only the sections that staged: a skipped create that the page still instantiates makes apply_plan
// refuse everything (v2-e2b/-lfm3/-e4b, 2026-10-28: three runs that wrote nothing).
const pageGraph = {
  nodes: [{ id: pageNode.id, type: 'Page', label: 'Home', parameters: { title: card.name || 'Home', urlPath: 'home' } },
    ...built.flatMap((b, i) => (stagedOk[i] ? [{ id: `home-s${i + 1}`, type: `/${b.path}`, parent: pageNode.id, label: b.sec.kind }] : []))],
  connections: [], visual_roots: [pageNode.id]
};
const pr = await mcp(s, 'stage_plan_operation', { plan_id: plan.planId, operation_id: opFor('Pages/Home'), ...pageGraph });
ledger.pageStage = pr.json ?? pr.text.slice(0, 600);
const skipOps = [...itemComps.filter((c) => failedItems.has(c.path) || !stagedOk[built.indexOf(c.b)]).map((c) => opFor(c.path)), ...built.filter((b, i) => !stagedOk[i]).map((b) => opFor(b.path))];
if (skipOps.length) ledger.defaults.push({ key: 'apply.skip', what: `sections that never staged clean were skipped: ${skipOps.join(', ')}` });
const ap = await mcp(s, 'apply_plan', { plan_id: plan.planId, render: 'summary', ...(skipOps.length ? { skip: skipOps } : {}) });
ledger.apply = ap.json ?? ap.text.slice(0, 2000);
const rr = await mcp(s, 'render_report', { out_dir: '.previews/shots', viewports: 'desktop,phone', scale: 0.5 });
const report = (() => { const i = rr.text.indexOf('{'), h = rr.text.indexOf('HONESTY'); try { return JSON.parse(rr.text.slice(i, rr.text.lastIndexOf('}', h) + 1)); } catch { return null; } })();
ledger.render = { summary: report?.summary ?? rr.text.slice(0, 400), findings: report?.findings,
  phone: report && { overflowing: report.viewports.phone.overflowingCount, scrollWidth: report.viewports.phone.scrollWidth, consoleErrors: report.viewports.phone.consoleErrors, lowContrast: report.viewports.phone.layout.lowContrast?.length },
  desktop: report && { overflowing: report.viewports.desktop.overflowingCount, consoleErrors: report.viewports.desktop.consoleErrors, lowContrast: report.viewports.desktop.layout.lowContrast?.length } };
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
for (const f of fs.readdirSync(path.join(PROJECT, '.previews/shots'))) fs.copyFileSync(path.join(PROJECT, '.previews/shots', f), path.join(OUT, 'shots', f));
await s.close();

const calls = ledger.calls;
ledger.result = {
  minutes: +((Date.now() - t0) / 60000).toFixed(1), modelCalls: calls.length, retries: calls.filter((c) => c.retry || c.retryFor).length,
  questionsSkippedByRule: ledger.skipped.length, defaults: ledger.defaults.length,
  validatorErrors: ledger.rejections.filter((r) => r.by === 'validator' && r.severity === 'error').length,
  validatorWarnings: ledger.rejections.filter((r) => r.by === 'validator' && r.severity === 'warning').length,
  treeRejections: ledger.rejections.filter((r) => r.by === 'harness tree check').length,
  tokensIn: calls.reduce((a, c) => a + (c.tokensIn || 0), 0), tokensOut: calls.reduce((a, c) => a + (c.tokensOut || 0), 0),
  maxPromptTokens: Math.max(...calls.map((c) => c.tokensIn || 0)), overBudgetCalls: calls.filter((c) => c.overBudget).length,
  unparsed: calls.filter((c) => !c.answer).length, nodes: built.reduce((a, b) => a + b.nodes.length, 0), sections: built.length,
  applied: !ap.isError
};
writeLedger();
console.log(JSON.stringify(ledger.result, null, 1));
