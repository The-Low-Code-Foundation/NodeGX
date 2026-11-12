/**
 * P112 OWN-031 step 3 — the page looked at, critiqued and repaired: OWN-029's review loop, ported from
 * `dev-docs/tasks/phase-112-your-own-nodegx/own-029/agent.mjs` (harness 22989dd1, the s3 defaults: accept by
 * constraint, organisation read on the outline without words, the peak ratchet, the contradiction critic, v4).
 *
 * Per round: build (a cached answer replays, so only what a fix invalidated is asked again), then
 *   describe  the script writes each section out in words, top to bottom, the way a reader meets it;
 *   critique  script rules over the graph (S1–S14), the validator's refusals (V), the render's findings mapped back to
 *             the section that drew them (R), and the reviewer's one-token yes/no and pick-one questions (J, M, C, P, Q);
 *   accept    a round is kept if defects per line fall and organisation holds (or organisation rises 0.1+ with defects
 *             per line within 10%); otherwise the best round's answers are restored;
 *   repair    the best round's heaviest untried issues, each touching only the answers it names: re-word a line or
 *             re-ask a choice with the reason as a hint, flip a decision to the model's own second choice, take a bit out
 *             of a section's choices, add or drop a section.
 *
 * OWN-031 §7 ruling 2 said the reviewer's answers may trigger a repair but never decide a round. The `organised` and
 * `shape` judgements do decide one here, as they did in the lab, because `build_app` asks a model on the server's own
 * machine (Ollama), with logprobs: the reason for the ruling (a client model through MCP gives no confidence) does
 * not apply to it. A client-model reviewer, when there is one, is the place to revisit that.
 *
 * @module noodl-mcp/guided/review
 */
import type { Door } from './door';
import { DARK, readRequest, type Built, type Card, type Refusal } from './page';
import { BIT_LABEL } from './page';

// OWN-029 s3 — the organisation judge without the words (shape.mjs): the words cannot move it, and a reword cannot be
// refused by it.
export const SHAPE_Q = 'Is this page well organised for this request: the first section can say what it is and what to do, the sections come in a sensible order, the parts suit each section, and no part is repeated?';
const SECTION_KINDS = ['hero', 'about', 'feature cards', 'how it works', 'gallery', 'menu or prices', 'schedule or line-up', 'testimonials', 'team', 'faq', 'location and hours', 'sign-up or contact form', 'call to action', 'footer'];
const dot = (t: unknown): string => String(t || '').trim().replace(/[.!]+$/, '');
const norm = (t: unknown): string => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/** One round as built: what the critics read. */
export interface RoundRes {
  card: Card;
  built: Built[];
  staging: Refusal[];
  findings: any[];
  shape?: number | null;
  org?: number | null;
  suits?: number | null;
}

export interface Fix {
  op: 'reword' | 'reask' | 'flip' | 'exclude' | 'addSection' | 'dropSection';
  sig?: string;
  hint?: string;
  decision?: any;
  S?: string;
  bit?: string;
  kind?: string;
  index?: number;
}

/** `id` is stable across rounds, so a fix that was tried and did not help is not tried again. */
export interface Issue {
  id: string;
  weight: number;
  section: number;
  say: string;
  fix: Fix | null;
  quality?: boolean;
}

export interface Line {
  label: string;
  text: string;
  sig?: string;
  node: any;
}

// ─── Describe: the page in words, the way a reader meets it ───────────────────────────────────────────────────────
const subtreeOf = (n: any) => {
  const out = [n];
  for (let i = 0; i < out.length; i++) out.push(...out[i].children);
  return out;
};

