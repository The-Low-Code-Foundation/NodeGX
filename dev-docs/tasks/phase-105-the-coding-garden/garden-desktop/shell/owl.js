/**
 * The owl sidecar (P105 CG-004): Qwen3.5-0.8B through node-llama-cpp, in the main process, one request at a time.
 *
 * What the exam proved and this file keeps (briefing §C2, `tpl-012-olive-exam/battery.mjs`, the only harness that
 * works for this model): raw ChatML through `LlamaCompletion`, the control tokens as `SpecialTokensText`, the empty
 * think block prefilled, stop on `<|im_end|>`; a grammar from `createGrammarForJsonSchema` per shape. The built-in
 * `Qwen` chat wrapper leaks `</think>`, the Jinja wrapper returns "" — neither is used.
 *
 * - Loaded once (`load()`), one context, one sequence; `ask()` queues, so two concurrent asks are served in order.
 * - `maxTokens` ≤ 64, a 12 s timeout that aborts the generation and answers `{ok:false, fallback:true, reason:'timeout'}`.
 * - No model file, a refused model (sha256 mismatch, see model-check.js) or a load failure: every ask answers
 *   `{ok:false, fallback:true, reason}` at once and `status().model` says why — the game runs on the written lines.
 * - A trailing incomplete UTF-8 sequence (an emoji cut by the cap prints as U+FFFD) is stripped by olive-check's `tidy`.
 *
 * Plain Node, no Electron import: the contract test loads it under `node`. node-llama-cpp is ESM, so it is imported
 * lazily inside `load()`; a fake `engine` can be injected for the unit tests.
 */
'use strict';

const fs = require('fs');
const { schemaFor, tidy } = require('./olive-check');

const DEFAULTS = { timeoutMs: 12_000, maxTokens: 64, contextSize: 1024, cpuThreads: 2 };

/**
 * @param {{ modelPath?: string|null, gpu?: boolean, threads?: number, timeoutMs?: number, contextSize?: number,
 *   log?: (l: string) => void, timings?: { line: (o: object) => void } | null, engine?: object|null, now?: () => number,
 *   refused?: string|null }} o
 *   `engine` (tests only) replaces node-llama-cpp: `{ load(modelPath, {gpu, threads, contextSize}) → { generate({system,
 *   user, schema, temperature, maxTokens, signal}) → Promise<string>, gpu: string } }`.
 */
