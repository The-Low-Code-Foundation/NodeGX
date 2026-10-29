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
import { outline, kidsOf } from './outline.mjs';
import { QUESTIONS } from './probe-vision.mjs';
import { SYSTEM, chat, dist, used } from './door.mjs';

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
  plumber: { name: 'Dupont Plumbing', about: 'a plumbing business; trustworthy, blue', photo: 'work-welder.webp', want: 'a headline, one line under it, a button, and a photo on the right' },
  // s4 held-out briefs (8f): names from OWN-029's cards; the library has no runner photo, so running gets a park-like ground
  running: { name: 'Park Runners', about: 'a Saturday morning running club in the park; energetic, green', photo: 'ground-forest-fog.webp', want: 'a headline, one line under it, a button, and a photo on the right' },
  pottery: { name: 'Potter Portfolio', about: 'a potter who sells handmade bowls and teaches weekend classes', photo: 'work-potter.webp', want: 'a headline, one line under it, a button, and a photo on the right' }
};
const GOAL = { ...GOALS[opt('--brief', 'puppy')] };
// s3, the look the person asked for (probe-look.mjs: E2B names it in 16 of 16 requests that say it). `minimal` is w6's
// hero; `stylish` adds the composition hero's moves: a small line above the headline, a dark brand ground, white words,
// a bold headline, a white pill button (OWN-029 G-plumber r4's hero, read param by param)
const REQUEST = opt('--request', EDIT.request);
// `--style auto` asks the builder model which look the request names (lookq.mjs), before turn 1; the answer is ledgered
const LOOK_ASKED = (opt('--style', EDIT.style) === 'auto') ? await (await import('./lookq.mjs')).lookOf(MODEL, REQUEST || GOAL.about) : null;
const STYLE = LOOK_ASKED ? LOOK_ASKED.style : opt('--style', EDIT.style || 'minimal');
const ASK_BAND = opt('--ask-band') ? opt('--ask-band').split(',').map(Number) : EDIT.askBand;
if (ASK_BAND && LOOK_ASKED && LOOK_ASKED.pStylish > ASK_BAND[0] && LOOK_ASKED.pStylish < ASK_BAND[1]) {
  // the request does not say which look: nothing is built, and the question goes back to the person
  const out = path.join(HERE, 'runs', `arm-${RUN}`);
  fs.mkdirSync(out, { recursive: true });
  const end = { ask: 'clean or bold?', pStylish: LOOK_ASKED.pStylish, band: ASK_BAND };
  fs.writeFileSync(path.join(out, 'ledger.json'), JSON.stringify({ run: RUN, request: REQUEST, lookAsked: LOOK_ASKED, edit: EDIT, turns: [], end, at: new Date().toISOString() }, null, 1));
  await fetch('http://127.0.0.1:11434/api/generate', { method: 'POST', body: JSON.stringify({ model: MODEL, keep_alive: 0 }) }).catch(() => {});
  console.log(JSON.stringify(end));
  process.exit(0);
}
if (REQUEST) GOAL.about = REQUEST;
if (STYLE === 'stylish') GOAL.want = 'a small line above the headline, a headline, one line under it, a button, and a photo on the right, all on a dark brand-colour ground';
// factsKept (s5, 9b): what the request names that the hero must say — the brief's name, and any date (a day and a month,
// either order). A date is there when the hero's words hold the same day and month in any form
const MONTH = '(January|February|March|April|May|June|July|August|September|October|November|December)';
const datesIn = (s) => new Map([...String(s).matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\b|\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'gi'))].map((m) => [`${Number(m[1] ?? m[4])} ${(m[2] ?? m[3]).toLowerCase()}`, m[0]]));
const FACTS = [{ what: 'the name', text: GOAL.name, on: 'headline', in: (s) => s.toLowerCase().includes(GOAL.name.toLowerCase()) },
  ...[...datesIn(GOAL.about)].map(([k, text]) => ({ what: 'the date', text, on: 'line', in: (s) => datesIn(s).has(k) }))];

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
    'max width': { say: 'how wide the lines may run', options: Object.fromEntries([['none', undefined], ['480px', 480], ['560px', 560], ['640px', 640]].map(([k, n]) => [k, { maxWidth: n && { value: n, unit: 'px' } }])) },
    ...(STYLE === 'stylish' ? { style: { say: 'what kind of line it is', options: { plain: { textTransform: undefined, letterSpacing: undefined }, 'small capitals': { fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-widest)', fontWeight: 'var(--font-semibold)' } } } } : {})
  },
  Image: {
    height: { say: 'how tall the photo is', options: Object.fromEntries([240, 320, 400, 480].map((n) => [`${n}px`, { height: { value: n, unit: 'px' } }])) },
    corners: { say: 'how round its corners are', options: { square: { borderRadius: undefined }, rounded: { borderRadius: 'var(--radius-lg)' }, 'very rounded': { borderRadius: 'var(--radius-2xl)' } } }
  },
  Button: {
    colours: { say: 'its colours', options: { 'brand fill, white words': { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }, 'white fill, brand words': { backgroundColor: 'var(--background)', color: 'var(--primary)' } } },
    size: { say: 'how big it is', options: { small: { paddingLeft: sp(3), paddingRight: sp(3), paddingTop: sp(1), paddingBottom: sp(1), fontSize: 'var(--text-sm)' }, medium: { paddingLeft: sp(4), paddingRight: sp(4), paddingTop: sp(2), paddingBottom: sp(2), fontSize: 'var(--text-sm)' }, large: { paddingLeft: sp(6), paddingRight: sp(6), paddingTop: sp(3), paddingBottom: sp(3), fontSize: 'var(--text-base)' } } },
    corners: { say: 'how round its corners are', options: { slightly: { borderRadius: 'var(--radius-md)' }, pill: { borderRadius: 'var(--radius-full)' } } },
    'self align': { say: 'where it sits inside its parent', options: { 'parent decides': { alignSelf: undefined }, start: { alignSelf: 'flex-start' }, centre: { alignSelf: 'center' }, end: { alignSelf: 'flex-end' } } },
    ...(EDIT.rules?.rhythm ? { 'space above': { say: 'extra space between it and the part above it', options: { none: { marginTop: undefined }, small: { marginTop: { value: 8, unit: 'px' } } } } } : {})
  }
};
const kindOf = (n) => Object.keys(KINDS).find((k) => KINDS[k].type === n.type);
const patch = (params, p) => { for (const [k, v] of Object.entries(p)) { if (v === undefined) delete params[k]; else params[k] = v; } };
const currentOf = (n, setting) => {
  const opts = SETTINGS[kindOf(n)][setting].options;
  return Object.keys(opts).find((o) => Object.entries(opts[o]).every(([k, v]) => JSON.stringify(n.params[k]) === JSON.stringify(v))) || '(not set)';
};

// ─── The model door: single-enum questions with their distribution, and the one free-words question ─────────────
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
// s2 switches, all off by default so w1–w3 stay reproducible (probe-kind.mjs measured each on the recorded prompts):
//   missingFirst  the "which kind?" list puts the kinds the goal still lacks first and Group last
//   markMissing   …and marks each of them "— still missing"
//   namedGoal     "Not there yet: a photo (an Image), …": the goal finding names the kind of each missing part
//   lastSteps     false drops YOUR LAST STEPS (a run of "added a Group" lines invites the next one)
//   legalOnly     "inside which part?" lists only the parts that can take one more (a Group, or Columns holding fewer
//                 than two); with none, "add" leaves the move menu. w3-puppy-t7a: 23 refused "inside n01" in a row — at
//                 temperature 0 a refused step leaves the prompt as it was, so the same wrong answer comes back
//   fixMenu       each finding the script can trace to a setting becomes its own move, ahead of the generic ones
//                 ("give n00 padding left and right (words are at the edge of the screen)"); the model then picks the
//                 value. probe-move.mjs on t7a-t8a turns 14–30: P(a fix) 0.92, 17/17, against P(set) 0.06, 0/17
//   shapeChecks   findings the DOM measures cannot see, read from the tree: the headline no bigger than ordinary words,
//                 no space above and below the section, the line not straight under the headline, the photo not on
//                 the right of the words. t14a-t14a ended "clean" with all four (the first two become fixes)
//                 With fixMenu, "photo not on the right" offers the NEXT structural step as a fix (add the Columns, add
//                 the words column, move the photo in beside it, move the headline, the line, the button into the words
//                 column, in that order), and, once the photo is on the right, one fix that removes the empty parts. w4-puppy: every part and every
//                 spacing right by turn 12, then 15 turns of empty Columns, because no action could move a part
//   roles         each part is told what it is when added (the headline, the line under it, the button, the photo) and
//                 keeps it through moves; the outline and the "write" prompt say it, and the shape checks read roles,
//                 never document order (w4-t15a: a move swapped texts[0]/[1], the size fix went to the other Text, and
//                 the hero ended with two headlines). With roles: the headline must be display-md or bigger and break
//                 onto at most 2 lines on a desktop; the line must be smaller than the headline; the line and the button
//                 must be in the words column ("together"); a word part straight in the Columns is wrapped in a Group
//                 ("wrap"); placeholder words become a write fix. w6-puppy: done at turn 24, every check clean
//   goalLine      once no part is missing, the findings open with "Every part of the goal is there…"
//   ownerNamed    a spacing finding names the part that owns the space and its setting now (s1's outline probe: E2B
//                 finds parts, never which part owns a space): "n00 (the whole section) has padding left and right: none"
// s4 switches (default off, so every earlier run replays unchanged):
//   addWhileMissing  under endGate, the generic "add" leaves the move menu once every part of the goal is there
//                 (w10s-jazz: 7 free "add a Columns / Group" turns while fixes were on the menu, later removed as empty)
//   shortHeadline (roles) a headline at the display-md floor that still breaks onto 3+ lines on a desktop gets a write
//                 fix: "make the headline shorter (n words, it breaks onto k lines)"; the rewrite is asked for at most
//                 max(3, ⌊2n/k⌋) words (w10m-bakery: 9 words on 4 lines, and the size fix had no smaller value left)
//   blankRetry    the bench measures a page that reads blank again, up to 3 times (bench.mjs retryBlank): w11m-jazz
//                 ended by endGate on a desktop shot taken before the page drew (P112-OWN032-BLANKSHOT); a shot still
//                 blank after that, with words in the tree, is ledgered (`blank`) and cannot end the run
//   askBand       (edit.askBand [lo, hi], or --ask-band lo,hi; with --style auto) when the look question's mean P(stylish)
//                 falls inside the band, the arm stops before turn 1 and returns "ask: clean or bold?" — in the product,
//                 the client asks the person. 8d: E2B puts every request that NAMES a look at ≤ 0.001 or ≥ 0.91, and
//                 20 plain ones at 0.11–0.70, so the band decides "did they say?", not "which way do they lean"
//   rhythm        (stylish) the words column keeps its lines close: a medium gap (16 px) and 8 px more above the button
//                 (Richard, 8c: of four spacings of w8s-puppy, "medium looks best overall"; the arm's "huge" 48 px
//                 held the small line as far from the headline as the line from the button). Two `only` fixes; the
//                 button's "space above" setting exists only with this switch
// s5 switches (default off):
//   fixesOnly     (fixMenu, endGate) once the findings open with goalMet and while a fix is on the menu, the menu is the
//                 fixes plus undo: no generic set or write (8a's miss: with "add" gone its odds moved onto "set")
//   factsKept     (roles) the brief's name and any date the request gives must be in the hero's words: a missing one is
//                 a write fix on the part that should carry it (the name on the headline, a date on the line), once that
//                 part holds written words; 8b's shorten fix also says "It must say <name>" (w12m-jazz lost "14 November",
//                 w12m-plumber never said "Dupont", w15s-running never said "Park Runners")
// The touching / edge thresholds are not rules: bench.mjs FACTS fixes them (4 px, 8 px), and probe-vision's key with them.
const RULES = { ...{ emptyParts: true, unchanged: true, missingFirst: false, markMissing: false, namedGoal: false, lastSteps: true, ownerNamed: false, legalOnly: false, fixMenu: false, goalLine: false, shapeChecks: false, roles: false, endGate: false, addWhileMissing: false, shortHeadline: false, blankRetry: false, rhythm: false, fixesOnly: false, factsKept: false }, ...(EDIT.rules || {}) };
// roles (s2, after w4-t15a): each part is told what it is when it is added, and keeps it through moves and removes;
// the shape checks read the roles, never the document order (t15a: a move made the headline texts[1], and the size
// fix went to the other Text, so the hero ended with two headlines and no line under them)
const ROLE_SAY = { eyebrow: 'the small line above the headline', headline: 'the headline', line: 'the line under the headline', button: 'the button', photo: 'the photo' };
const roleFor = (n, kind) => { const has = (r) => n.some((x) => x.role === r); if (kind === 'Text') return !has('headline') ? 'headline' : !has('line') ? 'line' : STYLE === 'stylish' && !has('eyebrow') ? 'eyebrow' : ''; if (kind === 'Button') return has('button') ? '' : 'button'; if (kind === 'Image') return has('photo') ? '' : 'photo'; return ''; };
const byRole = (n, r) => { const i = n.findIndex((x) => x.role === r); return i < 0 ? undefined : i; };
const missingKinds = (nodes) => { const k = nodes.map(kindOf); return [...(k.filter((x) => x === 'Text').length < (STYLE === 'stylish' ? 3 : 2) ? ['Text'] : []), ...(k.includes('Button') ? [] : ['Button']), ...(k.includes('Image') ? [] : ['Image'])]; };
export function findingsFrom(shot, nodes) {
  const out = [];
  const q = (s) => `"${s.length > 30 ? `${s.slice(0, 28)}…` : s}"`;
  // the part a measured block of words is: bench.mjs names a block by its first 40 characters, spaces folded
  const partOf = (text) => nodes.findIndex((n) => String(n.params.text ?? n.params.label ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) === text);
  const up = (i) => { const a = []; for (let p = nodes[i]?.parent; p !== undefined && p >= 0; p = nodes[p].parent) a.push(p); return a; };
  const root = nodes.findIndex((n) => n.parent === -1);
  // each traced finding carries `fix` { node, setting, say } for the fix menu; its owner sentence is said only with ownerNamed
  const edgeFix = () => (kindOf(nodes[root]) === 'Group' ? { node: root, setting: 'padding left and right', say: `give ${name(root)} padding left and right (words are at the edge of the screen; now: ${currentOf(nodes[root], 'padding left and right')})` } : undefined);
  const edgeOwner = () => (RULES.ownerNamed && kindOf(nodes[root]) === 'Group' ? ` ${name(root)} (the whole section) has padding left and right: ${currentOf(nodes[root], 'padding left and right')}.` : '');
  const common = (a, b) => { const ia = partOf(a), ib = partOf(b); if (ia < 0 || ib < 0) return undefined; return up(ia).find((x) => x === ib || up(ib).includes(x)); };
  const gapFix = (a, b) => { const c = common(a, b); return c !== undefined && kindOf(nodes[c]) === 'Group' ? { node: c, setting: 'gap', say: `give ${name(c)} more space between its parts (words are touching; now: ${currentOf(nodes[c], 'gap')})` } : undefined; };
  const gapOwner = (a, b) => {
    if (!RULES.ownerNamed) return '';
    const c = common(a, b); if (c === undefined) return '';
    return kindOf(nodes[c]) === 'Group' ? ` The space between them is the gap of ${name(c)}, which holds both: ${currentOf(nodes[c], 'gap')}.` : ` Both sit in ${name(c)} (${kindOf(nodes[c])}).`;
  };
  const wideFix = (text) => { const i = partOf(text); return i >= 0 && kindOf(nodes[i]) === 'Button' ? { node: i, setting: 'self align', say: `set where ${name(i)} sits inside its parent (the button is much wider than its words; now: ${currentOf(nodes[i], 'self align')})` } : undefined; };
  for (const w of ['desktop', 'phone']) {
    const f = shot[w].facts, on = w === 'desktop' ? 'On a desktop' : 'On a phone';
    for (const t of f.touching) out.push({ check: 'touching', width: w, say: `${on}, ${q(t.a)} and ${q(t.b)} are touching (${t.gap}px apart).${gapOwner(t.a, t.b)}`, fix: gapFix(t.a, t.b) });
    for (const t of f.atEdge) out.push({ check: 'atEdge', width: w, say: `${on}, ${q(t.text)} is ${Math.min(t.left, t.right)}px from the ${t.left <= t.right ? 'left' : 'right'} edge of the screen.${edgeOwner()}`, fix: edgeFix() });
    if (f.photoCut.length) out.push({ check: 'photoCut', width: w, say: `${on}, the photo runs past the edge of the screen.` });
    for (const b of f.buttonWide) out.push({ check: 'buttonWide', width: w, say: `${on}, the button ${q(b.text)} is ${b.w}px wide for ${b.words}px of words.`, fix: wideFix(b.text) });
    if (f.unaligned.length) out.push({ check: 'unaligned', width: w, say: `${on}, the words and the button are not lined up: neither their left edges nor their centres match.` });
    if (f.overflowX > 1) out.push({ check: 'overflowX', width: w, say: `${on}, the page is ${f.overflowX}px too wide and scrolls sideways.` });
    for (const l of f.lowContrast || []) out.push({ check: 'contrast', width: w, say: `${on}, ${q(l.text)} is hard to read against what is behind it (contrast ${l.ratio}).` });
  }
  // one line per fault, not one per width, when both widths say the same thing
  const seen = new Map();
  for (const f of out) { const k = f.say.replace(/^On a (desktop|phone), /, ''); if (seen.has(k)) seen.get(k).say = seen.get(k).say.replace(/^On a (desktop|phone), /, 'On both, '); else seen.set(k, f); }
  const kinds = nodes.map(kindOf);
  const missing = [['a headline', kinds.filter((k) => k === 'Text').length >= 1], ['a line under the headline', kinds.filter((k) => k === 'Text').length >= 2], ...(STYLE === 'stylish' ? [['a small line above the headline', kinds.filter((k) => k === 'Text').length >= 3]] : []), ['a button', kinds.includes('Button')], ['a photo', kinds.includes('Image')]].filter(([, has]) => !has).map(([s]) => s);
  const res = [...seen.values()];
  const KIND_OF = { 'a small line above the headline': 'a Text', 'a headline': 'a Text', 'a line under the headline': 'a Text', 'a button': 'a Button', 'a photo': 'an Image' };
  if (RULES.shapeChecks && root >= 0) {
    // document order: a part's children in the order they were added
    const order = []; const walk = (i) => { order.push(i); kidsOf(nodes, i).forEach(walk); }; walk(root);
    const leaves = order.filter((i) => ['Text', 'Button', 'Image'].includes(kindOf(nodes[i])));
    const texts = leaves.filter((i) => kindOf(nodes[i]) === 'Text'), img = leaves.find((i) => kindOf(nodes[i]) === 'Image');
    const h = RULES.roles ? byRole(nodes, 'headline') : texts[0], line = RULES.roles ? byRole(nodes, 'line') : texts[1];
    const btn = RULES.roles ? byRole(nodes, 'button') : leaves.find((i) => kindOf(nodes[i]) === 'Button');
    // with roles a hero headline is a display size (t15a ended at text-xl, ~20px: it read as ordinary words)
    const big = RULES.roles ? ['display-md', 'display-lg'] : ['text-xl', 'display-sm', 'display-md', 'display-lg'];
    const SIZES = Object.keys(SETTINGS.Text.size.options);
    if (RULES.roles && h !== undefined && line !== undefined) {
      const sz = (i) => SIZES.indexOf(currentOf(nodes[i], 'size'));
      // only above text-base: at text-base the headline's own size finding is the one to fix (and nothing is smaller)
      const hb = shot.desktop.facts.blocks?.find((b) => b.kind === 'words' && b.text === String(nodes[h].params.text ?? '').trim().replace(/\s+/g, ' ').slice(0, 40));
      const hw = String(nodes[h].params.text ?? '').trim().split(/\s+/).length, most = Math.max(3, Math.floor((2 * hw) / (hb?.lines || 1)));
      if (RULES.shortHeadline && hb && hb.lines >= 3 && sz(h) === SIZES.indexOf(big[0])) res.push({ check: 'headlineLong', say: `On a desktop, the headline ${name(h)} breaks onto ${hb.lines} lines at the smallest headline size: it has too many words (${hw}).`, fix: { node: h, setting: 'words', write: true, ask: `It is now ${hw} words and breaks onto ${hb.lines} lines on a desktop: write it again in at most ${most} words.${RULES.factsKept ? ` It must say "${GOAL.name}".` : ''}`, say: `make the headline ${name(h)} shorter (${hw} words, it breaks onto ${hb.lines} lines on a desktop)` } });
      if (hb && hb.lines >= 3 && sz(h) > SIZES.indexOf(big[0])) res.push({ check: 'headlineWraps', say: `On a desktop, the headline ${name(h)} breaks onto ${hb.lines} lines: it is too big for its column.`, fix: { node: h, setting: 'size', smaller: true, floor: big[0], say: `make ${name(h)} a little smaller (it breaks onto ${hb.lines} lines on a desktop; now: ${currentOf(nodes[h], 'size')})` } });
      if (sz(line) >= sz(h) && sz(line) > SIZES.indexOf('text-base')) res.push({ check: 'lineSize', say: `The line under the headline (${name(line)}) is as big as the headline: they read as two headlines.`, fix: { node: line, setting: 'size', smaller: true, say: `make ${name(line)} smaller than the headline (it reads as a second headline; now: ${currentOf(nodes[line], 'size')})` } });
    }
    if (h !== undefined && !big.some((t) => nodes[h].params.fontSize === `var(--${t})`)) res.push({ check: 'hierarchy', say: `The headline ${name(h)} is the size of ordinary words (${currentOf(nodes[h], 'size')}): it does not stand out.`, fix: { node: h, setting: 'size', bigger: true, say: `make ${name(h)} bigger (the headline does not stand out; now: ${currentOf(nodes[h], 'size')})` } });
    if (kindOf(nodes[root]) === 'Group' && !nodes[root].params.paddingTop) res.push({ check: 'airY', say: `The section ${name(root)} has no space above and below its parts: the words touch its top.`, fix: { node: root, setting: 'padding top and bottom', say: `give ${name(root)} padding top and bottom (no space above and below; now: ${currentOf(nodes[root], 'padding top and bottom')})` } });
    if (h !== undefined && line !== undefined && leaves[leaves.indexOf(h) + 1] !== line) {
      // with roles the order is a fix too: the line goes into the headline's parent, straight after it
      const sib = kidsOf(nodes, nodes[h].parent), next = sib[sib.indexOf(h) + 1];
      res.push({ check: 'order', say: `The line under the headline (${name(line)}) is not straight under it: ${name(leaves[leaves.indexOf(h) + 1])} comes between them.`, fix: RULES.roles ? { act: { kind: 'move', node: line, into: nodes[h].parent, before: next === line ? undefined : next }, say: `move ${name(line)} straight under the headline ${name(h)}` } : undefined });
    }
    if (img !== undefined && h !== undefined) {
      const up2 = (i) => { const a = []; for (let q = nodes[i].parent; q >= 0; q = nodes[q].parent) a.push(q); return a; };
      const cols = up2(img).find((c) => kindOf(nodes[c]) === 'Columns' && up2(h).includes(c));
      const kids = cols === undefined ? [] : kidsOf(nodes, cols);
      const side = (i) => kids.findIndex((k) => k === i || up2(i).includes(k));
      const eb = RULES.roles ? byRole(nodes, 'eyebrow') : undefined;
      const words = [...(eb !== undefined ? [eb] : []), h, line, btn];
      if (cols === undefined || side(h) !== 0 || side(img) !== 1) res.push({ check: 'photoRight', say: `The photo ${name(img)} is not on the right of the words: for that, one Columns must hold the words in its first column and the photo in its second.`, fix: structureStep(nodes, root, words, img) });
      else if (RULES.roles && words.some((x) => x !== undefined && side(x) !== 0)) { const out = words.filter((x) => x !== undefined && side(x) !== 0); res.push({ check: 'together', say: `${out.map((x) => `${ROLE_SAY[nodes[x].role]} ${name(x)}`).join(' and ')} ${out.length > 1 ? 'are' : 'is'} not in the words column, beside the photo.`, fix: structureStep(nodes, root, words, img) }); }
    }
    if (RULES.roles && STYLE === 'stylish') {
      // each fix offers only the values the look asks for (`only`), so the model takes the fix or leaves it
      const eb = byRole(nodes, 'eyebrow'), dark = ['dark brand gradient', 'brand colour'];
      if (kindOf(nodes[root]) === 'Group' && !dark.includes(currentOf(nodes[root], 'ground'))) res.push({ check: 'ground', say: `The section ${name(root)} is on a plain ground: the look asked for is bold, on a dark brand-colour ground.`, fix: { node: root, setting: 'ground', only: dark, say: `give ${name(root)} a dark brand-colour ground (the look asked for is bold; now: ${currentOf(nodes[root], 'ground')})` } });
      else {
        for (const i of [eb, h, line]) if (i !== undefined && currentOf(nodes[i], 'colour') !== 'white text') res.push({ check: 'onDark', say: `${ROLE_SAY[nodes[i].role]} ${name(i)} is not white on the dark ground.`, fix: { node: i, setting: 'colour', only: ['white text'], say: `make ${name(i)} white (it sits on the dark ground; now: ${currentOf(nodes[i], 'colour')})` } });
        if (btn !== undefined && currentOf(nodes[btn], 'colours') !== 'white fill, brand words') res.push({ check: 'buttonOnDark', say: `The button ${name(btn)} disappears into the dark ground.`, fix: { node: btn, setting: 'colours', only: ['white fill, brand words'], say: `give ${name(btn)} a white fill (it sits on the dark ground; now: ${currentOf(nodes[btn], 'colours')})` } });
      }
      if (h !== undefined && currentOf(nodes[h], 'weight') !== 'bold') res.push({ check: 'headlineWeight', say: `The headline ${name(h)} is not bold: the look asked for has a big, heavy headline.`, fix: { node: h, setting: 'weight', only: ['bold'], say: `make ${name(h)} bold (the look asked for has a heavy headline; now: ${currentOf(nodes[h], 'weight')})` } });
      if (btn !== undefined && currentOf(nodes[btn], 'corners') !== 'pill') res.push({ check: 'buttonShape', say: `The button ${name(btn)} has square-ish corners: the look asked for has a pill button.`, fix: { node: btn, setting: 'corners', only: ['pill'], say: `make ${name(btn)} a pill (now: ${currentOf(nodes[btn], 'corners')})` } });
      if (eb !== undefined && currentOf(nodes[eb], 'style') !== 'small capitals') res.push({ check: 'eyebrowStyle', say: `${ROLE_SAY.eyebrow} ${name(eb)} looks like ordinary words: it should be small capitals.`, fix: { node: eb, setting: 'style', only: ['small capitals'], say: `make ${name(eb)} small capitals (it is the small line above the headline; now: ${currentOf(nodes[eb], 'style')})` } });
      const col = h !== undefined ? nodes[h].parent : undefined;
      if (RULES.rhythm && col !== undefined && col !== root && kindOf(nodes[col]) === 'Group') {
        if (currentOf(nodes[col], 'gap') !== 'medium') res.push({ check: 'rhythm', say: `The words column ${name(col)} spaces its lines ${currentOf(nodes[col], 'gap')}: the look asked for keeps them close together.`, fix: { node: col, setting: 'gap', only: ['medium'], say: `give ${name(col)} a medium gap (the look keeps the lines of the words close together; now: ${currentOf(nodes[col], 'gap')})` } });
        if (btn !== undefined && nodes[btn].parent === col && currentOf(nodes[btn], 'space above') !== 'small') res.push({ check: 'rhythmButton', say: `The button ${name(btn)} sits as close to the line above it as the lines sit to each other.`, fix: { node: btn, setting: 'space above', only: ['small'], say: `give ${name(btn)} a little space above (it sits as close as the lines do; now: ${currentOf(nodes[btn], 'space above')})` } });
      }
      if (eb !== undefined && h !== undefined && nodes[eb].parent === nodes[h].parent && leaves[leaves.indexOf(h) - 1] !== eb) res.push({ check: 'eyebrowOrder', say: `${ROLE_SAY.eyebrow} ${name(eb)} is not straight above the headline.`, fix: { act: { kind: 'move', node: eb, into: nodes[h].parent, before: h }, say: `move ${name(eb)} straight above the headline ${name(h)}` } });
    }
    if (RULES.factsKept && RULES.roles) {
      // a fact of the request that none of the hero's words say: a write fix on the part that should carry it, once that
      // part holds written words (w12m-jazz's shortened headline dropped "14 November"; w12m-plumber never said "Dupont")
      const said = nodes.map((x) => String(x.params.text ?? x.params.label ?? '')).join(' ');
      const written = (i) => i !== undefined && !['Text', 'Button'].includes(String(nodes[i].params.text ?? nodes[i].params.label));
      for (const f of FACTS) {
        const at = f.on === 'headline' ? h : line;
        // the shorten fix on the same part already says "It must say <name>"
        if (!written(at) || f.in(said) || res.some((r) => r.fix?.node === at && r.fix?.write)) continue;
        res.push({ check: 'factLost', say: `The request gives ${f.what} "${f.text}", and none of the hero's words say it.`, fix: { node: at, setting: 'words', write: true, ask: `It must say "${f.text}".`, say: `write ${ROLE_SAY[nodes[at].role]} ${name(at)} again so it says "${f.text}" (the request gives it, and the hero never says it)` } });
      }
    }
  }
  if (!missing.length && RULES.goalLine) res.unshift({ check: 'goalMet', say: 'Every part of the goal is there. What is left is how it looks: the findings below.' });
  // with roles, the first missing part is its own fix (w7s-puppy: with a Button missing for 30 turns, "which kind?" gave
  // Group 0.50–0.59 and Button 0.03–0.05; the same cure as 5b). Words go in the words column once there is one.
  const addFix = () => {
    const kind = KIND_OF[missing[0]].split(' ')[1];
    const C = kidsOf(nodes, root).find((i) => kindOf(nodes[i]) === 'Columns'), c1 = C === undefined ? undefined : kidsOf(nodes, C)[0];
    const inside = kind !== 'Image' && c1 !== undefined && kindOf(nodes[c1]) === 'Group' ? c1 : root;
    return { act: { kind: 'add', what: kind, inside }, say: `add ${missing[0]} (${KIND_OF[missing[0]]}) inside ${name(inside)}: the goal still lacks it` };
  };
  if (missing.length) res.unshift({ check: 'goal', say: `Not there yet: ${missing.map((s) => (RULES.namedGoal ? `${s} (${KIND_OF[s]})` : s)).join(', ')}.`, fix: RULES.roles && root >= 0 ? addFix() : undefined });
  if (RULES.emptyParts) {
    const empty = nodes.map((n, i) => i).filter((i) => KINDS[kindOf(nodes[i])].holds && !nodes.some((m) => m.parent === i));
    if (empty.length) res.push({ check: 'empty', fix: empty.some((i) => i !== root) && !res.some((f) => f.check === 'photoRight' || f.check === 'together') ? { act: { kind: 'remove', nodes: empty.filter((i) => i !== root) }, say: `remove the empty parts ${empty.filter((i) => i !== root).map(name).join(', ')} (they show nothing)` } : undefined, say: `${empty.map(name).join(', ')} ${empty.length > 1 ? 'are' : 'is'} empty: ${empty.length > 1 ? 'they show' : 'it shows'} nothing until something is put inside.` });
  }
  if (RULES.unchanged && shot.unchanged) res.push({ check: 'unchanged', say: 'Your last step changed nothing a person can see, on a desktop or on a phone.' });
  const unwritten = nodes.map((n, i) => ({ n, i })).filter(({ n }) => (n.params.text === 'Text' || n.params.label === 'Button'));
  if (unwritten.length) res.push({ check: 'words', say: `Still holding placeholder words: ${unwritten.map(({ i }) => name(i)).join(', ')}.`, fix: RULES.roles ? { node: unwritten[0].i, setting: 'words', write: true, say: `write the words of ${name(unwritten[0].i)} (it still says "${unwritten[0].n.params.text ?? unwritten[0].n.params.label}")` } : undefined });
  return res;
}

// the next step toward "words in the first column, the photo in the second" (shapeChecks + fixMenu), or nothing when
// the tree is in a shape these steps do not cover; each step is one action the model can take or leave
function structureStep(nodes, root, words, img) {
  const under = (x, a) => { for (let q = x; q !== undefined && q >= 0; q = nodes[q].parent) if (q === a) return true; return false; };
  // a Columns whose first column is a word part itself (w5: the headline straight in a Columns, beside the photo) is the
  // one to finish: wrap that part in a Group, so the line and the button can join it (roles only; before, no step fit)
  const C = kidsOf(nodes, root).find((i) => kindOf(nodes[i]) === 'Columns' && kidsOf(nodes, i).every((k) => kindOf(nodes[k]) === 'Group' || k === img || (RULES.roles && words.includes(k))));
  if (C === undefined) return { act: { kind: 'add', what: 'Columns', inside: root }, say: `add a Columns inside ${name(root)}, to put the words and the photo side by side` };
  const [c1, c2] = kidsOf(nodes, C);
  if (c1 === undefined) return { act: { kind: 'add', what: 'Group', inside: C }, say: `add a Group inside ${name(C)} as its first column, for the words` };
  if (RULES.roles && words.includes(c1)) return { act: { kind: 'wrap', node: c1 }, say: `put ${name(c1)} in a Group of its own, so the words column of ${name(C)} can hold the line and the button too` };
  if (c1 === img || kindOf(nodes[c1]) !== 'Group' || under(img, c1)) return undefined;
  if (!under(img, C)) {
    if (c2 === undefined) return { act: { kind: 'move', node: img, into: C }, say: `move the photo ${name(img)} into ${name(C)} as its second column, beside the words` };
    if (kindOf(nodes[c2]) === 'Group' && !kidsOf(nodes, c2).length) return { act: { kind: 'move', node: img, into: c2 }, say: `move the photo ${name(img)} into ${name(c2)}, the second column of ${name(C)}` };
    return undefined;
  }
  for (const x of words) if (x !== undefined && !under(x, c1)) {
    const h = words.find((y) => nodes[y]?.role === 'headline');
    const before = nodes[x].role === 'eyebrow' && h !== undefined && nodes[h].parent === c1 ? h : undefined;
    return { act: { kind: 'move', node: x, into: c1, before }, say: `move ${ROLE_SAY[nodes[x].role] || 'the part'} ${name(x)} into ${name(c1)}, the words column${before !== undefined ? ', above the headline' : ''}` };
  }
  return undefined;
}

// ─── The prompt ──────────────────────────────────────────────────────────────────────────────────────────────────
// fixed-width names: with n1 / n10 / n11 the grammar decides between them a token AFTER the model's choice, and the
// odds read as three-way ties (w2-puppy: twelve refused "add inside n1" while n10 and n11 sat empty)
const name = (i) => `n${String(i).padStart(2, '0')}`;
const tree = (nodes) => (nodes.length ? outline(nodes.map((n) => ({ ...n, role: RULES.roles ? ROLE_SAY[n.role] || '' : '' }))).replace(/#(\d+) /g, (m, d) => `${name(Number(d))} `).replace(/ "" /g, ' ') : '(nothing yet: the section is empty)');
function context(state, turn, findings) {
  const intro = EDIT.intro || `GOAL: a hero section for "${GOAL.name}" (${GOAL.about}): ${GOAL.want}. It must look right on a desktop and on a phone.`;
  const last = state.history.slice(-4).map((h) => `- turn ${h.turn}: ${h.say}${h.legal === false ? ' (REFUSED)' : ''}`).join('\n');
  return `${intro}\n\nTHE SECTION NOW, one line per part (its name, its kind, its settings, its words):\n${tree(state.nodes)}\n\n` +
    `WHAT THE LAST LOOK FOUND:\n${findings.length ? findings.map((f) => `- ${f.say}`).join('\n') : '- nothing wrong.'}\n` +
    (last && RULES.lastSteps ? `\nYOUR LAST STEPS:\n${last}\n` : '') + (HINT[turn] ? `\nNOTE: ${HINT[turn]}\n` : '') + `\nThis is turn ${turn} of ${TURNS}.`;
}

// ─── One turn ────────────────────────────────────────────────────────────────────────────────────────────────────
async function decide(state, turn, findings, T) {
  const ctx = context(state, turn, findings);
  const n = state.nodes;
  const writable = n.map((x, i) => i).filter((i) => KINDS[kindOf(n[i])].words);
  const canTake = (i) => KINDS[kindOf(n[i])].holds && !(kindOf(n[i]) === 'Columns' && n.filter((x) => x.parent === i).length >= 2);
  const takers = n.map((x, i) => i).filter(canTake);
  const goalHere = RULES.endGate && findings.some((f) => f.check === 'goalMet');
  const goalMet = RULES.addWhileMissing && goalHere;
  // fixesOnly: once every part is there and a fix is on the menu, the generic set and write go too (8a: without "add",
  // its odds moved onto "set", and w11m-bakery nudged the headline's size by hand twice before taking the move fix)
  const fixesOnly = RULES.fixesOnly && RULES.fixMenu && goalHere && findings.some((f) => f.fix);
  const moves = [...((!RULES.legalOnly || !n.length || takers.length) && !goalMet ? [['add', 'add a part (a Group, Columns, Text, Image or Button) inside a part']] : []), ...(n.length && !fixesOnly ? [['set', 'change one setting of a part']] : []),
    ...(writable.length && !fixesOnly ? [['write', 'write the words of a Text or a Button']] : []), ...(state.history.length ? [['undo', 'undo your last step']] : []), ...(RULES.endGate && findings.some((f) => f.fix) ? [] : [['done', 'stop: the section is finished']])];
  if (RULES.fixMenu) moves.unshift(...[...new Map(findings.filter((f) => f.fix).map((f) => [`${f.fix.node}|${f.fix.setting}`, f.fix])).values()].map((f) => ['fix', f.say, f]));
  const menu = moves.map(([k, s], i) => `${i + 1}. ${s}`).join('\n');
  const move = await choose('move', `${ctx}\n\n${EDIT.menuWording || 'What do you do next? Pick one:'}\n${menu}`, moves.map((_, i) => String(i + 1)), T);
  const m = moves[Number(move) - 1]?.[0];
  if (m === 'fix' && moves[Number(move) - 1][2].act) { const f = moves[Number(move) - 1][2]; return { ...f.act, via: 'fix', say: `${f.say.replace(/ \(.*\)$/, '')} (a fix from the menu)` }; }
  if (m === 'fix' && moves[Number(move) - 1][2].write) { const i = moves[Number(move) - 1][2].node; const text = await words('write.text', writeAsk(ctx, n, i) + (moves[Number(move) - 1][2].ask ? ` ${moves[Number(move) - 1][2].ask}` : ''), kindOf(n[i]) === 'Button' ? 30 : 140, T); return { kind: 'write', node: i, text, via: 'fix', say: `wrote ${name(i)}: "${text}" (a fix from the menu)` }; }
  if (m === 'fix') {
    // a fix offers only values that change something: never the current one, and never "none" for a fault of too
    // little space (t14a: "set gap of n00 to none" 16 times, P(none) 1.00, "none" listed first and equal to "not set")
    const f = moves[Number(move) - 1][2], k = kindOf(n[f.node]), now = currentOf(n[f.node], f.setting);
    const all = Object.keys(SETTINGS[k][f.setting].options);
    const opts = f.only ? f.only.filter((o) => o !== now) : f.bigger ? all.slice(all.indexOf(now) + 1) : f.smaller ? all.slice(all.indexOf(f.floor || 'text-base'), all.indexOf(now)).reverse() : all.filter((o) => o !== now && !(o === 'none' && f.setting !== 'self align'));
    const why = f.say.match(/\(([^;]*);/)?.[1];
    const value = await choose('set.value', `${ctx}\n\nYou are fixing this: ${why}. You are changing "${f.setting}" of ${name(f.node)} (${k}): ${SETTINGS[k][f.setting].say}. It is now: ${now}. Change it to:`, opts, T);
    return { kind: 'set', node: f.node, setting: f.setting, value, via: 'fix', say: `set ${f.setting} of ${name(f.node)} to ${value} (a fix from the menu)` };
  }
  if (!m) return { kind: 'invalid', say: `answered "${move}"` };
  if (m === 'done' || m === 'undo') return { kind: m, say: m === 'done' ? 'said the section is finished' : 'undid the last step' };
  if (m === 'add') {
    const lack = missingKinds(n);
    const kinds = RULES.missingFirst ? [...lack, ...Object.keys(KINDS).filter((k) => !lack.includes(k) && k !== 'Group'), 'Group'] : Object.keys(KINDS);
    const kind = await choose('add.kind', `${ctx}\n\nYou are adding a part. Which kind?\n${kinds.map((k) => `- ${KINDS[k].say}${RULES.markMissing && lack.includes(k) ? ' — still missing' : ''}`).join('\n')}`, kinds, T);
    if (!n.length) return { kind: 'add', what: kind, inside: -1, say: `added a ${kind} as the whole section` };
    const holders = n.map((x, i) => i).filter((i) => KINDS[kindOf(n[i])].holds);
    const inside = RULES.legalOnly
      ? await choose('add.inside', `${ctx}\n\nYou are adding a ${kind}. Inside which part? These are the parts that can take it:\n${takers.map((i) => `- ${name(i)} (${kindOf(n[i])}, holding ${n.filter((x) => x.parent === i).length})`).join('\n')}`, takers.map(name), T)
      : await choose('add.inside', `${ctx}\n\nYou are adding a ${kind}. Inside which part? (Only a Group or Columns can hold parts.)`, n.map((_, i) => name(i)), T);
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
    const text = await words('write.text', writeAsk(ctx, n, i), k === 'Button' ? 30 : 140, T);
    return { kind: 'write', node: i, text, say: `wrote ${node}: "${text}"` };
  }
}

const writeAsk = (ctx, n, i) => { const k = kindOf(n[i]); return `${ctx}\n\nWrite the words of ${name(i)} (${k}) for "${GOAL.name}". ${k === 'Button' ? 'Two to four words, a verb first.' : RULES.roles && n[i].role === 'eyebrow' ? 'This is the small line above the headline: two to four words that name what this place is. It must not repeat the headline.' : RULES.roles && n[i].role === 'headline' ? 'This is the headline: three to seven words a visitor reads first, never a description of the page.' : RULES.roles && n[i].role === 'line' ? 'This is the line under the headline: one sentence of ten to twenty words that says what a visitor gets here. It must not repeat the headline.' : 'One headline or one sentence: what a visitor reads, never a description of the page.'}`; };

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
    n.push({ type: KINDS[a.what].type, role: RULES.roles ? roleFor(n, a.what) : '', parent: a.inside, params: KINDS[a.what].make() });
  }
  if (a.kind === 'move') {
    const under = (x, y) => { for (let q = x; q !== undefined && q >= 0; q = n[q].parent) if (q === y) return true; return false; };
    if (n[a.node]?.parent === -1) return 'The section itself cannot move.';
    if (!KINDS[kindOf(n[a.into])]?.holds) return `${name(a.into)} cannot hold parts.`;
    if (under(a.into, a.node)) return `${name(a.into)} is inside ${name(a.node)}.`;
    if (kindOf(n[a.into]) === 'Columns' && n.filter((x, j) => x.parent === a.into && j !== a.node).length >= 2) return `${name(a.into)} (Columns) already holds its two columns.`;
    n[a.node].parent = a.into; n[a.node].seq = a.before !== undefined ? (n[a.before].seq ?? a.before) - 0.5 : Math.max(...n.map((x, j) => x.seq ?? j)) + 1;
  }
  if (a.kind === 'wrap') {
    // a new Group takes the part's place among its siblings, and the part goes inside it
    if (n[a.node]?.parent === -1) return 'The section itself cannot be wrapped.';
    n.push({ type: KINDS.Group.type, role: '', parent: n[a.node].parent, seq: n[a.node].seq ?? a.node, params: KINDS.Group.make() });
    n[a.node].parent = n.length - 1; n[a.node].seq = Math.max(...n.map((x, j) => x.seq ?? j)) + 1;
  }
  if (a.kind === 'remove') {
    if (a.nodes.some((i) => n[i].parent === -1 || n.some((x) => x.parent === i))) return 'Only an empty part can be removed.';
    for (const i of [...a.nodes].sort((x, y) => y - x)) { n.splice(i, 1); for (const x of n) if (x.parent > i) x.parent--; }
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
const ledger = { style: STYLE, lookAsked: LOOK_ASKED || undefined, request: REQUEST, run: RUN, brief: opt('--brief', 'puppy'), bench: BENCH, goal: GOAL, model: MODEL, judge: JUDGE, look: LOOK, turnsCap: TURNS, rules: RULES, edit: EDIT, startedAt: new Date().toISOString(),
  fork: REPLAY ? { from: REPLAY.run, upto: UPTO, override: OVERRIDE, hint: HINT, force: FORCE, prompt: Object.keys(PROMPT).length ? PROMPT : undefined } : undefined,
  // what the viewer's "edit and re-run" asked for, in its own words (server.mjs writes it before starting the run)
  surgery: fs.existsSync(path.join(OUT, 'surgery.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'surgery.json'), 'utf8')) : undefined, turns: [] };
const save = () => { fs.writeFileSync(path.join(OUT, 'ledger.json'), JSON.stringify(ledger, null, 1)); writeTimeline(ledger); };
const state = { nodes: [], undo: [], history: [] };
const bench = await openBench(BENCH, { retryBlank: RULES.blankRetry });
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
      // blankRetry: a shot still blank after the retries, with words in the tree, measured nothing; it cannot end the run
      if (RULES.blankRetry && state.nodes.some((x) => KINDS[kindOf(x)].words) && ['desktop', 'phone'].some((w) => shot[w].checks?.words === 0)) T.blank = ['desktop', 'phone'].filter((w) => shot[w].checks?.words === 0);
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
    // endGate (s3): "done" waits while a finding has a fix (w9s-plumber said done with the photo still below the words),
    // and the run ends itself once every part is there and nothing left has a fix (both w9 bakery runs spent 15 turns on
    // the kit's contrast, which no move can reach)
    if (RULES.endGate && !T.blank && findings.some((f) => f.check === 'goalMet') && !findings.some((f) => f.fix)) T.ended = `nothing on the menu fixes what is left (${findings.filter((f) => f.check !== 'goalMet').map((f) => f.check).join(', ') || 'nothing'})`;
    ledger.turns.push(T);
    save();
    if (T.ended) { console.log(`turn ${turn}: ${action.say} | ended: ${T.ended}`); break; }
    console.log(`turn ${turn}: ${action.say}${refused ? ` — REFUSED: ${refused}` : ''} | ${findings.length} findings | ${T.calls.reduce((s, c) => s + (c.replayed ? 0 : c.ms || 0), 0)} ms model`);
  }
} finally {
  await bench.close();
  // a keep_alive:0 request for a model that is not loaded can load it first: never touch one this run did not ask
  for (const m of used) await fetch(`${OLLAMA}/api/generate`, { method: 'POST', body: JSON.stringify({ model: m, keep_alive: 0 }) }).catch(() => {});
}
ledger.endedAt = new Date().toISOString();
ledger.end = { turns: ledger.turns.length, done: ledger.turns.at(-1)?.action.kind === 'done', ended: ledger.turns.at(-1)?.ended, nodes: state.nodes.length, findings };
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
