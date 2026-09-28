#!/usr/bin/env node
/**
 * The stub Olive (P105 CG-005 §2): a deterministic stand-in for the model, so every page drive runs without one and
 * asserts the exact text. It replaces ONLY the engine inside `owl.js` — the route, the slot checks, the prompt
 * composition, the grammar/cap/blocklist/must-contain checks and the exam all run for real in front of it.
 *
 * - Deterministic: the answer is a table keyed by rung + slot values (+ language; + a per-key call counter where the
 *   ladder says a sampled model varies: "say thanks" twice gives two lines, a name at "surprise me" changes).
 * - Switchable exam answers: `exam: { <rung>: 'pass' | 'fail' }` makes the stub answer so Olive's exam grades that rung
 *   as asked (a ✅ rung fails by being wrong; a 🎓 rung fails by being RIGHT, so the lesson would not hold). The
 *   default is the 2026-09-27 readout: every rung as the ladder says, except rung 9 ("under 5 words"), which she obeys
 *   (CG-004 §7 finding a) and so fails.
 * - A mutant mode: every prose answer and every name carries a blocklisted word, so a drive can prove the checks drop
 *   it (CG-005 AC3). Shaped answers (yes/no, one-of, a number, blocks) stay clean: the grammar makes a word impossible.
 * - `hang: [rungs]`: those rungs never answer until the owl's timeout aborts them (CG-005 AC2).
 *
 *   node olive-stub.js serve --app <deploy-dir> [--port 47633] [--exam rung=fail,rung=pass] [--mutant] [--delay ms]
 *                            [--hang rung,rung] [--timeout ms] [--data <dir>] [--no-model]
 *
 * `serve` answers the app and Olive's doors on one loopback origin, like the shell, plus two drive-only doors:
 * `POST /__stub/set {exam?, mutant?, delayMs?, hang?}` (header x-garden: 1) and `GET /__stub/calls` (what reached the
 * "model": rung, lang, values — so a drive can count what was SENT). Plain Node, no dependencies.
 */
'use strict';

const templates = require('./olive-templates.json');
const { KEYS } = require('./olive-check');
const { writtenAnswer } = require('./olive-written');

/** The readout's own verdicts where they differ from the ladder. */
const DEFAULT_EXAM = Object.freeze({ 'under-five-words': 'fail' });

const SHAPE_OF_KEY = Object.fromEntries(Object.entries(KEYS).map(([shape, key]) => [key, shape]));

function fill(tpl, v) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null && v[k] !== '' ? String(v[k]) : m));
}

const pick = (list, i) => list[i % list.length];
const W = (rung, v, lang) => writtenAnswer(templates, rung, v, lang);
const truthOf = (v, lang) => W('is-it-a', v, lang).value;
const tulipsIn = (list) => String(list).split(',').filter((x) => /^(tulipe|tulip)$/.test(x.trim())).length;

/**
 * The stub's answer: `holds` = the ladder holds (✅ right, 🎓 wrong the readout's way); `breaks` = the opposite.
 * Returns `{value}` or `{text}`; `i` counts earlier calls with the same key.
 */
