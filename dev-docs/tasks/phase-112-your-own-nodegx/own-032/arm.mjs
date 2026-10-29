// OWN-032 3b — the workbench arm: the 2B model builds ONE hero, one action per turn, from closed menus (§3b).
//
//   node arm.mjs --run <name> [--brief puppy] [--turns 30] [--look script|vision|both] [--bench <bench project>]
//                [--replay <run> --upto <k>]          surgery: take turns 1..k-1 from <run> without asking (§3c)
//                [--override k=<json action>]          surgery: turn k does this action instead of asking
//                [--hint k=<text>]                     surgery: turn k's prompts carry this line
//                [--edit <json file>]                  surgery: { menuWording?, intro?, rules?, wordsTemperature? } for the whole run
//                [--force k.<key>=<answer>]            surgery: one call of turn k answers this instead of asking
//                [--prompt k.<key>=<file>]             surgery: one call of turn k is asked this text, verbatim
//                (the viewer's "edit and re-run from here" composes these: server.mjs POST /fork)
//
// A turn: the builder picks a MOVE from a short numbered menu (add / set / write / undo / done); each move then asks
// the one or two small closed questions it needs (which node, which setting, which value), every one a single-enum
// schema so the logprobs give the model's odds on every option. The script applies the action (an illegal one comes
// back as a finding, never dropped), renders the hero alone at 1280 and 390 (bench.mjs), measures the facts, asks the
// reviewer one yes/no question per fact with the picture, and writes the findings into the next turn's prompt.
// Every prompt, answer, distribution, action, tree, picture and measure goes into runs/<run>/ledger.json; the
// viewer's timeline.json is written from it after every turn, so a run can be watched while it runs.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBench, writeHero } from './bench.mjs';
import { outline } from './outline.mjs';
import { QUESTIONS } from './probe-vision.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const all = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
const RUN = opt('--run', 'w1'), TURNS = Number(opt('--turns', 30)), LOOK = opt('--look', 'script');
const MODEL = opt('--model', 'gemma4:e2b-it-qat'), JUDGE = opt('--judge', 'gemma4:e4b-it-qat');
const BENCH = opt('--bench', path.join(process.env.HOME, 'vscode_projects/NodeGX test projects/own-032-bench-puppy'));
const OLLAMA = 'http://127.0.0.1:11434';
const OUT = path.join(HERE, 'runs', `arm-${RUN}`);
const EDIT = opt('--edit') ? JSON.parse(fs.readFileSync(opt('--edit'), 'utf8')) : {};
const OVERRIDE = Object.fromEntries(all('--override').map((s) => [Number(s.split('=')[0]), JSON.parse(s.slice(s.indexOf('=') + 1))]));
const HINT = Object.fromEntries(all('--hint').map((s) => [Number(s.split('=')[0]), s.slice(s.indexOf('=') + 1)]));
const REPLAY = opt('--replay') ? JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${opt('--replay')}`, 'ledger.json'), 'utf8')) : null;
const UPTO = Number(opt('--upto', 0));
// `k.key=…` → { k: { key: … } }; the key itself holds a dot (`set.value`), so split at the first dot only
const perCall = (flag, read) => all(flag).reduce((m, s) => { const eq = s.indexOf('='), dot = s.indexOf('.'); const k = Number(s.slice(0, dot)); (m[k] ||= {})[s.slice(dot + 1, eq)] = read(s.slice(eq + 1)); return m; }, {});
const FORCE = perCall('--force', (v) => v);
const PROMPT = perCall('--prompt', (f) => fs.readFileSync(f, 'utf8'));
const WORDS_T = EDIT.wordsTemperature ?? 0.7;

export const GOALS = {
  puppy: { name: 'Puppy Haven', about: 'a puppy adoption site; blue, modern', photo: 'animal-dog.webp', want: 'a headline, one line under it, a button, and a photo on the right' },
  bakery: { name: 'Maison Levain', about: 'a family bakery in Lyon; warm colours', photo: 'food-bread.webp', want: 'a headline, one line under it, a button, and a photo on the right' },
  jazz: { name: 'The Blue Room', about: 'a jazz evening on 14 November; dark and elegant', photo: 'people-cafe.webp', want: 'a headline, one line under it, a button, and a photo on the right' },
  plumber: { name: 'Dupont Plumbing', about: 'a plumbing business; trustworthy, blue', photo: 'work-welder.webp', want: 'a headline, one line under it, a button, and a photo on the right' }
};
const GOAL = GOALS[opt('--brief', 'puppy')];

// ─── The vocabulary: what can be added, and every setting with its closed options ───────────────────────────────
const sp = (n) => (n === 0 ? '0px' : `var(--space-${n})`);
export const KINDS = {
  Group: { type: 'Group', say: 'Group (a box that holds other parts)', make: () => ({ width: { value: 100, unit: '%' }, sizeMode: 'contentHeight', flexDirection: 'column' }), holds: true },
  Columns: { type: 'net.noodl.visual.columns', say: 'Columns (two columns side by side, one under the other on a phone)', make: () => ({ layoutString: '1 1', marginX: { value: 24, unit: 'px' }, mediumBreakpoint: { value: 900, unit: 'px' }, mediumLayout: '1', smallBreakpoint: { value: 640, unit: 'px' }, smallLayout: '1' }), holds: true },
  Text: { type: 'Text', say: 'Text (words)', make: () => ({ text: 'Text', fontSize: 'var(--text-base)', color: 'var(--foreground)' }), words: 'text' },
  Image: { type: 'Image', say: 'Image (the photo)', make: () => ({ sizeMode: 'explicit', objectFit: 'cover', width: { value: 100, unit: '%' }, height: { value: 320, unit: 'px' }, src: `noodl_modules/starter-imagery/${GOAL.photo}`, alt: 'a photo' }) },
  Button: { type: 'net.noodl.controls.button', say: 'Button', make: () => ({ label: 'Button', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderStyle: 'none', borderRadius: 'var(--radius-md)', paddingLeft: sp(4), paddingRight: sp(4), paddingTop: sp(2), paddingBottom: sp(2), fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', sizeMode: 'contentSize' }), words: 'label' }
};
const gapOpts = Object.fromEntries([['none', 0], ['small', 2], ['medium', 4], ['large', 6], ['larger', 8], ['huge', 12]].map(([k, n]) => [k, { rowGap: sp(n), columnGap: sp(n) }]));
const padX = Object.fromEntries([['none', 0], ['small', 4], ['medium', 6], ['large', 8], ['huge', 12]].map(([k, n]) => [k, { paddingLeft: sp(n), paddingRight: sp(n) }]));
const padY = Object.fromEntries([['none', 0], ['small', 4], ['medium', 8], ['large', 16], ['huge', 24]].map(([k, n]) => [k, { paddingTop: sp(n), paddingBottom: sp(n) }]));
const maxW = Object.fromEntries([['none', undefined], ['480px', 480], ['640px', 640], ['960px', 960], ['1200px', 1200]].map(([k, n]) => [k, { maxWidth: n && { value: n, unit: 'px' } }]));
const colour = { 'dark text': 'var(--foreground)', 'grey text': 'var(--muted-foreground)', 'white text': 'var(--primary-foreground)', 'brand colour text': 'var(--primary)' };
export const SETTINGS = {
  Group: {
    direction: { say: 'how its parts are placed', options: { stacked: { flexDirection: 'column' }, 'side by side': { flexDirection: 'row' } } },
    gap: { say: 'the space between its parts', options: gapOpts },
    'padding left and right': { say: 'the space inside its left and right edges', options: padX },
    'padding top and bottom': { say: 'the space inside its top and bottom edges', options: padY },
    align: { say: 'where its parts sit across it', options: { start: { alignItems: 'flex-start' }, centre: { alignItems: 'center' }, end: { alignItems: 'flex-end' }, stretch: { alignItems: 'stretch' } } },
    justify: { say: 'where its parts sit along it', options: { start: { justifyContent: 'flex-start' }, centre: { justifyContent: 'center' }, end: { justifyContent: 'flex-end' }, 'spread out': { justifyContent: 'space-between' } } },
    'max width': { say: 'how wide it may grow', options: maxW },
    'self align': { say: 'where it sits inside its own parent', options: { 'parent decides': { alignSelf: undefined }, start: { alignSelf: 'flex-start' }, centre: { alignSelf: 'center' }, end: { alignSelf: 'flex-end' } } },
    ground: { say: 'what is behind it', options: { none: { backgroundColor: undefined, backgroundGradient: undefined }, 'page colour': { backgroundColor: 'var(--background)', backgroundGradient: undefined }, 'soft grey': { backgroundColor: 'var(--muted)', backgroundGradient: undefined }, 'brand colour': { backgroundColor: 'var(--primary)', backgroundGradient: undefined }, 'dark brand gradient': { backgroundGradient: 'var(--gradient-spotlight)', backgroundColor: undefined } } }
  },
  Columns: {
    split: { say: 'how wide each column is', options: { 'half and half': { layoutString: '1 1' }, 'wider first column': { layoutString: '3 2' }, 'wider second column': { layoutString: '2 3' } } },
    'column gap': { say: 'the space between the two columns', options: Object.fromEntries([0, 24, 48, 64].map((n) => [`${n}px`, { marginX: { value: n, unit: 'px' } }])) }
  },
  Text: {
    size: { say: 'how big the words are', options: Object.fromEntries(['text-sm', 'text-base', 'text-lg', 'text-xl', 'display-sm', 'display-md', 'display-lg'].map((t) => [t, { fontSize: `var(--${t})` }])) },
    weight: { say: 'how heavy the words are', options: { normal: { fontWeight: undefined }, semibold: { fontWeight: 'var(--font-semibold)' }, bold: { fontWeight: 'var(--font-bold)' } } },
    'text align': { say: 'how the lines of words line up', options: { left: { textAlignX: 'left' }, centre: { textAlignX: 'center' } } },
    colour: { say: 'the colour of the words', options: Object.fromEntries(Object.entries(colour).map(([k, v]) => [k, { color: v }])) },
    'max width': { say: 'how wide the lines may run', options: Object.fromEntries([['none', undefined], ['480px', 480], ['560px', 560], ['640px', 640]].map(([k, n]) => [k, { maxWidth: n && { value: n, unit: 'px' } }])) }
  },
  Image: {
    height: { say: 'how tall the photo is', options: Object.fromEntries([240, 320, 400, 480].map((n) => [`${n}px`, { height: { value: n, unit: 'px' } }])) },
    corners: { say: 'how round its corners are', options: { square: { borderRadius: undefined }, rounded: { borderRadius: 'var(--radius-lg)' }, 'very rounded': { borderRadius: 'var(--radius-2xl)' } } }
  },
  Button: {
    colours: { say: 'its colours', options: { 'brand fill, white words': { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }, 'white fill, brand words': { backgroundColor: 'var(--background)', color: 'var(--primary)' } } },
    size: { say: 'how big it is', options: { small: { paddingLeft: sp(3), paddingRight: sp(3), paddingTop: sp(1), paddingBottom: sp(1), fontSize: 'var(--text-sm)' }, medium: { paddingLeft: sp(4), paddingRight: sp(4), paddingTop: sp(2), paddingBottom: sp(2), fontSize: 'var(--text-sm)' }, large: { paddingLeft: sp(6), paddingRight: sp(6), paddingTop: sp(3), paddingBottom: sp(3), fontSize: 'var(--text-base)' } } },
    corners: { say: 'how round its corners are', options: { slightly: { borderRadius: 'var(--radius-md)' }, pill: { borderRadius: 'var(--radius-full)' } } },
    'self align': { say: 'where it sits inside its parent', options: { 'parent decides': { alignSelf: undefined }, start: { alignSelf: 'flex-start' }, centre: { alignSelf: 'center' }, end: { alignSelf: 'flex-end' } } }
  }
};
const kindOf = (n) => Object.keys(KINDS).find((k) => KINDS[k].type === n.type);
const patch = (params, p) => { for (const [k, v] of Object.entries(p)) { if (v === undefined) delete params[k]; else params[k] = v; } };
const currentOf = (n, setting) => {
  const opts = SETTINGS[kindOf(n)][setting].options;
  return Object.keys(opts).find((o) => Object.entries(opts[o]).every(([k, v]) => JSON.stringify(n.params[k]) === JSON.stringify(v))) || '(not set)';
};

// ─── The model door: single-enum questions with their distribution, and the one free-words question ─────────────
const SYSTEM = 'You are building one section of a web page, one small step at a time. Reply with JSON only, matching the schema.';
const used = new Set();   // the models this run asked: only these are unloaded at the end
async function chat(model, messages, { format, temperature = 0, numPredict = 60, logprobs = false }) {
  used.add(model);
  const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify({ model, messages, stream: false, think: false, format, ...(logprobs ? { logprobs: true, top_logprobs: 10 } : {}), options: { temperature, num_predict: numPredict, num_ctx: 4096 }, keep_alive: '15m' }) });
  if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
// the distribution over enum options, read where the options' spellings diverge (lm.mjs `confidence`)
function dist(j, options) {
  const lp = j.logprobs || [];
  // the value starts after the text so far reads `…": "`. lm.mjs looks only one token back, which misses `":` ` ` `"`
  // (three tokens): E2B answers a digit enum that way, and every move's odds came back empty (w1-puppy).
  let at = -1, text = '';
  for (let i = 0; i < lp.length - 1; i++) { text += lp[i].token; if (/:\s*"$/.test(text)) { at = i + 1; break; } }
  if (at < 0) return null;
  const d = Object.fromEntries(options.map((o) => [o, 0]));
  let prefix = '';
  for (let i = at; i < lp.length; i++) {
    const cands = options.filter((o) => o.toLowerCase().startsWith(prefix));
    if (cands.length <= 1) { if (cands[0]) d[cands[0]] = 1; break; }
    const chosen = lp[i].token.toLowerCase();
    if (cands.every((o) => o.toLowerCase().startsWith(prefix + chosen))) { prefix += chosen; continue; }
    for (const t of lp[i].top_logprobs || []) {
      const ext = prefix + t.token.toLowerCase();
      if (ext === prefix) continue;
      const hit = cands.filter((o) => o.toLowerCase().startsWith(ext) || (ext.startsWith(o.toLowerCase()) && ext.length > o.length - 1));
      for (const o of hit) d[o] += Math.exp(t.logprob) / hit.length;
    }
    break;
  }
  const sum = Object.values(d).reduce((a, b) => a + b, 0);
  if (!sum) return null;
  return options.map((o) => ({ label: o, p: +(d[o] / sum).toFixed(3) })).sort((a, b) => b.p - a.p);
}
// what surgery did to one call: its prompt replaced (`--prompt`), or the turn's hint in it (`--hint`)
const touched = (turnLog, key) => ({ edited: PROMPT[turnLog.turn]?.[key] != null || undefined, hinted: !!HINT[turnLog.turn] || undefined });
async function choose(key, prompt, options, turnLog) {
  prompt = PROMPT[turnLog.turn]?.[key] ?? prompt;
  const forced = turnLog.forced?.[key];
  if (forced !== undefined) { turnLog.calls.push({ key, prompt, options: options.map((label) => ({ label, p: null })), answer: forced, forced: true }); return forced; }
  const t = Date.now();
  const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], { format: { type: 'object', properties: { pick: { type: 'string', enum: options } }, required: ['pick'] }, logprobs: true });
  let answer = null; try { answer = JSON.parse(j.message.content).pick; } catch {}
  turnLog.calls.push({ key, model: MODEL, prompt, options: dist(j, options) || options.map((label) => ({ label, p: null })), answer, raw: answer ? undefined : j.message?.content, tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, ...touched(turnLog, key) });
  return answer;
}
async function words(key, prompt, max, turnLog) {
  prompt = PROMPT[turnLog.turn]?.[key] ?? prompt;
  const forced = turnLog.forced?.[key];
  if (forced !== undefined) { turnLog.calls.push({ key, prompt, answer: forced, forced: true }); return forced; }
  const t = Date.now();
  const j = await chat(MODEL, [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], { format: { type: 'object', properties: { text: { type: 'string', maxLength: max } }, required: ['text'] }, temperature: WORDS_T, numPredict: 120 });
  let answer = null; try { answer = JSON.parse(j.message.content).text; } catch {}
  turnLog.calls.push({ key, model: MODEL, prompt, answer, temperature: WORDS_T, tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, ...touched(turnLog, key) });
  return answer;
}
async function judge(q, png) {
  const t = Date.now();
  const j = await chat(JUDGE, [{ role: 'user', content: `${q} Answer yes or no.`, images: [png.toString('base64')] }], { numPredict: 1, logprobs: true });
  let y = 0, n = 0;
  for (const x of j.logprobs?.[0]?.top_logprobs || []) { const k = x.token.trim().toLowerCase(); if (k === 'yes') y += Math.exp(x.logprob); if (k === 'no') n += Math.exp(x.logprob); }
  return { pYes: y + n ? +(y / (y + n)).toFixed(3) : null, ms: Date.now() - t, tokensIn: j.prompt_eval_count };
}

// ─── Findings in words: the script's measures, and the goal's parts ──────────────────────────────────────────────
// emptyParts / unchanged: findings about what the picture cannot show (w1-puppy added 22 empty Groups in a row, and
// nothing it was told said they drew nothing). On by default from w2; `--edit` with rules:{…:false} turns one off.
const RULES = { ...{ minGapPx: 4, edgePx: 8, emptyParts: true, unchanged: true }, ...(EDIT.rules || {}) };
export function findingsFrom(shot, nodes) {
  const out = [];
  const q = (s) => `"${s.length > 30 ? `${s.slice(0, 28)}…` : s}"`;
  for (const w of ['desktop', 'phone']) {
    const f = shot[w].facts, on = w === 'desktop' ? 'On a desktop' : 'On a phone';
    for (const t of f.touching) out.push({ check: 'touching', width: w, say: `${on}, ${q(t.a)} and ${q(t.b)} are touching (${t.gap}px apart).` });
    for (const t of f.atEdge) out.push({ check: 'atEdge', width: w, say: `${on}, ${q(t.text)} is ${Math.min(t.left, t.right)}px from the ${t.left <= t.right ? 'left' : 'right'} edge of the screen.` });
    if (f.photoCut.length) out.push({ check: 'photoCut', width: w, say: `${on}, the photo runs past the edge of the screen.` });
    for (const b of f.buttonWide) out.push({ check: 'buttonWide', width: w, say: `${on}, the button ${q(b.text)} is ${b.w}px wide for ${b.words}px of words.` });
    if (f.unaligned.length) out.push({ check: 'unaligned', width: w, say: `${on}, the words and the button are not lined up: neither their left edges nor their centres match.` });
    if (f.overflowX > 1) out.push({ check: 'overflowX', width: w, say: `${on}, the page is ${f.overflowX}px too wide and scrolls sideways.` });
    for (const l of f.lowContrast || []) out.push({ check: 'contrast', width: w, say: `${on}, ${q(l.text)} is hard to read against what is behind it (contrast ${l.ratio}).` });
  }
  // one line per fault, not one per width, when both widths say the same thing
  const seen = new Map();
  for (const f of out) { const k = f.say.replace(/^On a (desktop|phone), /, ''); if (seen.has(k)) seen.get(k).say = seen.get(k).say.replace(/^On a (desktop|phone), /, 'On both, '); else seen.set(k, f); }
  const kinds = nodes.map(kindOf);
  const missing = [['a headline', kinds.filter((k) => k === 'Text').length >= 1], ['a line under the headline', kinds.filter((k) => k === 'Text').length >= 2], ['a button', kinds.includes('Button')], ['a photo', kinds.includes('Image')]].filter(([, has]) => !has).map(([s]) => s);
  const res = [...seen.values()];
  if (missing.length) res.unshift({ check: 'goal', say: `Not there yet: ${missing.join(', ')}.` });
  if (RULES.emptyParts) {
    const empty = nodes.map((n, i) => i).filter((i) => KINDS[kindOf(nodes[i])].holds && !nodes.some((m) => m.parent === i));
    if (empty.length) res.push({ check: 'empty', say: `${empty.map(name).join(', ')} ${empty.length > 1 ? 'are' : 'is'} empty: ${empty.length > 1 ? 'they show' : 'it shows'} nothing until something is put inside.` });
  }
  if (RULES.unchanged && shot.unchanged) res.push({ check: 'unchanged', say: 'Your last step changed nothing a person can see, on a desktop or on a phone.' });
  const unwritten = nodes.map((n, i) => ({ n, i })).filter(({ n }) => (n.params.text === 'Text' || n.params.label === 'Button'));
  if (unwritten.length) res.push({ check: 'words', say: `Still holding placeholder words: ${unwritten.map(({ i }) => name(i)).join(', ')}.` });
  return res;
}

// ─── The prompt ──────────────────────────────────────────────────────────────────────────────────────────────────
// fixed-width names: with n1 / n10 / n11 the grammar decides between them a token AFTER the model's choice, and the
// odds read as three-way ties (w2-puppy: twelve refused "add inside n1" while n10 and n11 sat empty)
const name = (i) => `n${String(i).padStart(2, '0')}`;
const tree = (nodes) => (nodes.length ? outline(nodes.map((n) => ({ ...n, role: '' }))).replace(/#(\d+) /g, (m, d) => `${name(Number(d))} `).replace(/ "" /g, ' ') : '(nothing yet: the section is empty)');
function context(state, turn, findings) {
  const intro = EDIT.intro || `GOAL: a hero section for "${GOAL.name}" (${GOAL.about}): ${GOAL.want}. It must look right on a desktop and on a phone.`;
  const last = state.history.slice(-4).map((h) => `- turn ${h.turn}: ${h.say}${h.legal === false ? ' (REFUSED)' : ''}`).join('\n');
  return `${intro}\n\nTHE SECTION NOW, one line per part (its name, its kind, its settings, its words):\n${tree(state.nodes)}\n\n` +
    `WHAT THE LAST LOOK FOUND:\n${findings.length ? findings.map((f) => `- ${f.say}`).join('\n') : '- nothing wrong.'}\n` +
    (last ? `\nYOUR LAST STEPS:\n${last}\n` : '') + (HINT[turn] ? `\nNOTE: ${HINT[turn]}\n` : '') + `\nThis is turn ${turn} of ${TURNS}.`;
}

// ─── One turn ────────────────────────────────────────────────────────────────────────────────────────────────────
async function decide(state, turn, findings, T) {
  const ctx = context(state, turn, findings);
  const n = state.nodes;
  const writable = n.map((x, i) => i).filter((i) => KINDS[kindOf(n[i])].words);
  const moves = [['add', 'add a part (a Group, Columns, Text, Image or Button) inside a part'], ...(n.length ? [['set', 'change one setting of a part']] : []),
    ...(writable.length ? [['write', 'write the words of a Text or a Button']] : []), ...(state.history.length ? [['undo', 'undo your last step']] : []), ['done', 'stop: the section is finished']];
  const menu = moves.map(([k, s], i) => `${i + 1}. ${s}`).join('\n');
  const move = await choose('move', `${ctx}\n\n${EDIT.menuWording || 'What do you do next? Pick one:'}\n${menu}`, moves.map((_, i) => String(i + 1)), T);
  const m = moves[Number(move) - 1]?.[0];
  if (!m) return { kind: 'invalid', say: `answered "${move}"` };
  if (m === 'done' || m === 'undo') return { kind: m, say: m === 'done' ? 'said the section is finished' : 'undid the last step' };
  if (m === 'add') {
    const kinds = Object.keys(KINDS);
    const kind = await choose('add.kind', `${ctx}\n\nYou are adding a part. Which kind?\n${kinds.map((k) => `- ${KINDS[k].say}`).join('\n')}`, kinds, T);
    if (!n.length) return { kind: 'add', what: kind, inside: -1, say: `added a ${kind} as the whole section` };
    const holders = n.map((x, i) => i).filter((i) => KINDS[kindOf(n[i])].holds);
    const inside = await choose('add.inside', `${ctx}\n\nYou are adding a ${kind}. Inside which part? (Only a Group or Columns can hold parts.)`, n.map((_, i) => name(i)), T);
    const at = Number(String(inside).slice(1));
    return { kind: 'add', what: kind, inside: at, legal: holders.includes(at) || undefined, say: `added a ${kind} inside ${inside}` };
  }
  if (m === 'set') {
    const node = await choose('set.node', `${ctx}\n\nYou are changing a setting. Of which part?`, n.map((_, i) => name(i)), T);
    const i = Number(String(node).slice(1)), k = kindOf(n[i]);
    const settings = Object.keys(SETTINGS[k] || {});
    if (!settings.length) return { kind: 'set', node: i, say: `chose ${node}, which has no settings`, legal: false };
    const setting = await choose('set.setting', `${ctx}\n\nYou are changing a setting of ${node} (${k}). Which one?\n${settings.map((s) => `- ${s}: ${SETTINGS[k][s].say} (now: ${currentOf(n[i], s)})`).join('\n')}`, settings, T);
    const opts = Object.keys(SETTINGS[k][setting].options);
    const value = await choose('set.value', `${ctx}\n\nYou are changing "${setting}" of ${node} (${k}): ${SETTINGS[k][setting].say}. It is now: ${currentOf(n[i], setting)}. Change it to:`, opts, T);
    return { kind: 'set', node: i, setting, value, say: `set ${setting} of ${node} to ${value}` };
  }
  if (m === 'write') {
    const node = await choose('write.node', `${ctx}\n\nYou are writing words. For which part? (A Text or a Button.)`, writable.map(name), T);
    const i = Number(String(node).slice(1)), k = kindOf(n[i]);
    const text = await words('write.text', `${ctx}\n\nWrite the words of ${node} (${k}) for "${GOAL.name}". ${k === 'Button' ? 'Two to four words, a verb first.' : 'One headline or one sentence: what a visitor reads, never a description of the page.'}`, k === 'Button' ? 30 : 140, T);
    return { kind: 'write', node: i, text, say: `wrote ${node}: "${text}"` };
  }
}

function apply(state, a) {
  const n = state.nodes;
  if (a.kind === 'invalid') return 'The answer was not on the menu.';
  if (a.kind === 'undo') { if (!state.undo.length) return 'There is nothing to undo.'; state.nodes = state.undo.pop(); return null; }
  if (a.kind === 'done') return null;
  const before = JSON.parse(JSON.stringify(n));
  if (a.kind === 'add') {
    if (!KINDS[a.what]) return `There is no kind "${a.what}".`;
    if (a.inside === -1 && n.length) return 'The section already exists; add parts inside it.';
    if (a.inside >= 0 && !KINDS[kindOf(n[a.inside])]?.holds) return `${name(a.inside)} is a ${kindOf(n[a.inside])}; only a Group or Columns can hold parts.`;
    if (a.inside >= 0 && kindOf(n[a.inside]) === 'Columns' && n.filter((x) => x.parent === a.inside).length >= 2) return `${name(a.inside)} (Columns) already holds its two columns.`;
    n.push({ type: KINDS[a.what].type, role: '', parent: a.inside, params: KINDS[a.what].make() });
  }
  if (a.kind === 'set') {
    if (a.legal === false) return `${name(a.node)} has no settings to change.`;
    const k = kindOf(n[a.node]);
    const o = SETTINGS[k]?.[a.setting]?.options?.[a.value];
    if (!o) return `"${a.setting}" cannot be "${a.value}" on a ${k}.`;
    patch(n[a.node].params, o);
  }
  if (a.kind === 'write') {
    if (!a.text || !a.text.trim()) return 'No words were written.';
    n[a.node].params[KINDS[kindOf(n[a.node])].words] = a.text.trim();
  }
  state.undo.push(before);
  return null;
}

// ─── The run ─────────────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const ledger = { run: RUN, brief: opt('--brief', 'puppy'), bench: BENCH, goal: GOAL, model: MODEL, judge: JUDGE, look: LOOK, turnsCap: TURNS, rules: RULES, edit: EDIT, startedAt: new Date().toISOString(),
  fork: REPLAY ? { from: REPLAY.run, upto: UPTO, override: OVERRIDE, hint: HINT, force: FORCE, prompt: Object.keys(PROMPT).length ? PROMPT : undefined } : undefined,
  // what the viewer's "edit and re-run" asked for, in its own words (server.mjs writes it before starting the run)
  surgery: fs.existsSync(path.join(OUT, 'surgery.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'surgery.json'), 'utf8')) : undefined, turns: [] };
const save = () => { fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 1)); writeTimeline(ledger); };
const state = { nodes: [], undo: [], history: [] };
const bench = await openBench(BENCH);
let findings = [], lastLook = null;
try {
  for (let turn = 1; turn <= TURNS; turn++) {
    const T = { turn, calls: [], forced: FORCE[turn] };
    let action;
    const prior = REPLAY && turn < UPTO ? REPLAY.turns.find((t) => t.turn === turn) : null;
    if (prior) { action = prior.action; T.replayed = true; T.calls = prior.calls.map((c) => ({ ...c, replayed: true })); }
    else if (OVERRIDE[turn]) { action = OVERRIDE[turn]; T.overridden = true; }
    else action = await decide(state, turn, findings, T);
    const refused = apply(state, action);
    T.action = action; T.legal = !refused; T.refused = refused || undefined;
    state.history.push({ turn, say: action.say + (refused ? ` — refused: ${refused}` : ''), legal: !refused });
    T.nodes = JSON.parse(JSON.stringify(state.nodes)); T.tree = tree(state.nodes);
    T.findingsIn = findings;
    if (action.kind === 'done') { delete T.forced; ledger.turns.push(T); save(); break; }
    if (state.nodes.length && !refused) {
      writeHero(BENCH, state.nodes);
      const shot = await bench.shoot(path.join(OUT, `t${turn}`));
      const look = ['desktop', 'phone'].map((w) => createHash('md5').update(fs.readFileSync(path.join(OUT, `t${turn}`, `${w}.png`))).digest('hex')).join();
      shot.unchanged = look === lastLook; lastLook = look;
      T.shot = { desktop: `t${turn}/desktop.png`, phone: `t${turn}/phone.png`, facts: `t${turn}/facts.json`, ms: shot.ms };
      findings = findingsFrom(shot, state.nodes);
      if (LOOK !== 'script') {
        T.look = [];
        for (const w of ['desktop', 'phone']) {
          const png = fs.readFileSync(path.join(OUT, `t${turn}`, `${w}.png`));
          for (const q of QUESTIONS) { const r = await judge(q.q, png); T.look.push({ width: w, check: q.id, question: q.q, ...r, truth: q.fact(shot[w].facts) }); }
        }
        if (LOOK === 'vision') findings = findings.filter((f) => !QUESTIONS.some((q) => q.id === f.check)).concat(QUESTIONS.flatMap((q) => ['desktop', 'phone'].filter((w) => (T.look.find((l) => l.check === q.id && l.width === w)?.pYes ?? 0) > 0.5).map((w) => ({ check: q.id, width: w, say: `${w === 'desktop' ? 'On a desktop' : 'On a phone'}: ${q.q.replace(/\?$/, '')} — the reviewer says yes.` }))));
      }
    } else if (refused) findings = [{ check: 'refused', say: `Your last step was refused: ${refused}` }, ...findings.filter((f) => f.check !== 'refused')];
    T.findingsOut = findings;
    delete T.forced;
    ledger.turns.push(T);
    save();
    console.log(`turn ${turn}: ${action.say}${refused ? ` — REFUSED: ${refused}` : ''} | ${findings.length} findings | ${T.calls.reduce((s, c) => s + (c.replayed ? 0 : c.ms || 0), 0)} ms model`);
  }
} finally {
  await bench.close();
  // a keep_alive:0 request for a model that is not loaded can load it first: never touch one this run did not ask
  for (const m of used) await fetch(`${OLLAMA}/api/generate`, { method: 'POST', body: JSON.stringify({ model: m, keep_alive: 0 }) }).catch(() => {});
}
ledger.endedAt = new Date().toISOString();
ledger.end = { turns: ledger.turns.length, done: ledger.turns.at(-1)?.action.kind === 'done', nodes: state.nodes.length, findings };
save();
console.log(JSON.stringify(ledger.end));

// ─── The timeline the viewer reads ───────────────────────────────────────────────────────────────────────────────
function writeTimeline(L) {
  const steps = [];
  for (const t of L.turns) {
    const rt = `Turn ${t.turn}${t.replayed ? ' (replayed)' : t.overridden ? ' (answer overridden)' : ''}`;
    for (const c of t.calls) steps.push({ actor: 'builder', round: t.turn, roundTitle: rt, key: c.key, model: c.model, prompt: c.prompt, system: SYSTEM, options: c.options?.some((o) => o.p != null) ? c.options : null,
      answer: { pick: c.answer }, ms: c.ms, tokensIn: c.tokensIn, tokensOut: c.tokensOut, forced: c.forced, edited: c.edited, hinted: c.hinted, from: c.replayed ? `arm-${L.fork?.from}` : undefined });
    steps.push({ actor: 'script', round: t.turn, roundTitle: rt, key: t.legal ? t.action.kind : 'refused',
      did: { say: t.legal ? `Did it: ${t.action.say}.` : `Refused "${t.action.say}": ${t.refused}`, nodes: t.tree },
      pictures: t.shot ? [{ src: t.shot.desktop, label: 'desktop, 1280' }, { src: t.shot.phone, label: 'phone, 390' }] : undefined, facts: t.shot?.facts,
      findings: (t.findingsOut || []).map((f) => ({ say: f.say, repair: f.check })), note: t.shot ? `Rendered in ${(t.shot.ms / 1000).toFixed(1)} s.` : undefined });
    if (t.look?.length) steps.push({ actor: 'reviewer', round: t.turn, roundTitle: rt, key: 'look', model: L.judge, note: 'One yes/no question per fact, with the picture. The measured answer is beside each.',
      judgements: t.look.map((l) => ({ key: `${l.width} · ${l.check} (measured: ${l.truth ? 'yes' : 'no'})`, prompt: l.question, pYes: l.pYes, ms: l.ms })) });
  }
  const tl = { title: `${GOAL.name}: the hero, turn by turn (${L.run})`, run: L.run, request: `${GOAL.want} — for ${GOAL.name}, ${GOAL.about}`, model: L.model, judge: L.look === 'script' ? null : L.judge, harness: `arm.mjs, look=${L.look}`,
    decisionsFrom: L.fork?.upto > 1 ? `arm-${L.fork.from}, turns 1–${L.fork.upto - 1}` : undefined, surgery: L.surgery,
    summary: { builderCalls: L.turns.reduce((s, t) => s + t.calls.filter((c) => !c.replayed).length, 0), reviewerCalls: L.turns.reduce((s, t) => s + (t.look?.length || 0), 0) }, steps };
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(tl, null, 1));
}
