/**
 * P112 OWN-031 — a page built from small questions: the vocabulary of questions and the assembly of OWN-029's round 0,
 * ported from `dev-docs/tasks/phase-112-your-own-nodegx/own-029/agent.mjs` (harness 22989dd1, the one OWN-030's graph
 * lane froze). OWN-031 §7 ruling 3: the questions are product, and this is where they ship.
 *
 * The thesis it carries (OWN-027/029): a small model makes good decisions when it is asked one small question with the
 * options in the words, and it fails when it has to draw a tree. So the model chooses (the page's kind and tone, its
 * sections, each section's bits, the looks the script offers for each node, and the words), and the script builds:
 * the tree, the looks' parameters, the dark-band rules, the list items as one component, the plan, staging and apply.
 *
 * Every question's signature is the lab's, so a recorded run replays through `replayDoor` and must give the same trees
 * (the paired gate, AC3). Change a question's words freely; change its signature or its options only on purpose.
 *
 * Not here yet (OWN-031 step 3): describe, the critics, the review loop and repair.
 *
 * @module noodl-mcp/guided/page
 */
import * as fs from 'fs';
import * as path from 'path';

import type { Door, Question } from './door';

// ─── The vocabulary of questions ──────────────────────────────────────────────────────────────────────────────────
export const KINDS = ['landing page', 'event page', 'sign-up or contact page', 'portfolio', 'shop or menu page', 'other'];
export const TONES = ['modern', 'playful', 'classic', 'minimal', 'bold'];
const HUE_WORDS: Record<string, string> = { blue: 'blue', navy: 'blue', green: 'green', warm: 'warm', orange: 'warm', red: 'warm', amber: 'warm', terracotta: 'warm', purple: 'purple', violet: 'purple', grey: 'neutral', gray: 'neutral', black: 'neutral', monochrome: 'neutral' };
const TONE_WORDS: Record<string, string> = { modern: 'modern', playful: 'playful', fun: 'playful', classic: 'classic', elegant: 'classic', trustworthy: 'classic', minimal: 'minimal', bold: 'bold', energetic: 'bold' };
export const HUES: Record<string, string> = { blue: 'blue', green: 'green', warm: 'amber', purple: 'purple', neutral: 'gray' };
const PAIRINGS = [
  { id: 'sans-sans', label: 'Inter headings / Inter body', head: null, body: null },
  { id: 'serif-sans', label: 'serif headings / Inter body', head: 'var(--font-serif)', body: null },
  { id: 'serif-serif', label: 'serif headings / serif body', head: 'var(--font-serif)', body: 'var(--font-serif)' },
  { id: 'mono-sans', label: 'monospace headings / Inter body', head: 'var(--font-mono)', body: null }
];
const RADII: Record<string, Record<string, string>> = {
  sharp: { '--radius-md': '2px', '--radius-lg': '4px', '--radius-xl': '4px', '--radius-2xl': '6px', '--radius-3xl': '8px' },
  round: { '--radius-md': '10px', '--radius-lg': '14px', '--radius-xl': '20px', '--radius-2xl': '28px', '--radius-3xl': '36px' }
};
const SECTION_KINDS = ['hero', 'about', 'feature cards', 'how it works', 'gallery', 'menu or prices', 'schedule or line-up', 'testimonials', 'team', 'faq', 'location and hours', 'sign-up or contact form', 'call to action', 'footer'];
const BITS: Record<string, string> = {
  eyebrow: 'a small uppercase line above the headline', badge: 'a small pill holding a few words', headline: 'the main heading',
  'sub-line': 'one sentence under the headline', 'body text': 'a short paragraph', button: 'the main action button',
  'second button': 'a quieter second action', photo: 'one photograph', 'list of items': 'several similar items: cards, steps, features, dishes, people or questions',
  quote: 'a quotation from a person', 'name line': 'who said it: a name and a role', form: 'a form to fill in: a few fields and a send button',
  'date and place': 'when and where, in one line', price: 'a price', 'small print': 'a line of fine print (copyright, terms)'
};
const ITEM_BITS: Record<string, string> = { photo: 'a photograph', icon: 'a small icon', number: 'a step number', title: 'a short title', text: 'a sentence or two', price: 'a price', time: 'a time or a date', button: 'a button', 'name line': 'a name and a role' };
const FIELDS = ['name', 'email', 'phone', 'message', 'date', 'number of people'];
// a form field's label and placeholder are facts about the field, so the script answers them (the model wrote
// "Puppy Adoption Hub\n\n[Hero Section: …" as a message placeholder)
const PLACEHOLDERS: Record<string, string> = { name: 'Your name', email: 'you@example.com', phone: 'Your phone number', message: 'Your message', date: 'DD/MM/YYYY', 'number of people': '2' };
const WORD_BITS = new Set(['eyebrow', 'badge', 'headline', 'sub-line', 'body text', 'button', 'second button', 'quote', 'name line', 'email field', 'small print', 'form', 'date and place', 'price']);
export const DARK = new Set(['heroGround', 'ctaBand', 'imageGround']);
const LIGHT = new Set(['card', 'testimonialCard', 'statTile', 'emptyState', 'raised']);
const HEADING_LOOKS = new Set(['displayHeadline', 'sectionHeading', 'cardTitle']);
const COPY_LEN: Record<string, number> = { displayHeadline: 70, sectionHeading: 60, cardTitle: 40, eyebrow: 30, meta: 60, lead: 160, fieldLabel: 30, fieldHint: 80 };
const short = (s: unknown, n = 90): string => {
  const c = String(s || '').split(/:\s|—|\.\s/)[0].trim();
  return c.length > n ? c.slice(0, n - 1) + '…' : c;
};
const enumQ = (user: string, key: string, options: string[], extra: Partial<Question> = {}): Question => ({ user, schema: { type: 'object', required: [key], properties: { [key]: { type: 'string', enum: options } } }, ...extra });
const dot = (t: unknown): string => String(t || '').trim().replace(/[.!]+$/, '');

/** The brief card: what the page is, for whom, and how it looks. */
export interface Card {
  kind: string;
  tone: string;
  hue?: string;
  name: string;
  audience: string;
  action: string;
  preset?: string;
  density?: string;
  pairing?: string;
  radius?: string;
  mustShow?: string[];
  photos?: string[];
}

/** What the script read or decided without asking, for the result (the lab's `ledger.skipped`). */
export type Skipped = { key: string; why: string }[];

export interface PageDeps {
  door: Door;
  request: string;
  skipped: Skipped;
  /** Bits the script took out of a section's choices, by section signature (OWN-029 S13's repair; empty in round 0). */
  exclude?: Map<string, Set<string>>;
  /** The bound project, whose stock photos the scout looks at; without it the page has no photos. */
  projectDir?: string;
  /** A line of progress, for a client that shows it. */
  progress?: (message: string) => void;
}

// ─── Stage 0: what the request already says, the script reads; the model answers only the rest ──────────────────
export function readRequest(req: string): Partial<Card> & { colourWord?: string } {
  const said: Partial<Card> & { colourWord?: string } = {};
  // a colour only counts when it is said AS a colour ("blue colour theme", "Warm colours", ", green."), not in a name
  // ("The Blue Room") — the jazz brief is the trap.
  const words = Object.keys(HUE_WORDS).join('|');
  const m = req.match(new RegExp(`\\b(${words})\\s+(colou?rs?|theme|palette|tones?)\\b`, 'i')) || req.match(new RegExp(`(?:^|[,.;]\\s*)(${words})\\s*(?:[,.;]|$)`, 'i'));
  if (m) {
    said.hue = HUE_WORDS[m[1].toLowerCase()];
    said.colourWord = m[1].toLowerCase();
  }
  for (const [w, t] of Object.entries(TONE_WORDS)) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(req)) {
      said.tone = t;
      break;
    }
  }
  for (const k of KINDS) {
    if (k !== 'other' && new RegExp(`\\b${k}\\b`, 'i').test(req)) {
      said.kind = k;
      break;
    }
  }
  return said;
}