/** Per section: the text a reviewer reads, and the lines (label, text, signature) it can point at. */
export function describe(b: Built): { text: string; lines: Line[] } {
  const nodes = b.nodes!;
  const lines: Line[] = [],
    out: string[] = [];
  const walk = (n: any) => {
    if (n.itemOf && n.field) {
      out.push(`- a form field: ${n.children.map((c: any) => c.params.text || c.params.placeholder).filter(Boolean).map((w: string) => `"${w}"`).join(' / ')}`);
      return;
    }
    if (n.itemOf) {
      if (n.itemOf[0] === 1) {
        const items = nodes.filter((m) => m.parent === n.parent && m.itemOf);
        const parts = [...new Set(nodes.filter((m) => m.listIndex !== undefined && (m.params.text || m.params.label || m.type === 'Image' || m.type === 'net.noodl.visual.icon')).map((m) => (m.type === 'Image' ? 'photo' : m.type === 'net.noodl.visual.icon' ? 'icon' : BIT_LABEL(m))))];
        out.push(`- ${items.length} ${n.look === 'none' ? 'items' : `${n.look}s`} in a ${nodes[n.parent].type === 'Group' ? 'single column' : 'grid'}, each: ${parts.join(', ')}:`);
        for (const it of items) {
          const ws = subtreeOf(it).filter((m) => m.params.text || m.params.label).map((m) => m.params.text || m.params.label);
          out.push(`  ${it.itemOf[0]}. ${ws.map((w: string) => `"${w}"`).join(' — ')}`);
          for (const m of subtreeOf(it)) if ((m.params.text || m.params.label) && !m.fixedText) lines.push({ label: `item ${it.itemOf[0]} ${BIT_LABEL(m)}`, text: m.params.text || m.params.label, sig: m.sig, node: m });
        }
      }
      return;
    }
    if (n.type === 'Image') out.push(`- a photo (${n.photoFile || 'none'})`);
    const w = n.params.text || n.params.label || n.params.placeholder;
    if (w && n.type !== 'Image') {
      const lab = BIT_LABEL(n);
      out.push(`- ${lab}: "${w}"`);
      if (!n.fixedText) lines.push({ label: lab, text: w, sig: n.sig, node: n });
    }
    for (const c of n.children) walk(c);
  };
  walk(nodes[0]);
  return { text: `Section "${b.sec.kind}" (${DARK.has(nodes[0].look) ? 'dark band' : 'light band'}). Top to bottom:\n${out.join('\n')}`, lines };
}

export interface Critique {
  issues: Issue[];
  score: number;
  sum: number;
  defects: number;
  lines: number;
  perLine: number;
  org: number | null;
  shape: number | null;
  suits: number | null;
  descs: { text: string; lines: Line[] }[];
}

