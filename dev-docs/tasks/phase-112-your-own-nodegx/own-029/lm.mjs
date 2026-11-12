// OWN-029 — the model door. Every model answer goes through `ask`, which:
//   - replays a cached answer when the same question (by signature) was answered in an earlier round, so a repair
//     round re-asks only what the reviewer invalidated;
//   - appends a reviewer's hint to a question that is being re-asked;
//   - can be FORCED to a given answer (the "flip" repair: take the model's own second choice);
//   - reads Ollama's logprobs at the answer token of a single-enum schema and returns the model's distribution over the
//     options, so the agent knows which of its decisions it was unsure of.
// `judge` is the reviewer's one-token yes/no: P(yes) from the logprobs, no sampling.
export const SYSTEM = 'You answer one question about building a web page. Reply with JSON only, matching the schema. Be brief.';
export const JUDGE_SYSTEM = 'You review one part of a web page described in words. Answer yes or no.';

// The control: an answer drawn at random from the schema, for every question that is not words. Measures what the
// model's DECISIONS are worth: the script, the vocabulary and the words stay the same.
function randomAnswer(schema, rnd) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const one = (p) => {
    if (p.enum) return pick(p.enum);
    if (p.type === 'array' && p.items?.enum) { const n = (p.minItems || 1) + Math.floor(rnd() * ((p.maxItems || 3) - (p.minItems || 1) + 1)); const pool = [...p.items.enum]; const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; }
    return undefined;
  };
  const out = {};
  for (const [k, p] of Object.entries(schema.properties || {})) { const v = one(p); if (v === undefined) return null; out[k] = v; }
  return out;
}
function seeded(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e9) / 1e9; }; }