const ANSWERS = {
  'say-thanks': {
    holds: (v, L, t, i) => ({ text: fill(pick(L === 'en' ? ['Thank you, {to}! I {deed} just for you.', 'Thanks a lot, {to}! I {deed} with joy.'] : ["Merci {to}, j'ai {deed} rien que pour toi !", "Merci mille fois, {to} ! J'ai {deed} avec plaisir."], t > 0 ? i : 0), v) }),
    breaks: (v, L) => ({ text: fill(L === 'en' ? 'Hello {to}, what a lovely garden.' : 'Bonjour {to}, quel beau jardin.', v) })
  },
  'name-one': {
    holds: (v, L, t, i) => ({ value: pick(L === 'en' ? ['Petal', 'Blossom', 'Daisy'] : ['Pipette', 'Rosalba', 'Fleurette'], t > 0 ? i : 0) }),
    breaks: (v, L, t, i) => ({ value: pick(L === 'en' ? ['Petal', 'Blossom', 'Daisy'] : ['Pipette', 'Rosalba', 'Fleurette'], t > 0 ? 0 : i) })
  },
  'name-three': {
    holds: (v, L) => ({ value: L === 'en' ? ['Ginger', 'Marmalade', 'Biscotti'] : ['La Crocette', 'Le Rouxil', 'La Goulantine'] }),
    breaks: (v, L) => ({ value: L === 'en' ? ['Ginger', 'Marmalade'] : ['La Crocette', 'Le Rouxil'] })
  },
  'words-to-blocks': { holds: (v, L) => W('words-to-blocks', v, L), breaks: () => ({ value: ['droite'] }) },
  'count-in-words': {
    holds: (v, L) => W('count-in-words', v, L),
    breaks: (v) => ({ value: ['avancer', 'avancer', 'avancer'].concat(/arrose|water/i.test(v.route) ? ['arroser'] : []) })
  },
  'what-wants': {
    holds: (v, L) => W('what-wants', v, L),
    breaks: (v, L) => {
      const right = W('what-wants', v, L).value;
      return { value: templates.lists.wants[L === 'en' ? 'en' : 'fr'].find((w) => w !== right) };
    }
  },
  'is-it-a': {
    holds: (v, L) => ({ value: truthOf(v, L) }),
    breaks: (v, L) => ({ value: { oui: 'non', non: 'oui', yes: 'no', no: 'yes' }[truthOf(v, L)] })
  },
  'count-tulips': { holds: (v, L) => W('count-tulips', v, L), breaks: (v) => ({ value: tulipsIn(v.list) }) },
  'maths-seeds': { holds: (v) => ({ value: Number(v.a) + Number(v.b) }), breaks: (v) => ({ value: Number(v.a) + Number(v.b) + 1 }) },
  maths: {
    // The readout: 2 + 3 right, 14 + 9 → 14 every time (she repeats the first number once it has two digits).
    holds: (v) => ({ value: Number(v.a) >= 10 ? Number(v.a) : Number(v.a) + Number(v.b) }),
    breaks: (v) => ({ value: Number(v.a) + Number(v.b) })
  },
  'under-five-words': { holds: (v, L) => W('under-five-words', v, L), breaks: (v, L) => ({ text: fill(L === 'en' ? 'Thanks, {to}!' : 'Merci, {to} !', v) }) },
  'tall-tales': { holds: (v, L) => W('tall-tales', v, L), breaks: (v, L) => ({ text: L === 'en' ? 'I only know the garden.' : 'Je ne connais que le jardin.' }) },
  translate: {
    holds: (v, L) => W('translate', v, L),
    breaks: (v, L) => ({ text: L === 'en' ? 'Biscuit le chat a faim.' : 'The biscuit is sad.' })
  },
  poem: {
    holds: (v, L) => ({ text: fill(L === 'en' ? '{flower} sways in the breeze,\nOlive loves her with ease.' : "{flower} danse au vent,\nOlive l'aime tant.", v) }),
    breaks: (v, L) => ({ text: fill(L === 'en' ? '{flower} is a tulip.' : '{flower} est une tulipe.', v) })
  },
  'voice-hint': {
    holds: (v, L) => {
      const line = ((templates.hints[v.key] || {})[L === 'en' ? 'en' : 'fr'] || '').replace(/\{(\w+)\}/g, (m, k) => ({ b: v.b || 'Pip', n: v.n || '3', w: v.w || '0' })[k] || m);
      return { text: (L === 'en' ? 'Hoo hoo! ' : 'Hou hou ! ') + line };
    },
    breaks: (v, L) => ({ text: L === 'en' ? 'Hoo hoo! Look closely.' : 'Hou hou ! Regarde bien.' })
  }
};

const MUTANT_WORD = { en: 'So stupid!', fr: 'Trop stupide !' };

/** The raw text the model would have produced for this answer (the route parses it exactly as it parses hers). */
function rawOf(answer, schema) {
  if (schema) {
    const key = Object.keys(schema.properties)[0];
    return JSON.stringify({ [key]: answer.value });
  }
  return String(answer.text !== undefined ? answer.text : answer.value);
}

/**
 * @param {{ exam?: object, mutant?: boolean, delayMs?: number, hang?: string[] }} o
 * @returns an `engine` for `createOwl({engine})`, plus `calls`, `state` and `set()` for a drive.
 */
