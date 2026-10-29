// OWN-029 — the small agent. A 2B model builds a page by answering small questions (OWN-027 v2); then the agent LOOKS
// at what it built, says what is wrong, repairs only that, and keeps the repair only if the page got better.
//
//   node agent.mjs --brief puppy --run p1 [--rounds 4] [--model gemma4:e2b-it-qat] [--judge gemma4:e4b-it-qat]
//                  [--copy-model …] [--copy-n 3] [--no-review] [--decisions-from <run>] [--accept constraint|sum]
//                  [--line-copy] [--no-contradict] [--no-v4]   (the s1 paths, for paired runs)
//                  [--org-on shape|words] [--ratchet last]       (the s3 accept rule; the s2 one)
//
// The loop, per round:
//   build    every answer comes from the model door (lm.mjs). A cached answer replays, so round k re-asks only what the
//            reviewer invalidated in round k-1. Each round is a fresh project (one MCP server binds once).
//   measure  render_report (screenshots + findings), and the graph the script built.
//   describe the script writes each section out in words: what a reader would see, top to bottom.
//   critique three kinds of critic, all cheap: script rules over the graph (repeated photo, a step headline, words that
//            echo the styling), render findings mapped back to the node that drew them, and a reviewer model answering
//            yes/no with ONE token about the words (P(yes) from logprobs, no sampling).
//   repair   each issue names its own fix: re-word one line with the reason as a hint, re-ask a section's bits, flip a
//            decision to the model's own second choice (logprobs), add or drop a section.
//   accept   s1: the round's score (weighted issues) must beat the best so far. s2/s3: defects per line must fall and
//            organisation must hold (--accept, --org-on). If not, the agent restores the best round's answers and
//            marks those fixes as tried.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { open } from '../own-027/mcp.mjs';
import { makeLM } from './lm.mjs';
import { SHAPE_Q } from './shape.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

export const BRIEFS = {
  puppy: 'Make me a puppy adoption landing page please, blue colour theme, modern style.',
  bakery: 'A one-page site for our family bakery in Lyon. Warm colours. We sell sourdough, croissants and cakes, open Tuesday to Sunday.',
  running: 'A sign-up page for a Saturday morning running club in the park. Energetic, green.',
  jazz: 'A page for a jazz evening on 14 November at The Blue Room: the line-up, tickets and how to get there. Dark and elegant.',
  pottery: 'A portfolio page for a potter who sells handmade bowls and teaches weekend classes. Minimal, lots of white space.',
  plumber: 'A simple page for my plumbing business so customers can ask for a call-back. Trustworthy, blue.'
};
const BRIEF_ID = opt('--brief', 'puppy');
const REQUEST = opt('--request') || BRIEFS[BRIEF_ID];
if (!REQUEST) throw new Error(`unknown brief ${BRIEF_ID}`);
const RUN = opt('--run', `${BRIEF_ID}-1`);
const ROUNDS = has('--no-review') ? 0 : Number(opt('--rounds', 4));
const MODEL = opt('--model', 'gemma4:e2b-it-qat');
const JUDGE = opt('--judge', 'gemma4:e4b-it-qat');
const COPY_MODEL = opt('--copy-model');
const COPY_N = Number(opt('--copy-n', 1));
// s2: what won in s1 is the default: one copy call per section (arm P, word issues −26%), the contradiction critic, and
// v4 (the outline judges, quotes ≤ 2, the hue from mood words). The old paths stay behind flags for paired runs.
const SECTION_COPY = !has('--line-copy'), CONTRADICT = !has('--no-contradict'), V4 = !has('--no-v4');
// --accept: how a round is kept. 'constraint' (s2 default): defects per line must fall AND "organised" must not drop
// by more than 0.1 (or it rises by 0.1+ with defects per line no more than 10% worse). 'sum' (s1): the weighted sum
// of every issue, the quality judges included, which kept a bakery round whose organisation fell 0.83 → 0.36.
const ACCEPT = opt('--accept', 'constraint');
// s3: --org-on, which organisation judge the constraint reads. 'shape' (default): the outline WITHOUT the words
// (shape.mjs), which a reword cannot move. 'words' (s2): the outline with each section's first line, which moved by up
// to 0.61 on one structure as the words changed. --ratchet: 'peak' (default) compares organisation with the highest any
// kept round reached; 'last' (s2) with the last kept round, which let K2-bakery lose 0.13 in two allowed steps.
const ORG_ON = opt('--org-on', 'shape');
const RATCHET = opt('--ratchet', 'peak');
const FIXES_PER_ROUND = Number(opt('--fixes', 10));
// S13's repair (s3): bits the script took out of one section's choices, by section signature; restored with the best round
const EXCLUDE = new Map();
const OUT = path.join(HERE, 'runs', RUN);
const PROJECT_ROOT = path.join(os.homedir(), 'vscode_projects/NodeGX test projects');
fs.mkdirSync(OUT, { recursive: true });

const REPO_ROOT = path.resolve(HERE, '../../../..');
const ledger = {
  run: RUN, brief: BRIEF_ID, request: REQUEST, model: MODEL, judge: JUDGE, copyModel: COPY_MODEL, copyN: COPY_N, rounds: ROUNDS,
  build: { distMtime: fs.statSync(path.join(REPO_ROOT, 'packages/noodl-mcp/dist/noodl-mcp.cjs')).mtime.toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim() },
  harness: (await import('node:crypto')).createHash('sha1').update(fs.readFileSync(path.join(HERE, 'agent.mjs'))).update(fs.readFileSync(path.join(HERE, 'lm.mjs'))).update(fs.readFileSync(path.join(HERE, 'shape.mjs'))).digest('hex').slice(0, 8),
  startedAt: new Date().toISOString(), calls: [], judgements: [], skipped: [], mcp: [], roundsLog: []
};
const writeLedger = () => fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 1));
process.on('uncaughtException', (e) => { ledger.crashed = String(e?.stack || e); writeLedger(); console.error(e); process.exit(1); });
const RANDOM = has('--random-decisions');
ledger.randomDecisions = RANDOM;
ledger.flags = argv.filter((a) => a.startsWith('--'));
ledger.mode = { sectionCopy: SECTION_COPY, contradict: CONTRADICT, v4: V4, accept: ACCEPT, orgOn: ORG_ON, ratchet: RATCHET };
const RULES = has('--learned') ? JSON.parse(fs.readFileSync(path.join(HERE, 'rules.json'), 'utf8')).rules : null;
ledger.learnedRules = RULES ? Object.keys(RULES).length : undefined;
const lm = makeLM({ model: MODEL, copyModel: COPY_MODEL, judgeModel: JUDGE, ledger, randomDecisions: RANDOM, seed: Number(opt('--seed', 7)), rules: RULES });
// --decisions-from <run>: a PAIRED run. Every round-0 decision of that run (the brief card, the sections, bits, looks,
// photos) is preloaded, so the page's structure is the same and only the words differ. One run per arm was dominated
// by the decisions' own sampling (V-puppy chose a form in five sections).
const FROM = opt('--decisions-from');
if (FROM) {
  const F = JSON.parse(fs.readFileSync(path.join(HERE, 'runs', FROM, 'ledger.json'), 'utf8'));
  let n = 0;
  for (const c of F.calls) if (c.round === 0 && c.answer && !c.forced && !/\|copy\||\|deck\||\|list\.rows\||~/.test(c.sig)) { lm.cache.set(c.sig, { answer: c.answer, conf: c.conf }); n++; }
  const kept = /kept (.*) of \d+/.exec(F.skipped.find((x) => x.key === 'card.photos')?.why || '')?.[1];
  lm.cache.set('card|photos', { answer: { photos: kept && kept !== 'none' ? kept.split(', ') : [] } });
  ledger.decisionsFrom = { run: FROM, decisions: n };
}
const t0 = Date.now();

// ─── The vocabulary of questions ──────────────────────────────────────────────────────────────────────────────────
const KINDS = ['landing page', 'event page', 'sign-up or contact page', 'portfolio', 'shop or menu page', 'other'];
const TONES = ['modern', 'playful', 'classic', 'minimal', 'bold'];
const HUE_WORDS = { blue: 'blue', navy: 'blue', green: 'green', warm: 'warm', orange: 'warm', red: 'warm', amber: 'warm', terracotta: 'warm', purple: 'purple', violet: 'purple', grey: 'neutral', gray: 'neutral', black: 'neutral', monochrome: 'neutral' };
const TONE_WORDS = { modern: 'modern', playful: 'playful', fun: 'playful', classic: 'classic', elegant: 'classic', trustworthy: 'classic', minimal: 'minimal', bold: 'bold', energetic: 'bold' };
const HUES = { blue: 'blue', green: 'green', warm: 'amber', purple: 'purple', neutral: 'gray' };
const PAIRINGS = [
  { id: 'sans-sans', label: 'Inter headings / Inter body', head: null, body: null },
  { id: 'serif-sans', label: 'serif headings / Inter body', head: 'var(--font-serif)', body: null },
  { id: 'serif-serif', label: 'serif headings / serif body', head: 'var(--font-serif)', body: 'var(--font-serif)' },
  { id: 'mono-sans', label: 'monospace headings / Inter body', head: 'var(--font-mono)', body: null }
];
const RADII = {
  sharp: { '--radius-md': '2px', '--radius-lg': '4px', '--radius-xl': '4px', '--radius-2xl': '6px', '--radius-3xl': '8px' },
  round: { '--radius-md': '10px', '--radius-lg': '14px', '--radius-xl': '20px', '--radius-2xl': '28px', '--radius-3xl': '36px' }
};
const SECTION_KINDS = ['hero', 'about', 'feature cards', 'how it works', 'gallery', 'menu or prices', 'schedule or line-up', 'testimonials', 'team', 'faq', 'location and hours', 'sign-up or contact form', 'call to action', 'footer'];
const BITS = {
  eyebrow: 'a small uppercase line above the headline', badge: 'a small pill holding a few words', headline: 'the main heading',
  'sub-line': 'one sentence under the headline', 'body text': 'a short paragraph', button: 'the main action button',
  'second button': 'a quieter second action', photo: 'one photograph', 'list of items': 'several similar items: cards, steps, features, dishes, people or questions',
  quote: 'a quotation from a person', 'name line': 'who said it: a name and a role', form: 'a form to fill in: a few fields and a send button',
  'date and place': 'when and where, in one line', price: 'a price', 'small print': 'a line of fine print (copyright, terms)'
};
const ITEM_BITS = { photo: 'a photograph', icon: 'a small icon', number: 'a step number', title: 'a short title', text: 'a sentence or two', price: 'a price', time: 'a time or a date', button: 'a button', 'name line': 'a name and a role' };
const FIELDS = ['name', 'email', 'phone', 'message', 'date', 'number of people'];
// a form field's label and placeholder are facts about the field, so the script answers them (the model wrote
// "Puppy Adoption Hub\n\n[Hero Section: …" as a message placeholder)
const PLACEHOLDERS = { name: 'Your name', email: 'you@example.com', phone: 'Your phone number', message: 'Your message', date: 'DD/MM/YYYY', 'number of people': '2' };
const WORD_BITS = new Set(['eyebrow', 'badge', 'headline', 'sub-line', 'body text', 'button', 'second button', 'quote', 'name line', 'email field', 'small print', 'form', 'date and place', 'price']);
const DARK = new Set(['heroGround', 'ctaBand', 'imageGround']);
const LIGHT = new Set(['card', 'testimonialCard', 'statTile', 'emptyState', 'raised']);
const HEADING_LOOKS = new Set(['displayHeadline', 'sectionHeading', 'cardTitle']);
const COPY_LEN = { displayHeadline: 70, sectionHeading: 60, cardTitle: 40, eyebrow: 30, meta: 60, lead: 160, fieldLabel: 30, fieldHint: 80 };
const short = (s, n = 90) => { const c = String(s || '').split(/:\s|—|\.\s/)[0].trim(); return c.length > n ? c.slice(0, n - 1) + '…' : c; };
const enumQ = (user, key, options, extra = {}) => ({ user, schema: { type: 'object', required: [key], properties: { [key]: { type: 'string', enum: options } } }, ...extra });