export function makeLM({ model, copyModel, judgeModel, ollama = 'http://127.0.0.1:11434', ledger, randomDecisions = false, seed = 7, rules = null }) {
  const rnd = seeded(seed);
  const cache = new Map();      // sig → { answer, conf }
  const hints = new Map();      // sig → hint text for the next ask
  const forced = new Map();     // sig → answer to return without asking
  let round = 0;

  async function chat(m, messages, { format, temperature, numPredict = 400, logprobs = false }) {
    const body = { model: m, messages, stream: false, think: false, ...(format ? { format } : {}), ...(logprobs ? { logprobs: true, top_logprobs: 10 } : {}),
      options: { temperature, num_predict: numPredict, num_ctx: 3072 }, keep_alive: '30m' };
    const r = await fetch(`${ollama}/api/chat`, { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }

  // The distribution over a single enum's options, read at the first token of the answer value.
  function confidence(j, options) {
    const lp = j.logprobs || [];
    // the value token comes after the `": "` / ` "` token that follows the key
    let at = -1;
    for (let i = 1; i < lp.length - 1; i++) { const tk = lp[i].token; if (tk.trim().endsWith('"') && (tk.includes(':') || lp[i - 1].token.includes(':'))) { at = i + 1; break; } }
    if (at < 0) return null;
    // Walk the answer's tokens until the options it could still be part DIVERGE ("icon-heart" / "icon-home" share the
    // token "icon"): read the distribution at the first token that tells them apart.
    const dist = Object.fromEntries(options.map((o) => [o, 0]));
    let prefix = '';
    for (let i = at; i < lp.length; i++) {
      const cands = options.filter((o) => o.toLowerCase().startsWith(prefix));
      if (cands.length <= 1) { if (cands[0]) dist[cands[0]] = 1; break; }
      const chosen = lp[i].token.toLowerCase();
      if (cands.every((o) => o.toLowerCase().startsWith(prefix + chosen))) { prefix += chosen; continue; }
      for (const t of lp[i].top_logprobs || []) {
        const ext = prefix + t.token.toLowerCase();
        if (ext === prefix) continue;
        const hit = cands.filter((o) => o.toLowerCase().startsWith(ext) || (ext.startsWith(o.toLowerCase()) && ext.length > o.length - 1));
        for (const o of hit) dist[o] += Math.exp(t.logprob) / hit.length;
      }
      break;
    }
    const sum = Object.values(dist).reduce((a, b) => a + b, 0);
    if (!sum) return null;
    for (const o of options) dist[o] = +(dist[o] / sum).toFixed(3);
    const ranked = Object.entries(dist).sort((a, b) => b[1] - a[1]);
    return { dist, top: ranked[0][0], second: ranked[1]?.[0], margin: +(ranked[0][1] - (ranked[1]?.[1] || 0)).toFixed(3) };
  }

  async function ask(key, sig, q, temperature, tag = {}) {
    const props = Object.keys(q.schema.properties || {});
    const single = props.length === 1 && q.schema.properties[props[0]].enum ? q.schema.properties[props[0]].enum : null;
    if (forced.has(sig)) {
      const answer = { [props[0]]: forced.get(sig) };
      const prev = cache.get(sig);
      cache.set(sig, { answer, conf: prev?.conf, forced: true });
      ledger.calls.push({ round, key, sig, ...tag, forced: true, answer });
      return { answer, conf: prev?.conf, forced: true };
    }
    if (cache.has(sig) && !hints.has(sig)) {
      const c = cache.get(sig);
      ledger.replays = (ledger.replays || 0) + 1;
      return { ...c, replay: true };
    }
    if (randomDecisions && !['text', 'texts', 'items', 'rows', 'purpose'].includes(props[0]) && !props.includes('audience')) {
      const answer = randomAnswer(q.schema, rnd);
      if (answer) {
        hints.delete(sig);
        const conf = single ? { dist: Object.fromEntries(single.map((o) => [o, +(1 / single.length).toFixed(3)])), top: answer[props[0]], second: single.find((o) => o !== answer[props[0]]), margin: 0 } : null;
        cache.set(sig, { answer, conf });
        ledger.calls.push({ round, key, sig, ...tag, random: true, answer });
        process.stdout.write(`  [${key}] (random) → ${JSON.stringify(answer).slice(0, 100)}\n`);
        return { answer, conf };
      }
    }
    // a learned rule (learn.mjs) answers a question the model has always answered the same way, confidently. A
    // reviewer's hint overrides it: the rule was learned from pages, not from this page's problem.
    const rk = sig.replace(/#\d+\|/, '|');
    if (rules?.[rk] && !hints.has(sig) && single) {
      const answer = { [props[0]]: rules[rk].answer };
      const conf = { dist: { [rules[rk].answer]: 1 }, top: rules[rk].answer, second: single.find((o) => o !== rules[rk].answer), margin: 1, learned: true };
      cache.set(sig, { answer, conf });
      ledger.calls.push({ round, key, sig, ...tag, learned: true, answer });
      ledger.learnedAnswers = (ledger.learnedAnswers || 0) + 1;
      return { answer, conf };
    }
    const hint = hints.get(sig);
    hints.delete(sig);
    const user = hint ? `${q.user}\nA reviewer looked at the built page and said: ${hint}` : q.user;
    const words = ['text', 'texts', 'items', 'rows'].includes(props[0]) || props.includes('audience');
    const m = copyModel && words ? copyModel : model;
    const t = Date.now();
    const j = await chat(m, [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { format: q.schema, temperature, numPredict: q.numPredict || 400, logprobs: !!single });
    let answer = null; try { answer = JSON.parse(j.message?.content ?? ''); } catch {}
    const conf = single && answer ? confidence(j, single) : null;
    cache.set(sig, { answer, conf });
    const row = { round, key, sig, model: m, ...tag, user, temperature, answer, conf: conf || undefined, raw: answer ? undefined : j.message?.content,
      tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, hinted: hint ? true : undefined };
    ledger.calls.push(row);
    process.stdout.write(`  [${key}] ${hint ? '(hinted) ' : ''}→ ${JSON.stringify(answer).slice(0, 100)}${conf ? ` p=${conf.dist[answer[props[0]]]}` : ''} (${row.tokensIn}/${row.tokensOut} tok, ${row.ms} ms)\n`);
    return { answer, conf };
  }

  // One token, read as P(yes). The reviewer does not write: it answers.
  async function judge(key, user, tag = {}, images) {
    const t = Date.now();
    const j = await chat(judgeModel || model, images ? [{ role: 'user', content: user, images }] : [{ role: 'system', content: JUDGE_SYSTEM }, { role: 'user', content: user }], { temperature: 0, numPredict: 1, logprobs: true });
    let y = 0, n = 0;
    for (const x of j.logprobs?.[0]?.top_logprobs || []) { const k = x.token.trim().toLowerCase(); if (k === 'yes') y += Math.exp(x.logprob); if (k === 'no') n += Math.exp(x.logprob); }
    const p = y + n ? +(y / (y + n)).toFixed(3) : null;
    ledger.judgements.push({ round, key, ...tag, user, pYes: p, model: judgeModel || model, tokensIn: j.prompt_eval_count, ms: Date.now() - t });
    return p;
  }

  // Pick-one judgement: which of the labelled lines is weakest. Letters, one token, distribution from logprobs.
  async function pick(key, user, labels, tag = {}) {
    const letters = labels.map((_, i) => String.fromCharCode(65 + i));
    const j = await chat(judgeModel || model, [{ role: 'system', content: 'You review a web page described in words. Answer with one letter.' }, { role: 'user', content: `${user}\n${labels.map((l, i) => `${letters[i]}: ${l}`).join('\n')}\nAnswer with one letter.` }], { temperature: 0, numPredict: 1, logprobs: true });
    const dist = {};
    for (const x of j.logprobs?.[0]?.top_logprobs || []) { const k = x.token.trim().toUpperCase(); const i = letters.indexOf(k); if (i >= 0) dist[labels[i]] = (dist[labels[i]] || 0) + Math.exp(x.logprob); }
    const best = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
    ledger.judgements.push({ round, key, ...tag, user, pick: best?.[0], dist, model: judgeModel || model });
    return best?.[0] ?? null;
  }

  return {
    ask, judge, pick, cache, hints, forced,
    setRound: (r) => { round = r; },
    invalidate: (sig, hint) => { cache.delete(sig); if (hint) hints.set(sig, hint); },
    hint: (sig, hint) => hints.set(sig, hint),
    force: (sig, value) => forced.set(sig, value),
    snapshot: () => ({ cache: new Map(cache), forced: new Map(forced) }),
    restore: (s) => { cache.clear(); for (const [k, v] of s.cache) cache.set(k, v); forced.clear(); for (const [k, v] of s.forced) forced.set(k, v); hints.clear(); }
  };
}
