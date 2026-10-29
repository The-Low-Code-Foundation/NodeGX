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

export interface Door {
  ask(key: string, sig: string, q: Question, temperature: number, tag?: Record<string, unknown>): Promise<Answer>;
  judge(key: string, user: string, tag?: Record<string, unknown>, images?: string[]): Promise<number | null>;
  cache: Map<string, { answer: any; conf?: Confidence | null }>;
  hints: Map<string, string>;
  calls: DoorCall[];
  judgements: { key: string; pYes: number | null; ms?: number; tag?: Record<string, unknown> }[];
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
  const cache: Door['cache'] = new Map();
  const hints = new Map<string, string>();
  const calls: DoorCall[] = [];
  const judgements: Door['judgements'] = [];

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
    const props = Object.keys(q.schema.properties || {});
    const single: string[] | null = props.length === 1 && q.schema.properties[props[0]].enum ? q.schema.properties[props[0]].enum : null;
    if (cache.has(sig) && !hints.has(sig)) return { ...cache.get(sig)!, replay: true };
    const hint = hints.get(sig);
    hints.delete(sig);
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
    cache.set(sig, { answer, conf });
    calls.push({ key, sig, answer, conf: conf || undefined, hinted: hint ? true : undefined, tokensIn: j.prompt_eval_count, tokensOut: j.eval_count, ms: Date.now() - t, raw: answer ? undefined : j.message?.content });
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
    judgements.push({ key, pYes: p, ms: Date.now() - t, tag });
    return p;
  }

  return { ask, judge, cache, hints, calls, judgements };
}

/**
 * A door that only replays: every answer comes from a recorded run, and a question the run never answered is an
 * error, so a port that asks something new (or asks it under a new signature) fails the paired gate loudly.
 */
export function replayDoor(answers: Record<string, any>): Door {
  const cache: Door['cache'] = new Map(Object.entries(answers).map(([sig, answer]) => [sig, { answer }]));
  const calls: DoorCall[] = [];
  return {
    cache,
    hints: new Map(),
    calls,
    judgements: [],
    async ask(key, sig) {
      const c = cache.get(sig);
      if (!c) throw new Error(`replay: the recorded run never answered ${sig} (${key})`);
      calls.push({ key, sig, answer: c.answer });
      return { ...c, replay: true };
    },
    async judge(key) {
      throw new Error(`replay: a judgement was asked (${key}); a recorded run's photos come from card|photos`);
    }
  };
}