// ─── Critique ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function critique(door: Door, request: string, res: RoundRes): Promise<Critique> {
  const issues: Issue[] = [];
  const { built, card } = res;
  const photos = card.photos || [];
  const reqLine = `Request: "${request}"`;
  const descs = built.map(describe);
  // S1 photos: one file in three or more places, or the same photo twice in one list
  const uses: Record<string, { si: number; n: any }[]> = {};
  built.forEach((b, si) =>
    b.nodes!.forEach((n) => {
      if (n.photoFile && !n.avatar) (uses[n.photoFile] = uses[n.photoFile] || []).push({ si, n });
    })
  );
  for (const [f, us] of Object.entries(uses)) {
    const inList: Record<string, number> = {};
    for (const u of us) if (u.n.listIndex !== undefined) inList[u.si] = (inList[u.si] || 0) + 1;
    for (const [si, k] of Object.entries(inList)) if (k > 1) issues.push({ id: `S1list|${built[+si].S}`, weight: 3, section: +si, say: `the list in "${built[+si].sec.kind}" shows the same photo ${k} times`, fix: { op: 'reask', sig: `${built[+si].S}|items.bits`, hint: `the page has only ${photos.length} photo(s), so ${k} items would repeat one picture. Choose an icon or a number instead of a photo.` } });
    if (us.length >= 3) for (const u of us.slice(2)) if (u.n.listIndex === undefined) issues.push({ id: `S1page|${built[u.si].S}`, weight: 2, section: u.si, say: `"${f}" appears ${us.length} times on the page`, fix: { op: 'reask', sig: `${built[u.si].S}|bits`, hint: `the page already shows the photo "${f}" ${us.length - 1} other times. Choose bits WITHOUT a photo for this section.` } });
  }
  // S2 words that talk about the styling; S3 words that echo a node type; S4 a list's headline that is item one;
  // S5 a line that repeats another; S6 a button label too long to fit. Only words that describe the LOOK: the
  // request's own colour word (if it said one as a colour) and colour/theme/style. Tone words are left to the
  // reviewer: "warm croissants" and "trustworthy plumbers" are words a business uses.
  const cw = readRequest(request).colourWord;
  const styleWords = [...new Set([...(cw && !['warm'].includes(cw) ? [cw] : []), 'colour', 'color', 'theme'])];
  const seen: { nt: string; t: string; sig: string }[] = [];
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
  for (let si = 1; si < built.length - 1; si++) {
    if ([si - 1, si, si + 1].every((k) => DARK.has(built[k].nodes![0].look))) {
      const d = built[si].decisions.find((x) => x.key === `s${si}.look.band`);
      if (d) issues.push({ id: `S8|${d.sig}`, weight: 2, section: si, say: 'three dark bands in a row', fix: { op: 'flip', sig: d.sig, decision: d } });
    }
  }
  // S10 the same one-per-page part twice: a second form, a third quote block
  for (const once of ['form']) {
    const at = built.map((b, i) => (b.bits.includes(once) ? i : -1)).filter((i) => i >= 0);
    for (const si of at.slice(1)) issues.push({ id: `S10|${once}|${built[si].S}`, weight: 4, section: si, say: `a second ${once} (already in "${built[at[0]].sec.kind}")`, fix: { op: 'reask', sig: `${built[si].S}|bits`, hint: `the page already has a ${once} in the "${built[at[0]].sec.kind}" section. Do not choose ${once} again.` } });
  }
  const qs = built.map((b, i) => (b.bits.includes('quote') ? i : -1)).filter((i) => i >= 0);
  for (const si of qs.slice(2)) issues.push({ id: `S10|quote|${built[si].S}`, weight: 2, section: si, say: `a quote in a ${qs.indexOf(si) + 1}th section`, fix: { op: 'reask', sig: `${built[si].S}|bits`, hint: `the page already has quotes in ${qs.length - 1} other sections. Do not choose quote or name line here.` } });
  // S11 one phrase said over and over across the page ("Find your perfect …" ten times)
  const grams: Record<string, { si: number; l: Line }[]> = {};
  descs.forEach((d, si) =>
    d.lines.forEach((l) => {
      if (!l.sig) return;
      const w = norm(l.text).split(/\s+/);
      const seenHere = new Set<string>();
      for (let k = 0; k + 2 < w.length; k++) {
        const g = w.slice(k, k + 3).join(' ');
        if (seenHere.has(g) || /^(and|the|to|of|a|for|with|your|our) /.test(g)) continue;
        seenHere.add(g);
        (grams[g] = grams[g] || []).push({ si, l });
      }
    })
  );
  for (const [g, us] of Object.entries(grams)) if (us.length >= 4) for (const u of us.slice(2)) issues.push({ id: `S11|${u.l.sig}`, weight: 1.5, section: u.si, say: `"${g}" is said ${us.length} times on the page`, fix: { op: 'reword', sig: u.l.sig, hint: `the page already says "${g}" ${us.length - 1} other times. Say it with different words.` } });
  // S12 four or more bands in a row on the same ground read as one long section: flip the middle one's ground
  for (let si = 0; si + 3 < built.length; si++) {
    const run = built.slice(si, si + 4).map((b) => b.nodes![0].look);
    if (new Set(run).size === 1) {
      const k = si + 2,
        d = built[k].decisions.find((x) => x.key === `s${k}.look.band`);
      if (d) issues.push({ id: `S12|${d.sig}`, weight: 2, section: k, say: `four "${run[0]}" bands in a row`, fix: { op: 'flip', sig: d.sig, decision: d } });
    }
  }
  // S13 one list's items repeated in another section (the same three products as a card row in three sections). Items
  // match on a shared content word ("Sourdough loaf" / "Our sourdough"); two matches flag the later list. A reword never
  // cleared it (a brief that names three products gets the same three again), so the repair takes the list out of
  // this section's choices and re-asks its bits.
  const STOP = new Set(['your', 'with', 'from', 'that', 'this', 'what', 'have', 'into', 'more', 'every', 'each', 'about', 'their', 'there', 'make', 'made', 'fresh', 'local', 'best']);
  const content = (t: string) => new Set(norm(t).split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/s$/, '')));
  const lists = descs.map((d, si) => ({ si, items: d.lines.filter((l) => /^item \d+ title$/.test(l.label)).map((l) => ({ l, w: content(l.text) })) })).filter((x) => x.items.length >= 2);
  for (let a = 1; a < lists.length; a++) {
    for (let e = 0; e < a; e++) {
      const hits = lists[a].items.filter((it) => lists[e].items.some((o) => [...it.w].some((w) => o.w.has(w))));
      if (hits.length < 2) continue;
      // the menu is where the products belong: when the later list IS the menu, the earlier one is the repeat
      const swap = built[lists[a].si].sec.kind === 'menu or prices' && built[lists[e].si].sec.kind !== 'menu or prices';
      const L = swap ? lists[e] : lists[a],
        E = swap ? lists[a] : lists[e],
        sig = L.items[0].l.sig;
      issues.push({ id: `S13|${built[L.si].S}`, weight: 3, section: L.si, say: `the "${built[L.si].sec.kind}" list repeats the items of "${built[E.si].sec.kind}" (${hits.map((h) => `"${h.l.text}"`).join(', ')})`, fix: sig ? { op: 'exclude', S: built[L.si].S, bit: 'list of items', sig: `${built[L.si].S}|bits`, hint: `the "${built[E.si].sec.kind}" section already lists ${E.items.map((o) => `"${o.l.text}"`).join(', ')}. This section says something else, without a list.` } : null });
      break;
    }
  }
  // S14 prices that disagree, checked by a script: two currencies on one page ("$5–8" beside "€"), two section-level
  // prices that differ ("$45 per person" and "Tickets: $35"), a "from $X" that is not the lowest item price, a single
  // price above a list that is not one of its prices. A list's items may differ by design.
  const CUR: Record<string, string> = { $: '$', dollar: '$', dollars: '$', usd: '$', '€': '€', euro: '€', euros: '€', eur: '€', '£': '£', gbp: '£' };
  const money: { l: Line; si: number; cur: string; amt: number; item: boolean }[] = [];
  descs.forEach((d, si) =>
    d.lines.forEach((l) => {
      if (!l.sig) return;
      for (const m of String(l.text).matchAll(/([$€£])\s?(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s?(€|£|euros?\b|eur\b|usd\b|dollars?\b|gbp\b)/gi)) {
        money.push({ l, si, cur: CUR[(m[1] || m[4]).toLowerCase()], amt: Number((m[2] || m[3]).replace(',', '.')), item: l.node?.listIndex !== undefined });
      }
    })
  );
  const curCount: Record<string, number> = {};
  for (const x of money) curCount[x.cur] = (curCount[x.cur] || 0) + 1;
  const main = Object.entries(curCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const x of money) if (x.cur !== main) issues.push({ id: `S14cur|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" prices in ${x.cur}, the rest of the page in ${main}`, fix: { op: 'reword', sig: x.l.sig, hint: `"${x.l.text}" uses ${x.cur}, but every other price on the page is in ${main}. One page, one currency: use ${main}.` } });
  // only a line that states ONE price: "From €2 to €15" or "Loaves €5.50 | Cakes from €15" is a range or a list
  const perLineN = new Map<Line, number>();
  for (const x of money) perLineN.set(x.l, (perLineN.get(x.l) || 0) + 1);
  const flat = money.filter((x) => !x.item && x.cur === main && perLineN.get(x.l) === 1);
  for (const x of flat.slice(1)) if (x.amt !== flat[0].amt && x.l.sig !== flat[0].l.sig) issues.push({ id: `S14amt|${x.l.sig}`, weight: 3, section: x.si, say: `"${String(x.l.text).slice(0, 60)}" says ${main}${x.amt}, "${String(flat[0].l.text).slice(0, 40)}" says ${main}${flat[0].amt}`, fix: { op: 'reword', sig: x.l.sig, hint: `this line gives the price as ${main}${x.amt}, but the page already says ${main}${flat[0].amt} ("${flat[0].l.text}"). A page states one price: give ${main}${flat[0].amt}, or leave the price out.` } });
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
  for (const st of res.staging) issues.push({ id: `V|${st.S}`, weight: 5, section: st.si, say: `the MCP refused "${built[st.si]?.sec.kind}": ${st.text.slice(0, 160)}`, fix: { op: 'reask', sig: `${st.S}|bits`, hint: `the builder could not make that section: ${st.text.slice(0, 200)}. Choose simpler bits.` } });
  // R render findings, mapped back to the section whose words they quote
  const findSection = (txt: string) => {
    const t = norm(txt).slice(0, 24);
    if (!t) return -1;
    return built.findIndex((b) => b.nodes!.some((n) => norm(n.params.text || n.params.label).startsWith(t)));
  };
  for (const f of res.findings) {
    if (/favicon/.test(f.message)) continue;
    const evs = Array.isArray(f.evidence) ? f.evidence : f.evidence ? [f.evidence] : [];
    const ev = evs.find((e: any) => e?.text);
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
    const b: any = built[si],
      d = descs[si];
    if (!d.lines.length) continue;
    const pSound = await door.judge(`s${si}.sound`, `${ctxLine}\n\n${d.text}\n\nDoes every line read like something a real business or organisation would publish on this page, with nothing odd, cut off, repeated, off-topic or strange?`, { section: si });
    b.pSound = pSound;
    if (pSound !== null && pSound < 0.5) {
      const weakest = await door.pick(`s${si}.weakest`, `${ctxLine}\n\n${d.text}\n\nWhich line is the weakest: odd, cut off, repeated or off-topic?`, d.lines.map((l) => `${l.label}: "${String(l.text).slice(0, 70)}"`), { section: si });
      const l = d.lines.find((x) => weakest?.startsWith(`${x.label}:`)) || d.lines[0];
      issues.push({ id: `J1|${l.sig}`, weight: 3 * (1 - pSound), section: si, say: `reviewer (p=${pSound}): weakest line ${l.label} "${String(l.text).slice(0, 50)}"`, fix: l.sig ? { op: 'reword', sig: l.sig, hint: `a reviewer found "${String(l.text).slice(0, 80)}" weak: odd, cut off, repeated or off-topic for ${card.name}. Write it fresh.` } : null });
    }
    const head = d.lines.find((l) => l.label === 'headline');
    if (head && b.bits.includes('list of items')) {
      const pFit = await door.judge(`s${si}.fits`, `${ctxLine}\n\n${d.text}\n\nDoes the headline describe the WHOLE section, not just one item in it?`, { section: si });
      b.pFit = pFit;
      if (pFit !== null && pFit < 0.5) issues.push({ id: `J2|${head.sig}`, weight: 3 * (1 - pFit), section: si, say: `reviewer (p=${pFit}): headline "${head.text}" doesn't cover the section`, fix: { op: 'reword', sig: head.sig, hint: `the headline "${head.text}" does not introduce the whole section. It sits above a list of ${b.nodes.filter((n: any) => n.itemOf && !n.field).length} items: name what they are together.` } });
    }
  }
  // M the page's own acceptance criteria: does it say what the request says it must?
  const allWords = descs.map((d, i) => `[${built[i].sec.kind}] ${d.lines.map((l) => String(l.text).slice(0, 90)).join(' / ')}`).join('\n');
  for (const fact of card.mustShow || []) {
    const p = await door.judge('page.mustShow', `${ctxLine}\nEvery line of words on the page, by section:\n${allWords}\n\nDoes the page tell a visitor: ${fact}?`, { fact });
    if (p === null || p >= 0.5) continue;
    const where = await door.pick('page.mustShowWhere', `${ctxLine}\nThe page must tell a visitor: ${fact}. It does not yet. Which section should say it?`, built.map((b, i) => `${i + 1}. ${b.sec.kind}`));
    const si = where ? Number(where.split('.')[0]) - 1 : 0;
    const b = built[si];
    const line = b && descs[si].lines.find((l) => ['sub-line', 'paragraph', 'date and place'].includes(l.label));
    issues.push({ id: `M|${fact}`, weight: 4 * (1 - p), section: si, say: `reviewer (p=${p}): the page does not say "${fact}"`, fix: line ? { op: 'reword', sig: line.sig, hint: `the page must tell a visitor: ${fact}. Say it in this line.` } : b ? { op: 'reask', sig: `${b.S}|bits`, hint: `the page must tell a visitor: ${fact}, and this section is where it goes. Include a bit that can say it (a sub-line, body text, or date and place).` } : null });
  }
  // C does any line say something the request contradicts? ("Mon-Sat" for "open Tuesday to Sunday", "$" for Lyon)
  const pC = await door.judge('page.contradicts', `${reqLine}\nEvery line of words on the page, by section:\n${allWords}\n\nDoes any line say something the request contradicts, or invent a detail it would need to know (a different day, date, time, place, price, currency or name)?`);
  if (pC !== null && pC > 0.5) {
    const cand = descs.flatMap((d, si) => d.lines.filter((l) => l.sig && /\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|daily|street|st\.|avenue|road|\$|€|£|\[/i.test(l.text)).map((l) => ({ ...l, si }))).slice(0, 12);
    if (cand.length) {
      const w = await door.pick('page.contradictsWhich', `${reqLine}\nWhich line contradicts the request or invents a detail?`, cand.map((l) => `${built[l.si].sec.kind} ${l.label}: "${String(l.text).slice(0, 70)}"`));
      const l = cand.find((x) => w?.startsWith(`${built[x.si].sec.kind} ${x.label}:`)) || cand[0];
      issues.push({ id: `C|${l.sig}`, weight: 4 * pC, section: l.si, say: `reviewer (p=${pC}): "${String(l.text).slice(0, 60)}" contradicts the request or invents a detail`, fix: { op: 'reword', sig: l.sig, hint: `that line contradicted the request or invented a detail. The request says: "${request}". Use only what it says; leave out what it does not.` } });
    }
  }
  // P the reviewer reads the page outline: is a section missing, or one too many?
  const outline = built.map((b, i) => `${i + 1}. ${b.sec.kind}: "${descs[i].lines.find((l) => l.label === 'headline')?.text || descs[i].lines[0]?.text || '(no words)'}"`).join('\n');
  const pageQ = `${reqLine}\n${ctxLine}\nThe page's sections, top to bottom:\n${outline}`;
  const pMissing = await door.judge('page.missing', `${pageQ}\n\nIs something a visitor would clearly expect on this page missing?`);
  if (pMissing !== null && pMissing > 0.6) {
    const absent = SECTION_KINDS.filter((k) => !built.some((b) => b.sec.kind === k));
    const kind = await door.pick('page.missingWhich', `${pageQ}\n\nWhich section should be added?`, absent);
    if (kind) issues.push({ id: `P1|${kind}`, weight: 3 * pMissing, section: -1, say: `reviewer (p=${pMissing}): add a "${kind}" section`, fix: { op: 'addSection', kind } });
  }
  // the sections that carry the brief's substance are not the reviewer's to drop, and a drop needs a clear yes
  const KEEP = new Set(['hero', 'footer', 'call to action', 'location and hours', 'menu or prices', 'schedule or line-up', 'sign-up or contact form']);
  if (built.length > 3) {
    const pExtra = await door.judge('page.extra', `${pageQ}\n\nDoes any section repeat another one, or not belong on this page?`);
    if (pExtra !== null && pExtra > 0.8) {
      const which = await door.pick('page.extraWhich', `${pageQ}\n\nWhich section should be removed?`, built.map((b, i) => `${i + 1}. ${b.sec.kind}`).filter((_, i) => !KEEP.has(built[i].sec.kind)));
      const i = which ? Number(which.split('.')[0]) - 1 : -1;
      if (i >= 0) issues.push({ id: `P2|${built[i].S}`, weight: 3 * pExtra, section: i, say: `reviewer (p=${pExtra}): drop section ${which}`, fix: { op: 'dropSection', index: i } });
    }
  }
  // Q the quality term: the reviewer reads the page OUTLINE and says whether it is well organised and whether its type
  // and parts suit it. Without it a thinner page scored better.
  const outlineQ = `${reqLine}\nType: ${card.pairing}. Sections, top to bottom:\n${built.map((b, i) => `${i + 1}. ${b.sec.kind} (${b.nodes![0].look}): ${b.bits.join(', ')} — ${(descs[i].lines.find((l) => l.label === 'headline')?.text || descs[i].lines[0]?.text || '').slice(0, 70)}`).join('\n')}`;
  const pOrg = await door.judge('page.organised', `${outlineQ}\n\nIs this page well organised: it opens by saying what it is and what to do, the sections come in a sensible order, and no part is repeated?`);
  const pType = await door.judge('page.suits', `${outlineQ}\n\nDo the type and the parts suit this kind of page?`);
  const shapeQ = `${reqLine}\nType: ${card.pairing}. Sections, top to bottom:\n${built.map((b, i) => `${i + 1}. ${b.sec.kind} (${b.nodes![0].look}): ${b.bits.join(', ')}`).join('\n')}`;
  res.shape = await door.judge('page.shape', `${shapeQ}\n\n${SHAPE_Q}`);
  issues.push({ id: 'Q|org', quality: true, weight: 8 * (1 - (pOrg ?? 0.5)), section: -1, say: `reviewer: organised p=${pOrg}`, fix: pOrg !== null && pOrg < 0.5 ? { op: 'reask', sig: 'sections', hint: 'a reviewer found the page badly organised. Open with a section that says what this is and what to do; put the sections in the order a visitor needs them; do not repeat a kind.' } : null });
  issues.push({ id: 'Q|type', quality: true, weight: 4 * (1 - (pType ?? 0.5)), section: -1, say: `reviewer: type and parts suit p=${pType}`, fix: null });
  res.org = pOrg;
  res.suits = pType;
  const byId = new Map<string, Issue>();
  for (const i of issues) if (!byId.has(i.id) || byId.get(i.id)!.weight < i.weight) byId.set(i.id, i);
  const kept = [...byId.values()];
  const sum = +kept.reduce((a, x) => a + x.weight, 0).toFixed(2);
  const defects = +kept.filter((x) => !x.quality).reduce((a, x) => a + x.weight, 0).toFixed(2);
  const lines = descs.reduce((a, d) => a + d.lines.length, 0);
  const perLine = +(defects / Math.max(1, lines)).toFixed(3);
  return { issues: kept, score: perLine, sum, defects, lines, perLine, org: res.org ?? null, shape: res.shape ?? null, suits: res.suits ?? null, descs };
}

/**
 * Keep a round? Organisation (the outline judge without words) may not fall more than 0.1 below the highest any kept
 * round reached, and defects per line must fall, unless organisation rose by 0.1+ with defects per line within 10%.
 */
export function better(c: Critique, best: Critique | null, peak: number | null): boolean {
  if (!best) return true;
  const co = c.shape,
    bo = best.shape;
  const known = co !== null && bo !== null;
  const floor = peak !== null && bo !== null ? Math.max(bo, peak) : bo;
  if (known && co! < floor! - 0.1) return false;
  if (c.perLine < best.perLine) return true;
  return known && co! >= bo! + 0.1 && c.perLine <= best.perLine * 1.1;
}

// ─── Repair: each fix touches only the answers it names ──────────────────────────────────────────────────────────
export async function repair(door: Door, request: string, card: Card, exclude: Map<string, Set<string>>, fix: Fix): Promise<boolean> {
  if (fix.op === 'reword' || fix.op === 'reask') {
    door.invalidate(fix.sig!, fix.hint);
    return true;
  }
  if (fix.op === 'flip') {
    const d = fix.decision;
    if (!d.conf?.second) return false;
    door.force(fix.sig!, d.conf.second);
    return true;
  }
  if (fix.op === 'exclude') {
    exclude.set(fix.S!, new Set([...(exclude.get(fix.S!) || []), fix.bit!]));
    door.invalidate(fix.sig!, fix.hint);
    return true;
  }
  const sc = door.cache.get('sections');
  if (!sc?.answer?.sections) return false;
  const list = sc.answer.sections;
  if (fix.op === 'addSection') {
    const at = list.findIndex((x: any) => x.kind === 'footer' || x.kind === 'call to action');
    const cardText = `Request: "${request}"\nBRIEF: a ${card.kind} called "${card.name}", for ${dot(card.audience)}. The one action: ${dot(card.action)}. Tone: ${card.tone}.`;
    const p = (await door.ask('sections.add', `sections.add|${fix.kind}`, { user: `${cardText}\nThe page gets a "${fix.kind}" section. What is its one-line purpose on THIS page?`, schema: { type: 'object', required: ['purpose'], properties: { purpose: { type: 'string', maxLength: 120 } } } }, 0.3)).answer;
    list.splice(at < 0 ? list.length : at, 0, { kind: fix.kind, purpose: p?.purpose || fix.kind });
    if (list.length > 8) return false;
    return true;
  }
  if (fix.op === 'dropSection') {
    if (list.length <= 3) return false;
    list.splice(fix.index!, 1);
    return true;
  }
  return false;
}

/** One round, as the loop records it (the lab's `roundsLog` entry, without the words). */
export interface RoundLog {
  round: number;
  perLine: number;
  defects: number;
  lines: number;
  sum: number;
  org: number | null;
  shape: number | null;
  suits: number | null;
  kept: boolean;
  issues: { id: string; weight: number; say: string; op?: string }[];
  findings: string[];
  fixesForNext?: string[];
}

export interface LoopResult<R extends RoundRes> {
  best: { round: number; crit: Critique; res: R };
  log: RoundLog[];
  /** The round whose page is in the project now (the last one built). */
  lastBuilt: number;
}

/**
 * The loop: build round 0, then up to `rounds` repairs. `build(round)` builds the page from the door's current answers
 * (and `exclude`); it is the caller's because where a round goes (the bound project, or a test's) is the caller's.
 */
export async function reviewLoop<R extends RoundRes>(opts: {
  door: Door;
  request: string;
  card: Card;
  exclude: Map<string, Set<string>>;
  rounds: number;
  build: (round: number) => Promise<R>;
  fixesPerRound?: number;
  tries?: number;
  progress?: (message: string) => void;
}): Promise<LoopResult<R>> {
  const { door, request, card, exclude } = opts;
  const FIXES = opts.fixesPerRound ?? 10,
    TRIES = opts.tries ?? 2;
  let best: (Critique & { round: number; snap: ReturnType<Door['snapshot']>; sectionsAnswer: any; exclude: Map<string, Set<string>>; res: R }) | null = null;
  let peak: number | null = null;
  // an issue may be tried twice: a re-word is a fresh sample, and "[City/Area]" came back bracketed once
  const tried = new Map<string, number>();
  const log: RoundLog[] = [];
  let lastBuilt = 0;
  for (let round = 0; round <= opts.rounds; round++) {
    door.setRound(round);
    const res = await opts.build(round);
    lastBuilt = round;
    opts.progress?.(`round ${round}: reading the page`);
    const crit = await critique(door, request, res);
    const entry: RoundLog = { round, perLine: crit.perLine, defects: crit.defects, lines: crit.lines, sum: crit.sum, org: crit.org, shape: crit.shape, suits: crit.suits, kept: false, issues: crit.issues.map((i) => ({ id: i.id, weight: +i.weight.toFixed(2), say: i.say, op: i.fix?.op })), findings: res.findings.map((f) => f.code) };
    log.push(entry);
    const improved = better(crit, best, peak);
    if (improved) {
      best = { ...crit, round, snap: door.snapshot(), sectionsAnswer: structuredClone(door.cache.get('sections')), exclude: new Map([...exclude].map(([k, v]) => [k, new Set(v)])), res };
      if (crit.shape !== null) peak = Math.max(peak ?? 0, crit.shape);
    } else {
      door.restore(best!.snap);
      door.cache.set('sections', structuredClone(best!.sectionsAnswer));
      exclude.clear();
      for (const [k, v] of best!.exclude) exclude.set(k, new Set(v));
    }
    entry.kept = improved;
    if (round === opts.rounds) break;
    // fixes from the best round's issues: heaviest first, not tried too often, one structural fix per section
    const queue = [...best!.issues].filter((i) => i.fix && (tried.get(i.id) || 0) < TRIES).sort((a, b) => b.weight - a.weight);
    if (!queue.length) break;
    const structural = new Set<number>();
    let n = 0,
      pageOp = false;
    const applied: string[] = [];
    for (const i of queue) {
      if (n >= FIXES) break;
      const isStruct = ['reask', 'exclude', 'flip', 'addSection', 'dropSection'].includes(i.fix!.op);
      if (['addSection', 'dropSection'].includes(i.fix!.op)) {
        if (pageOp) continue;
        pageOp = true;
      }
      if (isStruct && structural.has(i.section)) continue;
      tried.set(i.id, (tried.get(i.id) || 0) + 1);
      if (await repair(door, request, card, exclude, i.fix!)) {
        applied.push(i.id);
        n++;
        if (isStruct) structural.add(i.section);
      }
    }
    entry.fixesForNext = applied;
    opts.progress?.(`round ${round + 1}: ${applied.length} repairs`);
  }
  return { best: { round: best!.round, crit: best!, res: best!.res }, log, lastBuilt };
}
