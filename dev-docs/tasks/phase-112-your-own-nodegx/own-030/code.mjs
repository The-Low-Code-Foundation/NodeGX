// OWN-030 lanes "code-guided" and "code-bare": the small model writes HTML itself.
//
//   node code.mjs guided <brief> <graph run> <out dir> [--model gemma4:e2b-it-qat] [--rounds 4]
//   node code.mjs bare   <brief> <request> <out dir>   [--model gemma4:e2b-it-qat]
//
// guided: the graph run's stage 0 card and stage 1 sections (the same answers, read from its round-0 tree.json), then
// ONE call per section: "write this section's HTML", given the card, the section's purpose, the photos the scout kept
// and the names of the project's tokens. The script concatenates the sections under the same token sheet, then runs the
// word critics the graph lane runs on words (a repeated line, a phrase said 4+ times, a long button, words about the
// page), the reviewer (E4B, one token: "does every line read like something a real organisation would publish?") and a
// loop: a section with issues is rewritten with the reasons; a round is kept if defects per line fall.
// The graph-only critics (validator, S1/S7/S8/S10/S12–S14 over the graph) are not here, and the results say so.
// bare: "Write a complete landing page for: <request>. One HTML file, CSS inline." One call, no loop.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLM } from '../own-029/lm.mjs';
import { projectTokenCss, moduleStylesheets } from './emit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const MODEL = opt('--model', 'gemma4:e2b-it-qat'), JUDGE = opt('--judge', 'gemma4:e4b-it-qat');
const ROUNDS = Number(opt('--rounds', 4));
const OLLAMA = 'http://127.0.0.1:11434';
const ledger = { calls: [], judgements: [], rounds: [] };
const lm = makeLM({ model: MODEL, judgeModel: JUDGE, ledger });

async function write(prompt, numPredict) {
  const t = Date.now();
  const r = await fetch(`${OLLAMA}/api/chat`, { method: 'POST', body: JSON.stringify({ model: MODEL, stream: false, think: false, keep_alive: '30m',
    messages: [{ role: 'user', content: prompt }], options: { temperature: 0.3, num_predict: numPredict, num_ctx: 8192 } }) });
  const j = await r.json();
  const text = j.message?.content || '';
  ledger.calls.push({ prompt: prompt.slice(0, 4000), tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, done: j.done_reason });
  // the model wraps code in a fence more often than not
  const fenced = text.match(/```(?:html)?\s*\n([\s\S]*?)(?:```|$)/);
  return (fenced ? fenced[1] : text).trim();
}