// ─── Stage 0: what the request already says, the script reads; the model answers only the rest ──────────────────
function readRequest(req) {
  const said = {};
  // a colour only counts when it is said AS a colour ("blue colour theme", "Warm colours", ", green."), not in a name
  // ("The Blue Room") — the jazz brief is the trap.
  const words = Object.keys(HUE_WORDS).join('|');
  const m = req.match(new RegExp(`\\b(${words})\\s+(colou?rs?|theme|palette|tones?)\\b`, 'i')) || req.match(new RegExp(`(?:^|[,.;]\\s*)(${words})\\s*(?:[,.;]|$)`, 'i'));
  if (m) { said.hue = HUE_WORDS[m[1].toLowerCase()]; said.colourWord = m[1].toLowerCase(); }
  for (const [w, t] of Object.entries(TONE_WORDS)) if (new RegExp(`\\b${w}\\b`, 'i').test(req)) { said.tone = t; break; }
  for (const k of KINDS) if (k !== 'other' && new RegExp(`\\b${k}\\b`, 'i').test(req)) { said.kind = k; break; }
  return said;
}
const reqLine = `Request: "${REQUEST}"`;
const dot = (t) => String(t || '').trim().replace(/[.!]+$/, '');
const cardText = (card) => `${reqLine}\nBRIEF: a ${card.kind} called "${card.name}", for ${dot(card.audience)}. The one action: ${dot(card.action)}. Tone: ${card.tone}.`;

