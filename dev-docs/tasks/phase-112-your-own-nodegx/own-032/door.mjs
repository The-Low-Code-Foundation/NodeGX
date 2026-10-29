// OWN-032 — the model door, shared by the arm and the probes: one Ollama chat call, and the odds over a single-enum
// answer read from its logprobs.
export const SYSTEM = 'You are building one section of a web page, one small step at a time. Reply with JSON only, matching the schema.';
export const used = new Set();   // the models this run asked: only these are unloaded at the end
export async function chat(model, messages, { format, temperature = 0, numPredict = 60, logprobs = false }) {
  used.add(model);
  const r = await fetch(`http://127.0.0.1:11434/api/chat`, { method: 'POST', body: JSON.stringify({ model, messages, stream: false, think: false, format, ...(logprobs ? { logprobs: true, top_logprobs: 10 } : {}), options: { temperature, num_predict: numPredict, num_ctx: 4096 }, keep_alive: '15m' }) });
  if (!r.ok) throw new Error(`ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
// the distribution over enum options, read where the options' spellings diverge (lm.mjs `confidence`)
export function dist(j, options) {
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