// ─── words from HTML, the way agent.mjs describes a section (headline, sub-line, paragraph, button, item …) ─────────
const strip = (h) => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export function wordsOf(html) {
  const lines = [];
  const body = html.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '');
  for (const m of body.matchAll(/<(h[1-6]|p|button|a|li|label|blockquote|figcaption|span|td|th|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = strip(m[2]); if (!t || /<(p|h[1-6]|li|button)\b/i.test(m[2])) continue;
    const tag = m[1].toLowerCase();
    lines.push({ label: /^h1$|^h2$/.test(tag) ? 'headline' : /^h/.test(tag) ? 'title' : tag === 'button' || tag === 'a' ? 'button' : tag === 'li' ? 'item' : tag === 'blockquote' ? 'quote' : 'paragraph', text: t });
  }
  // a placeholder in a form counts as words a visitor reads
  for (const m of body.matchAll(/placeholder="([^"]+)"/gi)) lines.push({ label: 'input placeholder', text: m[1] });
  return lines;
}
const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

// the word critics that need no graph: S5, S6, S9, S11 (agent.mjs critique, the same rules)
function wordCritics(sections) {
  const issues = [], seen = [], grams = {};
  sections.forEach((s, si) => s.lines.forEach((l) => {
    const t = l.text;
    if (/\b(hero|section|landing page|concept|headline|sub-?line|blueprint|placeholder|lorem)\b|\[|\]/i.test(t)) issues.push({ si, weight: 3, say: `"${t.slice(0, 60)}" talks about the page instead of to the visitor` });
    if (l.label === 'button' && (t.length > 24 || t.split(/\s+/).length > 4)) issues.push({ si, weight: 2, say: `button "${t}" is too long for a button` });
    const nt = norm(t), dup = nt.length > 12 && seen.find((x) => x.nt === nt);
    if (dup && dup.si !== si) issues.push({ si, weight: 2, say: `"${t.slice(0, 60)}" repeats a line in another section` });
    seen.push({ nt, si });
    const w = nt.split(/\s+/), here = new Set();
    for (let k = 0; k + 2 < w.length; k++) { const g = w.slice(k, k + 3).join(' '); if (here.has(g) || /^(and|the|to|of|a|for|with|your|our) /.test(g)) continue; here.add(g); (grams[g] = grams[g] || []).push(si); }
  }));
  for (const [g, us] of Object.entries(grams)) if (us.length >= 4) for (const si of us.slice(2)) issues.push({ si, weight: 1.5, say: `"${g}" is said ${us.length} times on the page` });
  return issues;
}

// broken markup: a section that renders nothing, or open and close tags that do not pair
export function broken(html) {
  const out = [];
  for (const t of ['div', 'section', 'ul', 'form']) { const o = (html.match(new RegExp(`<${t}\\b`, 'gi')) || []).length, c = (html.match(new RegExp(`</${t}>`, 'gi')) || []).length; if (o !== c) out.push(`<${t}> opened ${o}, closed ${c}`); }
  if (!strip(html)) out.push('no words');
  return out;
}

const page = (title, tokens, moduleCss, sectionsHtml) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
${moduleCss.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<style>${tokens}
body{margin:0;font-family:var(--font-sans);color:var(--foreground);background:var(--background)}</style></head>
<body>
${sectionsHtml.join('\n')}
</body></html>`;

// the token names the coder is given: the families a section is styled from, every name in the sheet
const tokenNames = (css) => [...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]).filter((n) => /^--(primary|secondary|foreground|background|muted|accent|surface|border|card|space-|radius-|text-|display-|font-|leading-|tracking-|shadow-|gradient-)/.test(n) && !/-(50|100|200|300|400|500|600|700|800|900|950)$/.test(n));

async function guided(brief, graphRun, outDir) {
  const t0 = Date.now();
  const graph = path.join(HERE, '../own-029/runs', graphRun);
  const tree = JSON.parse(fs.readFileSync(path.join(graph, 'r0', 'tree.json'), 'utf8'));
  const G = JSON.parse(fs.readFileSync(path.join(graph, 'ledger.json'), 'utf8'));
  const project = G.roundsLog[0].project;
  const card = tree.card, sections = tree.sections.map((s) => ({ kind: s.kind, purpose: s.purpose }));
  const tokens = projectTokenCss(project), names = tokenNames(tokens);
  const photos = (card.photos || []).map((f) => `noodl_modules/starter-imagery/${f}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.cpSync(path.join(project, 'noodl_modules'), path.join(outDir, 'noodl_modules'), { recursive: true });
  const cardText = `Request: "${G.request}"\nBRIEF: a ${card.kind} called "${card.name}", for ${card.audience}. The one action: ${card.action}. Tone: ${card.tone}.`;
  const outline = sections.map((s, i) => `${i + 1}. ${s.kind}`).join(', ');
  const ask = (si, hint) => write(`${cardText}
The page's sections, top to bottom: ${outline}.
Write the HTML for section ${si + 1}, the "${sections[si].kind}" section (${sections[si].purpose}).
Write ONE <section> element with its content and a <style> block or inline styles for it. No <html>, <head> or <body>.
Style it ONLY with these CSS custom properties, as var(--name): ${names.join(', ')}.
${photos.length ? `Photographs you may use (img src exactly as written, or none): ${photos.join(', ')}.` : 'Use no photographs and no image URLs.'}
Write the words a visitor reads, about ${card.name}. Use only facts from the request; invent no address, phone number, price or name it does not give.${hint ? `\nThis section was written before, and a reviewer found: ${hint} Write it again, fixing that.` : ''}`, 1800);

  let html = [];
  for (let si = 0; si < sections.length; si++) html.push(await ask(si));
  let best = null;
  const tried = new Map();
  for (let round = 0; round <= ROUNDS; round++) {
    lm.setRound(round);
    const secs = html.map((h, si) => ({ si, kind: sections[si].kind, lines: wordsOf(h), broken: broken(h) }));
    const issues = wordCritics(secs);
    for (const s of secs) {
      if (s.broken.length) issues.push({ si: s.si, weight: 5, say: `broken markup: ${s.broken.join('; ')}` });
      if (!s.lines.length) continue;
      const text = `Section "${s.kind}". Top to bottom:\n${s.lines.map((l) => `- ${l.label}: "${l.text.slice(0, 160)}"`).join('\n')}`;
      const p = await lm.judge(`s${s.si}.sound`, `A ${card.kind} called "${card.name}", for ${card.audience}.\n\n${text}\n\nDoes every line read like something a real business or organisation would publish on this page, with nothing odd, cut off, repeated, off-topic or strange?`);
      if (p !== null && p < 0.5) issues.push({ si: s.si, weight: 3 * (1 - p), say: `reviewer (p=${p}): a line in "${s.kind}" reads odd, cut off, repeated or off-topic` });
    }
    const lines = secs.reduce((a, s) => a + s.lines.length, 0);
    const defects = issues.reduce((a, x) => a + x.weight, 0), perLine = +(defects / Math.max(1, lines)).toFixed(3);
    const kept = !best || perLine < best.perLine;
    const file = path.join(outDir, `r${round}.html`);
    fs.writeFileSync(file, page(card.name, tokens, moduleStylesheets(project), html));
    ledger.rounds.push({ round, perLine, defects: +defects.toFixed(2), lines, kept, issues: issues.map((i) => ({ si: i.si, say: i.say, weight: +i.weight.toFixed(2) })), broken: secs.flatMap((s) => s.broken.map((b) => `${s.kind}: ${b}`)) });
    console.log(`round ${round}: per line ${perLine} (${issues.length} issues) ${kept ? 'KEPT' : 'reverted'}`);
    if (kept) best = { round, perLine, html: [...html], issues };
    else html = [...best.html];
    if (round === ROUNDS) break;
    // rewrite each flagged section once per round, with every reason it was flagged; two tries per section
    const bySec = {};
    for (const i of best.issues) (bySec[i.si] = bySec[i.si] || []).push(i.say);
    const todo = Object.entries(bySec).filter(([si]) => (tried.get(si) || 0) < 2);
    if (!todo.length) break;
    for (const [si, says] of todo) { tried.set(si, (tried.get(si) || 0) + 1); html[si] = await ask(+si, says.join(' ')); }
  }
  fs.copyFileSync(path.join(outDir, `r${best.round}.html`), path.join(outDir, 'index.html'));
  return { lane: 'code-guided', brief, from: graphRun, model: MODEL, judge: JUDGE, bestRound: best.round, perLine: best.perLine, minutes: +((Date.now() - t0) / 60000).toFixed(1) };
}

async function bare(brief, request, outDir) {
  const t0 = Date.now();
  fs.mkdirSync(outDir, { recursive: true });
  const html = await write(`Write a complete landing page for: ${request}. One HTML file, CSS inline.`, 6000);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  ledger.rounds.push({ round: 0, broken: broken(html), words: wordsOf(html).length });
  return { lane: 'code-bare', brief, model: MODEL, minutes: +((Date.now() - t0) / 60000).toFixed(1) };
}

const [mode, brief, a, outDir] = argv;
const result = mode === 'guided' ? await guided(brief, a, outDir) : await bare(brief, a, outDir);
ledger.result = { ...result, builderCalls: ledger.calls.length, reviewerCalls: ledger.judgements.length,
  tokensIn: ledger.calls.reduce((s, c) => s + (c.tokensIn || 0), 0), tokensOut: ledger.calls.reduce((s, c) => s + (c.tokensOut || 0), 0) };
fs.writeFileSync(path.join(outDir, 'ledger.json'), JSON.stringify(ledger, null, 1));
console.log(JSON.stringify(ledger.result));