function createOwl(o = {}) {
  const log = o.log || (() => {});
  const now = o.now || (() => Date.now());
  const timeoutMs = o.timeoutMs || DEFAULTS.timeoutMs;
  const state = {
    model: 'unloaded', // unloaded | loading | ready | none | refused | failed
    reason: o.refused || null,
    modelPath: o.modelPath || null,
    gpu: null,
    loadMs: null,
    lastMs: null,
    asked: 0,
    fallbacks: 0,
    busy: 0,
    queued: 0
  };
  if (o.refused) state.model = 'refused';
  let backend = null;
  let chain = Promise.resolve();

  async function realEngine() {
    const nlc = await import('node-llama-cpp');
    return {
      async load(modelPath, { gpu, threads, contextSize }) {
        const llama = await nlc.getLlama(gpu === false ? { gpu: false } : {});
        const model = await llama.loadModel({ modelPath });
        const ctx = await model.createContext({ contextSize, threads: gpu === false ? threads : undefined });
        const seq = ctx.getSequence();
        const comp = new nlc.LlamaCompletion({ contextSequence: seq });
        const ST = (t) => new nlc.SpecialTokensText(t);
        const stop = [nlc.LlamaText([ST('<|im_end|>')]), nlc.LlamaText([ST('<|endoftext|>')])];
        const chatml = (sys, user) =>
          nlc.LlamaText([ST('<|im_start|>'), 'system\n' + sys, ST('<|im_end|>'), '\n', ST('<|im_start|>'), 'user\n' + user, ST('<|im_end|>'), '\n', ST('<|im_start|>'), 'assistant\n', ST('<think>'), '\n\n', ST('</think>'), '\n\n']);
        const grammars = new Map();
        return {
          gpu: String(llama.gpu || 'cpu'),
          async generate({ system, user, schema, temperature, maxTokens, signal }) {
            let grammar;
            if (schema) {
              const key = JSON.stringify(schema);
              if (!grammars.has(key)) grammars.set(key, await llama.createGrammarForJsonSchema(schema));
              grammar = grammars.get(key);
            }
            try {
              return await comp.generateCompletion(chatml(system, user), { maxTokens, temperature, grammar, customStopTriggers: stop, signal, stopOnAbortSignal: false });
            } finally {
              await seq.clearHistory();
            }
          },
          async dispose() {
            await ctx.dispose();
            await model.dispose();
          }
        };
      }
    };
  }

  /** Load the model once. Never throws: the state says what happened. */
  async function load() {
    if (state.model !== 'unloaded') return status();
    if (!state.modelPath || !fs.existsSync(state.modelPath)) {
      state.model = 'none';
      state.reason = state.modelPath ? `no model file at ${state.modelPath}` : 'no model path';
      log(`owl: ${state.reason}`);
      return status();
    }
    state.model = 'loading';
    const t0 = now();
    try {
      const engine = o.engine || (await realEngine());
      backend = await engine.load(state.modelPath, { gpu: o.gpu !== false, threads: o.threads || DEFAULTS.cpuThreads, contextSize: o.contextSize || DEFAULTS.contextSize });
      state.gpu = backend.gpu || (o.gpu === false ? 'cpu' : 'unknown');
      state.loadMs = now() - t0;
      state.model = 'ready';
      log(`owl: loaded in ${state.loadMs} ms on ${state.gpu}`);
      if (o.timings) o.timings.line({ event: 'model-load', ms: state.loadMs, gpu: state.gpu });
    } catch (e) {
      state.model = 'failed';
      state.reason = String((e && e.message) || e).slice(0, 300);
      log(`owl: load failed: ${state.reason}`);
    }
    return status();
  }

  function status() {
    return { ...state };
  }

  /**
   * One completion, queued. `prompt` is olive-check's `compose()` output. Resolves to `{ok:true, raw, ms}` or
   * `{ok:false, fallback:true, reason, ms}`; never rejects.
   */
  function ask(prompt) {
    state.queued++;
    const run = chain.then(() => generateOne(prompt));
    chain = run.catch(() => {});
    return run;
  }

  async function generateOne(prompt) {
    state.queued--;
    const t0 = now();
    if (state.model !== 'ready' || !backend) {
      state.fallbacks++;
      return { ok: false, fallback: true, reason: state.model === 'none' ? 'no-model' : state.model === 'refused' ? 'refused' : state.model === 'failed' ? 'load-failed' : 'not-loaded', ms: now() - t0 };
    }
    state.busy++;
    state.asked++;
    const ac = new AbortController();
    let timer = null;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => {
        ac.abort(new Error('timeout'));
        resolve({ ok: false, fallback: true, reason: 'timeout' });
      }, timeoutMs);
    });
    try {
      const schema = schemaFor(prompt.shape, prompt.enumValues);
      const gen = backend
        .generate({ system: prompt.system, user: prompt.user, schema, temperature: prompt.temperature, maxTokens: Math.min(DEFAULTS.maxTokens, prompt.maxTokens || DEFAULTS.maxTokens), signal: ac.signal })
        .then((raw) => ({ ok: true, raw: tidy(raw) }), (e) => ({ ok: false, fallback: true, reason: ac.signal.aborted ? 'timeout' : 'generate-failed', error: String((e && e.message) || e).slice(0, 200) }));
      const r = await Promise.race([gen, timeout]);
      const ms = now() - t0;
      state.lastMs = ms;
      if (!r.ok) state.fallbacks++;
      return { ...r, ms };
    } finally {
      clearTimeout(timer);
      state.busy--;
    }
  }

  async function close() {
    if (backend && backend.dispose) await backend.dispose();
    backend = null;
    if (state.model === 'ready') state.model = 'unloaded';
  }

  return { load, ask, status, close };
}

module.exports = { createOwl, DEFAULTS };