const reqLine = (d: PageDeps) => `Request: "${d.request}"`;
const cardText = (d: PageDeps, card: Card) => `${reqLine(d)}\nBRIEF: a ${card.kind} called "${card.name}", for ${dot(card.audience)}. The one action: ${dot(card.action)}. Tone: ${card.tone}.`;

/**
 * Stage 0, the part that needs no project: kind, tone, the colour the request names, who it is for, the one action
 * and the name. The caller names the project's folder after `name`, then calls `finishCard`.
 */
export async function startCard(d: PageDeps): Promise<Card> {
  const card: any = {};
  const said = readRequest(d.request);
  for (const [k, v] of Object.entries(said)) {
    if (k === 'colourWord') continue;
    card[k] = v;
    d.skipped.push({ key: `card.${k}`, why: `S0: the request says it (${v})` });
  }
  const missing = ['kind', 'tone'].filter((k) => !card[k]);
  if (missing.length) {
    const props = { kind: { type: 'string', enum: KINDS }, tone: { type: 'string', enum: TONES } };
    const q: Question = {
      user: `${reqLine(d)}\n${missing.includes('kind') ? `What kind of page is this (${KINDS.join(', ')})? ` : ''}${missing.includes('tone') ? `What tone should it have (${TONES.join(', ')})?` : ''}`,
      schema: { type: 'object', required: missing, properties: Object.fromEntries(missing.map((k) => [k, props[k as 'kind' | 'tone']])) }
    };
    Object.assign(card, (await d.door.ask('card.kind+tone', 'card|kind+tone', q, 0.2)).answer);
  }
  Object.assign(
    card,
    (
      await d.door.ask(
        'card.audience+action+name',
        'card|audience',
        {
          user: `${reqLine(d)}\nWho is the page for (one line, max 20 words)? What is the ONE action the page wants a visitor to take (max 20 words)? What is the business, event or person called (max 4 words; use the name in the request, or invent a short one)?`,
          schema: { type: 'object', required: ['action', 'audience', 'name'], properties: { action: { type: 'string', maxLength: 140 }, audience: { type: 'string', maxLength: 140 }, name: { type: 'string', maxLength: 40 } } }
        },
        0.4
      )
    ).answer
  );
  card.kind = KINDS.includes(card.kind) ? card.kind : 'landing page';
  card.tone = TONES.includes(card.tone) ? card.tone : 'modern';
  card.name = String(card.name || '').trim() || 'My page';
  return card as Card;
}

