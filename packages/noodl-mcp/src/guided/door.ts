/**
 * P112 OWN-031 — the model door: every question `build_app` asks a local model goes through `ask`. A port of OWN-029's
 * `dev-docs/tasks/phase-112-your-own-nodegx/own-029/lm.mjs` (the random-decision control and the learned rules stay in
 * the lab), so that the questions, their signatures and their answers mean the same thing in the product as in the
 * runs that measured them.
 *
 *   - An answer is cached by its signature, so a repair re-asks only what was invalidated, and a recorded run replays
 *     through `replayDoor` (the paired gate: the same answers must give the same graphs, `tests/own031GuidedPage.test.ts`).
 *   - A hint (a reviewer's reason) is appended to a question being re-asked.
 *   - A single-enum question reads Ollama's logprobs at the answer token: the model's distribution over the options.
 *     This is the one thing the server gets that a client model through MCP never gives.
 *   - `judge` is a one-token yes/no, P(yes) from the logprobs; it can look at images (the photo scout).
 *
 * No `num_ctx` is sent, unlike the lab's 3072: the person's chat host already has this model loaded at the window it
 * needs (Goose wants 32k, FINDINGS row 3), and a different `num_ctx` makes Ollama reload the model on every switch.
 *
 * @module noodl-mcp/guided/door
 */
import { ToolError } from '../errors';

export const SYSTEM = 'You answer one question about building a web page. Reply with JSON only, matching the schema. Be brief.';
export const JUDGE_SYSTEM = 'You review one part of a web page described in words. Answer yes or no.';

/** One question: the options are in its words; the schema only shapes the answer. */
export interface Question {
  user: string;
  schema: any;
  numPredict?: number;
}

export interface Confidence {
  dist: Record<string, number>;
  top: string;
  second?: string;
  margin: number;
}

export interface Answer {
  answer: any;
  conf?: Confidence | null;
  replay?: boolean;
}

/** What was asked and answered, for the result and for a later replay. */
export interface DoorCall {
  key: string;
  sig: string;
  answer: any;
  conf?: Confidence;
  hinted?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  ms?: number;
  raw?: string;
}

export interface Judgement {
  round: number;
  key: string;
  user: string;
  pYes?: number | null;
  pick?: string | null;
  ms?: number;
  tag?: Record<string, unknown>;
}

type Cached = { answer: any; conf?: Confidence | null; forced?: boolean };

export interface Door {
  ask(key: string, sig: string, q: Question, temperature: number, tag?: Record<string, unknown>): Promise<Answer>;
  judge(key: string, user: string, tag?: Record<string, unknown>, images?: string[]): Promise<number | null>;
  /** Pick-one: which of the labelled lines. One letter, read from the logprobs. */
  pick(key: string, user: string, labels: string[], tag?: Record<string, unknown>): Promise<string | null>;
  cache: Map<string, Cached>;
  hints: Map<string, string>;
  forced: Map<string, any>;
  calls: (DoorCall & { round: number; forced?: boolean })[];
  judgements: Judgement[];
  setRound(r: number): void;
  /** Forget an answer, so it is asked again, with a reviewer's reason appended. */
  invalidate(sig: string, hint?: string): void;
  /** Answer a single-enum question with this value, without asking (the "flip": the model's own second choice). */
  force(sig: string, value: any): void;
  snapshot(): { cache: Map<string, Cached>; forced: Map<string, any> };
  restore(s: { cache: Map<string, Cached>; forced: Map<string, any> }): void;
}

/** The state every door shares: the cache, hints, forced answers, and the round's bookkeeping. */
function doorState() {
  const st = {
    round: 0,
    cache: new Map<string, Cached>(),
    hints: new Map<string, string>(),
    forced: new Map<string, any>(),
    calls: [] as Door['calls'],
    judgements: [] as Judgement[]
  };
  const common = {
    cache: st.cache,
    hints: st.hints,
    forced: st.forced,
    calls: st.calls,
    judgements: st.judgements,
    setRound: (r: number) => {
      st.round = r;
    },
    invalidate: (sig: string, hint?: string) => {
      st.cache.delete(sig);
      if (hint) st.hints.set(sig, hint);
    },
    force: (sig: string, value: any) => {
      st.forced.set(sig, value);
    },
    snapshot: () => ({ cache: new Map(st.cache), forced: new Map(st.forced) }),
    restore: (s: { cache: Map<string, Cached>; forced: Map<string, any> }) => {
      st.cache.clear();
      for (const [k, v] of s.cache) st.cache.set(k, v);
      st.forced.clear();
      for (const [k, v] of s.forced) st.forced.set(k, v);
      st.hints.clear();
    }
  };
  // a forced or cached answer, before any model is asked; null when the question must be asked
  const settled = (key: string, sig: string, q: Question): Answer | null => {
    const props = Object.keys(q.schema.properties || {});
    if (st.forced.has(sig)) {
      const answer = { [props[0]]: st.forced.get(sig) };
      const prev = st.cache.get(sig);
      st.cache.set(sig, { answer, conf: prev?.conf, forced: true });
      st.calls.push({ round: st.round, key, sig, answer, forced: true });
      return { answer, conf: prev?.conf };
    }
    if (st.cache.has(sig) && !st.hints.has(sig)) return { ...st.cache.get(sig)!, replay: true };
    return null;
  };
  return { st, common, settled };
}