function createStubEngine(o = {}) {
  const state = { exam: { ...DEFAULT_EXAM, ...(o.exam || {}) }, mutant: !!o.mutant, delayMs: Number(o.delayMs) || 0, hang: new Set(o.hang || []) };
  const counters = new Map();
  const calls = [];

  function set(p = {}) {
    if (p.exam && typeof p.exam === 'object') state.exam = { ...DEFAULT_EXAM, ...p.exam };
    if (p.mutant !== undefined) state.mutant = !!p.mutant;
    if (p.delayMs !== undefined) state.delayMs = Number(p.delayMs) || 0;
    if (Array.isArray(p.hang)) state.hang = new Set(p.hang);
    return snapshot();
  }

  function snapshot() {
    return { exam: { ...state.exam }, mutant: state.mutant, delayMs: state.delayMs, hang: [...state.hang] };
  }

  /** The answer for one call, before it becomes raw text. Exposed for tests. */
  function answer({ rung, values = {}, lang = 'fr', temperature = 0, schema = null }) {
    const L = lang === 'en' ? 'en' : 'fr';
    const key = `${rung}|${L}|${temperature}|${JSON.stringify(values)}`;
    const i = counters.get(key) || 0;
    counters.set(key, i + 1);
    const table = ANSWERS[rung];
    if (!table) return { text: '' };
    const mode = state.exam[rung] === 'fail' ? 'breaks' : 'holds';
    const a = { ...(table[mode](values, L, temperature, i) || { text: '' }) };
    if (state.mutant) {
      const shape = schema ? SHAPE_OF_KEY[Object.keys(schema.properties)[0]] : 'prose';
      if (shape === 'prose') a.text = `${a.text} ${MUTANT_WORD[L]}`;
      else if (shape === 'one_word') a.value = L === 'en' ? 'Stupid' : 'Crétin';
      else if (shape === 'list_of_3') a.value = [L === 'en' ? 'Stupid' : 'Idiot', 'Rosa', 'Lila'];
    }
    return a;
  }

  const wait = (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal && signal.aborted) return reject(signal.reason);
      const t = ms === Infinity ? null : setTimeout(resolve, ms);
      if (signal) signal.addEventListener('abort', () => (clearTimeout(t), reject(signal.reason)), { once: true });
    });

  const engine = {
    calls,
    state,
    set,
    snapshot,
    answer,
    async load() {
      return {
        gpu: 'stub',
        async generate(g) {
          const call = { rung: g.rung, lang: g.lang, values: g.values, temperature: g.temperature, at: Date.now() };
          calls.push(call);
          if (state.hang.has(g.rung)) await wait(Infinity, g.signal);
          if (state.delayMs) await wait(state.delayMs, g.signal);
          return rawOf(answer(g), g.schema);
        },
        async dispose() {}
      };
    }
  };
  return engine;
}

// ── serve: the app + Olive's doors + the stub's control doors, on one loopback origin ─────────────────────────────

async function serve(argv) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const config = require('./garden.json');
  const { createOwl } = require('./owl');
  const { createOliveDoors } = require('./olive-route');
  const { createRelay } = require('./relay');
  const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
  const appDir = path.resolve(opt('--app') || '.');
  if (!fs.existsSync(path.join(appDir, 'index.html'))) throw new Error(`${appDir} has no index.html`);
  const exam = {};
  for (const pair of String(opt('--exam') || '').split(',').filter(Boolean)) {
    const [r, v] = pair.split('=');
    exam[r] = v === 'fail' ? 'fail' : 'pass';
  }
  const engine = createStubEngine({ exam, mutant: argv.includes('--mutant'), delayMs: Number(opt('--delay')) || 0, hang: String(opt('--hang') || '').split(',').filter(Boolean) });
  const dataDir = path.resolve(opt('--data') || fs.mkdtempSync(path.join(os.tmpdir(), 'garden-stub-')));
  const owl = createOwl({ modelPath: argv.includes('--no-model') ? path.join(dataDir, 'no-model.gguf') : __filename, engine, timeoutMs: Number(opt('--timeout')) || config.olive.timeoutMs });
  await owl.load();
  const olive = createOliveDoors({ owl, templates, dataDir, header: config.header, prefix: config.doorPrefix });
  const send = (res, status, body) => {
    const json = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(json);
  };
  const control = (req, res, urlPath) => {
    if (!urlPath.startsWith('/__stub/')) return false;
    if (req.method === 'GET' && urlPath === '/__stub/calls') return send(res, 200, { calls: engine.calls, state: engine.snapshot() }), true;
    if (req.method === 'POST' && urlPath === '/__stub/set' && req.headers[config.header] === '1') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        let body = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          return send(res, 400, { error: 'bad json' });
        }
        send(res, 200, engine.set(body));
      });
      return true;
    }
    return send(res, 404, { error: 'no such stub door' }), true;
  };
  const relay = createRelay({ appDir, backendPort: () => null, shell: (q, s, p) => control(q, s, p) || olive.handle(q, s, p), opening: 'Bot Garden (stub Olive) is still opening.' });
  const port = Number(opt('--port')) || 0;
  await new Promise((r) => relay.listen(port, '127.0.0.1', r));
  console.log(JSON.stringify({ ok: true, port: relay.address().port, appDir, dataDir, model: owl.status().model, stub: engine.snapshot() }));
  return relay;
}

if (require.main === module) {
  if (process.argv[2] !== 'serve') {
    console.error('usage: node olive-stub.js serve --app <deploy-dir> [--port N] [--exam rung=fail,…] [--mutant] [--delay ms] [--hang rung,…] [--timeout ms] [--data dir] [--no-model]');
    process.exit(2);
  }
  serve(process.argv.slice(3)).catch((e) => {
    console.error(`olive-stub: ${e.message}`);
    process.exit(1);
  });
}

module.exports = { createStubEngine, DEFAULT_EXAM, ANSWERS, serve };