async function stage0(vocab) {
  const card = {};
  const said = readRequest(REQUEST);
  for (const [k, v] of Object.entries(said)) { if (k === 'colourWord') continue; card[k] = v; ledger.skipped.push({ key: `card.${k}`, why: `S0: the request says it (${v})` }); }
  const missing = ['kind', 'tone'].filter((k) => !card[k]);
  if (missing.length) {
    const props = { kind: { type: 'string', enum: KINDS }, tone: { type: 'string', enum: TONES } };
    const q = { user: `${reqLine}\n${missing.includes('kind') ? `What kind of page is this (${KINDS.join(', ')})? ` : ''}${missing.includes('tone') ? `What tone should it have (${TONES.join(', ')})?` : ''}`,
      schema: { type: 'object', required: missing, properties: Object.fromEntries(missing.map((k) => [k, props[k]])) } };
    Object.assign(card, (await lm.ask('card.kind+tone', 'card|kind+tone', q, 0.2)).answer);
  }
  Object.assign(card, (await lm.ask('card.audience+action+name', 'card|audience', { user: `${reqLine}\nWho is the page for (one line, max 20 words)? What is the ONE action the page wants a visitor to take (max 20 words)? What is the business, event or person called (max 4 words; use the name in the request, or invent a short one)?`,
    schema: { type: 'object', required: ['action', 'audience', 'name'], properties: { action: { type: 'string', maxLength: 140 }, audience: { type: 'string', maxLength: 140 }, name: { type: 'string', maxLength: 40 } } } }, 0.4)).answer);
  const presets = vocab.presets;
  const hueAsked = !card.hue;
  const pq = { user: `${reqLine}\nTone: ${card.tone}. Pick the style preset${hueAsked ? ` and the main colour (blue, green, warm, neutral, purple)${V4 ? ': choose it from the mood words in the request, never from a name in it' : ''}` : ''}.\nPresets:\n${presets.map((p) => `- ${p.id}: ${short(p.description, 80)}`).join('\n')}`,
    schema: { type: 'object', required: hueAsked ? ['hue', 'preset'] : ['preset'], properties: { preset: { type: 'string', enum: presets.map((p) => p.id) }, ...(hueAsked ? { hue: { type: 'string', enum: Object.keys(HUES) } } : {}) } } };
  Object.assign(card, (await lm.ask('card.preset+hue', 'card|preset', pq, 0.2)).answer);
  Object.assign(card, (await lm.ask('card.pairing+density+radius', 'card|type', { user: `${reqLine}\nTone: ${card.tone}. Pick the type pairing (headings / body), the density (airy, regular, compact) and the corner radius (sharp, soft, round).\nPairings:\n${PAIRINGS.map((p) => `- ${p.id}: ${p.label}`).join('\n')}`,
    schema: { type: 'object', required: ['density', 'pairing', 'radius'], properties: { density: { type: 'string', enum: ['airy', 'regular', 'compact'] }, pairing: { type: 'string', enum: PAIRINGS.map((p) => p.id) }, radius: { type: 'string', enum: ['sharp', 'soft', 'round'] } } } }, 0.2)).answer);
  // Photos: up to three, or none. A page that has none is told so in every later question (it can't pick "photo").
  const files = vocab.imagery.subjects.flatMap((x) => x.files).filter((f) => !/^avatar-|^tile-|^texture-|portrait|\.svg$/.test(f));
  // the agent's own acceptance criteria: what a visitor must be able to find, read out of the request
  const ms = (await lm.ask('card.mustShow', 'card|mustShow', { user: `${reqLine}\nWhat must a visitor be able to find on this page? List 1 to 4 short facts taken from the request about the business, event or person (a date, a place, what is sold, opening days, what to do). Only what the request says, and nothing about how the page should look.`,
    schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', maxLength: 80 } } } } }, 0.2)).answer;
  // a fact about the LOOK is not something a visitor must read (dbg3: "blue colour theme", "modern style")
  const looky = new RegExp(`\\b(${[...Object.keys(HUE_WORDS), ...Object.keys(TONE_WORDS), 'colou?r', 'theme', 'style', 'design', 'landing page', 'white space', 'dark', 'look'].join('|')})\\b`, 'i');
  // …but a look word that is part of a NAME stays: "The Blue Room" is the venue (A-jazz dropped it)
  const isName = (t) => { const m = t.match(looky); if (!m) return false; const w = t.slice(m.index, m.index + m[0].length); return /^[A-Z]/.test(w) && (m.index > 0 ? /[A-Z]\w*\s+$/.test(t.slice(0, m.index)) : /^\w+\s+[A-Z]/.test(t.slice(m.index))); };
  card.mustShow = (ms?.texts || []).filter((t) => t && (!looky.test(t) || isName(t)));
  if ((ms?.texts || []).length !== card.mustShow.length) ledger.skipped.push({ key: 'card.mustShow', why: `S0: dropped facts about the look: ${(ms?.texts || []).filter((t) => !card.mustShow.includes(t)).join('; ')}` });
  // The photo scout: the REVIEWER looks at every stock photo against the request (one image, one yes/no token) and
  // keeps the best three that pass. Measured in s1: E4B on one photo is a sharp gate (puppy page: dog 0.98, cat 0.01,
  // city 0.01); E2B says yes to nearly everything, and picking by file name chose soil textures and a cat.
  if (lm.cache.has('card|photos')) card.photos = lm.cache.get('card|photos').answer.photos;
  else if (has('--photos-by-name')) {
    const ph = (await lm.ask('card.photos', 'card|photos', { user: `${reqLine}\nWhich stock photographs fit this page? Choose 0 to 3, best first. Choose none if nothing fits: a wrong photo is worse than no photo.\nFiles: ${files.join(', ')}`,
      schema: { type: 'object', required: ['photos'], properties: { photos: { type: 'array', minItems: 0, maxItems: 3, items: { type: 'string', enum: files } } } } }, 0.2)).answer;
    card.photos = [...new Set(ph?.photos || [])];
  } else {
    const srcDir = path.join(REPO_ROOT, 'packages/noodl-editor/src/assets/starter-project/noodl_modules/starter-imagery');
    const pngDir = path.join(HERE, '.png-cache'); fs.mkdirSync(pngDir, { recursive: true });
    const scores = [];
    for (const f of files) {
      const png = path.join(pngDir, `${f}.png`);
      if (!fs.existsSync(png)) execSync(`sips -s format png -Z 512 "${path.join(srcDir, f)}" --out "${png}"`, { stdio: 'ignore' });
      // the SUBJECT, not the request: asked about "…blue colour theme, modern style" the reviewer judged the photo's
      // styling and rejected the dog (0.079); asked about the subject it keeps it (0.98, s1 probe)
      const subject = `"${card.name}", ${/^[aeiou]/i.test(card.kind) ? 'an' : 'a'} ${card.kind} for ${dot(card.audience)}${card.mustShow?.length ? ` (${card.mustShow.join('; ')})` : ''}`;
      const img = [fs.readFileSync(png).toString('base64')];
      const p = await lm.judge('photo.fit', `Would this photo make sense on a web page for ${subject}? Answer yes or no.`, { file: f }, img);
      // s2, a second gate: "make sense" invites yes (the running page passed a dog 0.97, sheep 0.96, carrots 0.92);
      // "does it SHOW what the page is about" refuses them (≤ 0.004) and keeps the dog for puppies (0.85) and hands in
      // clay for the potter (0.83). Alone it is too strict (the dog got 0.18 against a hand-written subject), so both.
      let shows = null;
      if ((p ?? 0) >= 0.6) shows = await lm.judge('photo.shows', `This page is about "${card.name}": ${card.mustShow?.length ? card.mustShow.join('; ') : dot(card.audience)}. Does this photo show what this page is about? Answer yes or no.`, { file: f }, img);
      scores.push([f, p ?? 0, shows]);
    }
    scores.sort((a, b) => (b[2] ?? -1) - (a[2] ?? -1) || b[1] - a[1]);
    card.photos = scores.filter(([, p, s]) => p >= 0.6 && (s ?? 0) >= 0.3).slice(0, 3).map(([f]) => f);
    ledger.photoScout = scores;
    lm.cache.set('card|photos', { answer: { photos: card.photos } });
    ledger.skipped.push({ key: 'card.photos', why: `photo scout (reviewer vision): kept ${card.photos.join(', ') || 'none'} of ${files.length}` });
  }
  return card;
}

// ─── Stage 1: the sections ────────────────────────────────────────────────────────────────────────────────────────
async function stage1(card) {
  const r = await lm.ask('sections', 'sections', { user: `${cardText(card)}\n${card.mustShow?.length ? `The page must show: ${card.mustShow.join('; ')}.\n` : ''}Which sections should the page have, top to bottom? Give 3 to 7. For each, one line saying what a VISITOR finds there (not what the section does for the page). Choose what THIS page needs; not every page needs every kind.\nSection kinds: ${SECTION_KINDS.join(', ')}`, numPredict: 700,
    schema: { type: 'object', required: ['sections'], properties: { sections: { type: 'array', minItems: 3, maxItems: 7, items: { type: 'object', required: ['kind', 'purpose'], properties: { kind: { type: 'string', enum: SECTION_KINDS }, purpose: { type: 'string', maxLength: 120 } } } } } } }, 0.3);
  return (r.answer?.sections || [{ kind: 'hero', purpose: 'say what this is' }]).slice(0, 7);
}

// ─── Stage 2+3: one section, as decisions, then built ─────────────────────────────────────────────────────────────
// `ctx` is the per-round build state: vocab, comps, node types, photo cursor, page-level gates.
function sigOf(sections, si) { const s = sections[si]; return `${s.kind}#${sections.slice(0, si).filter((x) => x.kind === s.kind).length}`; }

async function buildSection(ctx, card, sections, si) {
  const sec = sections[si], S = sigOf(sections, si), tag = { section: si, sectionKind: sec.kind };
  const T = [], decisions = [];
  const add = (n) => { T.push({ fixedParams: {}, children: [], ...n }); return T.length - 1; };
  const decide = async (key, q, temp = 0.2) => { const r = await lm.ask(`s${si}.${key}`, `${S}|${key}`, q, temp, tag); if (r.conf) decisions.push({ key: `s${si}.${key}`, sig: `${S}|${key}`, conf: r.conf, answer: Object.values(r.answer || {})[0] }); return r.answer; };
  const secLine = `The "${sec.kind}" section (${sec.purpose}).`;
  // a footer is fine print and a way on, not a second page (dbg-puppy r0 grew a four-card photo list in it)
  const FOOTER_BITS = ['headline', 'body text', 'small print', 'button', 'second button', 'date and place'];
  const bitList = Object.entries(BITS).filter(([k]) => (k !== 'photo' || card.photos.length) && (sec.kind !== 'footer' || FOOTER_BITS.includes(k)) && !EXCLUDE.get(S)?.has(k));
  const above = ctx.bitsSoFar.length ? `\nThe sections above already have: ${ctx.bitsSoFar.join('; ')}. Not every section needs a button or a photo; a section can be short.` : '';
  const a1 = await decide('bits', { user: `${cardText(card)}${above}\n${secLine} Which bits does it need, top to bottom? Choose 1 to 6:\n${bitList.map(([k, v]) => `- ${k}: ${v}`).join('\n')}${card.photos.length ? '' : '\n(This page has no photographs.)'}`,
    schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', enum: bitList.map(([k]) => k) } } } } }, 0.3);
  let bits = [...new Set((a1?.bits || ['headline']).filter((b) => BITS[b]))];
  if (!bits.length) bits = ['headline'];
  // a quote with nobody saying it reads as the page talking to itself (A-puppy r1): the script adds who said it
  if (bits.includes('quote') && !bits.includes('name line')) { bits.splice(bits.indexOf('quote') + 1, 0, 'name line'); ledger.skipped.push({ key: `s${si}.bits`, why: 'rule: a quote gets a name line' }); }
  ctx.bitsSoFar.push(`${sec.kind}: ${bits.join(', ')}`);
  const root = add({ parent: -1, type: 'Group', role: `the ${sec.kind} section band`, rootBand: true, lookOptions: null });
  const shell = add({ parent: root, type: 'Group', role: 'the one centred container inside the band', fixedLook: 'shell' });
  const words = bits.filter((b) => WORD_BITS.has(b));
  let align = 'left';
  if (words.length) align = (await decide('align', enumQ(`${cardText(card)}\n${secLine} Are its words centred or left-aligned? Answer one of: centred, left-aligned.`, 'answer', ['centred', 'left-aligned'])))?.answer === 'centred' ? 'center' : 'left';
  let wordsParent = shell, photoMode = null;
  if (bits.includes('photo') && words.length) photoMode = (await decide('photoPlace', enumQ(`${cardText(card)}\n${secLine} Should the photo sit beside the words, above them, or below them? Answer one of: beside, above, below.`, 'answer', ['beside', 'above', 'below'])))?.answer || 'beside';
  if (photoMode === 'beside') {
    const cols = add({ parent: shell, type: 'net.noodl.visual.columns', role: 'the words beside the photo', fixedLook: 'columnsTwoUp' });
    // zigzag: every other photo-beside section puts the photo first, so the page does not read as one column of clones
    const photoFirst = ctx.besideCount++ % 2 === 1;
    if (photoFirst) add({ parent: cols, type: 'Image', role: `the ${sec.kind} photograph` });
    wordsParent = add({ parent: cols, type: 'Group', role: 'the words', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', justifyContent: 'center', alignItems: align === 'center' ? 'center' : 'flex-start' } });
    if (!photoFirst) add({ parent: cols, type: 'Image', role: `the ${sec.kind} photograph` });
  } else if (words.length > 1) {
    wordsParent = add({ parent: shell, type: 'Group', role: 'the words', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', alignItems: align === 'center' ? 'center' : 'flex-start' } });
  }
  const textP = () => ({ textAlignX: align });
  let actionRow = null;
  for (const b of bits) {
    const P0 = wordsParent;
    switch (b) {
      case 'photo': if (photoMode !== 'beside') add({ parent: shell, type: 'Image', role: `the ${sec.kind} photograph` }); break;
      case 'eyebrow': add({ parent: P0, type: 'Text', role: 'the small uppercase line above the headline', fixedLook: 'eyebrow', fixedParams: textP() }); break;
      case 'badge': { const g = add({ parent: P0, type: 'Group', role: 'a small pill', fixedLook: 'badge' }); add({ parent: g, type: 'Text', role: 'the few words in the pill', fixedLook: 'none', fixedParams: { sizeMode: 'contentSize' } }); break; }
      case 'headline': add({ parent: P0, type: 'Text', role: `the ${sec.kind} headline`, bit: 'headline', lookOptions: ['displayHeadline', 'sectionHeading'], fixedParams: textP() }); break;
      case 'sub-line': add({ parent: P0, type: 'Text', role: 'one sentence under the headline', lookOptions: ['lead', 'body'], fixedParams: textP() }); break;
      case 'body text': add({ parent: P0, type: 'Text', role: 'a short paragraph', fixedLook: 'body', fixedParams: textP() }); break;
      case 'quote': add({ parent: P0, type: 'Text', role: 'a quotation from a happy customer or visitor', lookOptions: ['lead', 'body'], fixedParams: textP() }); break;
      case 'name line': add({ parent: P0, type: 'Text', role: 'who said it: a name and a role', fixedLook: 'meta', fixedParams: textP() }); break;
      case 'small print': add({ parent: P0, type: 'Text', role: 'a line of fine print', fixedLook: 'meta', fixedParams: textP() }); break;
      case 'date and place': add({ parent: P0, type: 'Text', role: 'when and where, in one line', fixedLook: 'lead', fixedParams: { ...textP(), color: 'var(--primary)' } }); break;
      case 'price': add({ parent: P0, type: 'Text', role: 'the price', fixedLook: 'sectionHeading', fixedParams: textP() }); break;
      case 'button': case 'second button': {
        if (actionRow === null) actionRow = add({ parent: P0, type: 'Group', role: 'the buttons', fixedLook: 'actionRow', fixedParams: align === 'center' ? { justifyContent: 'center' } : {} });
        add({ parent: actionRow, type: 'net.noodl.controls.button', role: b === 'button' ? `the main action of the ${sec.kind} section` : 'a quieter second action', lookOptions: ['primaryButton', 'outlineButton'] });
        break;
      }
      case 'form': {
        const f = await decide('form.fields', { user: `${cardText(card)}\n${secLine} It has a form. Which fields, top to bottom? Choose 1 to 5: ${FIELDS.join(', ')}.`,
          schema: { type: 'object', required: ['fields'], properties: { fields: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', enum: FIELDS } } } } }, 0.3);
        const fields = [...new Set(f?.fields?.length ? f.fields : ['name', 'email'])];
        const form = add({ parent: P0, type: 'Group', role: 'the form', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', maxWidth: { value: 480, unit: 'px' } } });
        // the fields become ONE field component placed N times (the MCP refuses identical sibling subtrees; V9)
        fields.forEach((fl, k) => {
          const g = add({ parent: form, type: 'Group', role: `the ${fl} field`, fixedLook: 'field', itemOf: [k + 1, fields.length], field: true });
          // the script knows a field's label: it is the field's name (the model wrote "Why Adopt With Us" for it)
          add({ parent: g, type: 'Text', role: `the label of the ${fl} field`, fixedLook: 'fieldLabel', fixedText: fl[0].toUpperCase() + fl.slice(1) });
          add({ parent: g, type: 'net.noodl.controls.textinput', role: `the box to type the ${fl}`, fixedPlaceholder: PLACEHOLDERS[fl] });
        });
        add({ parent: form, type: 'net.noodl.controls.button', role: 'the button that sends the form', fixedLook: 'primaryButton' });
        break;
      }
      case 'list of items': {
        const count = Number((await decide('items.count', enumQ(`${cardText(card)}\n${secLine} It has a list of similar items. How many items? Answer one of: 2, 3, 4, 6.`, 'answer', ['2', '3', '4', '6'])))?.answer || 3);
        const ibList = Object.entries(ITEM_BITS).filter(([k]) => k !== 'photo' || card.photos.length);
        const ib = await decide('items.bits', { user: `${cardText(card)}\n${secLine} It has a list of ${count} items. Which bits does EACH item have, top to bottom? Choose 1 to 4:\n${ibList.map(([k, v]) => `- ${k}: ${v}`).join('\n')}${card.photos.length && card.photos.length < count ? `\n(The page has only ${card.photos.length} photograph${card.photos.length > 1 ? 's' : ''}: a photo on each of ${count} items would repeat ${card.photos.length > 1 ? 'them' : 'it'}.)` : ''}`,
          schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: ibList.map(([k]) => k) } } } } }, 0.3);
        const ibits = [...new Set((ib?.bits?.length ? ib.bits : ['title', 'text']).filter((b) => ITEM_BITS[b]))];
        const lay = await decide('items.layout', enumQ(`${cardText(card)}\n${secLine} Its ${count} items: a grid, or one column? Answer one of: grid, one column.`, 'answer', ['grid', 'one column']));
        const container = lay?.answer === 'one column'
          ? add({ parent: shell, type: 'Group', role: 'the list of items, one column', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-6)' } })
          // four items in a 280px auto-fit grid left one orphan on its own row (dbg3 r2): at four, 220px fits a row
          : add({ parent: shell, type: 'net.noodl.visual.columns', role: 'the list of items, a grid', fixedLook: 'gridAutoFit', fixedParams: count === 4 ? { minWidth: { value: 220, unit: 'px' } } : {} });
        for (let k = 1; k <= count; k++) add({ parent: container, type: 'Group', role: `item ${k} of ${count} in the list`, lookOptions: ['card', 'featureItem', 'testimonialCard', 'statTile'], shareKey: 'item', itemOf: [k, count], itemBits: ibits, pending: true });
        break;
      }
    }
  }
  return { sec, S, tree: T, align, decisions, bits };
}

function placeItemInner(ctx, nodes, item) {
  const [k, count] = item.itemOf, ib = item.itemBits;
  const mk = (parent, type, role, extra = {}) => {
    const n = { type, typeLabel: ctx.labelOf(type), role: `item ${k} of ${count}: ${role}`, parent: parent.j, j: nodes.length, params: {}, origin: {}, children: [], fixedParams: {}, listRole: role, listIndex: k - 1, listCount: count, ...extra };
    n.id = `${item.id}i${nodes.length}`;
    nodes.push(n); parent.children.push(n); return n;
  };
  // a featureItem is a ROW: a photo as its lead squeezed the words to one character wide (dbg-puppy r0), so only an
  // icon or a number leads it; a photo goes on top of the words
  const leadKinds = new Set(['icon', 'number']);
  let lead = [], rest = ib, body = item;
  if (item.look === 'card') { lead = ib.filter((b) => b === 'photo'); rest = ib.filter((b) => b !== 'photo'); }
  if (item.look === 'featureItem') { lead = ib.filter((b) => leadKinds.has(b)).slice(0, 1); rest = ib.filter((b) => !lead.includes(b)); rest = [...rest.filter((b) => b === 'photo'), ...rest.filter((b) => b !== 'photo')]; }
  const avatar = ib.includes('name line');
  const place = (parent, b) => {
    if (b === 'photo') return mk(parent, 'Image', avatar ? 'a portrait of the person' : 'its photograph', { avatar });
    if (b === 'icon') return mk(parent, 'net.noodl.visual.icon', 'its icon');
    if (b === 'number') return mk(parent, 'Text', 'its step number', { fixedLook: 'sectionHeading', fixedText: String(k), fixedParams: { color: 'var(--primary)' } });
    if (b === 'title') return mk(parent, 'Text', 'its title', { fixedLook: 'cardTitle', rowField: 'title' });
    if (b === 'text') return mk(parent, 'Text', 'its sentence or two', { fixedLook: 'body', rowField: 'sentence' });
    if (b === 'price') return mk(parent, 'Text', 'its price', { fixedLook: 'cardTitle', rowField: 'price', fixedParams: { color: 'var(--primary)' } });
    if (b === 'time') return mk(parent, 'Text', 'its time or date', { fixedLook: 'meta', rowField: 'time' });
    if (b === 'button') return mk(parent, 'net.noodl.controls.button', 'its button', { lookOptions: ['primaryButton', 'outlineButton'], shareKey: 'itemButton', rowField: 'button' });
    if (b === 'name line') return mk(parent, 'Text', 'a name and a role', { fixedLook: 'meta', rowField: 'name' });
  };
  for (const b of lead) place(item, b);
  if (rest.length && (item.look === 'card' || item.look === 'featureItem')) body = mk(item, 'Group', 'its words', item.look === 'card' ? { fixedLook: 'cardBody' } : { fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-1)' } });
  for (const b of rest) place(body, b);
}

// Words. With --copy-n N, the builder writes N candidates and the reviewer keeps the one it is surest about.
async function writeWords(key, sig, q, tag, judgeLine) {
  if (COPY_N <= 1) return (await lm.ask(key, sig, q, 0.8, tag)).answer;
  if (lm.cache.has(sig) && !lm.hints.has(sig)) return lm.cache.get(sig).answer;
  const hint = lm.hints.get(sig); lm.hints.delete(sig);
  const q2 = hint ? { ...q, user: `${q.user}\nA reviewer looked at the built page and said: ${hint}` } : q;
  const cands = [];
  for (let i = 0; i < COPY_N; i++) {
    const a = (await lm.ask(`${key}~${i}`, `${sig}~${Date.now()}~${i}`, q2, 0.9, tag)).answer;
    const text = a && Object.values(a)[0];
    if (typeof text !== 'string' || !text) continue;
    cands.push({ a, text, p: await lm.judge(`${key}.cand`, judgeLine(text), tag) });
  }
  cands.sort((x, y) => (y.p ?? 0) - (x.p ?? 0));
  const best = cands[0]?.a || null;
  lm.cache.set(sig, { answer: best });
  ledger.skipped.push({ key, why: `copy-n: ${cands.length} candidates, kept p=${cands[0]?.p}`, cands: cands.map((c) => [c.text, c.p]) });
  return best;
}

async function fillSection(ctx, card, b, si) {
  const { sec, S, tree, align } = b, tag = { section: si, sectionKind: sec.kind };
  const nodes = tree.map((n, j) => ({ ...n, id: `s${si}n${j}`, j, params: {}, origin: {}, children: [] }));
  for (const n of nodes) if (n.parent >= 0) nodes[n.parent].children.push(n);
  for (const n of nodes) n.typeLabel = ctx.labelOf(n.type);
  const shared = {};
  // looks, top-down so a child knows its parent's look
  for (let ni = 0; ni < nodes.length; ni++) {
    const n = nodes[ni];
    n.parentLook = n.parent >= 0 ? nodes[n.parent].look : null;
    const apply = () => { const c0 = ctx.comps.find((x) => x.id === n.look); if (c0) for (const [k, v] of Object.entries(c0.parameters)) { n.params[k] = structuredClone(v); n.origin[k] = 'look'; } ctx.pageTaken.add(n.look); if (n.pending) placeItemInner(ctx, nodes, n); };
    if (n.fixedLook) { n.look = n.fixedLook; apply(); continue; }
    if (n.shareKey && shared[n.shareKey]) { n.look = shared[n.shareKey]; apply(); continue; }
    let looks = ctx.comps.filter((c) => c.nodeType === n.type);
    if (n.lookOptions) looks = looks.filter((c) => n.lookOptions.includes(c.id));
    if (n.rootBand) {
      // the script narrows the grounds by section kind (round 0 of dbg-puppy: heroGround on five sections in a row)
      const allow = sec.kind === 'hero' ? ['heroGround', 'imageGround', 'band', 'bandSurface'] : sec.kind === 'footer' ? ['footerBand'] : sec.kind === 'call to action' ? ['ctaBand', 'imageGround', 'bandSurface'] : ['band', 'bandSurface', 'imageGround'];
      looks = looks.filter((c) => c.group === 'spine' && allow.includes(c.id) && (c.id !== 'imageGround' || card.photos.length));
    }
    if (ctx.pageTaken.has('displayHeadline')) looks = looks.filter((c) => c.id !== 'displayHeadline'); // one per page
    if (looks.length === 0) { n.look = 'none'; continue; }
    if (looks.length === 1) { n.look = looks[0].id; apply(); continue; }
    const ids = [...looks.map((l) => l.id)];
    const lk = n.rootBand ? 'look.band' : n.shareKey ? `look.${n.shareKey}` : `look.${n.role}`;
    const r = await lm.ask(`s${si}.${lk}`, `${S}|${lk}|${ids.join(',')}`, enumQ(`${cardText(card)}\nThe "${sec.kind}" section (${sec.purpose}). A ${n.typeLabel} whose role is: ${n.role}.${n.parentLook && n.parentLook !== 'none' ? ` It sits inside a "${n.parentLook}".` : ''}\nWhich look should it take?\n${looks.map((l) => `- ${l.id}: ${short(l.description)}`).join('\n')}`, 'look', ids), 0.2, tag);
    n.look = r.answer?.look || ids[0];
    if (r.conf) b.decisions.push({ key: `s${si}.${lk}`, sig: `${S}|${lk}|${ids.join(',')}`, conf: r.conf, answer: n.look, node: n.id });
    if (n.shareKey) shared[n.shareKey] = n.look;
    apply();
  }
  const darkOf = (n) => (DARK.has(n.look) ? true : LIGHT.has(n.look) ? false : n.parent < 0 ? false : darkOf(nodes[n.parent]));
  const pairing = PAIRINGS.find((p) => p.id === card.pairing) || PAIRINGS[0];
  const photo = (n) => {
    if (n.avatar) return `${ctx.vocab.imagery.moduleDir}/avatar-${(n.listIndex % 6) + 1}.webp`;
    const f = card.photos[ctx.photoCursor++ % Math.max(1, card.photos.length)];
    return f ? `${ctx.vocab.imagery.moduleDir}/${f}` : null;
  };
  // one call per list writes every item's words as rows (OWN-027 --list-rows)
  const rows = {};
  const listRows = async (n) => {
    const fields = [...new Set(nodes.filter((m) => m.rowField && m.type !== 'Image').map((m) => m.rowField))];
    const k = `list.rows`, sig = `${S}|list.rows|${n.listCount}|${fields.join(',')}`;
    if (rows[sig]) return rows[sig];
    const maxLens = { title: 40, sentence: 160, price: 20, time: 30, name: 60, button: 24 };
    const loose = (f) => Math.max(60, maxLens[f] * 2); // the limit is in the words; a schema cap cuts mid-word
    const q = { user: `${cardText(card)}\nThe "${sec.kind}" section (${sec.purpose}) has a list of ${n.listCount} items. For EACH item, in order, write: ${fields.map((f) => `${f} (max ${maxLens[f]} characters)`).join(', ')}. Each item different from the others; an item's ${fields.join(' and ')} must agree. Plain words, no numbering.`,
      schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: n.listCount, maxItems: n.listCount, items: { type: 'object', required: fields, properties: Object.fromEntries(fields.map((f) => [f, { type: 'string', maxLength: loose(f) }])) } } } }, numPredict: 900 };
    rows[sig] = { sig, items: (await lm.ask(`s${si}.${k}`, sig, q, 0.8, tag)).answer?.items || [] };
    return rows[sig];
  };
  // --section-copy: ONE call writes every word of the section in reading order, so the headline, its sub-line and
  // the button are written knowing each other (OWN-027 found the same for a list's rows). Keys are numbered because
  // Ollama sorts a schema's keys and the model writes them in that order.
  let deck = null;
  const deckNodes = SECTION_COPY ? nodes.filter((n) => !n.fixedText && !n.rowField && ((n.type === 'Text') || n.type === 'net.noodl.controls.button')) : [];
  if (deckNodes.length > 1) {
    const used = {}, fields = deckNodes.map((n) => { const base = n.type === 'net.noodl.controls.button' ? (/sends the form/.test(n.role) ? 'form button' : /quieter/.test(n.role) ? 'second button' : 'button') : BIT_LABEL(n); used[base] = (used[base] || 0) + 1; return used[base] > 1 ? `${base} ${used[base]}` : base; });
    const keyOf = (i) => `${String(i + 1).padStart(2, '0')}_${fields[i].replace(/\W+/g, '_')}`;
    const spec = deckNodes.map((n, i) => n.type === 'net.noodl.controls.button'
      ? `${keyOf(i)}: ${fields[i]}, two to four words, a verb first; pressing it lets a visitor ${/main action/.test(n.role) ? dot(card.action) : /sends the form/.test(n.role) ? 'send the form' : 'do something else useful'}`
      : `${keyOf(i)}: ${fields[i]}, at most ${COPY_LEN[n.look] || 200} characters`);
    const dsig = `${S}|deck|${fields.join(',')}`;
    const q = { user: `BRIEF: "${card.name}", a ${card.kind} for ${dot(card.audience)}. Tone: ${card.tone}.${card.mustShow?.length ? `\nFacts the page must give: ${card.mustShow.join('; ')}.` : ''}\nWrite the words of the "${sec.kind}" section, top to bottom:\n${spec.join('\n')}\n${ctx.saidSoFar.length ? `Already on the page: ${ctx.saidSoFar.slice(-4).map((t) => `"${t}"`).join(', ')}. Say something new. ` : ''}Each line says something the others do not. Words a visitor reads: never describe the page, the section or its design.`,
      schema: { type: 'object', required: deckNodes.map((_, i) => keyOf(i)), properties: Object.fromEntries(deckNodes.map((n, i) => [keyOf(i), { type: 'string', maxLength: Math.max(60, (COPY_LEN[n.look] || 200) * 2) }])) }, numPredict: 900 };
    const a = (await lm.ask(`s${si}.deck`, dsig, q, 0.8, tag)).answer || {};
    deck = new Map(deckNodes.map((n, i) => [n, { text: a[keyOf(i)], sig: dsig }]));
  }
  const words = async (n, port, max, what) => {
    if (deck?.has(n)) { const d = deck.get(n); n.sig = d.sig; if (d.text) { n.params[port] = d.text; n.origin[port] = 'model'; if (/headline/.test(n.role) && !/uppercase/.test(n.role)) ctx.saidSoFar.push(d.text.slice(0, 60)); } return; }
    const sig = `${S}|copy|${n.role}|${n.type}`;
    const isButton = n.type === 'net.noodl.controls.button';
    const long = ['lead', 'body'].includes(n.look) || /when and where|quotation|paragraph|under the headline/.test(n.role);
    const brief = `BRIEF: "${card.name}", a ${card.kind} for ${dot(card.audience)}. Tone: ${card.tone}.${long && card.mustShow?.length ? `\nFacts the page must give: ${card.mustShow.join('; ')}.` : ''}`;
    const ask = isButton
      ? `Write the label of ${/main action|sends the form/.test(n.role) ? 'the main button' : 'a quieter second button'} in the "${sec.kind}" section. Pressing it lets a visitor: ${/main action/.test(n.role) ? dot(card.action) : /sends the form/.test(n.role) ? 'send the form' : 'do something else useful here'}. Two to four words, a verb first.`
      : `Write ${n.role} in the "${sec.kind}" section. At most ${max} characters. Words a visitor reads: never describe the page, the section or its design.${/headline|under the headline/.test(n.role) && ctx.saidSoFar.length ? ` Already on the page: ${ctx.saidSoFar.slice(-4).map((t) => `"${t}"`).join(', ')}. Say something different.` : ''}`;
    const q = { user: `${brief}\n${ask}`,
      schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', maxLength: Math.max(60, max * 2) } } } };
    const a = await writeWords(`s${si}.copy.${n.role}`, sig, q, tag, (text) => `A ${card.kind} called "${card.name}", for ${card.audience}\nIn the "${sec.kind}" section, ${n.role} reads: "${text}"\nDoes it read like something a real business or organisation would publish here, with nothing odd, cut off, repeated or off-topic?`);
    n.sig = sig;
    if (a?.text) { n.params[port] = a.text; n.origin[port] = 'model'; if (/headline/.test(n.role) && !/uppercase/.test(n.role)) ctx.saidSoFar.push(a.text.slice(0, 60)); }
  };
  for (const n of nodes) {
    const dark = darkOf(n), setR = (k, v) => { n.params[k] = v; n.origin[k] = 'rule'; };
    if (n.type === 'Group') {
      if (n.look === 'none') { setR('width', { value: 100, unit: '%' }); setR('sizeMode', 'contentHeight'); }
      if (n.parent < 0) setR('as', sec.kind === 'hero' ? 'header' : sec.kind === 'footer' ? 'footer' : 'section');
      if (n.look === 'badge' && !dark) { setR('backgroundColor', 'var(--surface)'); setR('borderColor', 'var(--border)'); }
      if (ctx.comps.find((c) => c.id === n.look)?.group === 'spine' && card.density !== 'regular' && 'paddingTop' in n.params) { const v = card.density === 'airy' ? 'var(--space-24)' : 'var(--space-12)'; setR('paddingTop', v); setR('paddingBottom', v); }
      if (n.look === 'imageGround') { const src = photo(n); if (src) setR('backgroundImage', src); n.params.sizeMode = 'contentHeight'; delete n.params.height; setR('minHeight', { value: 520, unit: 'px' }); }
    } else if (n.type === 'Text') {
      if (n.fixedText) setR('text', n.fixedText);
      else if (n.rowField) { const r = await listRows(n); n.sig = r.sig; const t = r.items[n.listIndex]?.[n.rowField]; if (t) { n.params.text = t; n.origin.text = 'model'; } }
      else await words(n, 'text', COPY_LEN[n.look] || 200, 'words');
      if (dark) setR('color', 'var(--primary-foreground)');
      if (n.look === 'displayHeadline') setR('as', 'h1'); else if (n.look === 'sectionHeading') setR('as', 'h2'); else if (n.look === 'cardTitle') setR('as', 'h3');
      const fam = HEADING_LOOKS.has(n.look) ? pairing.head : pairing.body; if (fam) setR('fontFamily', fam);
      if (['badge', 'actionRow'].includes(n.parentLook)) setR('sizeMode', 'contentSize');
    } else if (n.type === 'net.noodl.controls.button') {
      if (n.rowField) { const r = await listRows(n); n.sig = r.sig; const t = r.items[n.listIndex]?.button; if (t) n.params.label = t; }
      else await words(n, 'label', 28, 'button label');
      if (dark && n.look === 'primaryButton') { setR('backgroundColor', 'var(--background)'); setR('color', 'var(--primary)'); }
      if (dark && n.look === 'outlineButton') { setR('color', 'var(--primary-foreground)'); setR('borderColor', 'var(--border-glass)'); }
    } else if (n.type === 'Image') {
      const src = photo(n); if (src) { setR('src', src); setR('alt', n.role); n.photoFile = path.basename(src); }
    } else if (n.type === 'net.noodl.controls.textinput') {
      if (n.fixedPlaceholder) setR('placeholder', n.fixedPlaceholder); else await words(n, 'placeholder', 40, 'placeholder');
    } else if (n.type === 'net.noodl.visual.icon') {
      const g = await lm.ask(`s${si}.glyph.${n.role}`, `${S}|glyph|${n.role}`, enumQ(`${cardText(card)}\nThe "${sec.kind}" section. An icon whose role is: ${n.role}. Which glyph?\nGlyphs: ${ctx.glyphs.join(', ')}`, 'glyph', ctx.glyphs), 0.2, tag);
      setR('iconSourceType', 'icon'); setR('iconSize', 24); setR('iconColor', dark ? 'var(--primary-foreground)' : 'var(--primary)');
      if (g.answer?.glyph) n.params.iconIconSource = { ...ctx.iconShape, code: g.answer.glyph };
    }
  }
  // an accent colour a bit asks for (date and place, a price, a step number) is for a LIGHT ground: on a dark band
  // it was unreadable ("Lyon, France | …", A-bakery low-contrast-text); there the band's light text wins
  for (const n of nodes) for (const [k, v] of Object.entries(n.fixedParams || {})) { if (k === 'color' && darkOf(n)) continue; n.params[k] = v; n.origin[k] = 'rule'; }
  for (const n of nodes) if (n.look === 'displayHeadline' && nodes[n.parent]?.role === 'the words' && nodes[nodes[n.parent].parent]?.type === 'net.noodl.visual.columns') n.params.fontSize = 'var(--display-md)';
  b.nodes = nodes;
  b.path = `Sections/S${si + 1}${sec.kind.replace(/(^|\s)(\w)/g, (_, a, c) => c.toUpperCase()).replace(/\W/g, '')}`;
  return b;
}

// ─── One build: a fresh project, every answer through the door, staged, applied, rendered ────────────────────────
async function buildOnce(round) {
  lm.setRound(round);
  const project = path.join(PROJECT_ROOT, `own-029-${RUN}-r${round}`);
  if (fs.existsSync(project) && fs.readdirSync(project).length) throw new Error(`${project} exists`);
  const s = await open(null);
  const mcp = async (name, args) => { const r = await s.call(name, args); ledger.mcp.push({ round, tool: name, isError: r.isError, ms: r.ms, head: r.isError ? r.text.slice(0, 600) : undefined }); return r; };
  // the card needs the vocabulary (presets, imagery), which needs a project: ask kind/tone/name first, then create
  const pre = readRequest(REQUEST);
  const created = await mcp('create_project', { directory: project, name: BRIEF_ID, request: REQUEST, summary: REQUEST, audience: 'visitors', pages: [{ name: 'Home', purpose: REQUEST }], backend: { kind: 'none', description: 'None.' }, agreed: false });
  if (created.isError) throw new Error(`create_project: ${created.text.slice(0, 300)}`);
  const vocab = (await mcp('get_style_vocabulary', {})).json;
  const card = await stage0(vocab);
  const sections = await stage1(card);
  await mcp('find_tools', { group: 'theme' });
  await mcp('set_style_preset', { preset_id: card.preset });
  const h = HUES[card.hue] || 'blue';
  await mcp('set_project_tokens', { tokens: [{ name: '--primary', value: `var(--${h}-${h === 'gray' ? 900 : 600})` }, { name: '--primary-hover', value: `var(--${h}-${h === 'gray' ? 800 : 700})` }, { name: '--ring', value: `var(--${h}-500)` }, ...Object.entries(RADII[card.radius] || {}).map(([name, value]) => ({ name, value }))] });
  const nt = (await mcp('list_node_types', { visual_only: true })).json.nodeTypes;
  const ctx = { vocab, comps: vocab.compositions, glyphs: vocab.icons?.[0]?.glyphs || [], iconShape: vocab.icons?.[0]?.valueShape, pageTaken: new Set(), photoCursor: 0, besideCount: 0, bitsSoFar: [], saidSoFar: [],
    labelOf: (t) => nt.find((x) => x.typeName === t)?.displayName || t };
  const built = [];
  for (let si = 0; si < sections.length; si++) built.push(await fillSection(ctx, card, await buildSection(ctx, card, sections, si), si));
  // s3, for OWN-030's emit lane: the tree the script built, before items become components (one file per round)
  fs.mkdirSync(path.join(OUT, `r${round}`), { recursive: true });
  fs.writeFileSync(path.join(OUT, `r${round}`, 'tree.json'), JSON.stringify({ card, sections: built.map((b) => ({ kind: b.sec.kind, purpose: b.sec.purpose, bits: b.bits,
    nodes: b.nodes.map((n) => ({ type: n.type, role: n.role, parent: n.parent, params: n.params, look: n.look, photoFile: n.photoFile, itemOf: n.itemOf, listIndex: n.listIndex })) })) }, null, 1));

  // assemble: a list's items become ONE item component (OWN-027 V9)
  const itemComps = [];
  const subtree = (n) => { const out = [n]; for (let i = 0; i < out.length; i++) out.push(...out[i].children); return out; };
  for (const b of built) {
    b.replace = {};
    const lists = {};
    for (const n of b.nodes) if (n.itemOf) (lists[n.parent] = lists[n.parent] || []).push(n);
    let li = 0;
    for (const items of Object.values(lists)) {
      const trees = items.map(subtree), tpl = trees[0];
      if (items.length < 2 || trees.some((t) => t.length !== tpl.length || t.some((n, i) => n.type !== tpl[i].type))) continue;
      const varying = [];
      tpl.forEach((n, i) => { const keys = new Set(trees.flatMap((t) => Object.keys(t[i].params))); for (const k of keys) if (new Set(trees.map((t) => JSON.stringify(t[i].params[k]))).size > 1) varying.push({ i, k, port: `p${i}_${k}` }); });
      const cpath = `${b.path}Item${++li}`, inId = `${tpl[0].id}-in`;
      const strip = (n, i) => { const p = { ...n.params }; for (const v of varying) if (v.i === i) delete p[v.k]; return p; };
      itemComps.push({ path: cpath, b, varying, graph: { nodes: [{ id: inId, type: 'Component Inputs', label: 'what changes between the items', ports: varying.map((v) => ({ name: v.port, plug: 'output', type: '*' })) },
        ...tpl.map((n, i) => ({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...(i > 0 ? { parent: b.nodes[n.parent].id } : {}), parameters: strip(n, i) }))],
        connections: varying.map((v) => `${inId}.${v.port} -> ${tpl[v.i].id}.${v.k}`), visual_roots: [tpl[0].id] } });
      items.forEach((it, k) => { b.replace[it.id] = { id: `${it.id}-inst`, type: `/${cpath}`, label: it.role.slice(0, 60), parameters: Object.fromEntries(varying.map((v) => [v.port, trees[k][v.i].params[v.k]])) }; });
      (b.instantiates = b.instantiates || []).push(cpath);
    }
  }
  const home = (await mcp('get_component', { path: 'Pages/Home' })).json;
  const pageNode = home.nodes.find((n) => n.type === 'Page');
  const plan = (await mcp('create_plan', { request: REQUEST, scroll: 'page', operations: [
    ...itemComps.map((c) => ({ kind: 'create', target: c.path, intent: `One item of the ${c.b.sec.kind} list`, inputs: c.varying.map((v) => ({ name: v.port, type: 'string' })) })),
    ...built.map((b) => ({ kind: 'create', target: b.path, intent: `The ${b.sec.kind} section: ${b.sec.purpose}`, ...(b.instantiates ? { instantiates: b.instantiates } : {}) })),
    { kind: 'update', target: 'Pages/Home', intent: 'The page, its sections top to bottom.', instantiates: built.map((b) => b.path) }] })).json;
  const opFor = (t) => plan.operations.find((o) => o.target === t).id;
  const graphOf = (b) => { const out = [], q = [b.nodes[0]];
    while (q.length) { const n = q.shift(); const parent = n.parent >= 0 ? { parent: b.nodes[n.parent].id } : {};
      if (b.replace?.[n.id]) { out.push({ ...b.replace[n.id], ...parent }); continue; }
      out.push({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...parent, parameters: n.params }); q.push(...n.children); }
    return { nodes: out, connections: [], visual_roots: [b.nodes[0].id] }; };
  const staging = [];
  const failed = new Set();
  for (const c of itemComps) { const r = await mcp('stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(c.path), ...c.graph }); if (r.isError) { failed.add(c.path); staging.push({ target: c.path, b: c.b, text: r.text.slice(0, 500) }); } }
  for (const b of built) {
    if ((b.instantiates || []).some((p) => failed.has(p))) { b.staged = false; continue; }
    const r = await mcp('stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(b.path), ...graphOf(b) });
    const diags = r.json?.validation?.diagnostics || r.json?.diagnostics || r.json?.error?.diagnostics || [];
    b.warnings = diags.filter((d) => d.severity === 'warning').map((d) => ({ code: d.code, message: d.message.slice(0, 240), nodeId: d.location?.nodeId }));
    b.staged = !r.isError && !diags.some((d) => d.severity === 'error');
    if (!b.staged) staging.push({ target: b.path, b, text: (diags.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`).join(' | ') || r.text).slice(0, 500) });
  }
  await mcp('stage_plan_operation', { plan_id: plan.planId, operation_id: opFor('Pages/Home'), nodes: [{ id: pageNode.id, type: 'Page', label: 'Home', parameters: { title: card.name || 'Home', urlPath: 'home' } },
    ...built.flatMap((b, i) => (b.staged ? [{ id: `home-s${i + 1}`, type: `/${b.path}`, parent: pageNode.id, label: b.sec.kind }] : []))], connections: [], visual_roots: [pageNode.id] });
  const skip = [...itemComps.filter((c) => failed.has(c.path) || !c.b.staged).map((c) => opFor(c.path)), ...built.filter((b) => !b.staged).map((b) => opFor(b.path))];
  const ap = await mcp('apply_plan', { plan_id: plan.planId, render: 'summary', ...(skip.length ? { skip } : {}) });
  const rr = await mcp('render_report', { out_dir: '.previews/shots', viewports: 'desktop,phone', scale: 0.5 });
  const report = (() => { const i = rr.text.indexOf('{'), hh = rr.text.indexOf('HONESTY'); try { return JSON.parse(rr.text.slice(i, rr.text.lastIndexOf('}', hh > 0 ? hh : undefined) + 1)); } catch { return null; } })();
  const shotsDir = path.join(OUT, `r${round}`, 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  try { for (const f of fs.readdirSync(path.join(project, '.previews/shots'))) fs.copyFileSync(path.join(project, '.previews/shots', f), path.join(shotsDir, f)); } catch {}
  await s.close();
  return { project, card, sections, built, staging, applied: !ap.isError, applyHead: ap.isError ? ap.text.slice(0, 400) : undefined, findings: report?.findings || [], renderSummary: report?.summary || rr.text.slice(0, 300) };
}

// ─── Describe: the page in words, the way a reader meets it ───────────────────────────────────────────────────────
// Returns per section the lines (label, text, sig) the reviewer reads and points at.
const BIT_LABEL = (n) => {
  const r = n.listRole || n.role;
  if (/uppercase/.test(r)) return 'eyebrow';
  if (/under the headline/.test(r)) return 'sub-line';
  if (/headline/.test(r)) return 'headline';
  if (/pill/.test(r)) return 'badge';
  if (/paragraph/.test(r)) return 'paragraph';
  if (/quotation/.test(r)) return 'quote';
  if (/fine print/.test(r)) return 'small print';
  if (/when and where/.test(r)) return 'date and place';
  if (/^the price/.test(r)) return 'price';
  if (/label of the/.test(r)) return 'field label';
  if (n.type === 'net.noodl.controls.button') return 'button';
  if (n.type === 'net.noodl.controls.textinput') return 'input placeholder';
  return r.replace(/^its /, '');
};
function describe(b) {
  const lines = [], out = [];
  const walk = (n) => {
    if (n.itemOf && n.field) { out.push(`- a form field: ${n.children.map((c) => c.params.text || c.params.placeholder).filter(Boolean).map((w) => `"${w}"`).join(' / ')}`); return; }
    if (n.itemOf) {
      if (n.itemOf[0] === 1) {
        const items = b.nodes.filter((m) => m.parent === n.parent && m.itemOf);
        const parts = [...new Set(b.nodes.filter((m) => m.listIndex !== undefined && (m.params.text || m.params.label || m.type === 'Image' || m.type === 'net.noodl.visual.icon')).map((m) => (m.type === 'Image' ? 'photo' : m.type === 'net.noodl.visual.icon' ? 'icon' : BIT_LABEL(m))))];
        out.push(`- ${items.length} ${n.look === 'none' ? 'items' : `${n.look}s`} in a ${b.nodes[n.parent].type === 'Group' ? 'single column' : 'grid'}, each: ${parts.join(', ')}:`);
        for (const it of items) {
          const ws = subtreeOf(b, it).filter((m) => m.params.text || m.params.label).map((m) => m.params.text || m.params.label);
          out.push(`  ${it.itemOf[0]}. ${ws.map((w) => `"${w}"`).join(' — ')}`);
          for (const m of subtreeOf(b, it)) if ((m.params.text || m.params.label) && !m.fixedText) lines.push({ label: `item ${it.itemOf[0]} ${BIT_LABEL(m)}`, text: m.params.text || m.params.label, sig: m.sig, node: m });
        }
      }
      return;
    }
    if (n.type === 'Image') out.push(`- a photo (${n.photoFile || 'none'})`);
    const w = n.params.text || n.params.label || n.params.placeholder;
    if (w && n.type !== 'Image') { const lab = BIT_LABEL(n); out.push(`- ${lab}: "${w}"`); if (!n.fixedText) lines.push({ label: lab, text: w, sig: n.sig, node: n }); }
    for (const c of n.children) walk(c);
  };
  walk(b.nodes[0]);
  return { text: `Section "${b.sec.kind}" (${DARK.has(b.nodes[0].look) ? 'dark band' : 'light band'}). Top to bottom:\n${out.join('\n')}`, lines };
}
const subtreeOf = (b, n) => { const out = [n]; for (let i = 0; i < out.length; i++) out.push(...out[i].children); return out; };

// ─── Critique ─────────────────────────────────────────────────────────────────────────────────────────────────────
// An issue: { id, weight, section, say, fix: { op, sig, hint | value | kind } }. `id` is stable across rounds, so a
// fix that was tried and did not help is not tried again.
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
async function critique(res, round) {
  const issues = [];
  const { built, card } = res;
  const descs = built.map(describe);
  // S1 photos: one file in three or more places, or the same photo twice in one list
  const uses = {};
  built.forEach((b, si) => b.nodes.forEach((n) => { if (n.photoFile && !n.avatar) (uses[n.photoFile] = uses[n.photoFile] || []).push({ si, n }); }));
  for (const [f, us] of Object.entries(uses)) {
    const inList = {};
    for (const u of us) if (u.n.listIndex !== undefined) inList[u.si] = (inList[u.si] || 0) + 1;
    for (const [si, k] of Object.entries(inList)) if (k > 1) issues.push({ id: `S1list|${built[si].S}`, weight: 3, section: +si, say: `the list in "${built[si].sec.kind}" shows the same photo ${k} times`, fix: { op: 'reask', sig: `${built[si].S}|items.bits`, hint: `the page has only ${card.photos.length} photo(s), so ${k} items would repeat one picture. Choose an icon or a number instead of a photo.` } });
    if (us.length >= 3) for (const u of us.slice(2)) if (u.n.listIndex === undefined) issues.push({ id: `S1page|${built[u.si].S}`, weight: 2, section: u.si, say: `"${f}" appears ${us.length} times on the page`, fix: { op: 'reask', sig: `${built[u.si].S}|bits`, hint: `the page already shows the photo "${f}" ${us.length - 1} other times. Choose bits WITHOUT a photo for this section.` } });
  }
  // S2 words that talk about the styling; S3 words that echo a node type; S4 a list's headline that is item one;
  // S5 a line that repeats another; S6 a button label too long to fit
  // only words that describe the LOOK: the request's own colour word (if it said one as a colour) and colour/theme/style.
  // Tone words are left to the reviewer: "warm croissants" and "trustworthy plumbers" are words a business uses.
  const cw = readRequest(REQUEST).colourWord;
  const styleWords = [...new Set([...(cw && !['warm'].includes(cw) ? [cw] : []), 'colour', 'color', 'theme'])];
  const seen = [];
  descs.forEach((d, si) => {
    const b = built[si];
    for (const l of d.lines) {
      if (!l.sig) continue;
      const t = String(l.text);
      const sw = styleWords.find((w) => new RegExp(`\\b${w}\\b`, 'i').test(t) && !new RegExp(`\\b${w}\\b`, 'i').test(card.name || ''));
      if (sw) issues.push({ id: `S2|${l.sig}`, weight: 2, section: si, say: `"${t}" talks about the page's styling ("${sw}")`, fix: { op: 'reword', sig: l.sig, hint: `the words said "${sw}". That is how the page LOOKS, not what it SAYS: do not mention colours, the theme or the style.` } });
      if (/\b(hero|section|landing page|concept|headline|sub-?line|blueprint|placeholder)\b|\n|\[|\]/i.test(t)) issues.push({ id: `S9|${l.sig}`, weight: 3, section: si, say: `"${t.slice(0, 60)}" talks about the page instead of to the visitor`, fix: { op: 'reword', sig: l.sig, hint: 'those words described the page itself. Write only what a visitor reads.' } });
      if (/noodl|net\.|textinput|text input\b/i.test(t)) issues.push({ id: `S3|${l.sig}`, weight: 3, section: si, say: `"${t}" names a part of the builder`, fix: { op: 'reword', sig: l.sig, hint: 'the words named a part of the page builder. Write words for a visitor.' } });
      if (l.label === 'headline' && b.bits.includes('list of items') && /^(step|item|tip)\s*\d|^\d+[.):]/i.test(t)) issues.push({ id: `S4|${l.sig}`, weight: 3, section: si, say: `the "${b.sec.kind}" headline "${t}" reads as the first item, not the list`, fix: { op: 'reword', sig: l.sig, hint: `"${t}" reads as item 1. This headline sits ABOVE the whole list: introduce all of the items, without a number.` } });
      if (l.label === 'button' && (t.length > 24 || t.split(/\s+/).length > 4)) issues.push({ id: `S6|${l.sig}`, weight: 2, section: si, say: `button "${t}" is too long for a button`, fix: { op: 'reword', sig: l.sig, hint: `"${t}" is too long for a button. Two to four words.` } });
      const nt = norm(t);
      const dup = nt.length > 12 && seen.find((x) => x.nt === nt || (x.nt.length > 25 && nt.length > 25 && (x.nt.includes(nt) || nt.includes(x.nt))));
      if (dup && dup.sig !== l.sig) issues.push({ id: `S5|${l.sig}`, weight: 2, section: si, say: `"${t}" repeats "${dup.t}"`, fix: { op: 'reword', sig: l.sig, hint: `it repeats words used elsewhere on the page ("${dup.t}"). Say something new.` } });
      seen.push({ nt, t, sig: l.sig });
    }
    // S7 a middle section with nothing but a headline
    if (!['hero', 'footer', 'call to action'].includes(b.sec.kind) && b.bits.length === 1) issues.push({ id: `S7|${b.S}`, weight: 2, section: si, say: `"${b.sec.kind}" is only a ${b.bits[0]}`, fix: { op: 'reask', sig: `${b.S}|bits`, hint: `the section was only a ${b.bits[0]}. A visitor needs something to read or do here.` } });
  });
  // S8 three dark bands in a row read as one block: flip the middle one's band look
  for (let si = 1; si < built.length - 1; si++) if ([si - 1, si, si + 1].every((k) => DARK.has(built[k].nodes[0].look))) {
    const d = built[si].decisions.find((x) => x.key === `s${si}.look.band`);
    if (d) issues.push({ id: `S8|${d.sig}`, weight: 2, section: si, say: 'three dark bands in a row', fix: { op: 'flip', sig: d.sig, decision: d } });
  }
  // S10 the same one-per-page part twice: a second form, a second quote block
  for (const once of ['form']) {
    const at = built.map((b, i) => (b.bits.includes(once) ? i : -1)).filter((i) => i >= 0);
    for (const si of at.slice(1)) issues.push({ id: `S10|${once}|${built[si].S}`, weight: 4, section: si, say: `a second ${once} (already in "${built[at[0]].sec.kind}")`, fix: { op: 'reask', sig: `${built[si].S}|bits`, hint: `the page already has a ${once} in the "${built[at[0]].sec.kind}" section. Do not choose ${once} again.` } });
  }
  if (V4) {
    const qs = built.map((b, i) => (b.bits.includes('quote') ? i : -1)).filter((i) => i >= 0);
    for (const si of qs.slice(2)) issues.push({ id: `S10|quote|${built[si].S}`, weight: 2, section: si, say: `a quote in a ${qs.indexOf(si) + 1}th section`, fix: { op: 'reask', sig: `${built[si].S}|bits`, hint: `the page already has quotes in ${qs.length - 1} other sections. Do not choose quote or name line here.` } });
  }
  // S11 one phrase said over and over across the page ("Find your perfect …" ten times in A-puppy r1)
  const grams = {};
  descs.forEach((d, si) => d.lines.forEach((l) => { if (!l.sig) return; const w = norm(l.text).split(/\s+/); const seenHere = new Set();
    for (let k = 0; k + 2 < w.length; k++) { const g = w.slice(k, k + 3).join(' '); if (seenHere.has(g) || /^(and|the|to|of|a|for|with|your|our) /.test(g)) continue; seenHere.add(g); (grams[g] = grams[g] || []).push({ si, l }); } }));
  for (const [g, us] of Object.entries(grams)) if (us.length >= 4) for (const u of us.slice(2)) issues.push({ id: `S11|${u.l.sig}`, weight: 1.5, section: u.si, say: `"${g}" is said ${us.length} times on the page`, fix: { op: 'reword', sig: u.l.sig, hint: `the page already says "${g}" ${us.length - 1} other times. Say it with different words.` } });
  // S12 four or more bands in a row on the same ground read as one long section: flip the middle one's ground
  for (let si = 0; si + 3 < built.length; si++) { const run = built.slice(si, si + 4).map((b) => b.nodes[0].look); if (new Set(run).size === 1) { const k = si + 2, d = built[k].decisions.find((x) => x.key === `s${k}.look.band`); if (d) issues.push({ id: `S12|${d.sig}`, weight: 2, section: k, say: `four "${run[0]}" bands in a row`, fix: { op: 'flip', sig: d.sig, decision: d } }); } }
  // S13 one list's items repeated in another section (L-bakery: the same three products as a card row in three
  // sections). Items match on a shared content word ("Sourdough loaf" / "Our sourdough"); two matches flag the later list.
  const STOP = new Set(['your', 'with', 'from', 'that', 'this', 'what', 'have', 'into', 'more', 'every', 'each', 'about', 'their', 'there', 'make', 'made', 'fresh', 'local', 'best']);
  const content = (t) => new Set(norm(t).split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/s$/, '')));
  const lists = descs.map((d, si) => ({ si, items: d.lines.filter((l) => /^item \d+ title$/.test(l.label)).map((l) => ({ l, w: content(l.text) })) })).filter((x) => x.items.length >= 2);
  for (let a = 1; a < lists.length; a++) for (let e = 0; e < a; e++) {
    const hits = lists[a].items.filter((it) => lists[e].items.some((o) => [...it.w].some((w) => o.w.has(w))));
    if (hits.length < 2) continue;
    // the menu is where the products belong: when the later list IS the menu, the earlier one is the repeat
    const swap = built[lists[a].si].sec.kind === 'menu or prices' && built[lists[e].si].sec.kind !== 'menu or prices';
    const L = swap ? lists[e] : lists[a], E = swap ? lists[a] : lists[e], sig = L.items[0].l.sig;
    // s2: a reword never cleared it (the bakery brief names three products, so the model writes the same three again).
    // s3: take the list out of this section's choices and re-ask its bits.
    issues.push({ id: `S13|${built[L.si].S}`, weight: 3, section: L.si, say: `the "${built[L.si].sec.kind}" list repeats the items of "${built[E.si].sec.kind}" (${hits.map((h) => `"${h.l.text}"`).join(', ')})`, fix: sig ? { op: 'exclude', S: built[L.si].S, bit: 'list of items', sig: `${built[L.si].S}|bits`, hint: `the "${built[E.si].sec.kind}" section already lists ${E.items.map((o) => `"${o.l.text}"`).join(', ')}. This section says something else, without a list.` } : null });
    break;
  }
  // S14 prices that disagree, checked by a script: two currencies on one page (A-bakery "$5–8" beside "€"), or two
  // section-level prices that differ (A-jazz "$45 per person" and "Tickets: $35"; the contradiction critic missed it).
  // A list's items may differ by design, so they only count toward the currency. Not a whole "menu or prices" section:
  // A-jazz's "Tickets: $35" was that section's own price line.
  const CUR = { '$': '$', dollar: '$', dollars: '$', usd: '$', '€': '€', euro: '€', euros: '€', eur: '€', '£': '£', gbp: '£' };
  const money = [];
  descs.forEach((d, si) => d.lines.forEach((l) => { if (!l.sig) return;
    for (const m of String(l.text).matchAll(/([$€£])\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(€|£|euros?\b|eur\b|usd\b|dollars?\b|gbp\b)/gi)) {
      money.push({ l, si, cur: CUR[(m[1] || m[4]).toLowerCase()], amt: Number((m[2] || m[3]).replace(',', '.')), item: l.node?.listIndex !== undefined });
    } }));
  const curCount = {}; for (const x of money) curCount[x.cur] = (curCount[x.cur] || 0) + 1;
  const main = Object.entries(curCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const x of money) if (x.cur !== main) issues.push({ id: `S14cur|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" prices in ${x.cur}, the rest of the page in ${main}`, fix: { op: 'reword', sig: x.l.sig, hint: `"${x.l.text}" uses ${x.cur}, but every other price on the page is in ${main}. One page, one currency: use ${main}.` } });
  // only a line that states ONE price: "From €2 to €15" or "Loaves €5.50 | Cakes from €15" is a range or a list (A2-bakery)
  const perLineN = new Map(); for (const x of money) perLineN.set(x.l, (perLineN.get(x.l) || 0) + 1);
  const flat = money.filter((x) => !x.item && x.cur === main && perLineN.get(x.l) === 1);
  for (const x of flat.slice(1)) if (x.amt !== flat[0].amt && x.l.sig !== flat[0].l.sig) issues.push({ id: `S14amt|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" says ${main}${x.amt}, "${String(flat[0].l.text).slice(0, 40)}" says ${main}${flat[0].amt}`, fix: { op: 'reword', sig: x.l.sig, hint: `this line gives the price as ${main}${x.amt}, but the page already says ${main}${flat[0].amt} ("${flat[0].l.text}"). A page states one price: give ${main}${flat[0].amt}, or leave the price out.` } });
  // S14from: a "from $X" line must equal the lowest item price on the page, and a single price above a list must be one
  // of that list's prices (s2: K1-jazz "Tickets from $45" above a $35 item; W1-jazz "$50 Admission" above $75 and up).
  const itemAmts = money.filter((x) => (x.item || /^item \d/.test(x.l.label)) && x.cur === main).map((x) => x.amt);
  if (itemAmts.length) {
    const low = Math.min(...itemAmts);
    for (const x of money.filter((y) => !y.item && !/^item \d/.test(y.l.label) && y.cur === main && perLineN.get(y.l) === 1)) {
      const from = /\b(from|starting at|starts at|as low as)\s*[$€£]?\s*\d/i.test(x.l.text);
      const own = money.filter((y) => (y.item || /^item \d/.test(y.l.label)) && y.si === x.si && y.cur === main).map((y) => y.amt);
      if (from && x.amt !== low) issues.push({ id: `S14from|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" says from ${main}${x.amt}, the lowest price on the page is ${main}${low}`, fix: { op: 'reword', sig: x.l.sig, hint: `this line says "from ${main}${x.amt}", but the cheapest item on the page costs ${main}${low}. Say from ${main}${low}, or leave the price out.` } });
      else if (!from && own.length && !own.includes(x.amt)) issues.push({ id: `S14list|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" says ${main}${x.amt}, the list below says ${own.map((a) => main + a).join(', ')}`, fix: { op: 'reword', sig: x.l.sig, hint: `this line gives ${main}${x.amt}, but the prices listed below it are ${own.map((a) => main + a).join(', ')}. Do not state a different price: leave the price out of this line.` } });
    }
  }
  // V the validator refused a section: re-ask its bits with the refusal as the hint
  for (const st of res.staging) issues.push({ id: `V|${st.b.S}`, weight: 5, section: built.indexOf(st.b), say: `the MCP refused "${st.b.sec.kind}": ${st.text.slice(0, 160)}`, fix: { op: 'reask', sig: `${st.b.S}|bits`, hint: `the builder could not make that section: ${st.text.slice(0, 200)}. Choose simpler bits.` } });
  // R render findings, mapped back to the section whose words they quote
  const findSection = (txt) => { const t = norm(txt).slice(0, 24); if (!t) return -1; return built.findIndex((b) => b.nodes.some((n) => norm(n.params.text || n.params.label).startsWith(t))); };
  for (const f of res.findings) {
    if (/favicon/.test(f.message)) continue;
    const evs = Array.isArray(f.evidence) ? f.evidence : f.evidence ? [f.evidence] : [];
    const ev = evs.find((e) => e?.text);
    const si = ev ? findSection(ev.text) : -1;
    const b = built[si];
    const lowest = b && [...b.decisions].filter((d) => d.conf?.second).sort((x, y) => x.conf.margin - y.conf.margin)[0];
    const band = b && b.decisions.find((x) => x.key === `s${si}.look.band`);
    const target = f.code === 'low-contrast-text' || f.code === 'overlapping-sections' ? band || lowest : lowest;
    issues.push({ id: `R|${f.code}|${b?.S || 'page'}`, weight: f.severity === 'error' ? 6 : 4, section: si, say: `render: ${f.code}${ev ? ` at "${String(ev.text).slice(0, 40)}"` : ''}`, fix: target ? { op: 'flip', sig: target.sig, decision: target } : null });
  }
  // J the reviewer reads each section's words
  const ctxLine = `A ${card.kind} called "${card.name}", for ${dot(card.audience)}.`;
  for (let si = 0; si < built.length; si++) {
    const b = built[si], d = descs[si];
    if (!d.lines.length) continue;
    const pSound = await lm.judge(`s${si}.sound`, `${ctxLine}\n\n${d.text}\n\nDoes every line read like something a real business or organisation would publish on this page, with nothing odd, cut off, repeated, off-topic or strange?`, { section: si });
    b.pSound = pSound;
    if (pSound !== null && pSound < 0.5) {
      const weakest = await lm.pick(`s${si}.weakest`, `${ctxLine}\n\n${d.text}\n\nWhich line is the weakest: odd, cut off, repeated or off-topic?`, d.lines.map((l) => `${l.label}: "${String(l.text).slice(0, 70)}"`), { section: si });
      const l = d.lines.find((x) => weakest?.startsWith(`${x.label}:`)) || d.lines[0];
      issues.push({ id: `J1|${l.sig}`, weight: 3 * (1 - pSound), section: si, say: `reviewer (p=${pSound}): weakest line ${l.label} "${String(l.text).slice(0, 50)}"`, fix: l.sig ? { op: 'reword', sig: l.sig, hint: `a reviewer found "${String(l.text).slice(0, 80)}" weak: odd, cut off, repeated or off-topic for ${card.name}. Write it fresh.` } : null });
    }
    const head = d.lines.find((l) => l.label === 'headline');
    if (head && b.bits.includes('list of items')) {
      const pFit = await lm.judge(`s${si}.fits`, `${ctxLine}\n\n${d.text}\n\nDoes the headline describe the WHOLE section, not just one item in it?`, { section: si });
      b.pFit = pFit;
      if (pFit !== null && pFit < 0.5) issues.push({ id: `J2|${head.sig}`, weight: 3 * (1 - pFit), section: si, say: `reviewer (p=${pFit}): headline "${head.text}" doesn't cover the section`, fix: { op: 'reword', sig: head.sig, hint: `the headline "${head.text}" does not introduce the whole section. It sits above a list of ${b.nodes.filter((n) => n.itemOf && !n.field).length} items: name what they are together.` } });
    }
  }
  // M the agent's own acceptance criteria: does the page say what the request says it must?
  const allWords = descs.map((d, i) => `[${built[i].sec.kind}] ${d.lines.map((l) => String(l.text).slice(0, 90)).join(' / ')}`).join('\n');
  for (const fact of card.mustShow || []) {
    const p = await lm.judge('page.mustShow', `${ctxLine}\nEvery line of words on the page, by section:\n${allWords}\n\nDoes the page tell a visitor: ${fact}?`, { fact });
    if (p === null || p >= 0.5) continue;
    const where = await lm.pick('page.mustShowWhere', `${ctxLine}\nThe page must tell a visitor: ${fact}. It does not yet. Which section should say it?`, built.map((b, i) => `${i + 1}. ${b.sec.kind}`));
    const si = where ? Number(where.split('.')[0]) - 1 : 0;
    const b = built[si];
    const line = b && descs[si].lines.find((l) => ['sub-line', 'paragraph', 'date and place'].includes(l.label));
    issues.push({ id: `M|${fact}`, weight: 4 * (1 - p), section: si, say: `reviewer (p=${p}): the page does not say "${fact}"`, fix: line ? { op: 'reword', sig: line.sig, hint: `the page must tell a visitor: ${fact}. Say it in this line.` } : b ? { op: 'reask', sig: `${b.S}|bits`, hint: `the page must tell a visitor: ${fact}, and this section is where it goes. Include a bit that can say it (a sub-line, body text, or date and place).` } : null });
  }
  // C (--contradict) does any line say something the request contradicts? (A-bakery: "Mon-Sat" for "open Tuesday to
  // Sunday", "$" for a bakery in Lyon)
  if (CONTRADICT) {
    const pC = await lm.judge('page.contradicts', `${reqLine}\nEvery line of words on the page, by section:\n${allWords}\n\nDoes any line say something the request contradicts, or invent a detail it would need to know (a different day, date, time, place, price, currency or name)?`);
    if (pC !== null && pC > 0.5) {
      const cand = descs.flatMap((d, si) => d.lines.filter((l) => l.sig && /\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|daily|street|st\.|avenue|road|\$|€|£|\[/i.test(l.text)).map((l) => ({ ...l, si }))).slice(0, 12);
      if (cand.length) {
        const w = await lm.pick('page.contradictsWhich', `${reqLine}\nWhich line contradicts the request or invents a detail?`, cand.map((l) => `${built[l.si].sec.kind} ${l.label}: "${String(l.text).slice(0, 70)}"`));
        const l = cand.find((x) => w?.startsWith(`${built[x.si].sec.kind} ${x.label}:`)) || cand[0];
        issues.push({ id: `C|${l.sig}`, weight: 4 * pC, section: l.si, say: `reviewer (p=${pC}): "${String(l.text).slice(0, 60)}" contradicts the request or invents a detail`, fix: { op: 'reword', sig: l.sig, hint: `that line contradicted the request or invented a detail. The request says: "${REQUEST}". Use only what it says; leave out what it does not.` } });
      }
    }
  }
  // P the reviewer reads the page outline: is a section missing, or one too many?
  const outline = built.map((b, i) => `${i + 1}. ${b.sec.kind}: "${descs[i].lines.find((l) => l.label === 'headline')?.text || descs[i].lines[0]?.text || '(no words)'}"`).join('\n');
  const pageQ = `${reqLine}\n${ctxLine}\nThe page's sections, top to bottom:\n${outline}`;
  const pMissing = await lm.judge('page.missing', `${pageQ}\n\nIs something a visitor would clearly expect on this page missing?`);
  if (pMissing !== null && pMissing > 0.6) {
    const absent = SECTION_KINDS.filter((k) => !built.some((b) => b.sec.kind === k));
    const kind = await lm.pick('page.missingWhich', `${pageQ}\n\nWhich section should be added?`, absent);
    if (kind) issues.push({ id: `P1|${kind}`, weight: 3 * pMissing, section: -1, say: `reviewer (p=${pMissing}): add a "${kind}" section`, fix: { op: 'addSection', kind } });
  }
  // the page reviewer proposed dropping "location and hours" from a bakery page (A-bakery r1): the sections that carry
  // the brief's substance are not its to drop, and a drop needs a clear yes
  const KEEP = new Set(['hero', 'footer', 'call to action', 'location and hours', 'menu or prices', 'schedule or line-up', 'sign-up or contact form']);
  if (built.length > 3) {
    const pExtra = await lm.judge('page.extra', `${pageQ}\n\nDoes any section repeat another one, or not belong on this page?`);
    if (pExtra !== null && pExtra > 0.8) {
      const which = await lm.pick('page.extraWhich', `${pageQ}\n\nWhich section should be removed?`, built.map((b, i) => `${i + 1}. ${b.sec.kind}`).filter((_, i) => !KEEP.has(built[i].sec.kind)));
      const i = which ? Number(which.split('.')[0]) - 1 : -1;
      if (i >= 0) issues.push({ id: `P2|${built[i].S}`, weight: 3 * pExtra, section: i, say: `reviewer (p=${pExtra}): drop section ${which}`, fix: { op: 'dropSection', index: i } });
    }
  }
  // Q (--v4) the quality term: the reviewer reads the page OUTLINE (kinds, grounds, bits, first line) and says whether
  // it is well organised and whether its type and parts suit it. Without it a thinner page scored better (arm R).
  if (V4) {
    const outlineQ = `${reqLine}\nType: ${card.pairing}. Sections, top to bottom:\n${built.map((b, i) => `${i + 1}. ${b.sec.kind} (${b.nodes[0].look}): ${b.bits.join(', ')} — ${(descs[i].lines.find((l) => l.label === 'headline')?.text || descs[i].lines[0]?.text || '').slice(0, 70)}`).join('\n')}`;
    const pOrg = await lm.judge('page.organised', `${outlineQ}\n\nIs this page well organised: it opens by saying what it is and what to do, the sections come in a sensible order, and no part is repeated?`);
    const pType = await lm.judge('page.suits', `${outlineQ}\n\nDo the type and the parts suit this kind of page?`);
    const shapeQ = `${reqLine}\nType: ${card.pairing}. Sections, top to bottom:\n${built.map((b, i) => `${i + 1}. ${b.sec.kind} (${b.nodes[0].look}): ${b.bits.join(', ')}`).join('\n')}`;
    res.shape = await lm.judge('page.shape', `${shapeQ}\n\n${SHAPE_Q}`);
    issues.push({ id: 'Q|org', quality: true, weight: 8 * (1 - (pOrg ?? 0.5)), section: -1, say: `reviewer: organised p=${pOrg}`, fix: pOrg !== null && pOrg < 0.5 ? { op: 'reask', sig: 'sections', hint: 'a reviewer found the page badly organised. Open with a section that says what this is and what to do; put the sections in the order a visitor needs them; do not repeat a kind.' } : null });
    issues.push({ id: 'Q|type', quality: true, weight: 4 * (1 - (pType ?? 0.5)), section: -1, say: `reviewer: type and parts suit p=${pType}`, fix: null });
    res.org = pOrg; res.suits = pType;
  }
  const byId = new Map();
  for (const i of issues) if (!byId.has(i.id) || byId.get(i.id).weight < i.weight) byId.set(i.id, i);
  issues.length = 0; issues.push(...byId.values());
  const sum = +(issues.reduce((a, x) => a + x.weight, 0)).toFixed(2);
  const defects = +(issues.filter((x) => !x.quality).reduce((a, x) => a + x.weight, 0)).toFixed(2);
  const lines = descs.reduce((a, d) => a + d.lines.length, 0);
  const perLine = +(defects / Math.max(1, lines)).toFixed(3);
  return { issues, score: ACCEPT === 'sum' ? sum : perLine, sum, defects, lines, perLine, org: res.org ?? null, shape: res.shape ?? null, suits: res.suits ?? null, descs };
}

// Keep a round? 'sum' (s1): a lower weighted sum. 'constraint' (s2): organisation may not fall by more than 0.1, and
// the defects per line must fall, unless organisation rose by 0.1+ and the defects per line are within 10%.
// s3: organisation is read by --org-on, and the 0.1 is measured from the peak any kept round reached (--ratchet peak).
const orgOf = (x) => (ORG_ON === 'shape' ? x.shape : x.org);
function better(c, best, peak) {
  if (!best) return true;
  if (ACCEPT === 'sum') return c.sum < best.sum;
  const co = orgOf(c), bo = orgOf(best);
  const known = co !== null && bo !== null;
  const floor = RATCHET === 'peak' && peak !== null ? Math.max(bo, peak) : bo;
  if (known && co < floor - 0.1) return false;
  if (c.perLine < best.perLine) return true;
  return known && co >= bo + 0.1 && c.perLine <= best.perLine * 1.1;
}

// ─── Repair: each fix touches only the answers it names ──────────────────────────────────────────────────────────
async function repair(fix, res) {
  if (fix.op === 'reword' || fix.op === 'reask') { lm.invalidate(fix.sig, fix.hint); return true; }
  if (fix.op === 'flip') { const d = fix.decision; if (!d.conf?.second) return false; lm.force(fix.sig, d.conf.second); return true; }
  if (fix.op === 'exclude') { EXCLUDE.set(fix.S, new Set([...(EXCLUDE.get(fix.S) || []), fix.bit])); lm.invalidate(fix.sig, fix.hint); return true; }
  const sc = lm.cache.get('sections');
  if (!sc?.answer?.sections) return false;
  const list = sc.answer.sections;
  if (fix.op === 'addSection') {
    const at = list.findIndex((x) => x.kind === 'footer' || x.kind === 'call to action');
    const p = (await lm.ask('sections.add', `sections.add|${fix.kind}`, { user: `${cardText(res.card)}\nThe page gets a "${fix.kind}" section. What is its one-line purpose on THIS page?`, schema: { type: 'object', required: ['purpose'], properties: { purpose: { type: 'string', maxLength: 120 } } } }, 0.3)).answer;
    list.splice(at < 0 ? list.length : at, 0, { kind: fix.kind, purpose: p?.purpose || fix.kind });
    if (list.length > 8) return false;
    return true;
  }
  if (fix.op === 'dropSection') { if (list.length <= 3) return false; list.splice(fix.index, 1); return true; }
  return false;
}

// ─── The loop ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`OWN-029 ${RUN}: "${REQUEST}" — builder ${MODEL}, reviewer ${JUDGE}, ${ROUNDS} repair rounds`);
let best = null, peak = null;
// an issue may be tried twice: a re-word is a fresh sample, and the plumber's "[City/Area]" came back bracketed once
const tried = new Map();
const TRIES = Number(opt('--tries', 2));
for (let round = 0; round <= ROUNDS; round++) {
  const tr = Date.now();
  const callsBefore = ledger.calls.length, judgeBefore = ledger.judgements.length;
  const res = await buildOnce(round);
  const crit = await critique(res, round);
  const entry = { round, project: res.project, score: crit.score, sum: crit.sum, defects: crit.defects, lines: crit.lines, perLine: crit.perLine, org: crit.org, shape: crit.shape, suits: crit.suits, applied: res.applied, sections: res.built.map((b) => ({ kind: b.sec.kind, bits: b.bits, band: b.nodes[0].look, staged: b.staged, pSound: b.pSound, pFit: b.pFit })),
    issues: crit.issues.map((i) => ({ id: i.id, weight: +i.weight.toFixed(2), say: i.say, op: i.fix?.op })), findings: res.findings.map((f) => f.code), modelCalls: ledger.calls.length - callsBefore, judgements: ledger.judgements.length - judgeBefore,
    words: crit.descs.map((d) => d.text), minutes: +((Date.now() - tr) / 60000).toFixed(1) };
  ledger.roundsLog.push(entry);
  const improved = better(crit, best, peak);
  const m = (c) => `per line ${c.perLine} (${c.defects}/${c.lines}), organised ${c.org}, shape ${c.shape}, sum ${c.sum}`;
  console.log(`\n== round ${round}: ${m(crit)} (${crit.issues.length} issues) ${best ? (improved ? `KEPT over ${m(best)}` : `NOT better than ${m(best)} → revert`) : ''}`);
  for (const i of crit.issues) console.log(`   · [${i.weight.toFixed(1)}] ${i.say}${i.fix ? ` → ${i.fix.op}` : ''}`);
  if (improved) {
    best = { round, score: crit.score, sum: crit.sum, defects: crit.defects, lines: crit.lines, perLine: crit.perLine, org: crit.org, shape: crit.shape, suits: crit.suits, snap: lm.snapshot(), sectionsAnswer: structuredClone(lm.cache.get('sections')), exclude: new Map([...EXCLUDE].map(([k, v]) => [k, new Set(v)])), issues: crit.issues, res };
    if (orgOf(crit) !== null) peak = Math.max(peak ?? 0, orgOf(crit));
  } else { lm.restore(best.snap); lm.cache.set('sections', structuredClone(best.sectionsAnswer)); EXCLUDE.clear(); for (const [k, v] of best.exclude) EXCLUDE.set(k, new Set(v)); entry.reverted = true; }
  entry.kept = improved;
  writeLedger();
  if (round === ROUNDS) break;
  // choose fixes from the best round's issues: heaviest first, not tried before, one structural fix per section
  const queue = [...best.issues].filter((i) => i.fix && (tried.get(i.id) || 0) < TRIES).sort((a, b) => b.weight - a.weight);
  if (!queue.length) { console.log('nothing left to fix'); break; }
  const structural = new Set(); let n = 0, pageOp = false;
  const applied = [];
  for (const i of queue) {
    if (n >= FIXES_PER_ROUND) break;
    const isStruct = ['reask', 'exclude', 'flip', 'addSection', 'dropSection'].includes(i.fix.op);
    if (['addSection', 'dropSection'].includes(i.fix.op)) { if (pageOp) continue; pageOp = true; }
    if (isStruct && structural.has(i.section)) continue;
    tried.set(i.id, (tried.get(i.id) || 0) + 1);
    if (await repair(i.fix, best.res)) { applied.push(i.id); n++; if (isStruct) structural.add(i.section); }
  }
  entry.fixesForNext = applied;
  console.log(`   fixes for round ${round + 1}: ${applied.join(', ')}`);
  writeLedger();
}
ledger.result = { minutes: +((Date.now() - t0) / 60000).toFixed(1), accept: ACCEPT, bestRound: best.round, bestScore: best.score, scores: ledger.roundsLog.map((r) => r.score),
  r0: { perLine: ledger.roundsLog[0].perLine, org: ledger.roundsLog[0].org, shape: ledger.roundsLog[0].shape, suits: ledger.roundsLog[0].suits, sum: ledger.roundsLog[0].sum },
  kept: { perLine: best.perLine, org: best.org, shape: best.shape, suits: best.suits, sum: best.sum, lines: best.lines }, builderCalls: ledger.calls.filter((c) => !c.forced).length, judgements: ledger.judgements.length, replays: ledger.replays, bestProject: best.res.project };
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ ...ledger.result, rounds: ledger.roundsLog.map(({ words, ...r }) => r) }, null, 1));
writeLedger();
console.log(JSON.stringify(ledger.result, null, 1));