/** The distribution over a single enum's options, read at the first token of the answer value. */
export function confidence(j: any, options: string[]): Confidence | null {
  const lp = j.logprobs || [];
  // the value token comes after the `": "` / ` "` token that follows the key
  let at = -1;
  for (let i = 1; i < lp.length - 1; i++) {
    const tk = lp[i].token;
    if (tk.trim().endsWith('"') && (tk.includes(':') || lp[i - 1].token.includes(':'))) {
      at = i + 1;
      break;
    }
  }
  if (at < 0) return null;
  // Walk the answer's tokens until the options it could still be part of DIVERGE ("icon-heart" / "icon-home" share
  // the token "icon"): read the distribution at the first token that tells them apart.
  const dist: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
  let prefix = '';
  for (let i = at; i < lp.length; i++) {
    const cands = options.filter((o) => o.toLowerCase().startsWith(prefix));
    if (cands.length <= 1) {
      if (cands[0]) dist[cands[0]] = 1;
      break;
    }
    const chosen = lp[i].token.toLowerCase();
    if (cands.every((o) => o.toLowerCase().startsWith(prefix + chosen))) {
      prefix += chosen;
      continue;
    }
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

/** The door to an Ollama model on this machine. */
export function ollamaDoor({ model, host, judgeModel }: { model: string; host: string; judgeModel?: string }): Door {
  const { st, common, settled } = doorState();

  async function chat(m: string, messages: unknown[], { format, temperature, numPredict = 400, logprobs = false }: { format?: unknown; temperature: number; numPredict?: number; logprobs?: boolean }): Promise<any> {
    const body = {
      model: m,
      messages,
      stream: false,
      think: false,
      ...(format ? { format } : {}),
      ...(logprobs ? { logprobs: true, top_logprobs: 10 } : {}),
      options: { temperature, num_predict: numPredict },
      keep_alive: '30m'
    };
    let r: Response;
    try {
      r = await fetch(`${host}/api/chat`, { method: 'POST', body: JSON.stringify(body) });
    } catch (e) {
      throw new ToolError('io-error', `The local model (${m}) could not be reached at ${host}: ${(e as Error).message}. Is Ollama running?`);
    }
    if (!r.ok) throw new ToolError('io-error', `The local model (${m}) answered ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }

  async function ask(key: string, sig: string, q: Question, temperature: number): Promise<Answer> {
    const done = settled(key, sig, q);
    if (done) return done;
    const props = Object.keys(q.schema.properties || {});
    const single: string[] | null = props.length === 1 && q.schema.properties[props[0]].enum ? q.schema.properties[props[0]].enum : null;
    const hint = st.hints.get(sig);
    st.hints.delete(sig);
    const user = hint ? `${q.user}\nA reviewer looked at the built page and said: ${hint}` : q.user;
    const t = Date.now();
    const j = await chat(model, [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { format: q.schema, temperature, numPredict: q.numPredict || 400, logprobs: !!single });
    let answer: any = null;
    try {
      answer = JSON.parse(j.message?.content ?? '');
    } catch {
      /* answer stays null; the caller has a default for every question */
    }
    const conf = single && answer ? confidence(j, single) : null;
    st.cache.set(sig, { answer, conf });
    st.calls.push({ round: st.round, key, sig, answer, conf: conf || undefined, hinted: hint ? true : undefined, tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, raw: answer ? undefined : j.message?.content });
    return { answer, conf };
  }

  // One token, read as P(yes). The reviewer does not write: it answers.
  async function judge(key: string, user: string, tag?: Record<string, unknown>, images?: string[]): Promise<number | null> {
    const t = Date.now();
    const j = await chat(judgeModel || model, images ? [{ role: 'user', content: user, images }] : [{ role: 'system', content: JUDGE_SYSTEM }, { role: 'user', content: user }], { temperature: 0, numPredict: 1, logprobs: true });
    let y = 0,
      n = 0;
    for (const x of j.logprobs?.[0]?.top_logprobs || []) {
      const k = x.token.trim().toLowerCase();
      if (k === 'yes') y += Math.exp(x.logprob);
      if (k === 'no') n += Math.exp(x.logprob);
    }
    const p = y + n ? +(y / (y + n)).toFixed(3) : null;
    st.judgements.push({ round: st.round, key, user, pYes: p, ms: Date.now() - t, tag });
    return p;
  }

  // Pick-one judgement: which of the labelled lines. Letters, one token, distribution from logprobs.
  async function pick(key: string, user: string, labels: string[], tag?: Record<string, unknown>): Promise<string | null> {
    const t = Date.now();
    const letters = labels.map((_, i) => String.fromCharCode(65 + i));
    const j = await chat(
      judgeModel || model,
      [
        { role: 'system', content: 'You review a web page described in words. Answer with one letter.' },
        { role: 'user', content: `${user}\n${labels.map((l, i) => `${letters[i]}: ${l}`).join('\n')}\nAnswer with one letter.` }
      ],
      { temperature: 0, numPredict: 1, logprobs: true }
    );
    const dist: Record<string, number> = {};
    for (const x of j.logprobs?.[0]?.top_logprobs || []) {
      const i = letters.indexOf(x.token.trim().toUpperCase());
      if (i >= 0) dist[labels[i]] = (dist[labels[i]] || 0) + Math.exp(x.logprob);
    }
    const best = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
    st.judgements.push({ round: st.round, key, user, pick: best?.[0] ?? null, ms: Date.now() - t, tag });
    return best?.[0] ?? null;
  }

  return { ...common, ask, judge, pick };
}

/** A recorded run's model side: what was asked and judged, by round (an OWN-029 ledger's `calls` and `judgements`). */
export interface Recording {
  /** Answers known before round 0 (a paired run's preloaded decisions with their confidence, the photos). */
  preload: Record<string, { answer: any; conf?: Confidence | null }>;
  calls: { round: number; sig: string; answer: any; conf?: Confidence | null; forced?: boolean }[];
  judgements: { round: number; key: string; user: string; pYes?: number | null; pick?: string | null }[];
}

/**
 * A door that only replays: every answer and every judgement comes from a recorded run, matched by round and by
 * signature (a judgement by its exact words). A question the run never asked in that round is an error, so a port that
 * asks something new, asks it in another round, or words a judgement differently fails the paired gate loudly.
 */
export function replayDoor(rec: Recording | Record<string, any>): Door {
  const isRec = 'calls' in rec && Array.isArray((rec as Recording).calls);
  // a plain sig → answer map is one round's asks (the photos, which the scout reads from the cache, preloaded)
  const plain = rec as Record<string, any>;
  const r: Recording = isRec
    ? (rec as Recording)
    : { preload: 'card|photos' in plain ? { 'card|photos': { answer: plain['card|photos'] } } : {}, calls: Object.entries(plain).filter(([k]) => k !== 'card|photos').map(([sig, answer]) => ({ round: 0, sig, answer })), judgements: [] };
  const { st, common, settled } = doorState();
  for (const [sig, v] of Object.entries(r.preload)) st.cache.set(sig, { answer: v.answer, conf: v.conf });
  const asks = new Map<string, any[]>();
  for (const c of r.calls) if (!c.forced) (asks.get(`${c.round}|${c.sig}`) || asks.set(`${c.round}|${c.sig}`, []).get(`${c.round}|${c.sig}`)!).push(c);
  const said = new Map<string, any[]>();
  for (const j of r.judgements) (said.get(`${j.round}|${j.key}|${j.user}`) || said.set(`${j.round}|${j.key}|${j.user}`, []).get(`${j.round}|${j.key}|${j.user}`)!).push(j);
  const take = (m: Map<string, any[]>, k: string, what: string) => {
    const q = m.get(k);
    if (!q?.length) throw new Error(`replay: the recorded run never ${what} (round ${k.split('|')[0]}): ${k.slice(k.indexOf('|') + 1, k.indexOf('|') + 1 + 300)}`);
    return q.shift();
  };
  return {
    ...common,
    async ask(key, sig, q) {
      const done = settled(key, sig, q);
      if (done) return done;
      st.hints.delete(sig);
      const c = take(asks, `${st.round}|${sig}`, 'asked this');
      st.cache.set(sig, { answer: c.answer, conf: c.conf });
      st.calls.push({ round: st.round, key, sig, answer: c.answer });
      return { answer: c.answer, conf: c.conf };
    },
    async judge(key, user) {
      const j = take(said, `${st.round}|${key}|${user}`, 'judged this');
      st.judgements.push({ round: st.round, key, user, pYes: j.pYes });
      return j.pYes ?? null;
    },
    async pick(key, user) {
      const j = take(said, `${st.round}|${key}|${user}`, 'picked from this');
      st.judgements.push({ round: st.round, key, user, pick: j.pick });
      return j.pick ?? null;
    }
  };
}

/** What a recorded run left unasked: a port that skips a question its lab asked is as wrong as one that adds one. */
export function unconsumed(rec: Recording, door: Door): string[] {
  const used = new Map<string, number>();
  for (const c of door.calls) if (!c.forced) used.set(`${c.round}|${c.sig}`, (used.get(`${c.round}|${c.sig}`) || 0) + 1);
  for (const j of door.judgements) used.set(`${j.round}|${j.key}|${j.user}`, (used.get(`${j.round}|${j.key}|${j.user}`) || 0) + 1);
  const want = new Map<string, number>();
  for (const c of rec.calls) if (!c.forced) want.set(`${c.round}|${c.sig}`, (want.get(`${c.round}|${c.sig}`) || 0) + 1);
  for (const j of rec.judgements) want.set(`${j.round}|${j.key}|${j.user}`, (want.get(`${j.round}|${j.key}|${j.user}`) || 0) + 1);
  return [...want].filter(([k, n]) => (used.get(k) || 0) < n).map(([k]) => k.slice(0, 160));
}