/** Stage 0, the rest: the preset and colour, type, density and corners, the facts a visitor must find, the photos. */
export async function finishCard(d: PageDeps, card: Card, vocab: any): Promise<Card> {
  const presets: { id: string; description?: string }[] = vocab.presets || [];
  const hueAsked = !card.hue;
  const pq: Question = {
    user: `${reqLine(d)}\nTone: ${card.tone}. Pick the style preset${hueAsked ? ' and the main colour (blue, green, warm, neutral, purple): choose it from the mood words in the request, never from a name in it' : ''}.\nPresets:\n${presets.map((p) => `- ${p.id}: ${short(p.description, 80)}`).join('\n')}`,
    schema: { type: 'object', required: hueAsked ? ['hue', 'preset'] : ['preset'], properties: { preset: { type: 'string', enum: presets.map((p) => p.id) }, ...(hueAsked ? { hue: { type: 'string', enum: Object.keys(HUES) } } : {}) } }
  };
  if (presets.length) Object.assign(card, (await d.door.ask('card.preset+hue', 'card|preset', pq, 0.2)).answer);
  Object.assign(
    card,
    (
      await d.door.ask(
        'card.pairing+density+radius',
        'card|type',
        {
          user: `${reqLine(d)}\nTone: ${card.tone}. Pick the type pairing (headings / body), the density (airy, regular, compact) and the corner radius (sharp, soft, round).\nPairings:\n${PAIRINGS.map((p) => `- ${p.id}: ${p.label}`).join('\n')}`,
          schema: { type: 'object', required: ['density', 'pairing', 'radius'], properties: { density: { type: 'string', enum: ['airy', 'regular', 'compact'] }, pairing: { type: 'string', enum: PAIRINGS.map((p) => p.id) }, radius: { type: 'string', enum: ['sharp', 'soft', 'round'] } } }
        },
        0.2
      )
    ).answer
  );
  // the page's own acceptance criteria: what a visitor must be able to find, read out of the request
  const ms = (
    await d.door.ask(
      'card.mustShow',
      'card|mustShow',
      {
        user: `${reqLine(d)}\nWhat must a visitor be able to find on this page? List 1 to 4 short facts taken from the request about the business, event or person (a date, a place, what is sold, opening days, what to do). Only what the request says, and nothing about how the page should look.`,
        schema: { type: 'object', required: ['texts'], properties: { texts: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', maxLength: 80 } } } }
      },
      0.2
    )
  ).answer;
  // a fact about the LOOK is not something a visitor must read ("blue colour theme", "modern style")
  const looky = new RegExp(`\\b(${[...Object.keys(HUE_WORDS), ...Object.keys(TONE_WORDS), 'colou?r', 'theme', 'style', 'design', 'landing page', 'white space', 'dark', 'look'].join('|')})\\b`, 'i');
  // …but a look word that is part of a NAME stays: "The Blue Room" is the venue
  const isName = (t: string) => {
    const m = t.match(looky);
    if (!m || m.index === undefined) return false;
    const w = t.slice(m.index, m.index + m[0].length);
    return /^[A-Z]/.test(w) && (m.index > 0 ? /[A-Z]\w*\s+$/.test(t.slice(0, m.index)) : /^\w+\s+[A-Z]/.test(t.slice(m.index)));
  };
  const texts: string[] = ms?.texts || [];
  card.mustShow = texts.filter((t) => t && (!looky.test(t) || isName(t)));
  if (texts.length !== card.mustShow.length) d.skipped.push({ key: 'card.mustShow', why: `S0: dropped facts about the look: ${texts.filter((t) => !card.mustShow!.includes(t)).join('; ')}` });
  card.photos = await scoutPhotos(d, card, vocab);
  return card;
}

/**
 * The photo scout: the model LOOKS at the stock photos against the page (one image, one yes/no token) and keeps the
 * best three that pass both gates (OWN-029 s1/s2: "would it make sense" ≥ 0.6, then "does it show what the page is
 * about" ≥ 0.3; right on all six briefs). Asked by file name alone, a small model chose soil textures and a cat.
 *
 * New in the port: one text question first narrows the photos to the subjects that could belong (food, animals…), so
 * the vision gates run on a handful of files instead of all 32 (a warm vision call is about 4 s on E4B). A wrong
 * subject costs nothing worse than the lab's full scan would have found: the gates still refuse what does not fit.
 */
async function scoutPhotos(d: PageDeps, card: Card, vocab: any): Promise<string[]> {
  if (d.door.cache.has('card|photos')) return d.door.cache.get('card|photos')!.answer.photos;
  const keep = (f: string) => !/^avatar-|^tile-|^texture-|portrait|\.svg$/.test(f);
  const subjects: { subject: string; files: string[] }[] = (vocab.imagery?.subjects || []).map((s: any) => ({ subject: s.subject, files: s.files.filter(keep) })).filter((s: any) => s.files.length);
  let chosen: string[] = [];
  if (subjects.length && d.projectDir) {
    const readPhoto = photoReader(d.projectDir, vocab.imagery.moduleDir);
    const stem = (f: string) => f.replace(/\.\w+$/, '').replace(/^[a-z]+-/, '').replace(/-/g, ' ');
    const sq = await d.door.ask(
      'card.photoSubjects',
      'card|photoSubjects',
      {
        user: `${reqLine(d)}\nThis page is about "${card.name}": ${card.mustShow?.length ? card.mustShow.join('; ') : dot(card.audience)}. Which kinds of stock photograph could show what it is about? Choose 0 to 3 kinds. Choose none if nothing fits: a wrong photo is worse than no photo.\nKinds:\n${subjects.map((s) => `- ${s.subject}: ${s.files.map(stem).join(', ')}`).join('\n')}`,
        schema: { type: 'object', required: ['kinds'], properties: { kinds: { type: 'array', minItems: 0, maxItems: 3, items: { type: 'string', enum: subjects.map((s) => s.subject) } } } }
      },
      0.2
    );
    const kinds = new Set<string>(sq.answer?.kinds || []);
    const files = subjects.filter((s) => kinds.has(s.subject)).flatMap((s) => s.files);
    const scores: [string, number, number | null][] = [];
    const subject = `"${card.name}", ${/^[aeiou]/i.test(card.kind) ? 'an' : 'a'} ${card.kind} for ${dot(card.audience)}${card.mustShow?.length ? ` (${card.mustShow.join('; ')})` : ''}`;
    for (const f of files) {
      const img = readPhoto(f);
      if (!img) continue;
      d.progress?.(`looking at ${f}`);
      // the SUBJECT, not the request: asked about "…blue colour theme, modern style" the reviewer judged the photo's
      // styling and rejected the dog (0.079); asked about the subject it keeps it (0.98)
      const p = await d.door.judge('photo.fit', `Would this photo make sense on a web page for ${subject}? Answer yes or no.`, { file: f }, [img]);
      // the second gate: "make sense" invites yes (the running page passed a dog, sheep and carrots); "does it SHOW
      // what this page is about" refuses them and keeps the dog for puppies and hands in clay for the potter
      let shows: number | null = null;
      if ((p ?? 0) >= 0.6) shows = await d.door.judge('photo.shows', `This page is about "${card.name}": ${card.mustShow?.length ? card.mustShow.join('; ') : dot(card.audience)}. Does this photo show what this page is about? Answer yes or no.`, { file: f }, [img]);
      scores.push([f, p ?? 0, shows]);
    }
    scores.sort((a, b) => (b[2] ?? -1) - (a[2] ?? -1) || b[1] - a[1]);
    chosen = scores.filter(([, p, s]) => p >= 0.6 && (s ?? 0) >= 0.3).slice(0, 3).map(([f]) => f);
    d.skipped.push({ key: 'card.photos', why: `photo scout (vision): looked at ${files.length} of ${subjects.reduce((n, s) => n + s.files.length, 0)} (${[...kinds].join(', ') || 'no kinds'}), kept ${chosen.join(', ') || 'none'}` });
  }
  d.door.cache.set('card|photos', { answer: { photos: chosen } });
  return chosen;
}

// ─── Stage 1: the sections ────────────────────────────────────────────────────────────────────────────────────────
export interface Section {
  kind: string;
  purpose: string;
}

export async function stage1(d: PageDeps, card: Card): Promise<Section[]> {
  const r = await d.door.ask(
    'sections',
    'sections',
    {
      user: `${cardText(d, card)}\n${card.mustShow?.length ? `The page must show: ${card.mustShow.join('; ')}.\n` : ''}Which sections should the page have, top to bottom? Give 3 to 7. For each, one line saying what a VISITOR finds there (not what the section does for the page). Choose what THIS page needs; not every page needs every kind.\nSection kinds: ${SECTION_KINDS.join(', ')}`,
      numPredict: 700,
      schema: { type: 'object', required: ['sections'], properties: { sections: { type: 'array', minItems: 3, maxItems: 7, items: { type: 'object', required: ['kind', 'purpose'], properties: { kind: { type: 'string', enum: SECTION_KINDS }, purpose: { type: 'string', maxLength: 120 } } } } } }
    },
    0.3
  );
  return ((r.answer?.sections as Section[]) || [{ kind: 'hero', purpose: 'say what this is' }]).slice(0, 7);
}

// ─── Stage 2+3: one section, as decisions, then built ─────────────────────────────────────────────────────────────
/** The per-build state: vocabulary, looks, node types, the photo cursor, the page-level gates. */
export interface BuildCtx {
  vocab: any;
  comps: any[];
  glyphs: string[];
  iconShape: any;
  pageTaken: Set<string>;
  photoCursor: number;
  besideCount: number;
  bitsSoFar: string[];
  saidSoFar: string[];
  labelOf: (t: string) => string;
}

export function sigOf(sections: Section[], si: number): string {
  const s = sections[si];
  return `${s.kind}#${sections.slice(0, si).filter((x) => x.kind === s.kind).length}`;
}

/** A decision the model made with a confidence: what a later "flip" repair would take the second choice of. */
export interface Decision {
  key: string;
  sig: string;
  conf: any;
  answer: any;
  node?: string;
}

export interface Built {
  sec: Section;
  S: string;
  tree: any[];
  align: string;
  decisions: Decision[];
  bits: string[];
  nodes?: any[];
  path?: string;
  replace?: Record<string, any>;
  instantiates?: string[];
  staged?: boolean;
  warnings?: { code: string; message: string; nodeId?: string }[];
}

export async function buildSection(d: PageDeps, ctx: BuildCtx, card: Card, sections: Section[], si: number): Promise<Built> {
  const sec = sections[si],
    S = sigOf(sections, si),
    tag = { section: si, sectionKind: sec.kind };
  const T: any[] = [],
    decisions: Decision[] = [];
  const add = (n: any) => {
    T.push({ fixedParams: {}, children: [], ...n });
    return T.length - 1;
  };
  const decide = async (key: string, q: Question, temp = 0.2) => {
    const r = await d.door.ask(`s${si}.${key}`, `${S}|${key}`, q, temp, tag);
    if (r.conf) decisions.push({ key: `s${si}.${key}`, sig: `${S}|${key}`, conf: r.conf, answer: Object.values(r.answer || {})[0] });
    return r.answer;
  };
  const photos = card.photos || [];
  const secLine = `The "${sec.kind}" section (${sec.purpose}).`;
  // a footer is fine print and a way on, not a second page (dbg-puppy r0 grew a four-card photo list in it)
  const FOOTER_BITS = ['headline', 'body text', 'small print', 'button', 'second button', 'date and place'];
  const bitList = Object.entries(BITS).filter(([k]) => (k !== 'photo' || photos.length) && (sec.kind !== 'footer' || FOOTER_BITS.includes(k)) && !d.exclude?.get(S)?.has(k));
  const above = ctx.bitsSoFar.length ? `\nThe sections above already have: ${ctx.bitsSoFar.join('; ')}. Not every section needs a button or a photo; a section can be short.` : '';
  const a1 = await decide(
    'bits',
    {
      user: `${cardText(d, card)}${above}\n${secLine} Which bits does it need, top to bottom? Choose 1 to 6:\n${bitList.map(([k, v]) => `- ${k}: ${v}`).join('\n')}${photos.length ? '' : '\n(This page has no photographs.)'}`,
      schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', enum: bitList.map(([k]) => k) } } } }
    },
    0.3
  );
  let bits: string[] = [...new Set<string>((a1?.bits || ['headline']).filter((b: string) => BITS[b]))];
  if (!bits.length) bits = ['headline'];
  // a quote with nobody saying it reads as the page talking to itself: the script adds who said it
  if (bits.includes('quote') && !bits.includes('name line')) {
    bits.splice(bits.indexOf('quote') + 1, 0, 'name line');
    d.skipped.push({ key: `s${si}.bits`, why: 'rule: a quote gets a name line' });
  }
  ctx.bitsSoFar.push(`${sec.kind}: ${bits.join(', ')}`);
  const root = add({ parent: -1, type: 'Group', role: `the ${sec.kind} section band`, rootBand: true, lookOptions: null });
  const shell = add({ parent: root, type: 'Group', role: 'the one centred container inside the band', fixedLook: 'shell' });
  const words = bits.filter((b) => WORD_BITS.has(b));
  let align = 'left';
  if (words.length) align = (await decide('align', enumQ(`${cardText(d, card)}\n${secLine} Are its words centred or left-aligned? Answer one of: centred, left-aligned.`, 'answer', ['centred', 'left-aligned'])))?.answer === 'centred' ? 'center' : 'left';
  let wordsParent = shell,
    photoMode: string | null = null;
  if (bits.includes('photo') && words.length) photoMode = (await decide('photoPlace', enumQ(`${cardText(d, card)}\n${secLine} Should the photo sit beside the words, above them, or below them? Answer one of: beside, above, below.`, 'answer', ['beside', 'above', 'below'])))?.answer || 'beside';
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
  let actionRow: number | null = null;
  for (const b of bits) {
    const P0 = wordsParent;
    switch (b) {
      case 'photo':
        if (photoMode !== 'beside') add({ parent: shell, type: 'Image', role: `the ${sec.kind} photograph` });
        break;
      case 'eyebrow':
        add({ parent: P0, type: 'Text', role: 'the small uppercase line above the headline', fixedLook: 'eyebrow', fixedParams: textP() });
        break;
      case 'badge': {
        const g = add({ parent: P0, type: 'Group', role: 'a small pill', fixedLook: 'badge' });
        add({ parent: g, type: 'Text', role: 'the few words in the pill', fixedLook: 'none', fixedParams: { sizeMode: 'contentSize' } });
        break;
      }
      case 'headline':
        add({ parent: P0, type: 'Text', role: `the ${sec.kind} headline`, bit: 'headline', lookOptions: ['displayHeadline', 'sectionHeading'], fixedParams: textP() });
        break;
      case 'sub-line':
        add({ parent: P0, type: 'Text', role: 'one sentence under the headline', lookOptions: ['lead', 'body'], fixedParams: textP() });
        break;
      case 'body text':
        add({ parent: P0, type: 'Text', role: 'a short paragraph', fixedLook: 'body', fixedParams: textP() });
        break;
      case 'quote':
        add({ parent: P0, type: 'Text', role: 'a quotation from a happy customer or visitor', lookOptions: ['lead', 'body'], fixedParams: textP() });
        break;
      case 'name line':
        add({ parent: P0, type: 'Text', role: 'who said it: a name and a role', fixedLook: 'meta', fixedParams: textP() });
        break;
      case 'small print':
        add({ parent: P0, type: 'Text', role: 'a line of fine print', fixedLook: 'meta', fixedParams: textP() });
        break;
      case 'date and place':
        add({ parent: P0, type: 'Text', role: 'when and where, in one line', fixedLook: 'lead', fixedParams: { ...textP(), color: 'var(--primary)' } });
        break;
      case 'price':
        add({ parent: P0, type: 'Text', role: 'the price', fixedLook: 'sectionHeading', fixedParams: textP() });
        break;
      case 'button':
      case 'second button': {
        if (actionRow === null) actionRow = add({ parent: P0, type: 'Group', role: 'the buttons', fixedLook: 'actionRow', fixedParams: align === 'center' ? { justifyContent: 'center' } : {} });
        add({ parent: actionRow, type: 'net.noodl.controls.button', role: b === 'button' ? `the main action of the ${sec.kind} section` : 'a quieter second action', lookOptions: ['primaryButton', 'outlineButton'] });
        break;
      }
      case 'form': {
        const f = await decide(
          'form.fields',
          {
            user: `${cardText(d, card)}\n${secLine} It has a form. Which fields, top to bottom? Choose 1 to 5: ${FIELDS.join(', ')}.`,
            schema: { type: 'object', required: ['fields'], properties: { fields: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', enum: FIELDS } } } }
          },
          0.3
        );
        const fields: string[] = [...new Set<string>(f?.fields?.length ? f.fields : ['name', 'email'])];
        const form = add({ parent: P0, type: 'Group', role: 'the form', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-4)', maxWidth: { value: 480, unit: 'px' } } });
        // the fields become ONE field component placed N times (the server refuses identical sibling subtrees)
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
        const count = Number((await decide('items.count', enumQ(`${cardText(d, card)}\n${secLine} It has a list of similar items. How many items? Answer one of: 2, 3, 4, 6.`, 'answer', ['2', '3', '4', '6'])))?.answer || 3);
        const ibList = Object.entries(ITEM_BITS).filter(([k]) => k !== 'photo' || photos.length);
        const ib = await decide(
          'items.bits',
          {
            user: `${cardText(d, card)}\n${secLine} It has a list of ${count} items. Which bits does EACH item have, top to bottom? Choose 1 to 4:\n${ibList.map(([k, v]) => `- ${k}: ${v}`).join('\n')}${photos.length && photos.length < count ? `\n(The page has only ${photos.length} photograph${photos.length > 1 ? 's' : ''}: a photo on each of ${count} items would repeat ${photos.length > 1 ? 'them' : 'it'}.)` : ''}`,
            schema: { type: 'object', required: ['bits'], properties: { bits: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: ibList.map(([k]) => k) } } } }
          },
          0.3
        );
        const ibits = [...new Set<string>((ib?.bits?.length ? ib.bits : ['title', 'text']).filter((x: string) => ITEM_BITS[x]))];
        const lay = await decide('items.layout', enumQ(`${cardText(d, card)}\n${secLine} Its ${count} items: a grid, or one column? Answer one of: grid, one column.`, 'answer', ['grid', 'one column']));
        const container =
          lay?.answer === 'one column'
            ? add({ parent: shell, type: 'Group', role: 'the list of items, one column', fixedLook: 'none', fixedParams: { flexDirection: 'column', rowGap: 'var(--space-6)' } })
            : // four items in a 280px auto-fit grid left one orphan on its own row: at four, 220px fits a row
              add({ parent: shell, type: 'net.noodl.visual.columns', role: 'the list of items, a grid', fixedLook: 'gridAutoFit', fixedParams: count === 4 ? { minWidth: { value: 220, unit: 'px' } } : {} });
        for (let k = 1; k <= count; k++) add({ parent: container, type: 'Group', role: `item ${k} of ${count} in the list`, lookOptions: ['card', 'featureItem', 'testimonialCard', 'statTile'], shareKey: 'item', itemOf: [k, count], itemBits: ibits, pending: true });
        break;
      }
    }
  }
  return { sec, S, tree: T, align, decisions, bits };
}

function placeItemInner(ctx: BuildCtx, nodes: any[], item: any): void {
  const [k, count] = item.itemOf,
    ib: string[] = item.itemBits;
  const mk = (parent: any, type: string, role: string, extra: any = {}) => {
    const n: any = { type, typeLabel: ctx.labelOf(type), role: `item ${k} of ${count}: ${role}`, parent: parent.j, j: nodes.length, params: {}, origin: {}, children: [], fixedParams: {}, listRole: role, listIndex: k - 1, listCount: count, ...extra };
    n.id = `${item.id}i${nodes.length}`;
    nodes.push(n);
    parent.children.push(n);
    return n;
  };
  // a featureItem is a ROW: a photo as its lead squeezed the words to one character wide, so only an icon or a number
  // leads it; a photo goes on top of the words
  const leadKinds = new Set(['icon', 'number']);
  let lead: string[] = [],
    rest = ib,
    body = item;
  if (item.look === 'card') {
    lead = ib.filter((b) => b === 'photo');
    rest = ib.filter((b) => b !== 'photo');
  }
  if (item.look === 'featureItem') {
    lead = ib.filter((b) => leadKinds.has(b)).slice(0, 1);
    rest = ib.filter((b) => !lead.includes(b));
    rest = [...rest.filter((b) => b === 'photo'), ...rest.filter((b) => b !== 'photo')];
  }
  const avatar = ib.includes('name line');
  const place = (parent: any, b: string) => {
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

/** A line's kind, as a reader names it: the deck's field names, and later the critics' labels. */
export const BIT_LABEL = (n: any): string => {
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

export async function fillSection(d: PageDeps, ctx: BuildCtx, card: Card, b: Built, si: number): Promise<Built> {
  const { sec, S, tree, align } = b,
    tag = { section: si, sectionKind: sec.kind };
  const photos = card.photos || [];
  const nodes: any[] = tree.map((n, j) => ({ ...n, id: `s${si}n${j}`, j, params: {}, origin: {}, children: [] }));
  for (const n of nodes) if (n.parent >= 0) nodes[n.parent].children.push(n);
  for (const n of nodes) n.typeLabel = ctx.labelOf(n.type);
  const shared: Record<string, string> = {};
  // looks, top-down so a child knows its parent's look (an item's inner nodes are pushed as the item gets its look)
  for (let ni = 0; ni < nodes.length; ni++) {
    const n = nodes[ni];
    n.parentLook = n.parent >= 0 ? nodes[n.parent].look : null;
    const apply = () => {
      const c0 = ctx.comps.find((x) => x.id === n.look);
      if (c0) {
        for (const [k, v] of Object.entries(c0.parameters)) {
          n.params[k] = structuredClone(v);
          n.origin[k] = 'look';
        }
      }
      ctx.pageTaken.add(n.look);
      if (n.pending) placeItemInner(ctx, nodes, n);
    };
    if (n.fixedLook) {
      n.look = n.fixedLook;
      apply();
      continue;
    }
    if (n.shareKey && shared[n.shareKey]) {
      n.look = shared[n.shareKey];
      apply();
      continue;
    }
    let looks = ctx.comps.filter((c) => c.nodeType === n.type);
    if (n.lookOptions) looks = looks.filter((c) => n.lookOptions.includes(c.id));
    if (n.rootBand) {
      // the script narrows the grounds by section kind (heroGround on five sections in a row, otherwise)
      const allow = sec.kind === 'hero' ? ['heroGround', 'imageGround', 'band', 'bandSurface'] : sec.kind === 'footer' ? ['footerBand'] : sec.kind === 'call to action' ? ['ctaBand', 'imageGround', 'bandSurface'] : ['band', 'bandSurface', 'imageGround'];
      looks = looks.filter((c) => c.group === 'spine' && allow.includes(c.id) && (c.id !== 'imageGround' || photos.length));
    }
    if (ctx.pageTaken.has('displayHeadline')) looks = looks.filter((c) => c.id !== 'displayHeadline'); // one per page
    if (looks.length === 0) {
      n.look = 'none';
      continue;
    }
    if (looks.length === 1) {
      n.look = looks[0].id;
      apply();
      continue;
    }
    const ids = looks.map((l) => l.id);
    const lk = n.rootBand ? 'look.band' : n.shareKey ? `look.${n.shareKey}` : `look.${n.role}`;
    const r = await d.door.ask(
      `s${si}.${lk}`,
      `${S}|${lk}|${ids.join(',')}`,
      enumQ(`${cardText(d, card)}\nThe "${sec.kind}" section (${sec.purpose}). A ${n.typeLabel} whose role is: ${n.role}.${n.parentLook && n.parentLook !== 'none' ? ` It sits inside a "${n.parentLook}".` : ''}\nWhich look should it take?\n${looks.map((l) => `- ${l.id}: ${short(l.description)}`).join('\n')}`, 'look', ids),
      0.2,
      tag
    );
    n.look = ids.includes(r.answer?.look) ? r.answer.look : ids[0];
    if (r.conf) b.decisions.push({ key: `s${si}.${lk}`, sig: `${S}|${lk}|${ids.join(',')}`, conf: r.conf, answer: n.look, node: n.id });
    if (n.shareKey) shared[n.shareKey] = n.look;
    apply();
  }
  const darkOf = (n: any): boolean => (DARK.has(n.look) ? true : LIGHT.has(n.look) ? false : n.parent < 0 ? false : darkOf(nodes[n.parent]));
  const pairing = PAIRINGS.find((p) => p.id === card.pairing) || PAIRINGS[0];
  const photo = (n: any): string | null => {
    if (n.avatar) return `${ctx.vocab.imagery.moduleDir}/avatar-${(n.listIndex % 6) + 1}.webp`;
    const f = photos[ctx.photoCursor++ % Math.max(1, photos.length)];
    return f ? `${ctx.vocab.imagery.moduleDir}/${f}` : null;
  };
  // one call per list writes every item's words as rows
  const rows: Record<string, { sig: string; items: any[] }> = {};
  const listRows = async (n: any) => {
    const fields = [...new Set(nodes.filter((m) => m.rowField && m.type !== 'Image').map((m) => m.rowField as string))];
    const sig = `${S}|list.rows|${n.listCount}|${fields.join(',')}`;
    if (rows[sig]) return rows[sig];
    const maxLens: Record<string, number> = { title: 40, sentence: 160, price: 20, time: 30, name: 60, button: 24 };
    const loose = (f: string) => Math.max(60, maxLens[f] * 2); // the limit is in the words; a schema cap cuts mid-word
    const q: Question = {
      user: `${cardText(d, card)}\nThe "${sec.kind}" section (${sec.purpose}) has a list of ${n.listCount} items. For EACH item, in order, write: ${fields.map((f) => `${f} (max ${maxLens[f]} characters)`).join(', ')}. Each item different from the others; an item's ${fields.join(' and ')} must agree. Plain words, no numbering.`,
      schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', minItems: n.listCount, maxItems: n.listCount, items: { type: 'object', required: fields, properties: Object.fromEntries(fields.map((f) => [f, { type: 'string', maxLength: loose(f) }])) } } } },
      numPredict: 900
    };
    rows[sig] = { sig, items: (await d.door.ask(`s${si}.list.rows`, sig, q, 0.8, tag)).answer?.items || [] };
    return rows[sig];
  };
  // ONE call writes every word of the section in reading order, so the headline, its sub-line and the button are
  // written knowing each other. Keys are numbered because Ollama sorts a schema's keys and the model writes them in
  // that order.
  let deck: Map<any, { text: string; sig: string }> | null = null;
  const deckNodes = nodes.filter((n) => !n.fixedText && !n.rowField && (n.type === 'Text' || n.type === 'net.noodl.controls.button'));
  if (deckNodes.length > 1) {
    const used: Record<string, number> = {},
      fields = deckNodes.map((n) => {
        const base = n.type === 'net.noodl.controls.button' ? (/sends the form/.test(n.role) ? 'form button' : /quieter/.test(n.role) ? 'second button' : 'button') : BIT_LABEL(n);
        used[base] = (used[base] || 0) + 1;
        return used[base] > 1 ? `${base} ${used[base]}` : base;
      });
    const keyOf = (i: number) => `${String(i + 1).padStart(2, '0')}_${fields[i].replace(/\W+/g, '_')}`;
    const spec = deckNodes.map((n, i) =>
      n.type === 'net.noodl.controls.button'
        ? `${keyOf(i)}: ${fields[i]}, two to four words, a verb first; pressing it lets a visitor ${/main action/.test(n.role) ? dot(card.action) : /sends the form/.test(n.role) ? 'send the form' : 'do something else useful'}`
        : `${keyOf(i)}: ${fields[i]}, at most ${COPY_LEN[n.look] || 200} characters`
    );
    const dsig = `${S}|deck|${fields.join(',')}`;
    const q: Question = {
      user: `BRIEF: "${card.name}", a ${card.kind} for ${dot(card.audience)}. Tone: ${card.tone}.${card.mustShow?.length ? `\nFacts the page must give: ${card.mustShow.join('; ')}.` : ''}\nWrite the words of the "${sec.kind}" section, top to bottom:\n${spec.join('\n')}\n${ctx.saidSoFar.length ? `Already on the page: ${ctx.saidSoFar.slice(-4).map((t) => `"${t}"`).join(', ')}. Say something new. ` : ''}Each line says something the others do not. Words a visitor reads: never describe the page, the section or its design.`,
      schema: { type: 'object', required: deckNodes.map((_, i) => keyOf(i)), properties: Object.fromEntries(deckNodes.map((n, i) => [keyOf(i), { type: 'string', maxLength: Math.max(60, (COPY_LEN[n.look] || 200) * 2) }])) },
      numPredict: 900
    };
    const a = (await d.door.ask(`s${si}.deck`, dsig, q, 0.8, tag)).answer || {};
    deck = new Map(deckNodes.map((n, i) => [n, { text: a[keyOf(i)], sig: dsig }]));
  }
  const words = async (n: any, port: string, max: number) => {
    if (deck?.has(n)) {
      const dk = deck.get(n)!;
      n.sig = dk.sig;
      if (dk.text) {
        n.params[port] = dk.text;
        n.origin[port] = 'model';
        if (/headline/.test(n.role) && !/uppercase/.test(n.role)) ctx.saidSoFar.push(dk.text.slice(0, 60));
      }
      return;
    }
    const sig = `${S}|copy|${n.role}|${n.type}`;
    const isButton = n.type === 'net.noodl.controls.button';
    const long = ['lead', 'body'].includes(n.look) || /when and where|quotation|paragraph|under the headline/.test(n.role);
    const brief = `BRIEF: "${card.name}", a ${card.kind} for ${dot(card.audience)}. Tone: ${card.tone}.${long && card.mustShow?.length ? `\nFacts the page must give: ${card.mustShow.join('; ')}.` : ''}`;
    const ask = isButton
      ? `Write the label of ${/main action|sends the form/.test(n.role) ? 'the main button' : 'a quieter second button'} in the "${sec.kind}" section. Pressing it lets a visitor: ${/main action/.test(n.role) ? dot(card.action) : /sends the form/.test(n.role) ? 'send the form' : 'do something else useful here'}. Two to four words, a verb first.`
      : `Write ${n.role} in the "${sec.kind}" section. At most ${max} characters. Words a visitor reads: never describe the page, the section or its design.${/headline|under the headline/.test(n.role) && ctx.saidSoFar.length ? ` Already on the page: ${ctx.saidSoFar.slice(-4).map((t) => `"${t}"`).join(', ')}. Say something different.` : ''}`;
    const q: Question = { user: `${brief}\n${ask}`, schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', maxLength: Math.max(60, max * 2) } } } };
    const a = (await d.door.ask(`s${si}.copy.${n.role}`, sig, q, 0.8, tag)).answer;
    n.sig = sig;
    if (a?.text) {
      n.params[port] = a.text;
      n.origin[port] = 'model';
      if (/headline/.test(n.role) && !/uppercase/.test(n.role)) ctx.saidSoFar.push(a.text.slice(0, 60));
    }
  };
  for (const n of nodes) {
    const dark = darkOf(n),
      setR = (k: string, v: unknown) => {
        n.params[k] = v;
        n.origin[k] = 'rule';
      };
    if (n.type === 'Group') {
      if (n.look === 'none') {
        setR('width', { value: 100, unit: '%' });
        setR('sizeMode', 'contentHeight');
      }
      if (n.parent < 0) setR('as', sec.kind === 'hero' ? 'header' : sec.kind === 'footer' ? 'footer' : 'section');
      if (n.look === 'badge' && !dark) {
        setR('backgroundColor', 'var(--surface)');
        setR('borderColor', 'var(--border)');
      }
      if (ctx.comps.find((c) => c.id === n.look)?.group === 'spine' && card.density !== 'regular' && 'paddingTop' in n.params) {
        const v = card.density === 'airy' ? 'var(--space-24)' : 'var(--space-12)';
        setR('paddingTop', v);
        setR('paddingBottom', v);
      }
      if (n.look === 'imageGround') {
        const src = photo(n);
        if (src) setR('backgroundImage', src);
        n.params.sizeMode = 'contentHeight';
        delete n.params.height;
        setR('minHeight', { value: 520, unit: 'px' });
      }
    } else if (n.type === 'Text') {
      if (n.fixedText) setR('text', n.fixedText);
      else if (n.rowField) {
        const r = await listRows(n);
        n.sig = r.sig;
        const t = r.items[n.listIndex]?.[n.rowField];
        if (t) {
          n.params.text = t;
          n.origin.text = 'model';
        }
      } else await words(n, 'text', COPY_LEN[n.look] || 200);
      if (dark) setR('color', 'var(--primary-foreground)');
      if (n.look === 'displayHeadline') setR('as', 'h1');
      else if (n.look === 'sectionHeading') setR('as', 'h2');
      else if (n.look === 'cardTitle') setR('as', 'h3');
      const fam = HEADING_LOOKS.has(n.look) ? pairing.head : pairing.body;
      if (fam) setR('fontFamily', fam);
      if (['badge', 'actionRow'].includes(n.parentLook)) setR('sizeMode', 'contentSize');
    } else if (n.type === 'net.noodl.controls.button') {
      if (n.rowField) {
        const r = await listRows(n);
        n.sig = r.sig;
        const t = r.items[n.listIndex]?.button;
        if (t) n.params.label = t;
      } else await words(n, 'label', 28);
      if (dark && n.look === 'primaryButton') {
        setR('backgroundColor', 'var(--background)');
        setR('color', 'var(--primary)');
      }
      if (dark && n.look === 'outlineButton') {
        setR('color', 'var(--primary-foreground)');
        setR('borderColor', 'var(--border-glass)');
      }
    } else if (n.type === 'Image') {
      const src = photo(n);
      if (src) {
        setR('src', src);
        setR('alt', n.role);
        n.photoFile = path.basename(src);
      }
    } else if (n.type === 'net.noodl.controls.textinput') {
      if (n.fixedPlaceholder) setR('placeholder', n.fixedPlaceholder);
      else await words(n, 'placeholder', 40);
    } else if (n.type === 'net.noodl.visual.icon') {
      const g = await d.door.ask(`s${si}.glyph.${n.role}`, `${S}|glyph|${n.role}`, enumQ(`${cardText(d, card)}\nThe "${sec.kind}" section. An icon whose role is: ${n.role}. Which glyph?\nGlyphs: ${ctx.glyphs.join(', ')}`, 'glyph', ctx.glyphs), 0.2, tag);
      setR('iconSourceType', 'icon');
      setR('iconSize', 24);
      setR('iconColor', dark ? 'var(--primary-foreground)' : 'var(--primary)');
      if (g.answer?.glyph) n.params.iconIconSource = { ...ctx.iconShape, code: g.answer.glyph };
    }
  }
  // an accent colour a bit asks for (date and place, a price, a step number) is for a LIGHT ground: on a dark band it
  // was unreadable; there the band's light text wins
  for (const n of nodes) {
    for (const [k, v] of Object.entries(n.fixedParams || {})) {
      if (k === 'color' && darkOf(n)) continue;
      n.params[k] = v;
      n.origin[k] = 'rule';
    }
  }
  for (const n of nodes) if (n.look === 'displayHeadline' && nodes[n.parent]?.role === 'the words' && nodes[nodes[n.parent].parent]?.type === 'net.noodl.visual.columns') n.params.fontSize = 'var(--display-md)';
  b.nodes = nodes;
  b.path = `Sections/S${si + 1}${sec.kind.replace(/(^|\s)(\w)/g, (_, _a, c) => c.toUpperCase()).replace(/\W/g, '')}`;
  return b;
}

/** The trees the script built, before a list's items become a component: the lab's `r<k>/tree.json`. */
export function treeOf(card: Card, built: Built[]) {
  return {
    card,
    sections: built.map((b) => ({
      kind: b.sec.kind,
      purpose: b.sec.purpose,
      bits: b.bits,
      nodes: (b.nodes || []).map((n) => ({ type: n.type, role: n.role, parent: n.parent, params: n.params, look: n.look, photoFile: n.photoFile, itemOf: n.itemOf, listIndex: n.listIndex }))
    }))
  };
}

// ─── Assembly: the sections become components; a list's items become ONE item component ─────────────────────────
export interface ItemComp {
  path: string;
  b: Built;
  varying: { i: number; k: string; port: string }[];
  graph: { nodes: any[]; connections: string[]; visual_roots: string[] };
}

export function assemble(built: Built[]): ItemComp[] {
  const itemComps: ItemComp[] = [];
  const subtree = (n: any) => {
    const out = [n];
    for (let i = 0; i < out.length; i++) out.push(...out[i].children);
    return out;
  };
  for (const b of built) {
    b.replace = {};
    const lists: Record<string, any[]> = {};
    for (const n of b.nodes!) if (n.itemOf) (lists[n.parent] = lists[n.parent] || []).push(n);
    let li = 0;
    for (const items of Object.values(lists)) {
      const trees = items.map(subtree),
        tpl = trees[0];
      if (items.length < 2 || trees.some((t) => t.length !== tpl.length || t.some((n, i) => n.type !== tpl[i].type))) continue;
      const varying: ItemComp['varying'] = [];
      tpl.forEach((_n, i) => {
        const keys = new Set(trees.flatMap((t) => Object.keys(t[i].params)));
        for (const k of keys) if (new Set(trees.map((t) => JSON.stringify(t[i].params[k]))).size > 1) varying.push({ i, k, port: `p${i}_${k}` });
      });
      const cpath = `${b.path}Item${++li}`,
        inId = `${tpl[0].id}-in`;
      const strip = (n: any, i: number) => {
        const p = { ...n.params };
        for (const v of varying) if (v.i === i) delete p[v.k];
        return p;
      };
      itemComps.push({
        path: cpath,
        b,
        varying,
        graph: {
          nodes: [
            { id: inId, type: 'Component Inputs', label: 'what changes between the items', ports: varying.map((v) => ({ name: v.port, plug: 'output', type: '*' })) },
            ...tpl.map((n, i) => ({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...(i > 0 ? { parent: b.nodes![n.parent].id } : {}), parameters: strip(n, i) }))
          ],
          connections: varying.map((v) => `${inId}.${v.port} -> ${tpl[v.i].id}.${v.k}`),
          visual_roots: [tpl[0].id]
        }
      });
      items.forEach((it, k) => {
        b.replace![it.id] = { id: `${it.id}-inst`, type: `/${cpath}`, label: it.role.slice(0, 60), parameters: Object.fromEntries(varying.map((v) => [v.port, trees[k][v.i].params[v.k]])) };
      });
      (b.instantiates = b.instantiates || []).push(cpath);
    }
  }
  return itemComps;
}

/** One section's graph, its list items replaced by instances of their component. */
export function graphOf(b: Built) {
  const out: any[] = [],
    q = [b.nodes![0]];
  while (q.length) {
    const n = q.shift();
    const parent = n.parent >= 0 ? { parent: b.nodes![n.parent].id } : {};
    if (b.replace?.[n.id]) {
      out.push({ ...b.replace[n.id], ...parent });
      continue;
    }
    out.push({ id: n.id, type: n.type, label: n.role.slice(0, 60), ...parent, parameters: n.params });
    q.push(...n.children);
  }
  return { nodes: out, connections: [] as string[], visual_roots: [b.nodes![0].id] };
}

/** A tool result: `json` when it parsed, `isError` when the tool refused. */
export interface ToolOut {
  isError: boolean;
  text: string;
  json: any;
}

export type Tool = (name: string, args: Record<string, unknown>) => Promise<ToolOut>;

async function need(tool: Tool, name: string, args: Record<string, unknown>): Promise<any> {
  const r = await tool(name, args);
  if (r.isError) throw new Error(`${name}: ${r.text.slice(0, 400)}`);
  return r.json;
}

/** What every round shares: the vocabulary and the node types' names. */
export interface Prepared {
  vocab: any;
  nodeTypes: { typeName: string; displayName?: string }[];
}

/** Once per page: the rest of the card, then the theme it chose (preset, colour, corners). */
export async function preparePage(d: PageDeps, card: Card, tool: Tool): Promise<Prepared> {
  const vocab = await need(tool, 'get_style_vocabulary', {});
  d.progress?.('choosing the look');
  await finishCard(d, card, vocab);
  if (card.preset) await need(tool, 'set_style_preset', { preset_id: card.preset });
  const h = HUES[card.hue || 'blue'] || 'blue';
  await need(tool, 'set_project_tokens', {
    tokens: [
      { name: '--primary', value: `var(--${h}-${h === 'gray' ? 900 : 600})` },
      { name: '--primary-hover', value: `var(--${h}-${h === 'gray' ? 800 : 700})` },
      { name: '--ring', value: `var(--${h}-500)` },
      ...Object.entries(RADII[card.radius || ''] || {}).map(([name, value]) => ({ name, value }))
    ]
  });
  const nodeTypes = (await need(tool, 'list_node_types', { visual_only: true })).nodeTypes || [];
  return { vocab, nodeTypes };
}

/** One round's page, asked and filled, not yet written. */
export interface Planned {
  sections: Section[];
  built: Built[];
  itemComps: ItemComp[];
}

/**
 * The sections, every section asked and filled, and the lists made into item components. A cached answer replays,
 * so a repair round asks only what was invalidated. `folder` is where its components go (`Sections` in round 0; a
 * later round builds beside the last one and the last one is deleted once the new one is written).
 */
export async function planRound(d: PageDeps, card: Card, prep: Prepared, folder = 'Sections'): Promise<Planned> {
  d.progress?.('choosing the sections');
  const sections = await stage1(d, card);
  const ctx: BuildCtx = {
    vocab: prep.vocab,
    comps: prep.vocab.compositions || [],
    glyphs: prep.vocab.icons?.[0]?.glyphs || [],
    iconShape: prep.vocab.icons?.[0]?.valueShape,
    pageTaken: new Set(),
    photoCursor: 0,
    besideCount: 0,
    bitsSoFar: [],
    saidSoFar: [],
    labelOf: (t) => prep.nodeTypes.find((x) => x.typeName === t)?.displayName || t
  };
  const built: Built[] = [];
  for (let si = 0; si < sections.length; si++) {
    d.progress?.(`section ${si + 1} of ${sections.length}: ${sections[si].kind}`);
    const b = await fillSection(d, ctx, card, await buildSection(d, ctx, card, sections, si), si);
    if (folder !== 'Sections') b.path = b.path!.replace(/^Sections\//, `${folder}/`);
    built.push(b);
  }
  return { sections, built, itemComps: assemble(built) };
}

/** A section the validator refused: left out of the page, and reported (the critics re-ask its bits). */
export interface Refusal {
  target: string;
  text: string;
  S: string;
  si: number;
}

export interface Written {
  staging: Refusal[];
  applied: boolean;
  applyHead?: string;
  /** apply_plan's render block: the summary and the findings, when it rendered. */
  render?: any;
  findings: any[];
  /** Every component this round wrote, sections before their items (the order they can be deleted in). */
  paths: string[];
}

/**
 * One round into the bound project: the plan staged and applied, Home pointing at its sections. A section the
 * validator refuses is skipped and reported, not fatal: a page with five good sections beats no page.
 */
export async function writeRound(d: PageDeps, card: Card, planned: Planned, tool: Tool): Promise<Written> {
  const { built, itemComps } = planned;
  d.progress?.('building the page');
  const home = await need(tool, 'get_component', { path: 'Pages/Home' });
  const pageNode = (home.nodes || []).find((n: any) => n.type === 'Page');
  if (!pageNode) throw new Error('The project has no Page node on Pages/Home.');
  const plan = await need(tool, 'create_plan', {
    request: d.request,
    scroll: 'page',
    operations: [
      ...itemComps.map((c) => ({ kind: 'create', target: c.path, intent: `One item of the ${c.b.sec.kind} list`, inputs: c.varying.map((v) => ({ name: v.port, type: 'string' })) })),
      ...built.map((b) => ({ kind: 'create', target: b.path, intent: `The ${b.sec.kind} section: ${b.sec.purpose}`, ...(b.instantiates ? { instantiates: b.instantiates } : {}) })),
      { kind: 'update', target: 'Pages/Home', intent: 'The page, its sections top to bottom.', instantiates: built.map((b) => b.path) }
    ]
  });
  const opFor = (t: string) => plan.operations.find((o: any) => o.target === t).id;
  const staging: Refusal[] = [];
  const failed = new Set<string>();
  for (const c of itemComps) {
    const r = await tool('stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(c.path), ...c.graph });
    if (r.isError) {
      failed.add(c.path);
      staging.push({ target: c.path, text: r.text.slice(0, 500), S: c.b.S, si: built.indexOf(c.b) });
    }
  }
  for (const [si, b] of built.entries()) {
    if ((b.instantiates || []).some((p) => failed.has(p))) {
      b.staged = false;
      continue;
    }
    const r = await tool('stage_plan_operation', { plan_id: plan.planId, operation_id: opFor(b.path!), ...graphOf(b) });
    const diags: any[] = r.json?.validation?.diagnostics || r.json?.diagnostics || r.json?.error?.diagnostics || [];
    b.warnings = diags.filter((x) => x.severity === 'warning').map((x) => ({ code: x.code, message: String(x.message).slice(0, 240), nodeId: x.location?.nodeId }));
    b.staged = !r.isError && !diags.some((x) => x.severity === 'error');
    if (!b.staged) staging.push({ target: b.path!, text: (diags.filter((x) => x.severity === 'error').map((x) => `${x.code}: ${x.message}`).join(' | ') || r.text).slice(0, 500), S: b.S, si });
  }
  await need(tool, 'stage_plan_operation', {
    plan_id: plan.planId,
    operation_id: opFor('Pages/Home'),
    nodes: [{ id: pageNode.id, type: 'Page', label: 'Home', parameters: { title: card.name || 'Home', urlPath: 'home' } }, ...built.flatMap((b, i) => (b.staged ? [{ id: `home-s${i + 1}`, type: `/${b.path}`, parent: pageNode.id, label: b.sec.kind }] : []))],
    connections: [],
    visual_roots: [pageNode.id]
  });
  const skip = [...itemComps.filter((c) => failed.has(c.path) || !c.b.staged).map((c) => opFor(c.path)), ...built.filter((b) => !b.staged).map((b) => opFor(b.path!))];
  const ap = await tool('apply_plan', { plan_id: plan.planId, render: 'summary', ...(skip.length ? { skip } : {}) });
  const render = ap.json?.render;
  const paths = [...built.filter((b) => b.staged).map((b) => b.path!), ...itemComps.filter((c) => !failed.has(c.path) && c.b.staged).map((c) => c.path)];
  return { staging, applied: !ap.isError, applyHead: ap.isError ? ap.text.slice(0, 400) : undefined, render, findings: Array.isArray(render?.findings) ? render.findings : [], paths };
}

/** Delete a round's components once nothing points at them any more (sections first: they instantiate the items). */
export async function deleteRound(tool: Tool, paths: string[]): Promise<void> {
  for (const p of paths) await tool('delete_component', { path: p });
}

export interface PageResult extends Planned, Written {
  card: Card;
}

/** Round 0 alone: the card, the theme, the page asked, filled and written. */
export async function buildPage(d: PageDeps, card: Card, tool: Tool): Promise<PageResult> {
  const prep = await preparePage(d, card, tool);
  const planned = await planRound(d, card, prep);
  return { card, ...planned, ...(await writeRound(d, card, planned, tool)) };
}

/** A stock photo reader for the bound project: the file as base64, or null. */
export function photoReader(projectDir: string, moduleDir: string): (file: string) => string | null {
  return (file) => {
    try {
      return fs.readFileSync(path.join(projectDir, moduleDir, file)).toString('base64');
    } catch {
      return null;
    }
  };
}
